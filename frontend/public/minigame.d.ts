/* tslint:disable */
/* eslint-disable */
export class VoxelWorld {
  free(): void;
  get_block_at(wx: number, wy: number, wz: number): number;
  chunks_loaded(): number;
  constructor(seed: number);
  raycast(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, max_dist: number): Float32Array;
  get_mesh(): Float32Array;
  set_block(wx: number, wy: number, wz: number, block: number): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_voxelworld_free: (a: number, b: number) => void;
  readonly voxelworld_chunks_loaded: (a: number) => number;
  readonly voxelworld_get_block_at: (a: number, b: number, c: number, d: number) => number;
  readonly voxelworld_get_mesh: (a: number, b: number) => void;
  readonly voxelworld_new: (a: number) => number;
  readonly voxelworld_raycast: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
  readonly voxelworld_set_block: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_export_0: (a: number, b: number, c: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
