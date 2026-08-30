const TOKEN_KEY = "mediHomePartnerToken";
const PARTNER_KEY = "mediHomePartner";

export function partnerSession() {
  try {
    return {
      token: localStorage.getItem(TOKEN_KEY) || "",
      partner: JSON.parse(localStorage.getItem(PARTNER_KEY) || "null"),
    };
  } catch {
    return { token: "", partner: null };
  }
}

export function setPartnerSession(token, partner) {
  try {
    if (token && partner) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(PARTNER_KEY, JSON.stringify(partner));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(PARTNER_KEY);
    }
  } catch {
    /* ignore */
  }
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data;
}

export async function partnerLogin(loginId, password) {
  const data = await parseResponse(
    await fetch("/api/partner/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, password }),
    })
  );
  setPartnerSession(data.token, data.partner);
  return data;
}

export function partnerLogout() {
  setPartnerSession("", null);
}

export async function fetchPartnerJobs() {
  const { token, partner } = partnerSession();
  const params = new URLSearchParams({
    partnerId: partner?.id || "",
    token,
  });
  return parseResponse(
    await fetch(`/api/partner/jobs?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  );
}

export async function patchPartnerJob(id, patch) {
  const { token } = partnerSession();
  return parseResponse(
    await fetch(`/api/partner/jobs/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch),
    })
  );
}
