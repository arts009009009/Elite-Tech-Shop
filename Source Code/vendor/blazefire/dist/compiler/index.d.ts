/**
 * Blazefire Frostfast Compiler Entry Point
 */
export interface CompilerConfig {
    target?: string;
    module?: string;
    jsx?: string;
    strict?: boolean;
}
export declare const COMPILER_VERSION = "1.0.0";
export declare function createCompiler(config?: CompilerConfig): {
    config: CompilerConfig;
    version: string;
    compile(code: string): Promise<{
        code: string;
        error: null;
    }>;
};
