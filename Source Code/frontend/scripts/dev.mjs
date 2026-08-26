import { rmSync, existsSync } from "fs";
import { join } from "path";
import { cwd } from "process";
import { createServer } from "http";
import { parse } from "url";
import next from "next";

const dev = true;
const app = next({ dev });
const handle = app.getRequestHandler();
const cacheDir = join(cwd(), ".next", "cache");
const port = parseInt(process.env.PORT || "3000", 10);

app.prepare().then(() => {
  createServer((req, res) => {
    if (existsSync(cacheDir)) {
      rmSync(cacheDir, { recursive: true, force: true });
    }
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, () => {
    console.log(`> Dev server with auto-clear cache on http://localhost:${port}`);
  });
});
