import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFile, execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(root, "..");

export function distIndex(distDir) {
  return path.join(distDir, "index.html");
}

function distStampPath(distDir) {
  return path.join(distDir, ".source-stamp");
}

function currentSourceStamp() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function builtSourceStamp(distDir) {
  const stamp = distStampPath(distDir);
  if (!existsSync(stamp)) return "";
  try {
    return readFileSync(stamp, "utf8").trim();
  } catch {
    return "";
  }
}

export async function ensureWebsiteBuild(distDir) {
  const sourceStamp = currentSourceStamp();
  const builtStamp = builtSourceStamp(distDir);
  const haveBuild = existsSync(distIndex(distDir));
  const stampMatches = Boolean(sourceStamp) && sourceStamp === builtStamp;
  if (haveBuild && stampMatches) return false;

  const viteBin = path.join(projectRoot, "node_modules", "vite", "bin", "vite.js");
  if (!existsSync(viteBin)) {
    throw new Error("Vite is not installed. Run npm ci, then npm start.");
  }

  console.log("Website source changed; running npm run build…");
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
  if (sourceStamp) {
    writeFileSync(distStampPath(distDir), `${sourceStamp}\n`);
  }
  return true;
}
