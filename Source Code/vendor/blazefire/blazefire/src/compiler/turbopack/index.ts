/**
 * Blazefire Turbopack Integration
 */

export interface TurbopackConfig {
  entries?: string[];
  output?: string;
}

export function createTurbopackBuilder(config: TurbopackConfig = {}) {
  return {
    config,
    async build() {
      return { success: true, errors: [] };
    },
  };
}
