/**
 * Blazefire TypeScript Entry Point
 */
import React from 'react';
export interface BlazefireConfig {
    theme?: 'dark' | 'light';
    primaryColor?: string;
    enableGlow?: boolean;
}
export interface CompilerOptions {
    jsc?: {
        parser?: {
            syntax: string;
            tsx?: boolean;
        };
        transform?: {
            react?: {
                runtime: string;
            };
        };
    };
    module?: {
        type: string;
    };
}
export interface CompilerInstance {
    options: CompilerOptions;
    version: string;
    transform(code: string, filename?: string): Promise<{
        code: string;
    }>;
}
export declare const BLAZEFIRE_VERSION = "1.0.0";
export declare const FROSTFAST_VERSION = "1.0.0";
export { BlazefireLogo } from './components/BlazefireLogo';
export { BlazefireDevTools } from './components/BlazefireDevTools';
export { BlazefireErrorOverlay } from './components/BlazefireErrorOverlay';
export declare function insertBlazefireStyles(): void;
export declare function createBlazefireLogo(size?: number): string;
export declare function createCompiler(options?: CompilerOptions): CompilerInstance;
interface BlazefireContextValue {
    version: string;
    compiler: string;
}
export declare function useBlazefire(): BlazefireContextValue;
export interface BlazefireProviderProps {
    children: React.ReactNode;
}
export declare function BlazefireProvider({ children }: BlazefireProviderProps): React.JSX.Element;
declare const Blazefire: {
    version: string;
    createCompiler: typeof createCompiler;
    insertBlazefireStyles: typeof insertBlazefireStyles;
    createBlazefireLogo: typeof createBlazefireLogo;
    BlazefireProvider: typeof BlazefireProvider;
    useBlazefire: typeof useBlazefire;
};
export default Blazefire;
