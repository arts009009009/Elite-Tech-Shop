/**
 * Blazefire Turbopack injection loader
 *
 * Turbopack's next.config schema is a strictObject with NO `entry` key, so a
 * config plugin cannot prepend a client entry the way it can with webpack.
 * `resolveAlias` also fails here because Next specifies its client entry as a
 * relative filesystem path (./next/dist/client/app-next.js), which never
 * matches an npm-specifier alias key.
 *
 * `turbopack.rules` DOES match by path glob and accepts webpack loaders, so we
 * use it to prepend a single side-effect import of the Blazefire runtime to
 * Next's client bootstrap. Injecting once at the entry means the theme is
 * registered before any application code runs.
 *
 * Loaders must be synchronous and return a string or a Source object.
 */

'use strict'

const path = require('path')

const MARKER = 'blazefire-injected'

/**
 * @param {string} source original file contents
 * @returns {string} source with the Blazefire runtime import prepended
 */
function blazefireLoader(source) {
  // Idempotency: never inject twice (HMR may re-run the loader).
  if (typeof source === 'string' && source.includes(MARKER)) return source

  const options = this.getOptions ? this.getOptions() : {}
  const injectPath = options.injectPath

  if (!injectPath) return source

  // Turbopack resolves from the project root and rejects absolute paths
  // outside it (it rewrites "/a/b" to "./a/b"). Emitting a path relative to
  // the file being transformed keeps resolution inside the module graph and
  // works whether blazefire is linked or installed under node_modules.
  const from = this.resourcePath ? path.dirname(this.resourcePath) : process.cwd()
  let rel = path.relative(from, injectPath).replace(/\\/g, '/')
  if (!rel.startsWith('.')) rel = './' + rel

  const statement = `require(${JSON.stringify(rel)}); /* ${MARKER} */\n`
  return statement + source
}

module.exports = blazefireLoader
