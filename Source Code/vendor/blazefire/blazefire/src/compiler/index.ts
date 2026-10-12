/**
 * Blazefire Frostfast Compiler Entry Point
 */

export interface CompilerConfig {
  target?: string;
  module?: string;
  jsx?: string;
  strict?: boolean;
}

export const COMPILER_VERSION = '1.0.0';

export function createCompiler(config: CompilerConfig = {}) {
  const defaults: CompilerConfig = {
    target: 'es2020',
    module: 'es6',
    jsx: 'react-jsx',
    strict: true,
  };

  return {
    config: { ...defaults, ...config },
    version: COMPILER_VERSION,
    async compile(code: string) {
      return { code, error: null };
    },
  };
}
