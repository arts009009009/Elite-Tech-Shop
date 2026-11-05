/**
 * Blazefire Turbopack Integration
 */
export interface TurbopackConfig {
    entries?: string[];
    output?: string;
}
export declare function createTurbopackBuilder(config?: TurbopackConfig): {
    config: TurbopackConfig;
    build(): Promise<{
        success: boolean;
        errors: never[];
    }>;
};
