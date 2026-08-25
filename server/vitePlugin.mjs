import { handleApi } from "./handler.mjs";

export function mediHomeApiPlugin() {
  return {
    name: "medihome-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = String(req.url || "").split("?")[0];
        if (!path.startsWith("/api")) {
          next();
          return;
        }
        const handled = await handleApi(req, res);
        if (!handled) next();
      });
    },
  };
}
