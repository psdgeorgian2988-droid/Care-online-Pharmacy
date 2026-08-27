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
  try {
    const params = new URLSearchParams(query);
    q = (params.get("q") || "").trim();
    id = (params.get("id") || "").trim();
    step = (params.get("step") || "").trim();
  } catch {
    q = "";
    id = "";
    step = "";
  }
  const route = !path || path === "home" ? "#home" : `#${path}`;
  return { route, q, id, step };
}

export function goToHash(nextHash) {
  const hash = nextHash.startsWith("#") ? nextHash : `#${nextHash}`;
  const url = `${window.location.pathname}${window.location.search}${hash}`;
  window.history.pushState(null, "", url);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}
