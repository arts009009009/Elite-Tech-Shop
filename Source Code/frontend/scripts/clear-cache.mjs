import { rmSync, existsSync } from "fs";
import { join } from "path";
import { cwd } from "process";

const cacheDir = join(cwd(), ".next", "cache");

if (existsSync(cacheDir)) {
  rmSync(cacheDir, { recursive: true, force: true });
}
