#!/usr/bin/env node

import { spawn, execSync } from "child_process";
import { existsSync, readdirSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const BACKEND_ONLY = process.argv.includes("--backend-only");

function has(cmd) {
  try {
    const out = execSync(`${cmd} --version`, { stdio: ["ignore", "pipe", "ignore"], timeout: 5000 }).toString().trim();
    return out.length > 0 && !out.includes("ERR_");
  } catch { return false; }
}

function detectPM() {
  const ua = process.env.npm_config_user_agent || "";
  const execPath = process.env.npm_execpath || "";

  // First, check environment variables (these tell us which PM actually ran the script)
  if (ua.includes("yarn") || execPath.includes("yarn")) return "yarn";
  if (ua.includes("pnpm") || execPath.includes("pnpm")) return "pnpm";
  if (ua.includes("bun") || execPath.includes("bun")) return "bun";
  if (ua.includes("deno") || execPath.includes("deno")) return "deno";

  // Fallback: check what's available on the system
  // npm is checked first since it's the default Node.js package manager
  if (has("npm")) return "npm";
  if (has("yarn")) return "yarn";
  if (has("pnpm")) return "pnpm";
  if (has("bun")) return "bun";
  if (has("deno")) return "deno";
  return "npm";
}

const pm = detectPM();
console.log(`[dev] Using ${pm}`);

function run(cmd, args, opts = {}) {
  const child = spawn(cmd, args, { stdio: "inherit", shell: true, ...opts });
  child.on("error", () => {});
  return child;
}

function pmRun(script, cwd) {
  const opts = cwd ? { cwd } : {};
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

function buildSync(label, cmd, cwd) {
  console.log(`[dev] Building ${label}...`);
  try {
    execSync(cmd, { cwd: cwd || ROOT, stdio: "inherit", timeout: 300000 });
    console.log(`[dev] ${label} build complete`);
  } catch {
    console.error(`[dev] ${label} build failed — skipping`);
    return false;
  }
  return true;
}

const procs = [];

const javaJarDir = join(ROOT, "backend/target");
const javaJarExists = existsSync(javaJarDir) && readdirSync(javaJarDir).some(f => f.startsWith("elite-shop-backend-") && f.endsWith(".jar"));
if (javaJarExists || buildSync("Java backend", "mvn clean package -DskipTests", join(ROOT, "backend"))) {
  const jarPresent = existsSync(javaJarDir) && readdirSync(javaJarDir).some(f => f.startsWith("elite-shop-backend-") && f.endsWith(".jar"));
  if (jarPresent) procs.push(pmRun("backend:java"));
}

if (existsSync(join(ROOT, "backend/rust/target/release/products-service")) || buildSync("Rust backend", "cargo build --release", join(ROOT, "backend/rust"))) {
  if (existsSync(join(ROOT, "backend/rust/target/release/products-service"))) procs.push(pmRun("backend:rust"));
}

if (existsSync(join(ROOT, "backend/go-backend")) || (has("go") && buildSync("Go backend", "go build -o ../go-backend", join(ROOT, "backend/go")))) {
  if (existsSync(join(ROOT, "backend/go-backend"))) procs.push(pmRun("backend:go"));
}

if (!BACKEND_ONLY) {
  procs.push(pmFrontendDev());
}

function shutdown() {
  for (const p of procs) {
    try { p.kill("SIGTERM"); } catch (e) {}
  }
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
