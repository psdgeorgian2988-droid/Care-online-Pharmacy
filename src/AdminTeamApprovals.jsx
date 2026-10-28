import { useState } from "react";
import { AdminSectionGuard } from "./adminLeave";
import { deleteStaffTeamMember, reviewStaffTeamMember, updateStaffTeamMember } from "./adminApi";
import { emptyPartnerProfile } from "./partnerProfile.js";
import { teamDocumentSummary, teamFrom, teamStatusLabel } from "./partnerTeam.js";

function readDataFile(file, maxBytes) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("Choose a file."));
      return;
    }
    if (file.size > maxBytes) {
      const mb = Math.round(maxBytes / (1024 * 1024));
      reject(new Error(`That file must be ${mb} MB or smaller.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        fileName: file.name,
        fileType: file.type || "",
        fileData: String(reader.result || ""),
      });
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read that photo."));
    image.src = src;
  });
}

async function readTeamPhoto(file) {
  const type = String(file?.type || "").toLowerCase();
  const name = String(file?.name || "");
  const jpeg = type === "image/jpeg" || /\.jpe?g$/i.test(name);
  const png = type === "image/png" || /\.png$/i.test(name);
  if (!jpeg && !png) throw new Error("Profile photo must be JPG or PNG.");
  if (file.size > 3 * 1024 * 1024) throw new Error("Profile photo must be 3 MB or smaller.");
  const raw = await readDataFile(file, 3 * 1024 * 1024);
  const image = await loadImage(raw.fileData);
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const scale = Math.max(512 / image.width, 512 / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  ctx.drawImage(image, (512 - width) / 2, (512 - height) / 2, width, height);
  const fileType = png ? "image/png" : "image/jpeg";
  return {
    fileName: name || (png ? "photo.png" : "photo.jpg"),
    fileType,
    fileData: canvas.toDataURL(fileType, 0.92),
  };
}

const emptyDraft = () => ({
  name: "",
  mobile: "",
  role: "",
  profile: emptyPartnerProfile(),
});

export default function AdminTeamApprovals({ partners = [], onChange, embedded = false }) {
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState("");
  const [openMemberId, setOpenMemberId] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const portfolios = [...partners]
    .map((partner) => ({
      partner,
      members: [...teamFrom(partner.team)].sort((a, b) => {
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (b.status === "pending" && a.status !== "pending") return 1;
        return String(a.name).localeCompare(String(b.name));
      }),
    }))
    .filter((row) => row.members.length)
    .sort((a, b) => String(a.partner.name).localeCompare(String(b.partner.name)));

  const setProfile = (patch) =>
    setDraft((current) => ({ ...current, profile: { ...current.profile, ...patch } }));

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

  const startEdit = (member) => {
    setEditingId(member.id);
    setDraft({
      name: member.name,
      mobile: member.mobile,
      role: member.role,
      profile: { ...emptyPartnerProfile(), ...member.profile },
    });
    setError("");
    setNote("");
  };

  const onPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      const photo = await readTeamPhoto(file);
      setProfile({ photoName: photo.fileName, photoType: photo.fileType, photoData: photo.fileData });
    } catch (err) {
      setError(err.message || "Could not add that photo.");
    }
  };

  const onDocument = async (event, key, maxBytes) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      const saved = await readDataFile(file, maxBytes);
      if (key === "certificate") {
        setProfile({
          certificates: [
            ...(draft.profile.certificates || []).slice(0, 5),
            {
              name: saved.fileName,
              fileName: saved.fileName,
              fileType: saved.fileType,
              fileData: saved.fileData,
            },
          ],
        });
        return;
      }
      setProfile({
        [`${key}FileName`]: saved.fileName,
        [`${key}FileType`]: saved.fileType,
        [`${key}FileData`]: saved.fileData,
      });
    } catch (err) {
      setError(err.message || "Could not add that document.");
    }
  };

  const saveEdit = async (partner, member) => {
    if (!partner || !member) return false;
    setBusyId(`save-${member.id}`);
    setError("");
    setNote("");
    try {
      const data = await updateStaffTeamMember(partner.id, member.id, {
        name: draft.name,
        mobile: draft.mobile,
        role: draft.role,
        profile: draft.profile,
      });
      onChange?.(data.partners || []);
      setEditingId("");
      setDraft(emptyDraft());
      setNote(`Details saved for ${draft.name || member.name}.`);
      return true;
    } catch (err) {
      setError(err.message || "Could not save the team member.");
      return false;
    } finally {
      setBusyId("");
    }
  };

  const remove = async (partner, member) => {
    const ok = window.confirm(`Remove ${member.name} from ${partner.name}'s team?`);
    if (!ok) return;
    setBusyId(`remove-${member.id}`);
    setError("");
    setNote("");
    try {
      const data = await deleteStaffTeamMember(partner.id, member.id);
      onChange?.(data.partners || []);
      if (editingId === member.id) setEditingId("");
      setNote(`${member.name} removed.`);
    } catch (err) {
      setError(err.message || "Could not remove the team member.");
    } finally {
      setBusyId("");
    }
  };

  const closeMember = (memberId) => {
    setOpenMemberId("");
    if (editingId === memberId) setEditingId("");
  };

  const card = ({ partner, member }) => {
    const profile = member.profile || {};
    const editing = editingId === member.id;
    return (
      <article key={`${partner.id}-${member.id}`} className="admin-team-card">
        <div className="detail-stack">
          <div className="member-open-head">
            <strong>{member.name}</strong>
            <button type="button" onClick={() => closeMember(member.id)}>
              Close
            </button>
          </div>
          <div className="detail-row"><span>Mobile</span><strong>{member.mobile || "—"}</strong></div>
          <div className="detail-row"><span>Category</span><strong>{member.role || "—"}</strong></div>
          <div className="detail-row"><span>Qualification</span><strong>{profile.qualification || "—"}</strong></div>
          <div className="detail-row"><span>Email</span><strong>{profile.email || "—"}</strong></div>
          <div className="detail-row"><span>Aadhaar</span><strong>{profile.aadhaarNumber || "—"}</strong></div>
          <div className="detail-row"><span>Documents</span><strong>{teamDocumentSummary(profile) || "—"}</strong></div>
          <div className="detail-row">
            <span>Status</span>
            <strong className={`partner-team-status is-${member.status}`}>{teamStatusLabel(member.status)}</strong>
          </div>
          <div className="detail-actions">
          <button
            type="button"
            disabled={busyId === member.id}
            onClick={() => (editing ? setEditingId("") : startEdit(member))}
          >
            {editing ? "Cancel" : "Edit"}
          </button>
          <button
            type="button"
            className="is-delete"
            disabled={busyId === `remove-${member.id}`}
            onClick={() => remove(partner, member)}
          >
            {busyId === `remove-${member.id}` ? "…" : "Delete"}
          </button>
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
        </div>
          {editing ? (
            <form
              className="admin-team-form"
              onSubmit={(event) => {
                event.preventDefault();
                saveEdit(partner, member);
              }}
            >
              <h3>Edit details</h3>
              <label>
                Name
                <input
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                  required
                  minLength={2}
                />
              </label>
              <label>
                Mobile
                <input
                  value={draft.mobile}
                  inputMode="numeric"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      mobile: event.target.value.replace(/\D/g, "").slice(0, 10),
                    }))
                  }
                  required
                  pattern="\d{10}"
                />
              </label>
              <label>
                Role
                <input
                  value={draft.role}
                  onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}
                />
              </label>
              <label>
                Qualification
                <input
                  value={draft.profile.qualification}
                  onChange={(event) => setProfile({ qualification: event.target.value })}
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={draft.profile.email}
                  onChange={(event) => setProfile({ email: event.target.value })}
                />
              </label>
              <label>
                Aadhaar number
                <input
                  value={draft.profile.aadhaarNumber}
                  inputMode="numeric"
                  onChange={(event) =>
                    setProfile({ aadhaarNumber: event.target.value.replace(/\D/g, "").slice(0, 12) })
                  }
                />
              </label>
              <label>
                Profile photo (JPG or PNG, 512×512, max 3 MB)
                <input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={onPhoto} />
                {draft.profile.photoName ? <span>{draft.profile.photoName}</span> : null}
              </label>
              <label>
                Aadhaar card (max 5 MB)
                <input
                  type="file"
                  accept="image/*,.pdf,application/pdf"
                  onChange={(event) => onDocument(event, "aadhaar", 5 * 1024 * 1024)}
                />
                {draft.profile.aadhaarFileName ? <span>{draft.profile.aadhaarFileName}</span> : null}
              </label>
              <label>
                Police verification (max 10 MB)
                <input
                  type="file"
                  accept="image/*,.pdf,application/pdf"
                  onChange={(event) => onDocument(event, "police", 10 * 1024 * 1024)}
                />
                {draft.profile.policeFileName ? <span>{draft.profile.policeFileName}</span> : null}
              </label>
              <label>
                Certificate (max 10 MB)
                <input
                  type="file"
                  accept="image/*,.pdf,application/pdf"
                  onChange={(event) => onDocument(event, "certificate", 10 * 1024 * 1024)}
                />
                {draft.profile.certificates?.length ? (
                  <span>{draft.profile.certificates.map((row) => row.name).filter(Boolean).join(", ")}</span>
                ) : null}
              </label>
              <div className="admin-team-actions">
                <button type="submit" disabled={busyId === `save-${member.id}`}>
                  {busyId === `save-${member.id}` ? "Saving…" : "Save details"}
                </button>
                <button type="button" onClick={() => setEditingId("")}>
                  Cancel
                </button>
              </div>
            </form>
          ) : null}
      </article>
    );
  };

  const savePending = () => {
    const portfolio = portfolios.find((row) => row.members.some((member) => member.id === editingId));
    const member = portfolio?.members.find((row) => row.id === editingId);
    return saveEdit(portfolio?.partner, member);
  };

  return (
    <section className="admin-team">
      <AdminSectionGuard dirty={Boolean(editingId)} save={savePending} />
      <style>{`
        .admin-team{display:flex;flex-direction:column;gap:10px;margin:16px 0}
        .admin-team-portfolio{display:flex;flex-direction:column;gap:8px;padding:12px;border:1px solid #d7e2e9;border-radius:12px;background:#f4f8fb}
        .admin-team h2,.admin-team h3{margin:0;font-size:18px}
        .admin-team h3{font-size:14px}
        .admin-team p{margin:0;font-size:13px;line-height:1.4}
        .admin-team-card{display:flex;flex-direction:column;gap:8px}
        .detail-actions button.is-delete{color:#9b2c2c;border-color:#e7c7c7}
        .admin-team-detail{margin-top:6px;color:#5d7180}
        .admin-team-actions{display:flex;flex-wrap:wrap;gap:8px}
        .admin-team-actions button{min-height:32px;padding:6px 10px;border-radius:6px;border:1px solid #c5d4de;background:#fff;font:inherit}
        .admin-team-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-top:10px}
        .admin-team-form h3,.admin-team-form .admin-team-actions{grid-column:1 / -1}
        .admin-team-form label{display:flex;flex-direction:column;gap:4px;font-size:12px}
        .admin-team-form input{min-height:34px;padding:6px 8px;border:1px solid #d7e2e9;border-radius:6px;font:inherit}
        .partner-team-status{font-size:12px;font-weight:700}
        .partner-team-status.is-approved{color:#0b6b5a}
        .partner-team-status.is-rejected{color:#9b2c2c}
        .partner-team-status.is-pending{color:#8a5a00}
      `}</style>
      <h2>{embedded ? "Team" : "Team members"}</h2>
      {error ? <p className="admin-error">{error}</p> : null}
      {note ? <p>{note}</p> : null}
      {portfolios.length ? (
        portfolios.map(({ partner, members }) => (
          <section
            key={partner.id}
            className="admin-team-portfolio"
            aria-label={`${partner.name} team`}
          >
            {embedded ? null : <h2>{partner.name}</h2>}
            <div className="member-tabs" role="tablist" aria-label={`${partner.name} team`}>
              {members.map((member) => {
                const open = openMemberId === member.id;
                return (
                  <button
                    key={member.id}
                    type="button"
                    role="tab"
                    className={open ? "is-on" : ""}
                    aria-selected={open}
                    onClick={() => setOpenMemberId(member.id)}
                  >
                    <span>{member.name}</span>
                    <span className="member-mobile">{member.mobile || "No mobile"}</span>
                  </button>
                );
              })}
            </div>
            {members
              .filter((member) => member.id === openMemberId)
              .map((member) => card({ partner, member }))}
          </section>
        ))
      ) : (
        <p>No team members yet.</p>
      )}
    </section>
  );
}
