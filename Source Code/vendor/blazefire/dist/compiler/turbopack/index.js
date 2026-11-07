/**
 * Blazefire Turbopack Integration
 */
export function createTurbopackBuilder(config = {}) {
    return {
        config,
        async build() {
            return { success: true, errors: [] };
        },
    };
}
