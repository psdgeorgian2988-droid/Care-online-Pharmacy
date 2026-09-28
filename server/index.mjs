import http from "node:http";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleApi } from "./handler.mjs";
import { RELEASE } from "./release.mjs";
import { serveStatic } from "./static.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(root, "..");
const distDir = path.resolve(
  process.env.MEDIHOME_DIST || path.join(appRoot, "dist")
);
const port = Number(process.env.PORT || process.env.MEDIHOME_API_PORT || 3001);
const host = process.env.MEDIHOME_HOST || "0.0.0.0";

function skipWebsiteBuild() {
  return process.env.MEDIHOME_SKIP_BUILD === "1";
}

function buildWebsiteFromSource() {
  const vite = path.join(appRoot, "node_modules", "vite", "bin", "vite.js");
  if (!existsSync(vite)) {
    console.error("Vite is not installed. Run npm install, then npm start.");
    process.exit(1);
  }
  console.log(`Building MediHome website (${RELEASE.id}) from source…`);
  const result = spawnSync(
    process.execPath,
    ["--max-old-space-size=4096", vite, "build"],
    { cwd: appRoot, stdio: "inherit", env: process.env }
  );
  if (result.status !== 0) {
    console.error("Website build failed.");
    process.exit(result.status || 1);
  }
}

if (!skipWebsiteBuild()) {
  buildWebsiteFromSource();
}

const server = http.createServer(async (req, res) => {
  const handled = await handleApi(req, res);
  if (handled) return;

  if (existsSync(distDir)) {
    await serveStatic(req, res, distDir);
    return;
  }

  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(
    JSON.stringify({
      error: "Website build not found. Run npm start so the site is built from source.",
    })
  );
});

server.listen(port, host, () => {
  const hasSite = existsSync(distDir);
  console.log(
    hasSite
      ? `MediHome ${RELEASE.id} on http://${host}:${port}`
      : `MediHome API only on http://${host}:${port}`
  );
});
