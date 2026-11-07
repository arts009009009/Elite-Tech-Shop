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

function mergeDeep<T extends object>(base: T, override: Partial<T> = {} as Partial<T>): T {
  const merged = { ...(base as Record<string, unknown>) } as Record<string, unknown>;
  for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
    if (value === undefined || value === null) continue;
    const current = merged[key];
    if (current && typeof current === 'object' && !Array.isArray(current) && value && typeof value === 'object' && !Array.isArray(value)) {
      merged[key] = mergeDeep(current as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      merged[key] = value;
    }
  }
  return merged as T;
}

export function createCompiler(config: CompilerConfig = {}) {
  const defaults: CompilerConfig = {
    target: 'es2020',
    module: 'es6',
    jsx: 'react-jsx',
    strict: true,
  };

  return {
    config: mergeDeep(defaults, config),
    version: COMPILER_VERSION,
    async compile(code: string) {
      return { code, error: null };
    },
  };
}
