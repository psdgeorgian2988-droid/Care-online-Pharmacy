const TOKEN_KEY = "mediHomeStaffToken";

export function staffToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setStaffToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
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

export async function publishOrder(record) {
  try {
    await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
  } catch {
    /* Keep the customer booking even if the staff API is down. */
  }
}

export async function staffLogin(user, password) {
  const data = await parseResponse(
    await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, password }),
    })
  );
  setStaffToken(data.token);
  return data;
}

export function staffLogout() {
  setStaffToken("");
}

export async function fetchStaffOrders() {
  return parseResponse(
    await fetch("/api/admin/orders", {
      headers: { Authorization: `Bearer ${staffToken()}` },
    })
  );
}

export async function fetchStaffPartners() {
  return parseResponse(
    await fetch("/api/admin/partners", {
      headers: { Authorization: `Bearer ${staffToken()}` },
    })
  );
}

export async function createStaffPartner(body) {
  return parseResponse(
    await fetch("/api/admin/partners", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${staffToken()}`,
      },
      body: JSON.stringify(body),
    })
  );
}

export async function resetStaffPartnerPassword(id) {
  return parseResponse(
    await fetch(`/api/admin/partners/${encodeURIComponent(id)}/reset-password`, {
      method: "POST",
      headers: { Authorization: `Bearer ${staffToken()}` },
    })
  );
}

export function partnerDocumentUrl(id, kind) {
  return `/api/admin/partners/${encodeURIComponent(id)}/document/${encodeURIComponent(kind)}`;
}

export async function openStaffPartnerDocument(id, kind) {
  const response = await fetch(partnerDocumentUrl(id, kind), {
    headers: { Authorization: `Bearer ${staffToken()}` },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Document not found.");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
}

export async function fetchPublicFeatures() {
  return parseResponse(await fetch("/api/features"));
}

export async function fetchStaffSettings() {
  return parseResponse(
    await fetch("/api/admin/settings", {
      headers: { Authorization: `Bearer ${staffToken()}` },
    })
  );
}

export async function patchStaffSettings(patch) {
  return parseResponse(
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${staffToken()}`,
      },
      body: JSON.stringify(patch),
    })
  );
}

export async function fetchStaffChats() {
  return parseResponse(
    await fetch("/api/admin/chats", {
      headers: { Authorization: `Bearer ${staffToken()}` },
    })
  );
}

export async function replyStaffChat(sessionId, text) {
  return parseResponse(
    await fetch(`/api/admin/chats/${encodeURIComponent(sessionId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${staffToken()}`,
      },
      body: JSON.stringify({ text }),
    })
  );
}

export async function patchStaffOrder(id, patch) {
  return parseResponse(
    await fetch(`/api/admin/orders/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${staffToken()}`,
      },
      body: JSON.stringify(patch),
    })
  );
}
