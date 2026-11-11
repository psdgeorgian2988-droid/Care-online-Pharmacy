import { apiFetch } from "./apiBase.js";
import { readDeviceId } from "./deviceId.js";

function accountBody(profile = {}) {
  const { photo, ...rest } = profile;
  return rest;
}

export async function publishAccount(profile) {
  const mobile = String(profile?.mobile || "").replace(/\D/g, "");
  if (mobile.length < 10) return { ok: false, error: "Enter a valid 10-digit mobile number." };
  try {
    const response = await apiFetch("/api/accounts", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...accountBody(profile), deviceId: readDeviceId() }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: data.error || "Could not save this account." };
    }
    return { ok: true, account: data.account || null };
  } catch {
    return { ok: false, error: "Could not save this account." };
  }
}

export async function lookupAccountIdentity({ mobile = "", email = "" } = {}) {
  try {
    const response = await apiFetch("/api/accounts/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile, email, deviceId: readDeviceId() }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: data.error || "Enter a mobile number or mail ID." };
    }
    return { ok: true, ...data };
  } catch {
    return { ok: false, error: "Could not check this mobile number or mail ID." };
  }
}

export async function requestLoginOtp({ mobile = "", email = "" } = {}) {
  try {
    const response = await apiFetch("/api/accounts/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile, email }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: data.error || "Could not send the login code." };
    }
    return { ok: true, ...data };
  } catch {
    return { ok: false, error: "Could not send the login code." };
  }
}

export async function verifyLoginOtp({ mobile = "", email = "", otp = "" } = {}) {
  try {
    const response = await apiFetch("/api/accounts/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile, email, otp, deviceId: readDeviceId() }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: data.error || "That login code does not match." };
    }
    return { ok: true, ...data };
  } catch {
    return { ok: false, error: "Could not check the login code." };
  }
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
