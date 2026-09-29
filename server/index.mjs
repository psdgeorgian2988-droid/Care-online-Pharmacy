import http from "node:http";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleApi } from "./handler.mjs";
import { serveStatic } from "./static.mjs";
import { ensureWebsiteBuild } from "./ensureBuild.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(
  process.env.MEDIHOME_DIST || path.join(root, "..", "dist")
);
const port = Number(process.env.PORT || process.env.MEDIHOME_API_PORT || 3001);
const host = process.env.MEDIHOME_HOST || "0.0.0.0";

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
      error: "Website build not found. Run npm run build, then npm start.",
    })
  );
});

try {
  await ensureWebsiteBuild(distDir);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

server.listen(port, host, () => {
  console.log(`MediHome website + API on http://${host}:${port}`);
});
