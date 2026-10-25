#!/usr/bin/env node

import { spawn, execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

// Derive the project root from this script's location so installs work no
// matter which directory the script is launched from.
const ROOT = fileURLToPath(new URL("..", import.meta.url));

function has(cmd) {
  try { execSync(`${cmd} --version`, { stdio: "ignore" }); return true; } catch { return false; }
}

// Keep this detection in sync with scripts/dev-all.mjs — mixing package
// managers is how the repo ended up with multiple lockfiles.
function detectPM() {
  // 1. Honor the "packageManager" field in package.json.
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    const name = String(pkg.packageManager || "").split("@")[0]; // "yarn@4.18.1" → "yarn"
    if (["npm", "yarn", "pnpm", "bun"].includes(name)) return name;
  } catch {}

  // 2. Fall back to how this process was launched, then to PATH detection.
  //    (`deno install` is not a valid install command for a package.json project.)
  const ua = process.env.npm_config_user_agent || "";
  const execPath = process.env.npm_execpath || "";
  if (ua.includes("yarn") || execPath.includes("yarn")) return "yarn";
  if (ua.includes("pnpm") || execPath.includes("pnpm")) return "pnpm";
  if (ua.includes("bun") || execPath.includes("bun")) return "bun";
  if (has("npm")) return "npm";
  if (has("yarn")) return "yarn";
  if (has("pnpm")) return "pnpm";
  if (has("bun")) return "bun";
  return "npm";
}

const pm = detectPM();
console.log(`[install] Using ${pm}`);

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: true, ...opts });
    child.on("error", (err) => {
      console.error(`[install] Failed to run \`${cmd}\`: ${err.message}`);
      resolve(1);
    });
    // Resolve with the exit code so failures are not silently swallowed.
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function main() {
  const steps = [
    ["root", ROOT],
    ["frontend", join(ROOT, "frontend")],
  ];

  for (const [label, dir] of steps) {
    if (!existsSync(dir)) {
      console.error(`[install] ${label} directory not found: ${dir}`);
      process.exitCode = 1;
      return;
    }

    console.log(`[install] Installing ${label} dependencies...`);
    const code = await run(pm, ["install"], { cwd: dir });
    if (code !== 0) {
      console.error(`[install] ${label} install failed (exit ${code}). Aborting.`);
      process.exitCode = code;
      return;
    }
  }

  console.log("[install] Done.");
}

main().catch((err) => {
  console.error("[install] Fatal:", err);
  process.exit(1);
});
