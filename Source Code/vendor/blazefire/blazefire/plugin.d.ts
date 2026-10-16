import type { NextConfig } from "next";

/**
 * Options that tune Blazefire branding.
 *
 * Every one of these is optional; the values shown are the defaults.
 */
export interface BlazefireOptions {
  /** Inject the cyberpunk/OLED document theme. Default `true`. */
  theme?: boolean;
  /** Emit `X-Powered-By` / `X-Compiler`. Default `true`. */
  headers?: boolean;
  /** Rebrand the dev error overlay. Default `true`. */
  overlay?: boolean;
  /** Value for the `X-Powered-By` header. Default `'Blazefire Framework'`. */
  poweredBy?: string;
  /** Value for the `X-Compiler` header. Default `'Frostfast v1.0.0'`. */
  compiler?: string;
  /** Version surfaced to the runtime. Default `'v1.0.0'`. */
  version?: string;
}

/**
 * Blazefire accepts an existing Next config as its first argument and merges
 * into it rather than replacing it, so `headers()`, `rewrites()`,
 * `turbopack.root`, `experimental` and everything else the project already
 * wrote are preserved.
 */
declare function blazefire(
  first?: BlazefireOptions | NextConfig,
  second?: BlazefireOptions
): NextConfig;

export function isNextConfig(value: unknown): value is NextConfig;

/** Merge Blazefire's branding config into a config the project already wrote. */
export function mergeConfigs(base: NextConfig, ours: NextConfig): NextConfig;

/** The branding values every part of the package reads from. */
export const branding: {
  name: string;
  compiler: string;
  version: string;
  compilerVersion: string;
  headers: { poweredBy: string; compiler: string };
  banner: string;
  colors: Record<string, string>;
  topBarGradient: string;
};

/** Option defaults, useful for reading the effective configuration. */
export const DEFAULTS: Required<BlazefireOptions>;

export { blazefire };
export default blazefire;
