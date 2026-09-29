const DEFAULT_PORT = 3001;
const DEFAULT_HOST = "0.0.0.0";

function isPassenger() {
  return typeof globalThis.PhusionPassenger !== "undefined";
}

function isSocketPath(value) {
  return typeof value === "string" && value.startsWith("/");
}

/**
 * Port/host for production `npm start`.
 * GoDaddy/Passenger set PORT; never use Vite's 5173.
 */
export function productionListen(env = process.env) {
  if (isPassenger()) {
    return { port: "passenger", host: undefined, passenger: true };
  }

  const rawPort = env.PORT || env.MEDIHOME_API_PORT || String(DEFAULT_PORT);
  if (isSocketPath(rawPort)) {
    return { port: rawPort, host: undefined, passenger: false };
  }

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid PORT "${rawPort}". Use the PORT GoDaddy sets, not Vite port 5173.`
    );
  }

  const host = String(env.MEDIHOME_HOST || DEFAULT_HOST).trim() || DEFAULT_HOST;
  return { port, host, passenger: false };
}

export function bindHttpServer(server, options, onListen) {
  if (options.passenger || options.port === "passenger") {
    return server.listen("passenger", onListen);
  }
  if (options.host == null || options.host === "") {
    return server.listen(options.port, onListen);
  }
  return server.listen(options.port, options.host, onListen);
}
