#!/usr/bin/env node

import { spawn, spawnSync, execSync } from "child_process";
import { existsSync, readdirSync, symlinkSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const BACKEND_ONLY = process.argv.includes("--backend-only");

// ── Helpers ──

function has(cmd) {
  try {
    const out = execSync(`${cmd} --version`, { stdio: ["ignore", "pipe", "ignore"], timeout: 5000 }).toString().trim();
    return out.length > 0 && !out.includes("ERR_");
  } catch { return false; }
}

// ── JDK detection ──
// `java` is not enough for `mvn package`: Maven needs a JDK (javac + lib/ct.sym).
// Distro installs frequently ship only a JRE, in which case Maven dies with the
// misleading "error: release version 21 not supported". Probe well-known JDK
// homes so the build still works when a JDK exists but is not on PATH.

function findJdk() {
  const candidates = [];
  const push = (p) => { if (p) candidates.push(p); };

  push(process.env.JAVA_HOME);

  const home = process.env.HOME || "";
  const sdkman = join(home, ".sdkman", "candidates", "java");
  push(join(sdkman, "current"));
  try {
    readdirSync(sdkman, { withFileTypes: true })
      .filter((e) => e.name !== "current")
      .map((e) => join(sdkman, e.name))
      .sort()
      .reverse()
      .forEach(push);
  } catch {}

  try {
    readdirSync("/usr/lib/jvm", { withFileTypes: true })
      .filter((e) => e.name !== "default" && e.name !== "default-java")
      .map((e) => join("/usr/lib/jvm", e.name))
      .sort()
      .reverse()
      .forEach(push);
  } catch {}

  return candidates.find((p) => existsSync(join(p, "bin", "javac"))) || null;
}

let jdkHome = null;

function ensureJdk() {
  if (has("javac")) return true;
  jdkHome = findJdk();
  return Boolean(jdkHome);
}

function javaEnv() {
  if (!jdkHome) return process.env;
  return { ...process.env, JAVA_HOME: jdkHome, PATH: `${join(jdkHome, "bin")}:${process.env.PATH || ""}` };
}

function detectPM() {
  const ua = process.env.npm_config_user_agent || "";
  const execPath = process.env.npm_execpath || "";
  if (ua.includes("yarn") || execPath.includes("yarn")) return "yarn";
  if (ua.includes("pnpm") || execPath.includes("pnpm")) return "pnpm";
  if (ua.includes("bun") || execPath.includes("bun")) return "bun";
  if (ua.includes("deno") || execPath.includes("deno")) return "deno";
  if (has("npm")) return "npm";
  if (has("yarn")) return "yarn";
  if (has("pnpm")) return "pnpm";
  if (has("bun")) return "bun";
  if (has("deno")) return "deno";
  return "npm";
}

const pm = detectPM();
console.log(`[dev] Package manager: ${pm}`);

function run(cmd, args, opts = {}) {
  const child = spawn(cmd, args, { stdio: "inherit", shell: true, ...opts });
  child.on("error", (err) => console.error(`[dev] Process error (${cmd}):`, err.message));
  return child;
}

function buildSync(label, cmd, args, cwd, env) {
  console.log(`[dev] Building ${label}...`);
  const start = Date.now();
  try {
    const result = spawnSync(cmd, args, { stdio: "inherit", shell: true, cwd, timeout: 600000, env });
    if (result.status !== 0) {
      console.log(`[dev] ${label} build failed (exit ${result.status}). Skipping.`);
      return false;
    }
    console.log(`[dev] ${label} built in ${((Date.now() - start) / 1000).toFixed(1)}s`);
    return true;
  } catch (err) {
    console.log(`[dev] ${label} build failed: ${err.message}. Skipping.`);
    return false;
  }
}

function pmRun(script, cwd, env) {
  const opts = { ...(cwd ? { cwd } : {}), ...(env ? { env } : {}) };
  switch (pm) {
    case "bun":    return run("bun", ["run", script], opts);
    case "deno":   return run("deno", ["task", script], opts);
    case "pnpm":   return run("pnpm", [script], opts);
    case "yarn":   return run("yarn", [script], opts);
    default:       return run("npm", ["run", script], opts);
  }
}

function pmFrontendDev() {
  const feDir = { cwd: join(ROOT, "frontend") };
  switch (pm) {
    case "pnpm":   return run("pnpm", ["--filter", "frontend", "dev"]);
    case "yarn":   return run("npx", ["next", "dev"], feDir);
    case "bun":    return run("npx", ["next", "dev"], feDir);
    case "deno":   return run("npx", ["next", "dev"], feDir);
    default:       return run("npx", ["next", "dev"], feDir);
  }
}

function isMongoRunning() {
  try {
    execSync("mongosh --eval 'db.adminCommand({ping:1})' --quiet", { stdio: "ignore", timeout: 3000 });
    return true;
  } catch { return false; }
}

// ── Build backends ──

function buildRust() {
  const bin = join(ROOT, "backend/rust/target/release/products-service");
  if (existsSync(bin)) {
    console.log("[dev] Rust backend binary found.");
    return true;
  }
  if (!has("cargo")) {
    console.log("[dev] Skipping Rust backend — cargo not installed.");
    return false;
  }
  return buildSync("Rust backend", "cargo", ["build", "--release"], join(ROOT, "backend/rust"));
}

function buildJava() {
  const targetDir = join(ROOT, "backend/target");
  const jar =
    existsSync(targetDir) &&
    readdirSync(targetDir).find((f) => f.startsWith("elite-shop-backend-") && f.endsWith(".jar"));
  if (jar) {
    console.log("[dev] Java backend JAR found.");
    return true;
  }
  if (!has("mvn")) {
    console.log("[dev] Skipping Java backend — mvn not installed.");
    return false;
  }
  if (!ensureJdk()) {
    console.log("[dev] Skipping Java backend — no JDK found.");
    console.log("[dev]   `java` is on PATH but `javac` is not (a JRE-only install). Maven needs a JDK,");
    console.log("[dev]   otherwise it fails with: error: release version 21 not supported.");
    console.log("[dev]   Fix one of:");
    console.log("[dev]     • sudo apt-get install -y openjdk-25-jdk-headless");
    console.log("[dev]     • nix develop        (flake.nix already provides pkgs.jdk21)");
    return false;
  }
  if (jdkHome) console.log(`[dev] Using JDK at ${jdkHome}`);
  return buildSync("Java backend", "mvn", ["clean", "package", "-DskipTests", "-q"], join(ROOT, "backend"), javaEnv());
}

function buildGo() {
  const bin = join(ROOT, "backend/go-backend");
  if (existsSync(bin)) {
    console.log("[dev] Go backend binary found.");
    return true;
  }
  if (!has("go")) {
    console.log("[dev] Skipping Go backend — go not installed.");
    return false;
  }
  return buildSync("Go backend", "go", ["build", "-o", "../go-backend"], join(ROOT, "backend/go"));
}

function buildCalc() {
  const dir = join(ROOT, "backend/cpp-backend");
  const bin = join(dir, "build/calc_server");
  if (existsSync(bin)) {
    console.log("[dev] Calculator backend binary found.");
    return true;
  }
  if (!has("cmake")) {
    console.log("[dev] Skipping Calculator backend — cmake not installed.");
    return false;
  }
  const ok = buildSync("Calculator backend", "cmake", ["-B", "build"], dir)
    && buildSync("Calculator backend", "cmake", ["--build", "build", "-j"], dir);
  return ok;
}

// ── Ensure Rust products.json ──

function ensureRustProductsJson() {
  const rustDir = join(ROOT, "backend/rust");
  const target = join(rustDir, "products.json");
  const source = join(ROOT, "frontend/data/products.json");
  if (existsSync(target)) return;
  if (!existsSync(source)) {
    console.log("[dev] Warning: frontend/data/products.json not found. Rust backend may fail to load products.");
    return;
  }
  try {
    symlinkSync(source, target);
    console.log("[dev] Symlinked products.json → backend/rust/");
  } catch {
    // If symlink fails (e.g. on Windows), copy instead
    try {
      execSync(`cp "${source}" "${target}"`, { stdio: "ignore" });
      console.log("[dev] Copied products.json → backend/rust/");
    } catch {
      console.log("[dev] Warning: Could not create products.json symlink for Rust backend.");
    }
  }
}

// ── MongoDB ──

function ensureMongoDB() {
  if (isMongoRunning()) {
    console.log("[dev] MongoDB already running.");
    return;
  }

  const hasDC = has("docker") && (() => {
    try {
      execSync("docker compose version", { stdio: "ignore", timeout: 5000 });
      return true;
    } catch {
      try {
        execSync("docker-compose version", { stdio: "ignore", timeout: 5000 });
        return true;
      } catch { return false; }
    }
  })();

  if (!hasDC) {
    console.log("[dev] MongoDB not running and docker compose not available.");
    console.log("[dev] Java backend needs MongoDB. Start it manually or install docker compose.");
    return;
  }

  console.log("[dev] Starting MongoDB via Docker Compose...");
  try {
    execSync("docker compose -f docker-compose.yml up -d mongodb", {
      stdio: "inherit",
      cwd: ROOT,
      timeout: 60000,
    });
  } catch {
    console.log("[dev] Failed to start MongoDB container. Java backend may not work.");
    return;
  }

  console.log("[dev] Waiting for MongoDB to be ready...");
  let retries = 30;
  const interval = setInterval(() => {
    if (isMongoRunning()) {
      clearInterval(interval);
      console.log("[dev] MongoDB is ready.");
    } else if (--retries <= 0) {
      clearInterval(interval);
      console.log("[dev] MongoDB did not become ready. Java backend may fail to connect.");
    }
  }, 1000);
}

// ── Main ──

async function main() {
  console.log("[dev] Elite Shop — auto-build & dev mode\n");

  // Step 1: Build all backends (fast-fail: skip individual if toolchain missing)
  const rustOk = buildRust();
  const javaOk = buildJava();
  const goOk = buildGo();
  const calcOk = buildCalc();

  // Step 2: Prepare Rust products.json symlink
  if (rustOk) ensureRustProductsJson();

  // Step 3: Ensure MongoDB is running (Java needs it)
  if (javaOk) ensureMongoDB();

  // Step 4: Start all services
  const procs = [];

  if (rustOk) {
    console.log("[dev] Starting Rust backend → http://localhost:3002");
    procs.push(run("cargo", ["run", "--release"], { cwd: join(ROOT, "backend/rust") }));
  }

  if (javaOk) {
    console.log("[dev] Starting Java backend → http://localhost:3001");
    procs.push(pmRun("backend:java", null, javaEnv()));
  }

  if (goOk) {
    console.log("[dev] Starting Go backend → http://localhost:3003");
    procs.push(pmRun("backend:go"));
  }

  if (calcOk) {
    console.log("[dev] Starting Calculator backend → http://localhost:8084");
    procs.push(run("./build/calc_server", [], { cwd: join(ROOT, "backend/cpp-backend") }));
  }

  if (!BACKEND_ONLY) {
    console.log("[dev] Starting Frontend → http://localhost:3000");
    procs.push(pmFrontendDev());
  }

  console.log("\n[dev] All services started. Press Ctrl+C to stop.\n");

  // ── Shutdown ──
  let shuttingDown = false;
  function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("\n[dev] Shutting down all services...");
    for (const p of procs) {
      try { p.kill("SIGTERM"); } catch {}
    }
    setTimeout(() => process.exit(0), 1000);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
