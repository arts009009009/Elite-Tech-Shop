#!/usr/bin/env node
/**
 * Blazefire auto-activation.
 *
 * Runs after install and wires the activation into the host project's
 * next.config.* for you, so nobody has to hand-edit it:
 *
 *     import blazefire from "blazefire/plugin";
 *     export default blazefire(nextConfig);
 *
 * This file is also the engine behind `npx blazefire init` / `restore`. It
 * only self-executes when invoked directly (require.main), so requiring it
 * from the CLI is inert.
 *
 * Safety rules — a postinstall must never break someone's install:
 *
 *   1. never throws; any failure is logged and swallowed (exit 0)
 *   2. only ever writes a next.config.* found in the project we were
 *      installed INTO, never our own package and never a random ancestor
 *   3. requires <project>/node_modules/next to exist before writing
 *   4. copies the original into "<project>/Blazefire Backup/" first, and
 *      never overwrites an existing backup — the first copy is the pristine
 *      pre-Blazefire original
 *   5. idempotent: if "blazefire/plugin" is already referenced, does nothing
 *   6. opt out entirely with BLAZEFIRE_SKIP_AUTO=1
 *   7. after a successful activation it adds a `postinstall` hook to the
 *      HOST project's package.json, because a package's own postinstall is
 *      exactly what pnpm/bun refuse to run for untrusted dependencies — but
 *      a project's own scripts always run. One `npx blazefire init` (or a
 *      plain npm/yarn install) therefore makes every later pnpm/bun install
 *      self-activate too. `restore` puts the original script back.
 *
 * The edit itself is deliberately dumb: locate the top-level `export default`
 * (or `module.exports`) while skipping strings/comments/braces, then wrap the
 * expression in `blazefire(...)`. Anything we cannot recognise with
 * confidence is left alone and reported as a paste-in snippet instead.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const CONFIG_NAMES = [
  "next.config.ts",
  "next.config.mts",
  "next.config.cts",
  "next.config.mjs",
  "next.config.js",
  "next.config.cjs",
];

const BACKUP_DIR = "Blazefire Backup";
const MARKER = "blazefire/plugin";
const ESM_IMPORT = 'import blazefire from "blazefire/plugin";';
const CJS_REQUIRE = 'const blazefire = require("blazefire/plugin");';

// The hook we write into the HOST project's scripts. Two deliberate choices:
//
//   - `|| echo blazefire skipped` — without it, removing `blazefire` from
//     dependencies leaves this line behind and the next install dies with
//     `sh: 1: blazefire: not found` (exit 127 on npm, 1 on pnpm). A postinstall
//     must never be able to brick a project, so the failure is swallowed.
//   - `&& <theirs>` when a postinstall already exists — `||` binds tighter in
//     effect here (left-associative, equal precedence), so their command runs
//     whether init succeeded or was skipped.
const HOOK_COMMAND = "blazefire init || echo blazefire skipped";
const HOOK_RE = /\bblazefire\b[\s\S]*\binit\b/;
// Written next to the config backup so `restore` can undo it exactly, without
// restoring a whole (now stale) copy of package.json.
const HOOK_RECORD = "scripts.postinstall.json";

function say(message) {
  try {
    console.log("  blazefire: " + message);
  } catch (_) {
    /* stdout may be gone; never let logging break the install */
  }
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (_) {
    return null;
  }
}

/** Nearest directory at or above `start` that owns a package.json. */
function findNearestPackageRoot(start) {
  let dir = path.resolve(start);
  for (let i = 0; i < 16; i++) {
    if (fs.existsSync(path.join(dir, "package.json"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function findConfig(root) {
  for (const name of CONFIG_NAMES) {
    const file = path.join(root, name);
    try {
      if (fs.statSync(file).isFile()) return file;
    } catch (_) {
      /* not here */
    }
  }
  return null;
}

function dependencyBags(pkg) {
  return ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]
    .map((key) => pkg && pkg[key])
    .filter(Boolean);
}

function declaresNext(pkg) {
  return dependencyBags(pkg).some((bag) => Object.prototype.hasOwnProperty.call(bag, "next"));
}

/** Only a project that actually depends on us should get the hook. */
function declaresBlazefire(pkg) {
  return dependencyBags(pkg).some((bag) => Object.prototype.hasOwnProperty.call(bag, "blazefire"));
}

/**
 * The manifest is not enough: npm (and yarn) write a newly added dependency
 * into package.json *after* lifecycle scripts run, so on the very first
 * `npm install github:…` we are demonstrably installed but not yet listed.
 * The hook only needs us to be present on disk.
 */
function hasBlazefire(projectRoot, pkg) {
  if (declaresBlazefire(pkg)) return true;
  return blazefireInstalledAt(projectRoot);
}

/* ------------------------------------------------------------------ *
 * workspace / monorepo discovery
 *
 * Installing blazefire at the root of a monorepo is the common case, and
 * that root is usually not where the Next app lives — so an installer that
 * only looks at its own package.json silently does nothing. Only *declared*
 * workspaces are considered, so the search stays bounded and predictable.
 * ------------------------------------------------------------------ */

/** Workspace globs from package.json#workspaces and pnpm-workspace.yaml. */
function workspacePatterns(projectRoot) {
  const patterns = [];

  const pkg = readJson(path.join(projectRoot, "package.json"));
  const ws = pkg && pkg.workspaces;
  if (Array.isArray(ws)) patterns.push(...ws);
  else if (ws && Array.isArray(ws.packages)) patterns.push(...ws.packages);

  try {
    const yaml = fs.readFileSync(path.join(projectRoot, "pnpm-workspace.yaml"), "utf8");
    let collecting = false;
    for (const line of yaml.split("\n")) {
      if (/^packages\s*:/.test(line)) {
        collecting = true;
        continue;
      }
      if (!collecting) continue;
      const item = /^\s*-\s*(.+?)\s*$/.exec(line);
      if (item) patterns.push(item[1].replace(/^["']|["']$/g, ""));
      else if (/^\S/.test(line)) collecting = false; // next top-level key
    }
  } catch (_) {
    /* not a pnpm workspace */
  }

  return patterns;
}

/** Expand the `dir` and `dir/*` shapes real workspace files use. */
function expandWorkspace(projectRoot, patterns) {
  const dirs = [];
  for (const pattern of patterns) {
    if (pattern.includes("**")) continue; // too open-ended to walk
    const star = pattern.indexOf("*");
    if (star === -1) {
      const dir = path.join(projectRoot, pattern);
      if (fs.existsSync(path.join(dir, "package.json"))) dirs.push(dir);
      continue;
    }
    const parent = path.join(projectRoot, pattern.slice(0, star).replace(/\/$/, ""));
    let entries = [];
    try {
      entries = fs.readdirSync(parent, { withFileTypes: true });
    } catch (_) {
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) dirs.push(path.join(parent, entry.name));
    }
  }
  return dirs;
}

/** Declared workspaces that actually hold a Next config, in stable order. */
function findWorkspaceProjects(projectRoot) {
  const patterns = workspacePatterns(projectRoot);
  if (!patterns.length) return [];
  const dirs = expandWorkspace(projectRoot, patterns);
  dirs.sort();
  return dirs.filter((dir) => findConfig(dir));
}

/**
 * Can this project run `blazefire` at all? Walks up, because a workspace
 * package legitimately resolves a dependency hoisted to the monorepo root.
 */
function blazefireInstalledAt(projectRoot) {
  let dir = path.resolve(projectRoot);
  for (let i = 0; i < 16; i++) {
    if (fs.existsSync(path.join(dir, "node_modules", "blazefire", "package.json"))) return true;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return false;
}

/* ------------------------------------------------------------------ *
 * source scanning
 *
 * next.config files are small, so rather than pull in a parser we walk
 * the text once, skipping strings, template literals, comments and
 * brackets, which is enough to find a *top-level* statement safely.
 * ------------------------------------------------------------------ */

/** Return the index just past a string/template literal opened at `i`. */
function skipString(src, i) {
  const quote = src[i];
  i += 1;
  while (i < src.length) {
    const c = src[i];
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (quote === "`" && c === "$" && src[i + 1] === "{") {
      let depth = 1;
      i += 2;
      while (i < src.length && depth > 0) {
        const d = src[i];
        if (d === "{") depth += 1;
        else if (d === "}") depth -= 1;
        else if (d === '"' || d === "'" || d === "`") {
          i = skipString(src, i);
          continue;
        }
        i += 1;
      }
      continue;
    }
    if (c === quote) return i + 1;
    i += 1;
  }
  return i;
}

/** Find the first top-level occurrence of any target string. */
function findTopLevel(src, targets) {
  let i = 0;
  let depth = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") {
      const e = src.indexOf("\n", i);
      i = e === -1 ? src.length : e + 1;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const e = src.indexOf("*/", i + 2);
      i = e === -1 ? src.length : e + 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      i = skipString(src, i);
      continue;
    }
    if (c === "{" || c === "(" || c === "[") {
      depth += 1;
      i += 1;
      continue;
    }
    if (c === "}" || c === ")" || c === "]") {
      depth -= 1;
      i += 1;
      continue;
    }
    if (depth === 0) {
      for (const target of targets) {
        if (src.startsWith(target, i)) return { index: i, token: target };
      }
    }
    i += 1;
  }
  return null;
}

/** Index just past the statement starting at `start` (its terminating `;`, else EOF). */
function statementEnd(src, start) {
  let i = start;
  let depth = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") {
      i = skipString(src, i);
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      const e = src.indexOf("\n", i);
      i = e === -1 ? src.length : e + 1;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const e = src.indexOf("*/", i + 2);
      i = e === -1 ? src.length : e + 2;
      continue;
    }
    if (c === "{" || c === "(" || c === "[") depth += 1;
    else if (c === "}" || c === ")" || c === "]") depth -= 1;
    else if (c === ";" && depth <= 0) return i + 1;
    i += 1;
  }
  return src.length;
}

const SNIPPET =
  'import blazefire from "blazefire/plugin";\nexport default blazefire(nextConfig);';

/* ------------------------------------------------------------------ *
 * the actual rewrite
 * ------------------------------------------------------------------ */

function plan(src) {
  const hit = findTopLevel(src, ["export default", "module.exports"]);
  if (!hit) return { ok: false, reason: "no top-level `export default` found" };

  const isEsm = hit.token === "export default";
  const headEnd = hit.index + hit.token.length;
  const rest = src.slice(headEnd);

  // Two default exports (the exact mistake this tool exists to fix) must not
  // be "repaired" by wrapping only the first — refuse and explain instead.
  if (findTopLevel(rest, ["export default", "module.exports"])) {
    return { ok: false, reason: "file declares a default export more than once" };
  }

  // Function-style configs are fine: blazefire() detects a function argument
  // and wraps the config it returns, so Next still gets its (phase, ctx) call.
  // A `class` is not a config shape at all — refuse rather than guess.
  if (isEsm && /^\s+class\b/.test(rest)) {
    return { ok: false, reason: "`export default class` is not a Next config" };
  }
  if (/^\s*\{?[^;]*\bas\s+default\b/.test(src.slice(Math.max(0, hit.index - 120), headEnd))) {
    return { ok: false, reason: "`export { x as default }` form not supported" };
  }

  // Skip past `export default` / `module.exports` and any `=` / `satisfies` glue
  // to the start of the expression itself.
  let exprStart = headEnd;
  while (exprStart < src.length && /[ \t\r\n=]/.test(src[exprStart])) exprStart += 1;

  const endOfStatement = statementEnd(src, exprStart);
  // statementEnd returns either just past a depth-0 `;` or the end of file,
  // so the byte before it tells us which — scanning raw text for ';' would
  // misfire on a `;` nested inside a function body.
  const semicolon = endOfStatement > 0 && src[endOfStatement - 1] === ";";

  let expression;
  let exprEnd;
  if (semicolon) {
    expression = src.slice(exprStart, endOfStatement - 1).trim();
    exprEnd = endOfStatement; // the `;` is re-emitted by the replacement
  } else {
    const raw = src.slice(exprStart, endOfStatement);
    const trimmed = raw.trimEnd();
    expression = trimmed.trim();
    // Stop before trailing whitespace so blank lines / final newline stay in
    // the tail instead of being swallowed by the wrapped call.
    exprEnd = exprStart + trimmed.length;
  }

  if (!expression) return { ok: false, reason: "could not locate the config expression" };

  // `mid` (the slice from insertAt up to exprStart) already carries the
  // `export default` / `module.exports =` keyword verbatim, so the replacement
  // must be ONLY the call — re-emitting the keyword here doubles it and emits
  // `export default export default ...`, a hard syntax error.
  const replacement = `blazefire(${expression})${semicolon ? ";" : ""}`;

  const firstImport = findTopLevel(src, ["import "]);
  let insertAt = firstImport ? firstImport.index : hit.index;
  if (insertAt > hit.index) insertAt = hit.index;
  if (src.startsWith("#!")) {
    const nl = src.indexOf("\n");
    if (nl !== -1 && nl < insertAt) insertAt = nl + 1;
  }

  return {
    ok: true,
    isEsm,
    insertAt,
    exprStart,
    exprEnd,
    replacement,
    line: isEsm ? ESM_IMPORT : CJS_REQUIRE,
  };
}

function rewrite(src) {
  const p = plan(src);
  if (!p.ok) return p;

  // Respect the file's own line endings, otherwise a Windows-authored config
  // ends up with one LF line in a CRLF document.
  const eol = src.includes("\r\n") ? "\r\n" : "\n";

  const head = src.slice(0, p.insertAt);
  const mid = src.slice(p.insertAt, p.exprStart);
  const tail = src.slice(p.exprEnd);
  return { ok: true, code: head + p.line + eol + mid + p.replacement + tail };
}

/* ------------------------------------------------------------------ *
 * driver
 * ------------------------------------------------------------------ */

function backup(originalFile, contents, projectRoot) {
  const backupRoot = path.join(projectRoot, BACKUP_DIR);
  const saved = path.join(backupRoot, path.basename(originalFile));
  fs.mkdirSync(backupRoot, { recursive: true });
  // First copy wins: it is the pristine pre-Blazefire original.
  if (!fs.existsSync(saved)) fs.writeFileSync(saved, contents, "utf8");
  return saved;
}

function noteGitignore(projectRoot) {
  const file = path.join(projectRoot, ".gitignore");
  try {
    let current = "";
    try {
      current = fs.readFileSync(file, "utf8");
    } catch (_) {
      current = ""; // none yet — creating it is the entire point of this
    }
    if (current.includes(BACKUP_DIR)) return;
    const note = "# Blazefire keeps a copy of the config it edits\n" + BACKUP_DIR + "/\n";
    const body =
      current === ""
        ? note
        : (current.endsWith("\n") ? current : current + "\n") + "\n" + note;
    fs.writeFileSync(file, body, "utf8");
  } catch (_) {
    /* cosmetic only */
  }
}

/* ------------------------------------------------------------------ *
 * the self-perpetuating hook
 *
 * A dependency's own postinstall is exactly what pnpm and bun withhold from
 * an untrusted package, but the *project's* own scripts always run. So a
 * successful activation records itself into the host package.json, which
 * turns "npm/yarn activate, pnpm/bun do not" into "everything activates".
 * ------------------------------------------------------------------ */

/** Write package.json back with its own indentation and trailing newline. */
function writeJsonPreserving(file, pkg) {
  let raw = "";
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (_) {
    /* about to be overwritten anyway */
  }
  const indent = (raw.match(/^([ \t]+)"/m) || [])[1] || 2;
  const trailing = raw === "" || raw.endsWith("\n") ? "\n" : "";
  fs.writeFileSync(file, JSON.stringify(pkg, null, indent) + trailing, "utf8");
}

/**
 * True only when this process is the host project's own `postinstall` — i.e.
 * launched by the hook we wrote, not typed by a person.
 *
 * All four managers set `npm_lifecycle_event=postinstall` for a project
 * script (verified), while a typed invocation never does: `npx`/`pnpm exec`
 * set it to "npx", a direct node_modules/.bin call leaves it undefined. The
 * second condition — that the script really is ours — stops an unrelated
 * postinstall from inheriting our leniency.
 */
function isLifecycleHook() {
  if (process.env.npm_lifecycle_event !== "postinstall") return false;
  const located = locateCandidates();
  for (const start of located.candidates) {
    const root = findNearestPackageRoot(start);
    if (!root || (located.ownRoot && root === located.ownRoot)) continue;
    const pkg = readJson(path.join(root, "package.json"));
    const script = pkg && pkg.scripts && pkg.scripts.postinstall;
    if (typeof script === "string" && HOOK_RE.test(script)) return true;
  }
  return false;
}

/**
 * Add the activation hook to the host package.json, idempotently.
 *
 * Never overwrites an existing postinstall — it is chained after ours — and
 * records the pristine original beside the config backup so `restore` can
 * put it back exactly rather than restoring a whole stale package.json.
 *
 * @returns {boolean} whether anything was written
 */
/**
 * Install the self-activation hook in the project that owns the config, and in
 * the install root when those differ.
 *
 * In a monorepo the lifecycle actually runs at the root: that is where
 * `npm install` / `yarn` execute scripts and where the blazefire dependency is
 * declared. A hook left only in a workspace child is dead in a very common
 * layout — a root that declares `pnpm-workspace.yaml` but no
 * `package.json#workspaces` is invisible to yarn and npm, so they never run the
 * child's script and "self-activating" would silently not be true.
 */
function hookBoth(configRoot, installRoot) {
  const wrote = ensureHook(configRoot);
  if (installRoot && installRoot !== configRoot) ensureHook(installRoot);
  return wrote;
}

function ensureHook(projectRoot) {
  // Writing a hook under an explicit opt-out would defeat the opt-out on the
  // very next install, so skip it entirely.
  if (process.env.BLAZEFIRE_SKIP_AUTO) return false;

  const file = path.join(projectRoot, "package.json");
  const pkg = readJson(file);
  if (!pkg) return false;
  if (!hasBlazefire(projectRoot, pkg)) return false;

  const scripts = pkg.scripts || {};
  const existing = scripts.postinstall;
  if (typeof existing === "string" && HOOK_RE.test(existing)) return false; // already ours

  const record = path.join(projectRoot, BACKUP_DIR, HOOK_RECORD);
  try {
    if (!fs.existsSync(record)) {
      fs.mkdirSync(path.join(projectRoot, BACKUP_DIR), { recursive: true });
      fs.writeFileSync(
        record,
        JSON.stringify(
          {
            existed: typeof existing === "string",
            value: typeof existing === "string" ? existing : null,
          },
          null,
          2
        ) + "\n",
        "utf8"
      );
    }
  } catch (_) {
    // The record is what makes this reversible; without it, do not touch.
    return false;
  }

  pkg.scripts = scripts;
  scripts.postinstall = existing ? HOOK_COMMAND + " && " + existing : HOOK_COMMAND;
  writeJsonPreserving(file, pkg);
  say(
    'added "postinstall": ' +
      JSON.stringify(scripts.postinstall) +
      " — future installs will self-activate"
  );
  return true;
}

/** Undo {@link ensureHook}. @returns {boolean} whether there was a record */
function undoHook(projectRoot) {
  const record = path.join(projectRoot, BACKUP_DIR, HOOK_RECORD);
  const saved = readJson(record);
  if (!saved) return false;

  const file = path.join(projectRoot, "package.json");
  const pkg = readJson(file);
  const scripts = pkg && pkg.scripts;
  const current = scripts && scripts.postinstall;

  // Only ever remove a script that is recognisably ours; if the user
  // replaced it, it is theirs now and the record is stale.
  if (typeof current === "string" && HOOK_RE.test(current)) {
    if (saved.existed) scripts.postinstall = saved.value;
    else delete scripts.postinstall;
    writeJsonPreserving(file, pkg);
    say("restored \"scripts.postinstall\"" + (saved.existed ? "" : " (removed the Blazefire hook)"));
  }

  try {
    fs.unlinkSync(record);
  } catch (_) {
    /* already gone */
  }
  return true;
}

function activate(projectRoot, configPath, original) {
  const result = rewrite(original);
  if (!result.ok) {
    say("could not auto-edit " + path.basename(configPath) + " (" + result.reason + ").");
    say("paste this in manually instead:");
    say(SNIPPET.split("\n").join("\n         "));
    return;
  }

  const saved = backup(configPath, original, projectRoot);
  fs.writeFileSync(configPath, result.code, "utf8");
  noteGitignore(projectRoot);

  say(
    "activated " +
      path.basename(configPath) +
      " — original saved to " +
      path.relative(projectRoot, saved).split(path.sep).join("/")
  );
}

function locateCandidates() {
  // Our own package root: the nearest package.json above this file. A
  // candidate may never resolve back to it, so we can never edit ourselves.
  // It can legitimately be null (e.g. running cli.cjs straight from a
  // temp dir), in which case cwd alone decides.
  const ownRoot = findNearestPackageRoot(__dirname);

  // __dirname alone is not trustworthy: with a symlinked `file:` install node
  // resolves to the real package path, which can sit anywhere. npm/yarn both
  // publish where the install was started (INIT_CWD), npm publishes the
  // install root, and cwd is what yarn uses for lifecycle scripts — and what
  // `npx blazefire init` runs from.
  const candidates = [
    process.env.INIT_CWD,
    process.env.npm_config_local_prefix,
    process.cwd(),
    ownRoot && path.dirname(ownRoot),
  ].filter(Boolean);

  return { ownRoot, candidates };
}

/**
 * Wire the activation into the nearest recognised project.
 *
 * @param {{cli?: boolean}} [opts] `cli` reports every outcome and relaxes the
 *   installed-next guard — a user typing `npx blazefire init` has said what
 *   they want, so a declared-but-not-yet-installed `next` is enough.
 * @returns {'activated'|'already'|'manual'|'not-found'} outcome for callers
 *   that need an exit code. The postinstall path deliberately ignores it and
 *   always exits 0.
 */
function run(opts) {
  const cli = !!(opts && opts.cli);
  // Opt-out covers both paths: the plain postinstall, and the hook (which is
  // a CLI invocation but still "auto", so honouring it here is what keeps
  // BLAZEFIRE_SKIP_AUTO=1 true for the life of the project).
  if (process.env.BLAZEFIRE_SKIP_AUTO && (!cli || isLifecycleHook())) return "not-found";

  const located = locateCandidates();
  const { ownRoot, candidates } = located;

  const seen = new Set();
  let sawConfig = null;
  let declaredNext = false;

  for (const start of candidates) {
    const projectRoot = findNearestPackageRoot(start);
    if (!projectRoot || (ownRoot && projectRoot === ownRoot) || seen.has(projectRoot)) continue;
    seen.add(projectRoot);

    // The project holding the Next config is often a workspace *child*: an
    // installer run at a monorepo root almost never has the app beside it.
    const roots = [projectRoot].concat(
      findWorkspaceProjects(projectRoot).filter((dir) => !seen.has(dir))
    );

    for (const root of roots) {
      seen.add(root);

      const pkg = readJson(path.join(root, "package.json"));
      const configPath = findConfig(root);
      if (configPath && !sawConfig)
        sawConfig = { projectRoot: root, installRoot: projectRoot, configPath };

      if (declaresNext(pkg)) declaredNext = true;
      if (!configPath) continue;

      const original = fs.readFileSync(configPath, "utf8");
      if (original.includes(MARKER)) {
        // Already wired, but the hook may not be: the config could have been
        // activated by our own postinstall on an earlier npm/yarn install.
        hookBoth(root, projectRoot);
        if (cli) say("already active — " + path.basename(configPath) + " is wired up.");
        return "already";
      }

      // Only ever write where `next` is genuinely installed.
      const hasInstalledNext = fs.existsSync(path.join(root, "node_modules", "next"));
      if (!hasInstalledNext && !(cli && declaresNext(pkg))) continue;

      activate(root, configPath, original);
      hookBoth(root, projectRoot);
      return "activated";
    }
  }

  // The config is there but `next` is not installed yet — almost always an
  // install that simply hasn't run. Activation has to wait, but the *hook*
  // does not: this run arrived first, so wiring it here is what lets the next
  // install (the one that brings `next`) finish the job by itself instead of
  // asking the user to run anything by hand.
  if (sawConfig) {
    hookBoth(sawConfig.projectRoot, sawConfig.installRoot);
    say("found " + path.basename(sawConfig.configPath) + " but node_modules/next is missing — skipped.");
    say("the next install will activate it automatically, or run: npx blazefire init");
    return "manual";
  }
  if (declaredNext) {
    say("this looks like a Next.js project but there is no next.config.* — add:");
    say(SNIPPET.split("\n").join("\n         "));
    return "manual";
  }
  if (cli) {
    say("no next.config.* found from " + process.cwd() + " — run this in your project root, or add:");
    say(SNIPPET.split("\n").join("\n         "));
  }
  return "not-found";
}

/**
 * Undo activation by copying `Blazefire Backup/` back over the config.
 *
 * @returns {number} process exit code
 */
function restore() {
  const located = locateCandidates();
  if (!located) return 1;
  const { ownRoot, candidates } = located;

  const seen = new Set();
  for (const start of candidates) {
    const projectRoot = findNearestPackageRoot(start);
    if (!projectRoot || projectRoot === ownRoot || seen.has(projectRoot)) continue;
    seen.add(projectRoot);

    // Same workspace descent as run(): a backup written into a workspace
    // child has to be reachable from the monorepo root too.
    const roots = [projectRoot].concat(
      findWorkspaceProjects(projectRoot).filter((dir) => !seen.has(dir))
    );

    let restored = 0;
    for (const root of roots) {
      seen.add(root);

      const backupRoot = path.join(root, BACKUP_DIR);
      if (fs.existsSync(backupRoot)) {
        for (const name of CONFIG_NAMES) {
          const saved = path.join(backupRoot, name);
          if (!fs.existsSync(saved)) continue;
          fs.copyFileSync(saved, path.join(root, name));
          say("restored " + name + " from " + BACKUP_DIR + "/");
          restored += 1;
        }
      } else if (root !== projectRoot) {
        continue; // a workspace child with no backup holds nothing of ours
      }

      // The hook is part of "what Blazefire changed" — leaving it behind would
      // re-activate the config on the next install. The install root gets one
      // even though its backup lives in the child, so undo it regardless of
      // whether this particular root holds a backup directory.
      if (undoHook(root)) restored += 1;
    }
    if (restored > 0) return 0;
  }

  say("no backups in " + BACKUP_DIR + "/ — nothing to restore.");
  return 1;
}

if (require.main === module) {
  try {
    run();
  } catch (error) {
    // A postinstall must never fail someone's install — and an error thrown
    // in a `finally` would escape this handler and abort it, so there isn't one.
    say("auto-activation skipped: " + (error && error.message ? error.message : error));
    process.exitCode = 0;
  }
}

module.exports = {
  run,
  restore,
  plan,
  rewrite,
  findConfig,
  isLifecycleHook,
  ensureHook,
  undoHook,
  SNIPPET,
  BACKUP_DIR,
  MARKER,
  HOOK_COMMAND,
};
