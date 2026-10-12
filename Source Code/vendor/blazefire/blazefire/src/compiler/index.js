/**
 * Blazefire Frostfast Compiler Entry Point (JS)
 */

export var COMPILER_VERSION = '1.0.0';

export function createCompiler(config) {
  config = config || {};
  var defaults = {
    target: 'es2020',
    module: 'es6',
    jsx: 'react-jsx',
    strict: true,
  };

  var merged = Object.assign({}, defaults, config);

  return {
    config: merged,
    version: COMPILER_VERSION,
    compile: function (code) {
      return Promise.resolve({ code: code, error: null });
    },
  };
}
