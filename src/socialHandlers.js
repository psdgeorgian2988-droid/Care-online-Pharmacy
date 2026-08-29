import { isNativeRuntime } from "./appRuntime.js";
import { SITE, SOCIAL } from "./siteMeta.js";

export { isNativeRuntime };

export function socialById(id) {
  return SOCIAL.find((item) => item.id === id) || null;
}

export function handleUsername(handle) {
  return String(handle || "")
    .replace(/^@/, "")
    .trim();
}

export function nativeAppUrl(item) {
  if (!item) return "";
  const user = handleUsername(item.handle);
  switch (item.id) {
    case "instagram":
      return `instagram://user?username=${encodeURIComponent(user)}`;
    case "facebook":
      return `fb://facewebmodal/f?href=${encodeURIComponent(item.href)}`;
    case "youtube": {
      try {
        const parsed = new URL(item.href);
        return `youtube://${parsed.host}${parsed.pathname}`;
      } catch {
        return "";
      }
    }
    case "linkedin":
      return `linkedin://company/${encodeURIComponent(user.toLowerCase())}`;
    case "x":
      return `twitter://user?screen_name=${encodeURIComponent(user)}`;
    case "whatsapp": {
      const phone = String(SITE.whatsapp || "").replace(/\D/g, "");
      let text = "";
      try {
        text = new URL(item.href).searchParams.get("text") || "";
      } catch {
        text = "";
      }
      return `whatsapp://send?phone=${phone}${
        text ? `&text=${encodeURIComponent(text)}` : ""
      }`;
    }
    default:
      return "";
  }
}

export function openExternalUrl(url, env = globalThis) {
  if (!url) return false;
  try {
    const opened = env.open?.(url, "_blank");
    if (opened) {
      opened.opener = null;
      return true;
    }
  } catch {
    /* popup blocked */
  }
  env.location?.assign?.(url);
  return true;
}

export function openSocial(item, env = globalThis) {
  if (!item?.href) return "";
  const url =
    isNativeRuntime(env) && nativeAppUrl(item) ? nativeAppUrl(item) : item.href;
  openExternalUrl(url, env);
  return url;
}

export async function copyHandle(item, env = globalThis) {
  const text = String(item?.handle || "").trim();
  if (!text) return "";
  await env.navigator.clipboard.writeText(text);
  return text;
}

export function sharePayload() {
  return {
    title: SITE.name,
    text: `${SITE.name} — ${SITE.tagline}`,
    url: SITE.url,
  };
}

export async function shareMediHome(env = globalThis) {
  const payload = sharePayload();
  if (typeof env.navigator?.share === "function") {
    await env.navigator.share(payload);
    return "shared";
  }
  const line = `${payload.title}\n${payload.text}\n${payload.url}`;
  if (env.navigator?.clipboard?.writeText) {
    await env.navigator.clipboard.writeText(line);
    return "copied";
  }
  return "none";
}
