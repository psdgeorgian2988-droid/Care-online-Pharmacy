import { useState } from "react";
import { reviewStaffTeamMember } from "./adminApi";
import { teamFrom, teamStatusLabel } from "./partnerTeam.js";

export default function AdminTeamApprovals({ partners = [], onChange }) {
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const rows = partners.flatMap((partner) =>
    teamFrom(partner.team).map((member) => ({ partner, member }))
  );
  const pending = rows.filter((row) => row.member.status === "pending");
  const reviewed = rows.filter((row) => row.member.status !== "pending");

  const review = async (partner, member, status) => {
    setBusyId(member.id);
    setError("");
    setNote("");
    try {
      const data = await reviewStaffTeamMember(partner.id, member.id, status);
      onChange?.(data.partners || []);
      setNote(status === "approved" ? `${member.name} is approved.` : `${member.name} was not approved.`);
    } catch (err) {
      setError(err.message || "Could not review that profile.");
    } finally {
      setBusyId("");
    }
  };

  const card = ({ partner, member }) => {
    const profile = member.profile || {};
    return (
      <article key={`${partner.id}-${member.id}`} className="admin-team-card">
        <div>
          <strong>{member.name}</strong>
          <p>
            {member.role} · {member.mobile}
          </p>
          <p>
            Lab partner: {partner.name}
            {profile.qualification ? ` · ${profile.qualification}` : ""}
            {profile.email ? ` · ${profile.email}` : ""}
          </p>
          <p>
            {profile.aadhaarNumber ? `Aadhaar ${profile.aadhaarNumber}` : "Aadhaar number not added"}
            {profile.photoData ? " · Photo added" : ""}
            {profile.aadhaarFileData ? " · Aadhaar file added" : ""}
            {profile.policeFileData ? " · Police verification added" : ""}
            {profile.certificates?.length ? ` · ${profile.certificates.length} certificate(s)` : ""}
          </p>
          <p className={`partner-team-status is-${member.status}`}>{teamStatusLabel(member.status)}</p>
        </div>
        <div className="admin-team-actions">
          <button
            type="button"
            disabled={busyId === member.id || member.status === "approved"}
            onClick={() => review(partner, member, "approved")}
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busyId === member.id || member.status === "rejected"}
            onClick={() => review(partner, member, "rejected")}
          >
            Reject
          </button>
        </div>
      </article>
    );
  };

  return (
    <section className="admin-team">
      <style>{`
        .admin-team{display:flex;flex-direction:column;gap:10px;margin:16px 0}
        .admin-team h2{margin:0;font-size:18px}
        .admin-team p{margin:0;font-size:13px;line-height:1.4}
        .admin-team-card{border:1px solid #d7e2e9;border-radius:10px;padding:12px;background:#fff;display:flex;justify-content:space-between;gap:12px;align-items:center}
        .admin-team-actions{display:flex;gap:8px}
        .admin-team-actions button{min-height:32px;padding:6px 10px;border-radius:6px;border:1px solid #c5d4de;background:#fff}
        .partner-team-status{font-size:12px;font-weight:700}
        .partner-team-status.is-approved{color:#0b6b5a}
        .partner-team-status.is-rejected{color:#9b2c2c}
        .partner-team-status.is-pending{color:#8a5a00}
      `}</style>
      <h2>Lab team profiles</h2>
      <p>Profiles added by a lab partner. Approve a profile before that person can be assigned to an order.</p>
      {error ? <p className="admin-error">{error}</p> : null}
      {note ? <p>{note}</p> : null}
      {pending.length ? pending.map(card) : <p>No team profiles are waiting for approval.</p>}
      {reviewed.length ? (
        <>
          <h2>Reviewed</h2>
          {reviewed.map(card)}
        </>
      ) : null}
    </section>
  );
}
