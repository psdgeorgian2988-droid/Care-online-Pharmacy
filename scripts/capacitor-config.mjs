import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const liveServer = String(process.env.MEDIHOME_APP_SERVER || "").trim().replace(/\/$/, "");

const config = {
  appId: "in.medihome.app",
  appName: "MediHome",
  webDir: "dist",
  android: {
    allowMixedContent: true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchShowDuration: 400,
      backgroundColor: "#eaf4fb",
      launchAutoHide: false,
    },
    StatusBar: {
      overlaysWebView: false,
      style: "DARK",
      backgroundColor: "#eaf6f3",
    },
  },
};

if (liveServer) {
  config.server = {
    url: liveServer,
    cleartext: liveServer.startsWith("http://"),
  };
}

writeFileSync(
  path.join(root, "capacitor.config.json"),
  `${JSON.stringify(config, null, 2)}\n`
);

console.log(
  liveServer
    ? `Capacitor will load ${liveServer} (live reload).`
    : "Capacitor will use the bundled dist/ build."
);
