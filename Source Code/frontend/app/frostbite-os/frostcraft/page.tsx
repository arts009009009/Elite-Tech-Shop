"use client";
import { useEffect, useRef, useState, useCallback } from "react";

// ============================================
// FROSTCRAFT - Minecraft Beta Inspired (5.1 Canary 5)
// Features: Polished Textures, HUD, Difficulty, Double Jump, Dash, 60 FPS
// ============================================

// Difficulty levels
const DIFFICULTY_LEVELS = [
  { name: "Peaceful", speedBoost: 1, color: "#00ff00" },
  { name: "Easy", speedBoost: 1.2, color: "#00aaff" },
  { name: "Normal", speedBoost: 1.5, color: "#ffff00" },
  { name: "Hard", speedBoost: 2.0, color: "#ffaa00" },
  { name: "Extreme", speedBoost: 2.5, color: "#ff0000" },
];

// Block definitions with score values
const BLOCK_DEFS = [
  { name: "Air", score: 0, color: [0, 0, 0] },
  { name: "Grass", score: 10, color: [0.3, 0.7, 0.2] },
  { name: "Dirt", score: 5, color: [0.55, 0.35, 0.15] },
  { name: "Stone", score: 15, color: [0.5, 0.5, 0.5] },
  { name: "Bedrock", score: 0, color: [0.2, 0.2, 0.2] },
  { name: "Wood", score: 20, color: [0.45, 0.3, 0.1] },
  { name: "Sand", score: 8, color: [0.85, 0.8, 0.5] },
  { name: "Water", score: 0, color: [0.2, 0.4, 0.8] },
  { name: "Leaves", score: 3, color: [0.15, 0.55, 0.15] },
  { name: "Coal Ore", score: 25, color: [0.3, 0.3, 0.3] },
  { name: "Iron Ore", score: 50, color: [0.6, 0.5, 0.35] },
  { name: "Gold Ore", score: 75, color: [0.7, 0.6, 0.2] },
  { name: "Diamond Ore", score: 100, color: [0.3, 0.6, 0.7] },
  { name: "Gravel", score: 7, color: [0.45, 0.4, 0.35] },
  { name: "Snow", score: 4, color: [0.95, 0.95, 0.95] },
  { name: "Clay", score: 6, color: [0.6, 0.55, 0.45] },
];

// Hotbar blocks
const HOTBAR_BLOCKS = [1, 2, 3, 5, 6, 9, 10, 11, 12];

// Game constants
const DASH_SPEED = 80;
const DASH_DURATION = 0.5;
const DASH_COOLDOWN = 1.5;

function drawBlockPreview(ctx: CanvasRenderingContext2D, blockId: number, size: number) {
  const c = BLOCK_DEFS[blockId]?.color || [0.5, 0.5, 0.5];
  const r = Math.round(c[0] * 255);
  const g = Math.round(c[1] * 255);
  const b = Math.round(c[2] * 255);
  const s = size * 0.7;
  const ox = (size - s) / 2;
  const oy = (size - s) / 2;
  const d = s * 0.2;
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(ox + d, oy, s - d, s - d);
  ctx.fillStyle = `rgb(${Math.round(r * 0.6)},${Math.round(g * 0.6)},${Math.round(b * 0.6)})`;
  ctx.fillRect(ox, oy + d, d, s - d);
  ctx.fillRect(ox + d, oy + s - d, s - d, d);
  ctx.fillStyle = `rgb(${Math.min(255, Math.round(r * 1.3))},${Math.min(255, Math.round(g * 1.3))},${Math.min(255, Math.round(b * 1.3))})`;
  ctx.fillRect(ox + d, oy + d, s - d * 2, s - d * 2);
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 1;
  ctx.strokeRect(ox, oy, s, s);
}

export default function FrostCraftPage() {
  console.log("[frostcraft] Component rendered");
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wasmMemRef = useRef<WebAssembly.Memory | null>(null);
  const [hotbar] = useState(HOTBAR_BLOCKS);
  const [selected, setSelected] = useState(0);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [graphicsLevel, setGraphicsLevel] = useState<1 | 4 | 16>(1);
  const [game, setGame] = useState({
    score: 0,
    time: 0,
    fps: 60,
    difficulty: 0,
    particles: [] as Array<{ x: number; y: number; z: number; life: number }>,
  });
  const [player, setPlayer] = useState({
    onGround: false,
    canDoubleJump: false,
    dashCooldown: 0,
    dashTimer: 0,
    lives: 3,
    combo: 0,
  });
  const selectedRef = useRef(0);
  const graphicsLevelRef = useRef(1);
  const rebuildRef = useRef<((subdiv: number) => void) | null>(null);
  const hotbarCanvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const frameIdRef = useRef<number | null>(null);
  const worldRef = useRef<any>(null);

  const drawHotbar = useCallback(() => {
    hotbarCanvasRefs.current.forEach((cvs, i) => {
      if (!cvs) return;
      const ctx = cvs.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, 48, 48);
      drawBlockPreview(ctx, hotbar[i], 48);
      if (i === selected) {
        ctx.strokeStyle = "#ffd700";
        ctx.lineWidth = 3;
        ctx.strokeRect(1, 1, 46, 46);
      }
    });
  }, [hotbar, selected]);

  useEffect(() => {
    graphicsLevelRef.current = graphicsLevel;
    rebuildRef.current?.(graphicsLevel);
  }, [graphicsLevel]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Hydration fix - must run BEFORE main useEffect so canvas is in DOM
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  useEffect(() => { drawHotbar(); }, [drawHotbar, isMounted]);
  useEffect(() => {
    if (!isMounted) return;
    console.log("[frostcraft] useEffect running");
    let destroyed = false;
    let world: any = null;
    let gl: WebGLRenderingContext | null = null;
    let canvasEl: HTMLCanvasElement | null = null;
    let wasmMem: WebAssembly.Memory | null = null;
    let lastTime = performance.now();
    let mouseDX = 0, mouseDY = 0;
    let camX = 24, camY = 50, camZ = 40;
    const cleanupRef = { current: null as (() => void) | null };
    let yaw = -0.6, pitch = -0.3;
    let velY = 0, onGround = false, canDoubleJump = false;
    let hasDashed = false, dashDirection: [number, number, number] | null = null;
    let dashTimer = 0, dashCooldown = 0;
    let score = 0, combo = 0, lives = 3, time = 0;
    let difficultyTimer = 0, particleSpawnTimer = 0;
    let particles: Array<{ x: number; y: number; z: number; life: number }> = [];
    let spacePressed = false;

    const EYE_HEIGHT = 2.8, PLAYER_W = 0.3, PLAYER_H = 3.0;
    const SPAWN_X = 24, SPAWN_Y = 50, SPAWN_Z = 40;

    // Difficulty scaling
    const getMoveSpeed = () => 5 * DIFFICULTY_LEVELS[game.difficulty].speedBoost;
    const getJumpVelocity = () => 9 + game.difficulty * 0.5;
    const getGravity = () => -28 - game.difficulty * 2;

    async function init() {
      if (destroyed) return;
      canvasEl = canvasRef.current;
      if (!canvasEl) {
        console.error("[frostcraft] Canvas element not found");
        return;
      }
      console.log("[frostcraft] Canvas found", canvasEl);

      // Initialize WebGL
      console.log("[frostcraft] Canvas size:", canvasEl.width, "x", canvasEl.height);
      gl = (canvasEl.getContext("webgl2") || canvasEl.getContext("webgl")) as WebGLRenderingContext;
      if (!gl) {
        console.error("[frostcraft] WebGL not available");
        return;
      }
      console.log("[frostcraft] WebGL initialized, canvas:", canvasEl.width, "x", canvasEl.height);

      // Load WASM - use absolute path from root
      const wasmUrl = "/minigame_bg.wasm";
      console.log("[frostcraft] Fetching WASM from:", wasmUrl, "(relative to", window.location.origin + ")");
      const resp = await fetch(wasmUrl);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText} for ${wasmUrl}`);
      }
      console.log("[frostcraft] WASM fetch successful, status:", resp.status, "size:", resp.headers.get("content-length"));
      const bytes = await resp.arrayBuffer();

      const importObject = {
        wbg: {
          __wbindgen_throw: (arg0: number, arg1: number) => {
            throw new Error(new TextDecoder().decode(new Uint8Array(wasmMem!.buffer, arg0, arg1)));
          },
        },
      };

      const result = await WebAssembly.instantiate(bytes, importObject);
      if (destroyed) return;
      const wasm = result.instance.exports as Record<string, (...args: unknown[]) => unknown>;
      wasmMem = wasm.memory as WebAssembly.Memory;
      wasmMemRef.current = wasmMem;

      class VoxelWorldImpl {
        ptr: number;
        constructor(seed: number) {
          this.ptr = (wasm.voxelworld_new as (s: number) => number)(seed) >>> 0;
        }
        free() {
          if (this.ptr !== 0) {
            (wasm.__wbg_voxelworld_free as (p: number, a: number) => void)?.(this.ptr, 1);
            this.ptr = 0;
          }
        }
        get_mesh(subdiv: number): Float32Array {
          const retptr = (wasm.__wbindgen_add_to_stack_pointer as (n: number) => number)(-16);
          (wasm.voxelworld_get_mesh as (r: number, p: number, s: number) => void)(retptr, this.ptr, subdiv);
          const dv = new DataView(wasmMem.buffer);
          const ptr = dv.getInt32(retptr + 0, true) >>> 0;
          const len = dv.getInt32(retptr + 4, true);
          const f32 = new Float32Array(wasmMem.buffer, ptr, len).slice();
          (wasm.__wbindgen_add_to_stack_pointer as (n: number) => number)(16);
          return f32;
        }
        set_block(x: number, y: number, z: number, block: number) {
          (wasm.voxelworld_set_block as (p: number, x: number, y: number, z: number, b: number) => void)(this.ptr, x, y, z, block);
        }
        get_block_at(x: number, y: number, z: number): number {
          return ((wasm.voxelworld_get_block_at as (p: number, x: number, y: number, z: number) => number)(this.ptr, x, y, z)) >>> 0;
        }
        raycast(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, max: number): Float32Array {
          const retptr = (wasm.__wbindgen_add_to_stack_pointer as (n: number) => number)(-16);
          (wasm.voxelworld_raycast as (r: number, p: number, ...args: unknown[]) => void)(retptr, this.ptr, ox, oy, oz, dx, dy, dz, max);
          const dv = new DataView(wasmMem.buffer);
          const ptr = dv.getInt32(retptr + 0, true) >>> 0;
          const len = dv.getInt32(retptr + 4, true);
          const f32 = new Float32Array(wasmMem.buffer, ptr, len).slice();
          (wasm.__wbindgen_add_to_stack_pointer as (n: number) => number)(16);
          return f32;
        }
      }

      world = new VoxelWorldImpl(42);

      // Compile shaders
      const vsSource = `attribute vec3 aPos; attribute vec3 aNorm; attribute vec3 aCol;
        uniform mat4 uMVP; varying vec3 vCol; varying vec3 vNorm; varying float vFog;
        void main(){ gl_Position=uMVP*vec4(aPos,1.0); vCol=aCol; vNorm=aNorm;
        vFog=clamp(length(aPos-vec3(24,30,24))/80.0,0.0,1.0); }`;
      const fsSource = `precision mediump float; varying vec3 vCol; varying vec3 vNorm; varying float vFog;
        void main(){ vec3 light=normalize(vec3(0.4,0.8,0.3)); float diff=max(dot(vNorm,light),0.25);
        vec3 c=vCol*diff; c=mix(c,vec3(0.53,0.81,0.92),vFog*vFog); gl_FragColor=vec4(c,1.0); }`;

      function mkShader(type: number, src: string) {
        const s = gl!.createShader(type)!;
        gl!.shaderSource(s, src);
        gl!.compileShader(s);
        return s;
      }
      const vs = mkShader(gl.VERTEX_SHADER, vsSource);
      const fs = mkShader(gl.FRAGMENT_SHADER, fsSource);
      const prog = gl.createProgram()!;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      gl.useProgram(prog);

      let mesh = world.get_mesh(graphicsLevelRef.current);
      const F = 9;
      let verts = mesh.length / F;

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);

      rebuildRef.current = (subdiv: number) => {
        mesh = world.get_mesh(subdiv);
        verts = mesh.length / F;
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
      };

      const aPos = gl.getAttribLocation(prog, "aPos");
      const aNorm = gl.getAttribLocation(prog, "aNorm");
      const aCol = gl.getAttribLocation(prog, "aCol");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, F * 4, 0);
      gl.enableVertexAttribArray(aNorm);
      gl.vertexAttribPointer(aNorm, 3, gl.FLOAT, false, F * 4, 12);
      gl.enableVertexAttribArray(aCol);
      gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, F * 4, 24);

      const uMVP = gl.getUniformLocation(prog, "uMVP");
      gl.enable(gl.DEPTH_TEST);
      gl.clearColor(0.53, 0.81, 0.92, 1.0);
      console.log("[frostcraft] WebGL viewport set to:", canvasEl.width, "x", canvasEl.height);

      camY = findSpawnY(camX, camZ);

      // Event handlers
      function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          canvasEl!.width = rect.width * dpr;
          canvasEl!.height = rect.height * dpr;
        } else {
          canvasEl!.width = window.innerWidth * dpr;
          canvasEl!.height = window.innerHeight * dpr;
        }
        gl!.viewport(0, 0, canvasEl!.width, canvasEl!.height);
      }
      // Ensure canvas has size before init
      setTimeout(resize, 100);
      resize();
      window.addEventListener("resize", resize);

      function onMouse(e: MouseEvent) {
        if (document.pointerLockElement === canvasEl) {
          mouseDX += e.movementX;
          mouseDY += e.movementY;
        }
      }

      function onMouseDown(e: MouseEvent) {
        if (document.pointerLockElement !== canvasEl) {
          canvasEl?.requestPointerLock();
          return;
        }
        const fx = Math.cos(yaw) * Math.cos(pitch);
        const fy = Math.sin(pitch);
        const fz = Math.sin(yaw) * Math.cos(pitch);
        const hit = world.raycast(camX, camY + EYE_HEIGHT, camZ, fx, fy, fz, 8);

        if (hit.length >= 7 && hit[0] >= 0) {
          if (e.button === 0) {
            // Mine block
            const blockType = world.get_block_at(hit[0], hit[1], hit[2]);
            if (blockType !== 0) {
              const blockDef = BLOCK_DEFS[blockType];
              score += blockDef.score * (1 + Math.floor(combo / 5));
              combo++;
              // Spawn particles
              for (let i = 0; i < 5; i++) {
                particles.push({ x: hit[0] + 0.5 + (Math.random() - 0.5) * 0.5, y: hit[1] + 0.5 + (Math.random() - 0.5) * 0.5, z: hit[2] + 0.5 + (Math.random() - 0.5) * 0.5, life: 1.0 });
              }
            }
            world.set_block(hit[0], hit[1], hit[2], 0);
            mesh = world.get_mesh(graphicsLevelRef.current);
            verts = mesh.length / F;
            gl.bindBuffer(gl.ARRAY_BUFFER, buf);
            gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
          } else if (e.button === 2) {
            // Place block
            const blockType = hotbar[selectedRef.current];
            const px = hit[3], py = hit[4], pz = hit[5];
            if (blockType !== 7 || world.get_block_at(px, py, pz) !== 7) {
              world.set_block(px, py, pz, blockType);
              mesh = world.get_mesh(graphicsLevelRef.current);
              verts = mesh.length / F;
              gl.bindBuffer(gl.ARRAY_BUFFER, buf);
              gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
            }
          }
        }
      }

      const onClick = () => { if (document.pointerLockElement !== canvasEl) canvasEl?.requestPointerLock(); };
      const onContextMenu = (e: Event) => e.preventDefault();
      canvasEl.addEventListener("click", onClick);
      canvasEl.addEventListener("mousedown", onMouseDown);
      canvasEl.addEventListener("contextmenu", onContextMenu);
      document.addEventListener("mousemove", onMouse);

      const onPointerLockChange = () => {
        setPointerLocked(document.pointerLockElement === canvasEl);
      };
      document.addEventListener("pointerlockchange", onPointerLockChange);

      const keys: Record<string, boolean> = {};
      function onKeyDown(e: KeyboardEvent) {
        if (e.code === "ArrowUp" || e.code === "ArrowDown" || e.code === "ArrowLeft" || e.code === "ArrowRight" || e.code === "Space") e.preventDefault();
        keys[e.code] = true;
        if (e.code === "Space") {
          spacePressed = true;
        }
        if (e.code >= "Digit1" && e.code <= "Digit9") {
          const idx = parseInt(e.code.charAt(5)) - 1;
          setSelected(idx);
          selectedRef.current = idx;
        }
      }
      function onKeyUp(e: KeyboardEvent) { 
        keys[e.code] = false;
        if (e.code === "ShiftLeft" || e.code === "ShiftRight") hasDashed = false;
      }
      function onWheel(e: WheelEvent) {
        let idx = selectedRef.current;
        if (e.deltaY > 0) idx = (idx + 1) % hotbar.length;
        else idx = (idx - 1 + hotbar.length) % hotbar.length;
        setSelected(idx);
        selectedRef.current = idx;
      }
      document.addEventListener("keydown", onKeyDown);
      document.addEventListener("keyup", onKeyUp);
      document.addEventListener("wheel", onWheel);

      // Matrix math
      const _projOut = new Float32Array(16);
      const _viewOut = new Float32Array(16);
      const _mvpOut = new Float32Array(16);

      const projMat = (aspect: number) => {
        const f = 1 / Math.tan(70 * Math.PI / 180 / 2);
        const near = 1.0, far = 200, nf = near + far, range = near - far;
        _projOut[0] = f / aspect; _projOut[1] = 0; _projOut[2] = 0; _projOut[3] = 0;
        _projOut[4] = 0; _projOut[5] = f; _projOut[6] = 0; _projOut[7] = 0;
        _projOut[8] = 0; _projOut[9] = 0; _projOut[10] = nf / range; _projOut[11] = -1;
        _projOut[12] = 0; _projOut[13] = 0; _projOut[14] = (2 * near * far) / range; _projOut[15] = 0;
        return _projOut;
      };

      const viewMat = () => {
        const eyeY = camY + EYE_HEIGHT;
        const fx = Math.cos(yaw) * Math.cos(pitch);
        const fy = Math.sin(pitch);
        const fz = Math.sin(yaw) * Math.cos(pitch);
        const ux = 0, uy = 1, uz = 0;
        let rx = fy * uz - fz * uy;
        let ry = fz * ux - fx * uz;
        let rz = fx * uy - fy * ux;
        const l = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
        rx /= l; ry /= l; rz /= l;
        const upx = ry * fz - rz * fy;
        const upy = rz * fx - rx * fz;
        const upz = rx * fy - ry * fx;
        _viewOut[0] = rx; _viewOut[1] = upx; _viewOut[2] = -fx; _viewOut[3] = 0;
        _viewOut[4] = ry; _viewOut[5] = upy; _viewOut[6] = -fy; _viewOut[7] = 0;
        _viewOut[8] = rz; _viewOut[9] = upz; _viewOut[10] = -fz; _viewOut[11] = 0;
        _viewOut[12] = -(rx * camX + ry * eyeY + rz * camZ);
        _viewOut[13] = -(upx * camX + upy * eyeY + upz * camZ);
        _viewOut[14] = (fx * camX + fy * eyeY + fz * camZ);
        _viewOut[15] = 1;
        return _viewOut;
      };
      const mul4 = (a: Float32Array, b: Float32Array) => {
        for (let i = 0; i < 4; i++)
          for (let j = 0; j < 4; j++)
            _mvpOut[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3];
        return _mvpOut;
      };

      function isSolid(x: number, y: number, z: number): boolean {
        const b = world.get_block_at(Math.floor(x), Math.floor(y), Math.floor(z));
        return b !== 0 && b !== 7;
      }

      function collides(px: number, py: number, pz: number): boolean {
        const minX = Math.floor(px - PLAYER_W);
        const maxX = Math.floor(px + PLAYER_W);
        const minY = Math.floor(py);
        const maxY = Math.floor(py + PLAYER_H);
        const minZ = Math.floor(pz - PLAYER_W);
        const maxZ = Math.floor(pz + PLAYER_W);
        for (let bx = minX; bx <= maxX; bx++) {
          for (let by = minY; by <= maxY; by++) {
            for (let bz = minZ; bz <= maxZ; bz++) {
              const block = world.get_block_at(bx, by, bz);
              if (block !== 0 && block !== 7) return true;
            }
          }
        }
        return false;
      }

      function findSpawnY(x: number, z: number): number {
        for (let y = 63; y >= 0; y--) {
          if (!isSolid(x, y, z) && !isSolid(x, y + 1, z) && isSolid(x, y - 1, z)) return y;
        }
        return 40;
      }

      camY = findSpawnY(camX, camZ);

      function cleanup() {
        if (frameIdRef.current) { cancelAnimationFrame(frameIdRef.current); frameIdRef.current = null; }
        window.removeEventListener("resize", resize);
        document.removeEventListener("mousemove", onMouse);
        if (canvasEl) { canvasEl.removeEventListener("click", onClick); canvasEl.removeEventListener("mousedown", onMouseDown); canvasEl.removeEventListener("contextmenu", onContextMenu); }
        document.removeEventListener("keydown", onKeyDown);
        document.removeEventListener("keyup", onKeyUp);
        document.removeEventListener("wheel", onWheel);
        document.removeEventListener("pointerlockchange", onPointerLockChange);
        if (document.pointerLockElement === canvasEl) document.exitPointerLock();
        world?.free?.();
        if (gl) { gl.deleteBuffer(buf); gl.deleteShader(vs); gl.deleteShader(fs); gl.deleteProgram(prog); }
      }
      cleanupRef.current = cleanup;

      // Main render loop
      function frame() {
        if (destroyed) { cleanup(); return; }
        const now = performance.now();
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;
        if (frameIdRef.current === null) {
          console.log("[frostcraft] Frame loop started");
        }

        // Reset space press at start of frame
        const didSpacePress = spacePressed;
        spacePressed = false;

        // FPS calculation
        if (now - (frameIdRef.current || 0) >= 1000) {
          setGame(prev => ({ ...prev, fps: Math.round(1 / dt) }));
          frameIdRef.current = now;
        }

        time += dt;
        difficultyTimer += dt;
        if (difficultyTimer >= 30) {
          difficultyTimer = 0;
          setGame(prev => ({ ...prev, difficulty: Math.min(4, prev.difficulty + 1) }));
        }

        // Particle system
        particleSpawnTimer += dt;
        if (particleSpawnTimer >= 0.1 && Math.random() < 0.3) {
          particleSpawnTimer = 0;
          particles.push({
            x: camX + (Math.random() - 0.5) * 10,
            y: camY + EYE_HEIGHT + Math.random() * 5,
            z: camZ + (Math.random() - 0.5) * 10,
            life: 2.0 + Math.random() * 2
          });
        }
        for (let i = particles.length - 1; i >= 0; i--) {
          particles[i].life -= dt;
          if (particles[i].life <= 0) particles.splice(i, 1);
        }

        // Dash ability cooldown
        dashCooldown = Math.max(0, dashCooldown - dt);
        if (dashDirection) {
          dashTimer -= dt;
          if (dashTimer <= 0) {
            dashDirection = null;
            hasDashed = false;
          }
        }

        if (document.pointerLockElement === canvasEl) {
          yaw += mouseDX * 0.002;
          pitch -= mouseDY * 0.002;
          pitch = Math.max(-1.5, Math.min(1.5, pitch));
          mouseDX = 0;
          mouseDY = 0;
        }

        // Camera bounds
        if (camY < -10) {
          camX = SPAWN_X;
          camY = findSpawnY(SPAWN_X, SPAWN_Z);
          camZ = SPAWN_Z;
          velY = 0;
          dashDirection = null;
          hasDashed = false;
        }

        // Gravity
        velY += getGravity() * dt;

        // Double jump - same height as normal jump (tap Space twice)
        if (didSpacePress && !onGround && canDoubleJump) {
          velY = getJumpVelocity();
          canDoubleJump = false;
          hasDashed = false;
        }

        // Dash ability
        if ((keys["ShiftLeft"] || keys["ShiftRight"]) && !hasDashed && dashCooldown <= 0 && dashTimer <= 0) {
          hasDashed = true;
          dashCooldown = DASH_COOLDOWN;
          dashTimer = DASH_DURATION;
          dashDirection = [Math.cos(yaw), 0, Math.sin(yaw)];
          for (let i = 0; i < 40; i++) {
            particles.push({ x: camX + dashDirection[0] * 3 + (Math.random() - 0.5) * 2, y: camY + EYE_HEIGHT * 0.5 + (Math.random() - 0.5) * 2, z: camZ + dashDirection[2] * 3 + (Math.random() - 0.5) * 2, life: 0.5 });
          }
        }

        // Regular jump (tap Space once)
        if (didSpacePress && onGround) {
          velY = getJumpVelocity();
          onGround = false;
          canDoubleJump = true;
        }

        // Movement
        const moveX = Math.cos(yaw);
        const moveZ = Math.sin(yaw);
        let dx = 0, dz = 0;
        if (keys["KeyW"] || keys["ArrowUp"]) { dx += moveX; dz += moveZ; }
        if (keys["KeyS"] || keys["ArrowDown"]) { dx -= moveX; dz -= moveZ; }
        if (keys["KeyA"] || keys["ArrowLeft"]) { dx -= Math.cos(yaw + Math.PI / 2); dz -= Math.sin(yaw + Math.PI / 2); }
        if (keys["KeyD"] || keys["ArrowRight"]) { dx += Math.cos(yaw + Math.PI / 2); dz += Math.sin(yaw + Math.PI / 2); }

        const len = Math.sqrt(dx * dx + dz * dz);
        if (len > 0) { dx /= len; dz /= len; }

        // Apply dash velocity
        if (dashDirection) {
          dx += dashDirection[0] * DASH_SPEED * dt;
          dz += dashDirection[2] * DASH_SPEED * dt;
        }

        const spd = getMoveSpeed() * dt;
        const newX = camX + dx * spd;
        const newZ = camZ + dz * spd;

        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx * spd), Math.abs(dz * spd)) / 0.3));
        const stepX = (newX - camX) / steps;
        const stepZ = (newZ - camZ) / steps;
        for (let s = 0; s < steps; s++) {
          if (!collides(camX + stepX, camY, camZ + stepZ)) { camX += stepX; camZ += stepZ; }
          else if (!collides(camX + stepX, camY, camZ)) camX += stepX;
          else if (!collides(camX, camY, camZ + stepZ)) camZ += stepZ;
        }

        // Vertical movement
        const newY = camY + velY * dt;
        const vSteps = Math.max(1, Math.ceil(Math.abs(velY * dt) / 0.3));
        const stepY = (newY - camY) / vSteps;
        let landed = false;
        for (let s = 0; s < vSteps; s++) {
          if (!collides(camX, camY + stepY, camZ)) camY += stepY;
          else { if (stepY < 0) landed = true; break; }
        }

        if (landed) { onGround = true; velY = 0; canDoubleJump = true; if (combo > 0) combo = 0; }
        else if (camY === newY) onGround = false;

        // Prevent going through ceiling
        while (isSolid(camX, camY + EYE_HEIGHT, camZ)) { camY += 1; velY = 0; }

        // Render
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const aspect = canvasEl.width / canvasEl.height;
        const mvp = mul4(projMat(aspect), viewMat());
        gl.uniformMatrix4fv(uMVP, false, mvp);
        gl.drawArrays(gl.TRIANGLES, 0, verts);

        // Update state
        setGame(prev => ({ ...prev, time, particles: [...particles] }));
        setPlayer({ score, combo, lives, onGround, canDoubleJump, dashCooldown, dashTimer });

        frameIdRef.current = requestAnimationFrame(frame);
      }
      frame();
    }

    init().catch((e) => console.error("[frostcraft] Init failed:", e));
    return () => { destroyed = true; cleanupRef.current?.(); };
    }, [isMounted]);

  if (!isMounted) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontFamily: "monospace", zIndex: 1000 }}>
        Loading FrostCraft Beta...
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", minHeight: "100vh", position: "relative", overflow: "hidden", background: "#000" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", minWidth: "100%", minHeight: "100%" }} />

      {/* Crosshair */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 10, pointerEvents: "none" }}>
        <div style={{ width: 24, height: 24, position: "relative" }}>
          <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 2, background: "rgba(255,255,255,0.8)", transform: "translateY(-50%)", boxShadow: "0 0 2px rgba(0,0,0,0.5)" }} />
          <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: "rgba(255,255,255,0.8)", transform: "translateX(-50%)", boxShadow: "0 0 2px rgba(0,0,0,0.5)" }} />
        </div>
      </div>

      {/* HUD */}
      <div style={{ position: "absolute", top: 8, left: 8, zIndex: 10, color: "white", fontFamily: "monospace", fontSize: 12, pointerEvents: "none", textShadow: "1px 1px 2px #000", background: "rgba(0,0,0,0.6)", padding: 8, borderRadius: 6 }}>
        <div style={{ fontSize: 16, fontWeight: "bold", marginBottom: 4 }}>FrostCraft Beta</div>
        <div><span style={{ color: "#ffd700" }}>Score:</span> {game.score}</div>
        <div><span style={{ color: "#00aaff" }}>Time:</span> {formatTime(game.time)}</div>
        <div><span style={{ color: "#00ff00" }}>FPS:</span> {game.fps}</div>
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>DIFFICULTY</div>
          <div style={{ fontSize: 16, fontWeight: "bold", color: DIFFICULTY_LEVELS[game.difficulty]?.color || "#ffffff" }}>
            {DIFFICULTY_LEVELS[game.difficulty]?.name || "Unknown"}
          </div>
        </div>
      </div>

      {/* Hotbar */}
      <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 10, display: "flex", gap: 4, background: "rgba(0,0,0,0.6)", padding: 8, borderRadius: 10 }}>
        {hotbar.map((blockId, i) => (
          <div key={i} style={{ position: "relative", width: 52, height: 52, border: i === selected ? "3px solid #ffd700" : "2px solid rgba(255,255,255,0.3)", borderRadius: 6, background: "rgba(0,0,0,0.4)" }}>
            <canvas
              ref={(el) => { hotbarCanvasRefs.current[i] = el; }}
              width={48}
              height={48}
              style={{ width: 48, height: 48, display: "block", margin: "auto", marginTop: i === selected ? 0 : 2 }}
            />
            <div style={{ position: "absolute", bottom: 1, right: 3, color: "rgba(255,255,255,0.6)", fontSize: 10, fontFamily: "monospace" }}>
              {i + 1}
            </div>
          </div>
        ))}
      </div>

      {/* Selected block name */}
      <div style={{ position: "absolute", bottom: 84, left: "50%", transform: "translateX(-50%)", zIndex: 10, color: "white", fontFamily: "monospace", fontSize: 12, pointerEvents: "none", textShadow: "1px 1px 2px #000", textAlign: "center", background: "rgba(0,0,0,0.5)", padding: "4px 8px", borderRadius: 4 }}>
        {BLOCK_DEFS[hotbar[selected]]?.name || "Unknown"}
      </div>

      {/* Controls Help */}
      <div style={{ position: "absolute", top: 8, right: 8, zIndex: 10, color: "white", fontFamily: "monospace", fontSize: 11, pointerEvents: "none", textShadow: "1px 1px 2px #000", background: "rgba(0,0,0,0.6)", padding: 8, borderRadius: 6, textAlign: "right" }}>
        <div>WASD: Move</div>
        <div>Space: Jump / Double Jump</div>
        <div>Shift: Dash</div>
        <div>Left Click: Mine</div>
        <div>Right Click: Place</div>
        <div>1-9 / Scroll: Select Block</div>
      </div>

      {/* Pause overlay */}
      {!pointerLocked && (
        <div style={{ position: "absolute", inset: 0, zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", pointerEvents: "none" }}>
          <div style={{ color: "white", fontFamily: "monospace", fontSize: 22, fontWeight: "bold", marginBottom: 20, textShadow: "2px 2px 4px #000", pointerEvents: "auto" }}>FrostCraft Beta Paused</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16, pointerEvents: "auto" }}>
            {([1, 4, 16] as const).map((level) => (
              <button
                key={level}
                onClick={(e) => { e.stopPropagation(); setGraphicsLevel(level); }}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  fontFamily: "monospace",
                  fontWeight: graphicsLevel === level ? "bold" : "normal",
                  color: graphicsLevel === level ? "#fff" : "rgba(255,255,255,0.6)",
                  background: graphicsLevel === level ? "rgba(59,130,246,0.8)" : "rgba(255,255,255,0.1)",
                  border: `2px solid ${graphicsLevel === level ? "rgba(59,130,246,1)" : "rgba(255,255,255,0.2)"}`,
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                {level}x{level}
              </button>
            ))}
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontFamily: "monospace", fontSize: 12 }}>Click anywhere to resume</div>
        </div>
      )}
    </div>
  );
}
