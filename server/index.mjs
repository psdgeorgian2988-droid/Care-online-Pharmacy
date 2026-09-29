import http from "node:http";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleApi } from "./handler.mjs";
import { serveStatic } from "./static.mjs";
import { distIndex, ensureWebsiteBuild } from "./ensureBuild.mjs";
import { bindHttpServer, productionListen } from "./listenOptions.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(
  process.env.MEDIHOME_DIST || path.join(root, "..", "dist")
);
const listen = productionListen(process.env);

let distReady = existsSync(distIndex(distDir));
let distError = "";

const server = http.createServer(async (req, res) => {
  const handled = await handleApi(req, res);
  if (handled) return;

  if (distReady || existsSync(distIndex(distDir))) {
    distReady = true;
    await serveStatic(req, res, distDir);
    return;
  }

  res.statusCode = 503;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Retry-After", "10");
  res.end(
    JSON.stringify({
      error: distError || "Website is building. Refresh in a few seconds.",
    })
  );
});

// Bind before the Vite build so Passenger / GoDaddy's proxy does not 502.
bindHttpServer(server, listen, () => {
  const where = listen.host ? `${listen.host}:${listen.port}` : String(listen.port);
  console.log(`MediHome website + API on http://${where}`);
});

if (!distReady) {
  ensureWebsiteBuild(distDir)
    .then(() => {
      distReady = true;
    })
    .catch((err) => {
      distError = err instanceof Error ? err.message : String(err);
      console.error(distError);
    });
}
