export function parseAppHash(rawHash) {
  let value = rawHash || "";
  if (value.startsWith("#")) {
    value = value.slice(1);
  }
  try {
    value = decodeURIComponent(value);
  } catch {
    value = value.replace(/%3F/gi, "?").replace(/%3D/gi, "=");
  }
  const queryIndex = value.indexOf("?");
  const path = (queryIndex === -1 ? value : value.slice(0, queryIndex))
    .trim()
    .replace(/^\/+/, "")
    .toLowerCase();
  const query = queryIndex === -1 ? "" : value.slice(queryIndex + 1);
  let q = "";
  let id = "";
  let step = "";
  let plan = "";
  let service = "";
  try {
    const params = new URLSearchParams(query);
    q = (params.get("q") || "").trim();
    id = (params.get("id") || "").trim();
    step = (params.get("step") || "").trim();
    plan = (params.get("plan") || "").trim();
    service = (params.get("service") || "").trim();
  } catch {
    q = "";
    id = "";
    step = "";
    plan = "";
    service = "";
  }
  const HASH_ALIASES = {
    social: "contact",
    staff: "admin",
    ops: "admin",
    partners: "partner",
    customer: "home",
    app: "apps",
  };
  const mapped = HASH_ALIASES[path] || path;
  const route = !mapped || mapped === "home" ? "#home" : `#${mapped}`;
  return { route, q, id, step, plan, service };
}

export function goToHash(nextHash) {
  const hash = nextHash.startsWith("#") ? nextHash : `#${nextHash}`;
  const url = `${window.location.pathname}${window.location.search}${hash}`;
  window.history.pushState(null, "", url);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}
