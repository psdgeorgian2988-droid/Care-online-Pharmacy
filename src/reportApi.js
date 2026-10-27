import { apiFetch } from "./apiBase.js";
import { staffToken } from "./adminApi.js";
import { partnerSession } from "./partnerApi.js";

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not search reports.");
  return data;
}

function query(params) {
  const search = new URLSearchParams();
  if (params.mobile) search.set("mobile", params.mobile);
  if (params.email) search.set("email", params.email);
  const text = search.toString();
  return text ? `?${text}` : "";
}

export async function searchStaffReports(params) {
  return parseResponse(
    await apiFetch(`/api/admin/reports${query(params)}`, {
      headers: { Authorization: `Bearer ${staffToken()}` },
    })
  );
}

export async function openStaffReport(id) {
  return parseResponse(
    await apiFetch(`/api/admin/reports/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${staffToken()}` },
    })
  );
}

export async function searchPartnerReports(params) {
  const { token } = partnerSession();
  return parseResponse(
    await apiFetch(`/api/partner/reports${query(params)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  );
}

export async function openPartnerReport(id) {
  const { token } = partnerSession();
  return parseResponse(
    await apiFetch(`/api/partner/reports/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  );
}
