/**
 * Blazefire Frostfast Compiler Entry Point
 */
export const COMPILER_VERSION = '1.0.0';
function mergeDeep(base, override = {}) {
    const merged = { ...base };
    for (const [key, value] of Object.entries(override)) {
        if (value === undefined || value === null)
            continue;
        const current = merged[key];
        if (current && typeof current === 'object' && !Array.isArray(current) && value && typeof value === 'object' && !Array.isArray(value)) {
            merged[key] = mergeDeep(current, value);
        }
        else {
            merged[key] = value;
        }
    }
    return merged;
}
export function createCompiler(config = {}) {
    const defaults = {
        target: 'es2020',
        module: 'es6',
        jsx: 'react-jsx',
        strict: true,
    };
    return {
        config: mergeDeep(defaults, config),
        version: COMPILER_VERSION,
        async compile(code) {
            return { code, error: null };
        },
    };
}
