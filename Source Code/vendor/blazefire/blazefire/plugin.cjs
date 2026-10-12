/**
 * Blazefire next.config plugin
 *
 * Activates Blazefire branding for any Next.js project with a single line:
 *
 *   // next.config.js
 *   const blazefire = require('blazefire/plugin')
 *   module.exports = blazefire({ /* options *\/ })
 *
 * Or, when the project already has a config it cares about, wrap it:
 *
 *   // next.config.ts
 *   export default blazefire(nextConfig)
 *
 * Wrapping merges instead of replaces, so an existing `headers()`,
 * `rewrites()`, `turbopack.root` and friends all survive.
 *
 * All branding content lives in this package. Nothing in the user's project
 * is modified, and node_modules is never patched.
 */

'use strict'

const path = require('path')
const { BLAZEFIRE_BRANDING } = require('./branding.cjs')

const DEFAULTS = {
  // Branding toggles
  theme: true, // inject cyberpunk/OLED CSS into the document
  headers: true, // X-Powered-By / X-Compiler
  overlay: true, // rebrand the dev overlay (best effort)
  poweredBy: 'Blazefire Framework',
  compiler: 'Frostfast v1.0.0',
  version: 'v1.0.0',
}

/**
 * Activate Blazefire branding.
 *
 * Three call shapes:
 *
 *   blazefire(nextConfig)                  // wrap an existing config
 *   blazefire(nextConfig, { theme: false }) // wrap it, override options
 *   blazefire({ theme: false })            // no existing config to wrap
 *
 * The first argument is treated as an existing Next config only when it
 * actually looks like one. That matters: real projects already define
 * `headers()`, `rewrites()` and `turbopack{}`, and returning our config
 * *instead* of theirs would silently delete their security headers and
 * turbopack root. Everything they wrote is preserved and ours is merged in.
 *
 * @param {Partial<typeof DEFAULTS> | import('next').NextConfig} [first]
 * @param {Partial<typeof DEFAULTS>} [second]
 * @returns {import('next').NextConfig}
 */
function blazefire(first = {}, second) {
  // Next's config export may itself be a function — sync or async:
  //   module.exports = (phase, { defaultConfig }) => ({ ... })
  // It has to be handled before the object path below, because a function has
  // no own enumerable keys: `isNextConfig(fn)` is false and `{...fn}` is `{}`,
  // which would silently REPLACE the user's whole config with ours.
  // Next resolves it via normalizeConfig(), which calls it with
  // (phase, { defaultConfig }) and awaits the result — so returning an async
  // wrapper here is safe.
  if (typeof first === 'function') {
    const userConfig = first
    const ours = buildConfig({ ...DEFAULTS, ...(second || {}) })
    return async function blazefireWrappedConfig(phase, ctx) {
      const base = await userConfig(phase, ctx)
      return mergeConfigs(base && typeof base === 'object' ? base : {}, ours)
    }
  }

  const baseIsConfig = isNextConfig(first)
  const base = baseIsConfig ? first : {}
  const options = { ...DEFAULTS, ...(baseIsConfig ? (second || {}) : first) }

  return mergeConfigs(base, buildConfig(options))
}

/**
 * @param {Partial<typeof DEFAULTS>} opts
 * @returns {import('next').NextConfig}
 */
function buildConfig(opts) {
  return {
    // Next sets `X-Powered-By: Next.js` unconditionally in sendRenderResult()
    // AFTER custom headers() are applied, which would clobber ours. Disabling
    // it lets the headers() entry below stand on its own.
    poweredByHeader: false,

    // ---- 1. HTTP identity (works on webpack AND turbopack) ----
    ...(opts.headers && {
      headers: async () => [
        {
          source: '/:path*',
          headers: [
            { key: 'X-Powered-By', value: opts.poweredBy },
            { key: 'X-Compiler', value: opts.compiler },
          ],
        },
      ],
    }),

    // ---- 2. Build-time flag so runtime code can detect Blazefire ----
    env: {
      NEXT_PUBLIC_BLAZEFIRE: 'true',
      NEXT_PUBLIC_BLAZEFIRE_VERSION: opts.version,
      NEXT_PUBLIC_BLAZEFIRE_COMPILER: 'frostfast',
    },

    // ---- 3. Client-side theme injection (webpack builds) ----
    webpack(config, ctx) {
      if (opts.theme && !ctx.isServer) {
        const runtime = path.join(__dirname, 'runtime', 'inject.cjs')
        for (const name of Object.keys(config.entry)) {
          config.entry[name] = runtime
        }
      }
      return config
    },

    // ---- 4. Turbopack: config schema has no `entry` key (it is a
    //         strictObject of rules/resolveAlias/resolveExtensions/root/
    //         debugIds/ignoreIssue/chunkLoadingGlobal only), and Next
    //         specifies its client entry as a relative filesystem path, so
    //         resolveAlias never matches. `rules` matches by path glob and
    //         accepts webpack loaders — that's our injection vector. ----
    turbopack: {
      rules: buildTurbopackRules(opts),
    },
  }
}

/**
 * Is this argument an existing Next config rather than our own options bag?
 *
 * Discriminated on the keys a config has that our options never do. `headers`
 * alone is ambiguous — it is a boolean for us and a function/array for Next —
 * so it only counts as a config marker in its Next form.
 *
 * @param {unknown} x
 * @returns {boolean}
 */
function isNextConfig(x) {
  if (!x || typeof x !== 'object') return false

  const next = /** @type {Record<string, unknown>} */ (x)

  if (typeof next.headers === 'function' || Array.isArray(next.headers)) return true
  if (typeof next.rewrites === 'function') return true
  if (typeof next.redirects === 'function') return true
  if (typeof next.webpack === 'function') return true

  // Present-only keys
  return (
    next.turbopack !== undefined ||
    next.experimental !== undefined ||
    next.images !== undefined ||
    next.env !== undefined ||
    next.output !== undefined ||
    next.typescript !== undefined ||
    next.eslint !== undefined ||
    next.poweredByHeader !== undefined ||
    next.basePath !== undefined ||
    next.assetPrefix !== undefined ||
    next.reactStrictMode !== undefined ||
    // Next's own `compiler` is an object; ours is a version string
    (next.compiler !== undefined && typeof next.compiler === 'object')
  )
}

/**
 * Merge our branding into a config the project already wrote.
 *
 * Rules, in priority order:
 *  - scalars: ours wins, EXCEPT nothing can opt back into Next's
 *    `X-Powered-By: Next.js`, which is stamped after headers() and would
 *    overwrite ours;
 *  - `headers()` / `redirects()` style arrays: concatenate, never replace;
 *  - `turbopack`: shallow-merge so their `root`/`resolveAlias` survive
 *    alongside our `rules`;
 *  - `webpack`: chain, so their transforms still run;
 *  - everything else (rewrites, images, experimental...): untouched.
 *
 * @param {import('next').NextConfig} base
 * @param {import('next').NextConfig} ours
 * @returns {import('next').NextConfig}
 */
function mergeConfigs(base, ours) {
  if (!base || Object.keys(base).length === 0) return ours

  const out = { ...base, ...ours }

  // Our env vars layer on top of theirs rather than replacing them.
  out.env = { ...(base.env || {}), ...(ours.env || {}) }

  // Both sets of headers must reach the wire.
  if (base.headers || ours.headers) {
    out.headers = concatListProviders(base.headers, ours.headers)
  }

  // Shallow-merge so `turbopack.root` (etc.) survives; only `rules` needs a
  // deeper merge because both sides may define globs.
  if (base.turbopack || ours.turbopack) {
    out.turbopack = {
      ...(base.turbopack || {}),
      ...(ours.turbopack || {}),
      rules: {
        ...((base.turbopack && base.turbopack.rules) || {}),
        ...((ours.turbopack && ours.turbopack.rules) || {}),
      },
    }
  }

  // Chain webpack hooks — theirs runs first, ours prepends the entry last so
  // the branding entry sits in front of application code.
  if (base.webpack && ours.webpack) {
    const oursWebpack = ours.webpack
    out.webpack = (config, ctx) => {
      const afterBase = base.webpack(config, ctx)
      return oursWebpack(afterBase == null ? config : afterBase, ctx)
    }
  }

  return out
}

/**
 * Combine two `headers()`-style providers (either an array or a function
 * returning one) into a single provider yielding both lists.
 *
 * @param {unknown} a
 * @param {unknown} b
 * @returns {unknown}
 */
function concatListProviders(a, b) {
  if (!a) return b
  if (!b) return a

  return async () => {
    const [x, y] = await Promise.all([
      typeof a === 'function' ? a() : a,
      typeof b === 'function' ? b() : b,
    ])
    return [...(Array.isArray(x) ? x : []), ...(Array.isArray(y) ? y : [])]
  }
}

/**
 * Prepends a side-effect import of the Blazefire runtime to Next's client
 * bootstrap so the theme is registered before any application code runs.
 *
 * Matches the bootstrap by glob rather than by import specifier because
 * Next passes it as `./next/dist/client/app-next.js` (a relative path from
 * the project root), which alias keys never match.
 *
 * @param {object} opts
 * @returns {Record<string, Array<{loader: string, options: object}>>}
 */
function buildTurbopackRules(opts) {
  if (!opts.theme) return {}

  const loader = path.join(__dirname, 'runtime', 'turbopack-loader.cjs')
  const inject = path.join(__dirname, 'runtime', 'inject.cjs')

  // Covers dev (next-dev.js / app-next-dev.js) and prod (next.js / app-next.js)
  // across both the pages and app routers. Turbopack globs are matched against
  // absolute paths, hence the `**/` prefix.
  const targets = [
    '**/next/dist/client/app-next*.js',
    '**/next/dist/client/next*.js',
  ]

  const rules = {}
  for (const glob of targets) {
    rules[glob] = [{ loader, options: { injectPath: inject } }]
  }
  return rules
}

module.exports = blazefire
module.exports.blazefire = blazefire
module.exports.branding = BLAZEFIRE_BRANDING
module.exports.DEFAULTS = DEFAULTS
module.exports.isNextConfig = isNextConfig
module.exports.mergeConfigs = mergeConfigs
