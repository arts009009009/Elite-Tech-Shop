#!/usr/bin/env node

import { spawn, execSync } from "child_process";

function has(cmd) {
  try { execSync(`${cmd} --version`, { stdio: "ignore" }); return true; } catch { return false; }
}

function detectPM() {
  if (has("bun")) return "bun";
  if (has("deno")) return "deno";
  if (has("pnpm")) return "pnpm";
  if (has("yarn")) return "yarn";
  return "npm";
}

const pm = detectPM();
console.log(`[install] Using ${pm}`);

function run(cmd, args, opts = {}) {
  const child = spawn(cmd, args, { stdio: "inherit", shell: true, ...opts });
  return new Promise((resolve) => child.on("close", resolve));
}

async function main() {
  console.log("[install] Installing root dependencies...");
  switch (pm) {
    case "bun":    await run("bun", ["install"]); break;
    case "deno":   await run("deno", ["install"]); break;
    case "pnpm":   await run("pnpm", ["install"]); break;
    case "yarn":   await run("yarn", ["install"]); break;
    default:       await run("npm", ["install"]); break;
  }

  console.log("[install] Installing frontend dependencies...");
  const frontendOpts = { cwd: process.cwd() + "/frontend" };
  switch (pm) {
    case "bun":    await run("bun", ["install"], frontendOpts); break;
    case "deno":   await run("deno", ["install"], frontendOpts); break;
    case "pnpm":   await run("pnpm", ["install"], frontendOpts); break;
    case "yarn":   await run("yarn", ["install"], frontendOpts); break;
    default:       await run("npm", ["install"], frontendOpts); break;
  }

  console.log("[install] Done.");
}

main();
