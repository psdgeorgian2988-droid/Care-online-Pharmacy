import http from "node:http";
import { handleApi } from "./handler.mjs";

const port = Number(process.env.MEDIHOME_API_PORT || 3001);

const server = http.createServer(async (req, res) => {
  const handled = await handleApi(req, res);
  if (!handled) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Not found." }));
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`MediHome staff API on http://0.0.0.0:${port}`);
});
