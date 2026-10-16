<div align="center">
  <h1>Blazefire</h1>
  <p>Blazefire framework powered by Frostfast compiler</p>
</div>

## Early Showcase of custom error overlay triggered by hydration mismatch
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/91770e1d-d05f-491c-ac95-a4384e5bad44" />

# Blazefire Framework 🔥

Blazefire is a chaos‑driven web framework with custom runtime, overlay branding, and compiler hooks.  
It’s inspired by modern meta‑frameworks like Next.js, but built with its own identity and features.

## Acknowledgements
- [Next.js](https://nextjs.org/) — for pioneering the meta‑framework model and inspiring routing + SSR concepts.
- Frostfast Compiler — powering Blazefire’s runtime speed.
- Community devs who shaped the ecosystem we build on.

## Features

- Cyberpunk/OLED dark theme
- Neon glow effects
- Flame logo with gradient
- Error overlay with custom branding
- DevTools indicator
- Frostfast compiler (SWC + Turbopack)

## Installation

Install straight from GitHub — the package is not published to npm.

```bash
npm install github:arts009009009/Blazefire

# Yarn 1
yarn add github:arts009009009/Blazefire

# Yarn Berry (2+) — name@range is REQUIRED there. The Yarn 1 line above fails
# with: "didn't match the required format (package-name@range)"
yarn add blazefire@github:arts009009009/Blazefire

pnpm add github:arts009009009/Blazefire
bun add  github:arts009009009/Blazefire
```

That is all for npm and Yarn 1. Yarn Berry and pnpm each need one extra
step — see below. Your `next.config.*` is copied
to `Blazefire Backup/` and its export is wrapped with `blazefire()` — and
activation writes this into your `package.json`:

```json
"postinstall": "blazefire init || echo blazefire skipped"
```

A project's own scripts are never blocked, so once that line is committed
**every** package manager self-activates on install, including the ones
below. Commit it alongside the config.

### Yarn Berry (2+)

Berry ships with `enableScripts: false` and an empty git allowlist, so it
runs no dependency install scripts and blocks **every** `github:`
dependency until you opt in. One `.yarnrc.yml` at the project root covers
both gates:

```yaml
nodeLinker: node-modules
enableScripts: true
approvedGitRepositories:
  - "https://github.com/**"
```

Patterns match the resolved HTTPS URL, and `**` is required —
`https://github.com/*` stops one path segment short, and a bare `*` never
matches a URL containing slashes.

Prefer not to enable every dependency's scripts? Drop `enableScripts` and
allow just this package from `package.json`:

```json
{ "dependenciesMeta": { "blazefire": { "built": true } } }
```

Or skip the git allowlist entirely by installing the tarball:

```bash
yarn add blazefire@https://github.com/arts009009009/Blazefire/archive/refs/tags/v1.0.0.tar.gz
```

This is **one-time** setup: once the hook exists in `package.json`,
project scripts always run regardless of `enableScripts`, so later
installs — including a fresh clone — self-activate under stock Berry
defaults.

### pnpm

pnpm installs fine, but skips a *dependency's* build scripts by default, so
the very first install activates nothing. Bootstrap it once:

```bash
pnpm exec blazefire init      # or: pnpm approve-builds, then pnpm install
```

After that the hook takes over and no allowlist is needed. Worth knowing:
an `onlyBuiltDependencies` entry for a git dependency embeds the full commit
SHA, so it quietly stops matching on your next commit — the hook doesn't.

### bun

Same one-time bootstrap — bun blocks untrusted postinstalls:

```bash
bunx blazefire init
```

or allow the package outright in your `package.json`:

```json
"trustedDependencies": ["blazefire"]
```

### Monorepos and workspaces

Installing at the repository root is fine even when the root has no Next.js
config. The installer then looks inside the workspaces you have *declared* —
`package.json#workspaces` (npm, yarn, pnpm) or the `packages:` list in
`pnpm-workspace.yaml` — and activates the one that actually holds a
`next.config.*`:

```text
elite-shop/              blazefire installed here
├── package.json
├── pnpm-workspace.yaml    packages: ["frontend"]
└── frontend/             the app
    ├── next.config.ts      wrapped + copied to frontend/Blazefire Backup/
    └── package.json        receives the self-activation hook
```

The backup and the hook both land beside the app rather than at the root, and
`npx blazefire restore` reaches them from either place. Only declared
workspaces are searched — nothing is found by scanning directories — so the
outcome is deterministic.

### Not supported: Deno

Deno's installer only resolves npm-registry and JSR specifiers, so it drops
`github:` (and `git+https`) dependencies without an error. Use npm, yarn or
pnpm to install, then run `npx blazefire init`.

### Fallback (any manager, incl. `--ignore-scripts`)

```bash
npx blazefire init      # activate
npx blazefire restore   # put the original config back AND remove the hook
```

`init` never exits non-zero when it is running as your `postinstall` — a
deleted `next.config.*` must not be able to brick your install — but it still
exits 1 when you invoke it yourself and finds nothing to do.

Set `BLAZEFIRE_SKIP_AUTO=1` to opt out of auto-activation entirely: no hook
is written, and an existing hook honours the flag too.

## Usage

```jsx
import { BlazefireLogo, BlazefireErrorOverlay } from 'blazefire';
import { insertBlazefireStyles } from 'blazefire/styles';
import { createCompiler } from 'blazefire/compiler';

// Insert styles
insertBlazefireStyles();

// Create compiler instance
const compiler = createCompiler();

// Use components
function App() {
  return (
    <BlazefireErrorOverlay
      errorType="Runtime Error"
      errorMessage="Something went wrong"
      onClose={() => {}}
    />
  );
}
```

## Compiler

The Frostfast compiler provides:

- SWC-based transformations
- Turbopack bundling
- TypeScript/JSX support
- Hot module replacement

```js
import { createCompiler, FROSTFAST_VERSION } from 'blazefire/compiler';

const compiler = createCompiler({
  // Custom options
});

console.log(`Frostfast v${FROSTFAST_VERSION}`);
```

## Components

- `BlazefireLogo` - Flame logo with neon glow
- `BlazefireErrorHeader` - Error overlay header
- `BlazefireErrorOverlay` - Full error overlay
- `BlazefireDevToolsIndicator` - Floating dev tools button

## Styles

Import the CSS files for the full cyberpunk theme:

```css
@import 'blazefire/assets/blazefire-dark-theme.css';
@import 'blazefire/assets/blazefire-global.css';
```

## License

MIT
