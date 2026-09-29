import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(root, "..");

export function distIndex(distDir) {
  return path.join(distDir, "index.html");
}

export async function ensureWebsiteBuild(distDir) {
  if (existsSync(distIndex(distDir))) return false;

  const viteBin = path.join(projectRoot, "node_modules", "vite", "bin", "vite.js");
  if (!existsSync(viteBin)) {
    throw new Error("Vite is not installed. Run npm ci, then npm start.");
  }

  console.log("No website build found; running npm run build…");
  await execFileAsync(
    process.execPath,
    ["--max-old-space-size=4096", viteBin, "build"],
    {
      cwd: projectRoot,
      env: { ...process.env, NODE_ENV: "production" },
      maxBuffer: 32 * 1024 * 1024,
    }
  );

  if (!existsSync(distIndex(distDir))) {
    throw new Error("Website build finished but dist/index.html is missing.");
  }
  return true;
}
