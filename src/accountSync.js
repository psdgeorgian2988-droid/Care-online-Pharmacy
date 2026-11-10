import { apiFetch } from "./apiBase.js";

function accountBody(profile = {}) {
  const { photo, ...rest } = profile;
  return rest;
}

export function publishAccount(profile) {
  const mobile = String(profile?.mobile || "").replace(/\D/g, "");
  if (mobile.length < 10) return Promise.resolve(null);
  return apiFetch("/api/accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(accountBody(profile)),
  }).catch(() => null);
}

export async function loginAccountOnServer(mobile, pin) {
  try {
    const response = await apiFetch("/api/accounts/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile, pin }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.account) {
      return {
        account: null,
        status: response.status,
        error: data.error || "",
      };
    }
    return { account: data.account, status: response.status, error: "" };
  } catch {
    return { account: null, status: 0, error: "" };
  }
}
