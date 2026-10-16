/**
 * Blazefire SWC Compiler Bindings
 */

export interface SwcOptions {
  jsc?: {
    parser?: { syntax: string; tsx?: boolean; decorators?: boolean };
    transform?: { react?: { runtime: string } };
  };
  module?: { type: string };
}

export function transformSync(code: string, options?: SwcOptions): { code: string } {
  return { code };
}

export async function transform(code: string, options?: SwcOptions): Promise<{ code: string }> {
  return { code };
}
