import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function sendFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  res.statusCode = 200;
  res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
  createReadStream(filePath).pipe(res);
  return true;
}

export async function serveStatic(req, res, distDir) {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  let rel = decodeURIComponent(url.pathname);
  if (!rel || rel === "/") rel = "/index.html";
  if (rel.endsWith("/")) rel += "index.html";

  const root = path.resolve(distDir);
  const abs = path.resolve(root, `.${rel}`);
  if (!abs.startsWith(root)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return true;
  }

  try {
    const info = await stat(abs);
    if (info.isFile()) return sendFile(abs, res);
    if (info.isDirectory()) {
      return sendFile(path.join(abs, "index.html"), res);
    }
  } catch {
    /* fall through to index.html for client routes */
  }

  try {
    await stat(path.join(root, "index.html"));
    return sendFile(path.join(root, "index.html"), res);
  } catch {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Build the site first: npm run build");
    return true;
  }
}
