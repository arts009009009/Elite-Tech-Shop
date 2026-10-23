# Blazefire Framework Bug Report — Fix All Issues Below

You are working on the Blazefire framework (vendored at `Source Code/vendor/blazefire/`, published as package `blazefire`). Fix every bug listed below. Do NOT change the app in `Source Code/frontend/` — fix the framework so the app works. Each item was verified by inspection; fix them all.

## 1. `plugin.cjs` webpack injection is a silent no-op
The webpack plugin function does `config.entry = ...` to inject Blazefire's entry files. However, in modern Next.js `config.entry` is an **async function** — assigning a plain object/array silently never runs, so the client entry (`BlazefireDevTools`, error overlay, etc.) is never bundled. Worse, if the assignment did take effect it would **replace** all of Next's entries instead of merging. Fix: call the existing `entry()` if it's a function and prepend the Blazefire entries to each resulting entrypoint, preserving everything else.

## 2. Two conflicting package installs fight over `next.config.ts`
The repo root `package.json` depends on `blazefire` from GitHub (`github:arts009009009/Blazefire`, v1.0.9) while `Source Code/frontend/package.json` depends on the vendored copy (`file:../vendor/blazefire`, v1.0.0). Both declare a `postinstall` that runs `blazefire init`, so installs alternate between two versions rewriting `frontend/next.config.ts` with different plugin shapes. Fix on the framework side: make `blazefire init` idempotent and version-aware (detect an existing Blazefire block in `next.config.ts` and update it in place rather than re-appending/regenerating), and document that only one copy should be installed. Do not remove the root dependency from the repo.

## 3. Vendored package hard-depends on `react ^19` → duplicate React
`vendor/blazefire/package.json` lists `react`/`react-dom` in `dependencies` with `^19`. When the frontend (React 19.2.8) is installed, npm/yarn nests a **second** React (19.3.0) inside `node_modules/blazefire/node_modules/react`, producing the dual-React hook-invalidation trap ("Cannot read properties of null (reading 'useContext')" etc.) whenever framework components run in the app's React tree. Fix: move `react`, `react-dom`, `next` to `peerDependencies` (with sensible `peerDependenciesMeta`), and keep only truly private deps in `dependencies`.

## 4. `src/index.ts` contains JSX but is a `.ts` file and is the `types` entry
- `blazefire/src/index.ts` contains JSX syntax; `.ts` cannot parse JSX, so the declared `build` script (`tsc`) fails. There is also no `tsconfig.json` in the package.
- `package.json#types` points at the **raw source** (`src/index.ts`) instead of a generated `.d.ts`. Consumers get broken/incomplete types, and TS tries to parse JSX in a `.ts` file.
Fix: rename to `.tsx` (or configure `jsx` in a proper `tsconfig.json`), add the tsconfig, make `build` emit `dist/`, and point `main`, `module`, and `types` at the built artifacts.

## 5. `postinstall.cjs` `statementEnd` corrupts semicolon-less configs
`statementEnd(src)` is supposed to return the index after the first top-level statement; when the source contains no depth-0 `;` it returns `src.length`, so any config written without semicolons gets spliced at the very end — appending the Blazefire import/plugin lines **after** the last expression, producing invalid/incorrectly-ordered JavaScript. Fix: track the true end of the first statement (respecting strings, template literals, comments, and bracket depth) and return that index; add a fallback for semicolon-less sources.

## 6. `HOOK_RE` over-matches and `undoHook` can delete the user's own postinstall
- The hook detection regex `/\bblazefire\b[\s\S]*\binit\b/` matches across the whole file: any `package.json` whose `postinstall` mentions "blazefire" anywhere before an unrelated "init" (or mentions both words in different scripts) is treated as "already hooked", and, conversely, unrelated scripts can be misclassified.
- `undoHook` removes the matched script, which can delete a **user-authored** `postinstall` that merely references blazefire.
Fix: match only within the `postinstall` (and related lifecycle) script values, use an anchored pattern like `/(^|&&|;)\s*npx\s+blazefire\s+init\b/`, and only strip the Blazefire portion of a chained command, never the whole script.

## 7. Hook chaining lacks parentheses around the user's script
When appending, the code does something equivalent to `postinstall: "user script && npx blazefire init"`. If the user's script contains `||` (e.g. `"build || true"`), shell precedence makes the Blazefire call part of the right-hand side of the `||` and it may never run (or run at the wrong time). Fix: wrap the existing script in parentheses before chaining: `postinstall: "(<existing>) && npx blazefire init"`.

## 8. Vendored `data/navbar-translate.json` is a stale fork
The vendored package ships `data/navbar-translate.json` containing a **flat-key** translation object, while consumers use the **nested** per-language structure (`{ en: {...}, ar: {...}, ... }`). Anything importing the vendored file gets keys like `"Products"` instead of `en.Products`. Fix: update the vendored file to the nested structure (same schema the app's `frontend/data/navbar-translate.json` uses) or remove the unused copy and export the canonical file.

## 9. `BlazefireErrorOverlay.tsx` missing `position: 'relative'`
The overlay's root element has absolutely-positioned children (dismiss buttons, corner badges) but the root style lacks `position: 'relative'`, so those children anchor to the nearest positioned ancestor (often the whole viewport), landing outside the overlay. Fix: add `position: 'relative'` to the overlay container.

## 10. `BlazefireDevTools` renders nothing when open
The DevTools component returns `null` in its "open" state (the render branch is missing/empty), so toggling it has no visible effect. Fix: render the panel (version info, links, actions) when open.

## 11. `inject.cjs` MutationObserver is un-debounced and observes the full document
The dev-time DOM injector attaches a `MutationObserver` to `document` with no debounce and no subtree filtering, so every DOM mutation (including React re-renders and animation frames) triggers synchronous re-scan work — measurable jank in dev. Fix: debounce the callback (e.g. ~100ms via `requestAnimationFrame`/timeout), and scope observation to `document.body`'s relevant subtrees.

## 12. README documents non-existent exports and a squatable install name
The README tells users to import `BlazefireLogo`, `BlazefireErrorOverlay`, `FROSTFAST_VERSION`, and to import `blazefire-dark-theme.css` — none of which are exported by the package. It also suggests `npm install blazefire`, which installs a **different, unrelated package** from npm rather than this framework. Fix: remove or correct the export examples to match the actual public API, and change the install instructions to the real source (the vendored `file:` path / GitHub spec), noting the npm name is squatted.

## 13. `package.json#types` points at raw source, not `.d.ts`
(Same root cause as #4, tracked separately because it's a packaging fix.) Ensure `types`/`exports` point to built declaration files and add an `exports` map with `types`, `import`, and `require` conditions.

## 14. Plugin option spread can pass `version: undefined` into Next `env`
The plugin builds Next's `env` injection by spreading user options, which can include keys with `undefined` values (e.g. `version: undefined`). Next serializes `env` values into the client bundle as the literal string `"undefined"`. Fix: strip `undefined`/`null` values before injecting into `env`.

## 15. `createCompiler` shallow-merge loses nested defaults
`createCompiler(overrides)` does `{ ...defaults, ...overrides }`, so a partial override like `{ errorOverlay: { showStack: false } }` **replaces** the whole nested `errorOverlay` default object, dropping sibling defaults (e.g. `enabled`, `theme`). Fix: deep-merge (at least one level) so partial nested options keep their defaults.

## 16. `BLAZEFIRE_SKIP_AUTO=0` is treated as opted-out
The env check treats any truthy-looking string as "skip", but the code path checks `process.env.BLAZEFIRE_SKIP_AUTO` with a naive truthiness/`!== undefined` test, so explicitly setting `BLAZEFIRE_SKIP_AUTO=0` (meaning "do not skip") still disables the auto-init. Fix: treat only `1`, `true`, `yes` (case-insensitive) as opted-out; `0`/`false`/empty must mean "run normally".

## 17. Theme warning color mismatches branding
`theme.json` warns with `#ffaa00` while the Blazefire branding/accent used everywhere else is `#ff8800`. Pick one (branding `#ff8800`) and use it consistently.

## 18. Turbopack loader silently skips injection without `getOptions`
The Turbopack loader returns early (doing nothing) when `this.getOptions` is unavailable or throws, so under Turbopack the loader silently produces no injection and users get no Blazefire runtime with zero diagnostics. Fix: support Turbopack's loader options API (`this.getOptions()`), and when options are genuinely unavailable, fail loudly with a clear error rather than silently skipping.

## 19. `.yarnrc.yml` has a duplicate `approvedGitRepositories` key
The vendored `.yarnrc.yml` declares `approvedGitRepositories` twice; YAML keeps only the last one, silently dropping the earlier approval entries and breaking installs that rely on them (observed: YN0080 blocking the `ssh://git@github.com/arts009009009/Blazefire.git` fetch even though it looks approved). Fix: merge the duplicate lists into a single key that approves both the https and ssh forms of the repository URL.

## Verification
After fixing, run:
1. `npm run build` (or `npx tsc`) inside `vendor/blazefire` — must succeed and emit `dist/` with `.d.ts` files.
2. `npm install` in `Source Code/frontend` — exactly one React copy in the tree (`npm ls react` shows a single version).
3. Start the frontend dev server and confirm the Blazefire dev client actually loads (dev tools toggle shows the panel; error overlay appears on a thrown error).
4. Run `npx blazefire init` twice in a row on a semicolon-less `next.config.ts` — the file must remain valid and the Blazefire block must appear exactly once.
