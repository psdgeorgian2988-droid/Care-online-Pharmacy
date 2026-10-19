import { existsSync, readdirSync, statSync } from "node:fs";
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

function latestMtime(target) {
  if (!existsSync(target)) return 0;
  const info = statSync(target);
  if (info.isFile()) return info.mtimeMs;
  let latest = info.mtimeMs;
  for (const entry of readdirSync(target, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") {
      continue;
    }
    const next = latestMtime(path.join(target, entry.name));
    if (next > latest) latest = next;
  }
  return latest;
}

function sourceIsNewerThanDist(distDir) {
  const built = distIndex(distDir);
  if (!existsSync(built)) return true;
  const distTime = statSync(built).mtimeMs;
  const watched = ["src", "index.html", "vite.config.js", "vite.config.mjs", "public"].map(
    (name) => path.join(projectRoot, name)
  );
  return watched.some((item) => latestMtime(item) > distTime);
}

export async function ensureWebsiteBuild(distDir) {
  if (existsSync(distIndex(distDir)) && !sourceIsNewerThanDist(distDir)) {
    return false;
  }

  const viteBin = path.join(projectRoot, "node_modules", "vite", "bin", "vite.js");
  if (!existsSync(viteBin)) {
    throw new Error("Vite is not installed. Run npm ci, then npm start.");
  }

  console.log("Website source is newer than dist; running npm run build…");
  const heapMb = String(process.env.MEDIHOME_BUILD_HEAP_MB || "1024");
  await execFileAsync(
    process.execPath,
    [`--max-old-space-size=${heapMb}`, viteBin, "build"],
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
