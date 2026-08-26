use wasm_bindgen::prelude::*;

const CS: usize = 16;
const CH: usize = 64;
const WATER: usize = 20;
const NX: usize = 3;
const NZ: usize = 3;
const MAX_BLOCK: u8 = 15;

type Chunk = Vec<Vec<Vec<u8>>>;

#[wasm_bindgen]
pub struct VoxelWorld {
    chunks: Vec<Chunk>,
    seed: u32,
}

#[wasm_bindgen]
impl VoxelWorld {
    #[wasm_bindgen(constructor)]
    pub fn new(seed: u32) -> VoxelWorld {
        let mut world = VoxelWorld {
            chunks: Vec::with_capacity(NX * NZ),
            seed,
        };
        for cx in 0..NX as i32 {
            for cz in 0..NZ as i32 {
                world.gen_chunk(cx, cz);
            }
        }
        world
    }

    fn hash(&self, x: i32, z: i32) -> f64 {
        let n = (x as u64)
            .wrapping_mul(374761393)
            .wrapping_add((z as u64).wrapping_mul(668265263))
            .wrapping_add((self.seed as u64).wrapping_mul(1274126177)) as f64;
        (n.sin() * 43758.5453).fract()
    }

    fn hash3(&self, x: i32, y: i32, z: i32) -> f64 {
        let n = (x as u64)
            .wrapping_mul(374761393)
            .wrapping_add((y as u64).wrapping_mul(668265263))
            .wrapping_add((z as u64).wrapping_mul(1274126177))
            .wrapping_add((self.seed as u64).wrapping_mul(2654435761)) as f64;
        (n.sin() * 43758.5453).fract()
    }

    fn noise(&self, x: f64, z: f64) -> f64 {
        let ix = x.floor() as i32;
        let iz = z.floor() as i32;
        let fx = x - ix as f64;
        let fz = z - iz as f64;
        let sx = fx * fx * (3.0 - 2.0 * fx);
        let sz = fz * fz * (3.0 - 2.0 * fz);
        let n00 = self.hash(ix, iz);
        let n10 = self.hash(ix + 1, iz);
        let n01 = self.hash(ix, iz + 1);
        let n11 = self.hash(ix + 1, iz + 1);
        let nx0 = n00 * (1.0 - sx) + n10 * sx;
        let nx1 = n01 * (1.0 - sx) + n11 * sx;
        nx0 * (1.0 - sz) + nx1 * sz
    }

    fn gen_chunk(&mut self, cx: i32, cz: i32) {
        let mut chunk: Chunk = vec![vec![vec![0u8; CS]; CH]; CS];
        let mut tree_positions: Vec<(i32, i32)> = Vec::new();

        for x in 0..CS {
            for z in 0..CS {
                let wx = cx * CS as i32 + x as i32;
                let wz = cz * CS as i32 + z as i32;
                let mut h = self.noise(wx as f64 * 0.01, wz as f64 * 0.01) * 20.0;
                h += self.noise(wx as f64 * 0.05, wz as f64 * 0.05) * 8.0;
                h += self.noise(wx as f64 * 0.1, wz as f64 * 0.1) * 3.0;
                let ht = ((h + 25.0) as usize).min(CH - 1);

                for y in 0..CH {
                    let block = if y == 0 {
                        4 // bedrock
                    } else if y < ht.saturating_sub(4) {
                        let h3 = self.hash3(wx, y as i32, wz);
                        if h3 < 0.02 { 9 }       // coal
                        else if h3 < 0.03 { 10 }  // iron
                        else if h3 < 0.035 { 11 }  // gold
                        else if y < 12 && h3 < 0.038 { 12 } // diamond
                        else { 3 } // stone
                    } else if y < ht.saturating_sub(1) {
                        if ht <= WATER + 2 { 8 } else { 2 }
                    } else if y == ht.saturating_sub(1) {
                        if ht <= WATER + 2 { 6 } else { 1 }
                    } else if y < WATER {
                        7
                    } else {
                        0
                    };
                    chunk[x][y][z] = block;
                }

                if ht > WATER + 2 {
                    let tv = self.hash(wx, wz + 1000);
                    if tv < 0.04 {
                        tree_positions.push((wx, wz));
                    }
                }
            }
        }

        for (tx, tz) in &tree_positions {
            let lx = tx.rem_euclid(CS as i32) as usize;
            let lz = tz.rem_euclid(CS as i32) as usize;
            let mut top_y = 0usize;
            for y in (0..CH).rev() {
                if chunk[lx][y][lz] == 1 {
                    top_y = y;
                    break;
                }
            }
            if top_y == 0 || top_y + 6 >= CH {
                continue;
            }
            let trunk_h = 4 + (self.hash(*tx, *tz * 7) * 3.0) as usize;
            for dy in 0..trunk_h {
                chunk[lx][top_y + 1 + dy][lz] = 5;
            }
            let leaf_base = top_y + trunk_h - 1;
            let leaf_top = top_y + trunk_h + 2;
            for ly in leaf_base..=leaf_top.min(CH - 1) {
                        let r: i32 = if ly >= leaf_top { 1 } else { 2 };
                for lx2 in -r..=r {
                    for lz2 in -r..=r {
                        if lx2 == 0 && lz2 == 0 && ly < leaf_top {
                            continue;
                        }
                        if lx2.abs() + lz2.abs() > r + 1 {
                            continue;
                        }
                        let nx = *tx + lx2;
                        let nz = *tz + lz2;
                        if nx < cx * CS as i32 || nx >= (cx + 1) * CS as i32 {
                            continue;
                        }
                        if nz < cz * CS as i32 || nz >= (cz + 1) * CS as i32 {
                            continue;
                        }
                        let nlx = nx.rem_euclid(CS as i32) as usize;
                        let nlz = nz.rem_euclid(CS as i32) as usize;
                        if chunk[nlx][ly][nlz] == 0 {
                            chunk[nlx][ly][nlz] = 8;
                        }
                    }
                }
            }
        }

        self.chunks.push(chunk);
    }

    fn get_block(&self, wx: i32, wy: i32, wz: i32) -> u8 {
        if wy < 0 || wy >= CH as i32 {
            return 0;
        }
        let cx = wx.div_euclid(CS as i32);
        let cz = wz.div_euclid(CS as i32);
        let idx = (cx * NX as i32 + cz) as usize;
        if idx >= self.chunks.len() {
            return 0;
        }
        let lx = wx.rem_euclid(CS as i32) as usize;
        let lz = wz.rem_euclid(CS as i32) as usize;
        self.chunks[idx][lx][wy as usize][lz]
    }

    fn set_block_raw(&mut self, wx: i32, wy: i32, wz: i32, block: u8) {
        if wy < 0 || wy >= CH as i32 {
            return;
        }
        let cx = wx.div_euclid(CS as i32);
        let cz = wz.div_euclid(CS as i32);
        let idx = (cx * NX as i32 + cz) as usize;
        if idx >= self.chunks.len() {
            return;
        }
        let lx = wx.rem_euclid(CS as i32) as usize;
        let lz = wz.rem_euclid(CS as i32) as usize;
        self.chunks[idx][lx][wy as usize][lz] = block;
    }

    #[wasm_bindgen]
    pub fn set_block(&mut self, wx: i32, wy: i32, wz: i32, block: u8) {
        self.set_block_raw(wx, wy, wz, block.min(MAX_BLOCK));
    }

    #[wasm_bindgen]
    pub fn get_block_at(&self, wx: i32, wy: i32, wz: i32) -> u8 {
        self.get_block(wx, wy, wz)
    }

    #[wasm_bindgen]
    pub fn raycast(
        &self,
        ox: f32,
        oy: f32,
        oz: f32,
        dx: f32,
        dy: f32,
        dz: f32,
        max_dist: f32,
    ) -> Vec<f32> {
        let mut x = ox.floor();
        let mut y = oy.floor();
        let mut z = oz.floor();
        let step_x = if dx > 0.0 { 1.0 } else { -1.0 };
        let step_y = if dy > 0.0 { 1.0 } else { -1.0 };
        let step_z = if dz > 0.0 { 1.0 } else { -1.0 };
        let mut t_max_x = if dx != 0.0 {
            ((if dx > 0.0 { x + 1.0 } else { x }) - ox) / dx
        } else {
            f32::MAX
        };
        let mut t_max_y = if dy != 0.0 {
            ((if dy > 0.0 { y + 1.0 } else { y }) - oy) / dy
        } else {
            f32::MAX
        };
        let mut t_max_z = if dz != 0.0 {
            ((if dz > 0.0 { z + 1.0 } else { z }) - oz) / dz
        } else {
            f32::MAX
        };
        let t_delta_x = if dx != 0.0 { 1.0 / dx.abs() } else { f32::MAX };
        let t_delta_y = if dy != 0.0 { 1.0 / dy.abs() } else { f32::MAX };
        let t_delta_z = if dz != 0.0 { 1.0 / dz.abs() } else { f32::MAX };

        let mut prev_x = ox.floor() as i32;
        let mut prev_y = oy.floor() as i32;
        let mut prev_z = oz.floor() as i32;

        for _ in 0..(max_dist * 3.0) as i32 {
            let bx = x as i32;
            let by = y as i32;
            let bz = z as i32;
            let b = self.get_block(bx, by, bz);
            if b != 0 && b != 7 {
                return vec![
                    bx as f32,
                    by as f32,
                    bz as f32,
                    prev_x as f32,
                    prev_y as f32,
                    prev_z as f32,
                    b as f32,
                ];
            }
            prev_x = bx;
            prev_y = by;
            prev_z = bz;
            if t_max_x < t_max_y {
                if t_max_x < t_max_z {
                    if t_max_x > max_dist {
                        break;
                    }
                    x += step_x;
                    t_max_x += t_delta_x;
                } else {
                    if t_max_z > max_dist {
                        break;
                    }
                    z += step_z;
                    t_max_z += t_delta_z;
                }
            } else if t_max_y < t_max_z {
                if t_max_y > max_dist {
                    break;
                }
                y += step_y;
                t_max_y += t_delta_y;
            } else {
                if t_max_z > max_dist {
                    break;
                }
                z += step_z;
                t_max_z += t_delta_z;
            }
        }
        vec![-1.0]
    }

    #[wasm_bindgen]
    pub fn get_mesh(&self, subdiv: u32) -> Vec<f32> {
        let s = subdiv.clamp(1, 16) as usize;
        let sf = s as f32;
        let mut v: Vec<f32> = Vec::with_capacity(1024 * 1024);
        let colors: [[f32; 3]; 16] = [
            [0.0, 0.0, 0.0],    // 0: air
            [0.3, 0.7, 0.2],    // 1: grass
            [0.55, 0.35, 0.15], // 2: dirt
            [0.5, 0.5, 0.5],    // 3: stone
            [0.2, 0.2, 0.2],    // 4: bedrock
            [0.45, 0.3, 0.1],   // 5: wood/log
            [0.85, 0.8, 0.5],   // 6: sand
            [0.2, 0.4, 0.8],    // 7: water
            [0.15, 0.55, 0.15], // 8: leaves
            [0.3, 0.3, 0.3],    // 9: coal ore
            [0.6, 0.5, 0.35],   // 10: iron ore
            [0.7, 0.6, 0.2],    // 11: gold ore
            [0.3, 0.6, 0.7],    // 12: diamond ore
            [0.45, 0.4, 0.35],  // 13: gravel
            [0.95, 0.95, 0.95], // 14: snow
            [0.6, 0.55, 0.45],  // 15: clay
        ];
        let dirs = [
            (1, 0, 0),
            (-1, 0, 0),
            (0, 1, 0),
            (0, -1, 0),
            (0, 0, 1),
            (0, 0, -1),
        ];
        let quads: [[(f32, f32, f32); 4]; 6] = [
            [(1., 0., 1.), (1., 1., 1.), (1., 1., 0.), (1., 0., 0.)],
            [(0., 0., 0.), (0., 1., 0.), (0., 1., 1.), (0., 0., 1.)],
            [(0., 1., 0.), (0., 1., 1.), (1., 1., 1.), (1., 1., 0.)],
            [(0., 0., 1.), (0., 0., 0.), (1., 0., 0.), (1., 0., 1.)],
            [(0., 0., 1.), (0., 1., 1.), (1., 1., 1.), (1., 0., 1.)],
            [(1., 0., 0.), (1., 1., 0.), (0., 1., 0.), (0., 0., 0.)],
        ];
        let idxs = [0, 1, 2, 0, 2, 3];

        for cx in 0..NX as i32 {
            for cz in 0..NZ as i32 {
                let chunk_idx = (cx * NX as i32 + cz) as usize;
                if chunk_idx >= self.chunks.len() {
                    continue;
                }
                for x in 0..CS {
                    for y in 0..CH {
                        for z in 0..CS {
                            let block = self.chunks[chunk_idx][x][y][z];
                            if block == 0 {
                                continue;
                            }
                            let bx = cx * CS as i32 + x as i32;
                            let bz = cz * CS as i32 + z as i32;
                            let c = colors[block as usize];

                            for fi in 0..6 {
                                let (dx, dy, dz) = dirs[fi];
                                let nb = self.get_block(bx + dx, y as i32 + dy, bz + dz);
                                if nb != 0 && !(nb == 7 && block != 7) {
                                    continue;
                                }

                                let q0 = quads[fi][0];
                                let eu = (
                                    quads[fi][1].0 - q0.0,
                                    quads[fi][1].1 - q0.1,
                                    quads[fi][1].2 - q0.2,
                                );
                                let ev = (
                                    quads[fi][3].0 - q0.0,
                                    quads[fi][3].1 - q0.1,
                                    quads[fi][3].2 - q0.2,
                                );

                                for gj in 0..s {
                                    for gi in 0..s {
                                        let u0 = gi as f32 / sf;
                                        let u1 = (gi + 1) as f32 / sf;
                                        let v0 = gj as f32 / sf;
                                        let v1 = (gj + 1) as f32 / sf;

                                        let corners = [
                                            (q0.0 + eu.0 * u0 + ev.0 * v0,
                                             q0.1 + eu.1 * u0 + ev.1 * v0,
                                             q0.2 + eu.2 * u0 + ev.2 * v0),
                                            (q0.0 + eu.0 * u1 + ev.0 * v0,
                                             q0.1 + eu.1 * u1 + ev.1 * v0,
                                             q0.2 + eu.2 * u1 + ev.2 * v0),
                                            (q0.0 + eu.0 * u1 + ev.0 * v1,
                                             q0.1 + eu.1 * u1 + ev.1 * v1,
                                             q0.2 + eu.2 * u1 + ev.2 * v1),
                                            (q0.0 + eu.0 * u0 + ev.0 * v1,
                                             q0.1 + eu.1 * u0 + ev.1 * v1,
                                             q0.2 + eu.2 * u0 + ev.2 * v1),
                                        ];

                                        let px_i = bx * s as i32 + gi as i32;
                                        let py_i = y as i32 * s as i32 + gj as i32;
                                        let hval = (px_i as u64)
                                            .wrapping_mul(0x9E3779B9)
                                            .wrapping_add(py_i as u64)
                                            .wrapping_mul(0x85EBCA6B)
                                            .wrapping_add(bz as u64)
                                            .wrapping_mul(0xC2B2AE35);
                                        let hv = ((hval >> 16) & 0xFF) as f32 / 255.0;
                                        let vary = (hv - 0.5) * 0.3;
                                        let cr = (c[0] + vary).clamp(0.0, 1.0);
                                        let cg = (c[1] + vary * 0.8).clamp(0.0, 1.0);
                                        let cb = (c[2] + vary * 0.6).clamp(0.0, 1.0);

                                        for &ti in &idxs {
                                            let (px, py, pz) = corners[ti];
                                            v.push(bx as f32 + px + dx as f32 * 0.005);
                                            v.push(y as f32 + py + dy as f32 * 0.005);
                                            v.push(bz as f32 + pz + dz as f32 * 0.005);
                                            v.push(dx as f32);
                                            v.push(dy as f32);
                                            v.push(dz as f32);
                                            v.push(cr);
                                            v.push(cg);
                                            v.push(cb);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        v
    }

    #[wasm_bindgen]
    pub fn chunks_loaded(&self) -> usize {
        self.chunks.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_world_creation() {
        let world = VoxelWorld::new(42);
        assert_eq!(world.seed, 42);
        assert_eq!(world.chunks.len(), NX * NZ);
    }

    #[test]
    fn test_chunks_loaded() {
        let world = VoxelWorld::new(1);
        assert_eq!(world.chunks_loaded(), NX * NZ);
        assert_eq!(NX * NZ, 9);
    }

    #[test]
    fn test_get_set_block() {
        let mut world = VoxelWorld::new(42);
        world.set_block(5, 30, 5, 1);
        assert_eq!(world.get_block_at(5, 30, 5), 1);
        world.set_block(5, 30, 5, 0);
        assert_eq!(world.get_block_at(5, 30, 5), 0);
    }

    #[test]
    fn test_get_mesh_not_empty() {
        let world = VoxelWorld::new(42);
        let mesh = world.get_mesh(1);
        assert!(!mesh.is_empty());
    }

    #[test]
    fn test_raycast_no_hit() {
        let world = VoxelWorld::new(42);
        let result = world.raycast(24.0, 60.0, 24.0, 0.0, 1.0, 0.0, 10.0);
        assert_eq!(result, vec![-1.0]);
    }
}
