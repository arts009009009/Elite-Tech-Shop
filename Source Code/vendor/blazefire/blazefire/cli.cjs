#!/usr/bin/env node
/**
 * `npx blazefire init` / `npx blazefire restore`
 *
 * Fallback for the cases where a postinstall cannot do the job:
 *   - `ignore-scripts=true` (common in CI)
 *   - Yarn Berry with `enableScripts: false`, or PnP (no node_modules)
 *   - the config could not be recognised automatically
 *
 * Same engine as the postinstall — there is deliberately one implementation
 * of the rewrite, not two.
 */
"use strict";

const api = require("./postinstall.cjs");

const HELP = `
Blazefire

  npx blazefire init      wire Blazefire into this project's next.config.*
  npx blazefire restore   put the original back from "Blazefire Backup/"

  Init backs the original up first and never runs twice on the same file.
  If the config shape is not recognised it prints exactly what to paste
  instead of guessing.

  It also writes a "postinstall" hook into your package.json (chaining onto
  any you already have), so pnpm and bun — which refuse to run a dependency's
  own postinstall — still self-activate on every install. "restore" removes
  that hook again.

  Opt out of auto-activation on install with BLAZEFIRE_SKIP_AUTO=1.
`;

const command = (process.argv[2] || "init").toLowerCase();

function bail(message) {
  console.error("  blazefire: " + message);
  process.exitCode = 1;
}

try {
  if (command === "init" || command === "setup" || command === "activate") {
    const status = api.run({ cli: true });
    // Distinguish "did nothing" from "did it" so CI/scripts can react — but
    // only when a person asked. When we are the project's own postinstall,
    // "nothing to do" must exit 0 or a `next.config` deletion would brick
    // every future install.
    if ((status === "manual" || status === "not-found") && !api.isLifecycleHook()) {
      process.exitCode = 1;
    }
  } else if (command === "restore" || command === "revert") {
    process.exitCode = api.restore();
  } else if (command === "--help" || command === "-h" || command === "help") {
    console.log(HELP.trim());
  } else {
    bail('unknown command "' + command + '". Try: npx blazefire init');
  }
} catch (error) {
  bail((error && error.message ? error.message : String(error)) + " — nothing was written.");
  process.exitCode = 1;
}
