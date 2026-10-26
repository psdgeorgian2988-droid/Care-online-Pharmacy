import { partnerProfileFrom } from "./partnerProfile.js";

function clip(value, max = 160) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function teamMemberFrom(row = {}) {
  if (!row || typeof row !== "object") return null;
  const id = clip(row.id, 40);
  const name = clip(row.name, 80);
  if (!id || name.length < 2) return null;
  const status = row.status === "approved" || row.status === "rejected" ? row.status : "pending";
  return {
    id,
    name,
    mobile: String(row.mobile || "").replace(/\D/g, "").slice(0, 10),
    role: clip(row.role, 80) || "Sample collection executive",
    profile: partnerProfileFrom({ profile: row.profile, email: row.profile?.email || row.email }),
    status,
    createdAt: Number(row.createdAt) > 0 ? Number(row.createdAt) : 0,
    reviewedAt: Number(row.reviewedAt) > 0 ? Number(row.reviewedAt) : 0,
    reviewNote: clip(row.reviewNote, 160),
  };
}

export function teamFrom(list) {
  return (Array.isArray(list) ? list : [])
    .slice(0, 30)
    .map((row) => teamMemberFrom(row))
    .filter(Boolean);
}

/** A member just added by the lab partner. Approval always starts pending. */
export function newTeamMember(body = {}, id = "T-NEW", now = Date.now()) {
  return teamMemberFrom({
    id,
    name: body.name,
    mobile: body.mobile,
    role: body.role,
    profile: body.profile,
    email: body.email,
    status: "pending",
    createdAt: now,
    reviewedAt: 0,
    reviewNote: "",
  });
}

export function reviewedTeamMember(member, status, note = "", now = Date.now()) {
  if (status !== "approved" && status !== "rejected") return null;
  const current = teamMemberFrom(member);
  if (!current) return null;
  return {
    ...current,
    status,
    reviewedAt: now,
    reviewNote: clip(note, 160),
  };
}

export function approvedTeam(list) {
  return teamFrom(list).filter((row) => row.status === "approved");
}

export function approvedTeamMember(partner, id) {
  const memberId = String(id || "").trim();
  if (!memberId) return null;
  return approvedTeam(partner?.team).find((row) => row.id === memberId) || null;
}

export function teamStatusLabel(status) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Not approved";
  return "Pending admin approval";
}

export function teamDocumentSummary(profile = {}) {
  const parts = [];
  if (profile.photoName || profile.photoData) parts.push(profile.photoName || "Photo");
  if (profile.aadhaarFileName || profile.aadhaarFileData) {
    parts.push(profile.aadhaarFileName || "Aadhaar card");
  }
  if (profile.policeFileName || profile.policeFileData) {
    parts.push(profile.policeFileName || "Police verification");
  }
  const certificates = Array.isArray(profile.certificates) ? profile.certificates : [];
  if (certificates.length) {
    const names = certificates.map((row) => row?.name).filter(Boolean);
    parts.push(names.length ? names.join(", ") : `${certificates.length} certificate(s)`);
  }
  return parts.join(" · ");
}
