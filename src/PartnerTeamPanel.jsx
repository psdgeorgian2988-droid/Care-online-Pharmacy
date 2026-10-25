import { useState } from "react";
import { emptyPartnerProfile } from "./partnerProfile.js";
import { teamFrom, teamStatusLabel } from "./partnerTeam.js";
import {
  addPartnerTeamMember,
  removePartnerTeamMember,
  updatePartnerTeamMember,
} from "./partnerApi.js";

const emptyDraft = (role = "Team member") => ({
  name: "",
  mobile: "",
  role,
  profile: emptyPartnerProfile(),
});

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

export default function PartnerTeamPanel({ partner, onSaved }) {
  const team = teamFrom(partner?.team);
  const [draft, setDraft] = useState(() => emptyDraft(partner?.role || "Team member"));
  const [editingId, setEditingId] = useState("");
  const [mode, setMode] = useState("list");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const setProfile = (patch) =>
    setDraft((current) => ({ ...current, profile: { ...current.profile, ...patch } }));

  const showList = () => {
    setEditingId("");
    setDraft(emptyDraft(partner?.role || "Team member"));
    setMode("list");
  };

  const openAdd = () => {
    setEditingId("");
    setDraft(emptyDraft(partner?.role || "Team member"));
    setError("");
    setNote("");
    setMode("form");
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
    setMode("form");
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
            { name: saved.fileName, fileName: saved.fileName, fileType: saved.fileType, fileData: saved.fileData },
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

  const save = async () => {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const body = {
        name: draft.name,
        mobile: draft.mobile,
        role: draft.role,
        profile: draft.profile,
      };
      const wasEditing = Boolean(editingId);
      const data = wasEditing
        ? await updatePartnerTeamMember(editingId, body)
        : await addPartnerTeamMember(body);
      onSaved?.(data.partner);
      setEditingId("");
      setDraft(emptyDraft(partner?.role || "Team member"));
      setMode("list");
      setNote(
        wasEditing
          ? "Profile updated. Admin approval is required again before this person can be assigned."
          : "Team member added. Admin will approve the profile before you can assign this person."
      );
    } catch (err) {
      setError(err.message || "Could not save the team member.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (member) => {
    const ok = window.confirm(`Remove ${member.name} from the team?`);
    if (!ok) return;
    setBusy(true);
    setError("");
    setNote("");
    try {
      const data = await removePartnerTeamMember(member.id);
      onSaved?.(data.partner);
      if (editingId === member.id) showList();
    } catch (err) {
      setError(err.message || "Could not remove the team member.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="partner-team">
      <style>{`
        .partner-team{display:flex;flex-direction:column;gap:12px;margin:8px 0 16px}
        .partner-team-card,.partner-team-form{border:1px solid #d7e2e9;border-radius:10px;padding:12px;background:#fff;display:flex;flex-direction:column;gap:8px}
        .partner-team-card{flex-direction:row;justify-content:space-between;align-items:center;gap:10px}
        .partner-team h2{margin:0;font-size:16px}
        .partner-team p{margin:0;font-size:13px;line-height:1.4}
        .partner-team label{display:flex;flex-direction:column;gap:4px;font-size:12px}
        .partner-team input,.partner-team button{font:inherit}
        .partner-team input{min-height:34px;padding:6px 8px;border:1px solid #d7e2e9;border-radius:6px}
        .partner-team-actions{display:flex;gap:8px;flex-wrap:wrap}
        .partner-team-actions button{min-height:32px;padding:6px 10px;border-radius:6px;border:1px solid #c5d4de;background:#fff}
        .partner-team .partner-accept{border:0;background:#0b6b5a;color:#fff}
        .partner-team-status{font-size:12px;font-weight:700}
        .partner-team-status.is-approved{color:#0b6b5a}
        .partner-team-status.is-rejected{color:#9b2c2c}
        .partner-team-status.is-pending{color:#8a5a00}
        .partner-team-tabs{display:inline-flex;flex-wrap:wrap;padding:4px;border-radius:10px;background:#e8f1f6;gap:4px;width:fit-content}
        .partner-team-tabs button{border:0;background:transparent;color:#3d5a6c;font:inherit;font-size:13px;font-weight:700;padding:8px 14px;border-radius:8px;cursor:pointer;min-height:0}
        .partner-team-tabs button.is-on{background:#fff;color:#1a6b7a;box-shadow:0 1px 3px rgba(20,50,70,.08)}
      `}</style>
      <h2>Team</h2>
      <div className="partner-team-tabs" role="tablist" aria-label="Team">
        <button
          type="button"
          role="tab"
          className={mode === "list" ? "is-on" : ""}
          aria-selected={mode === "list"}
          onClick={showList}
        >
          Team members
        </button>
        <button
          type="button"
          role="tab"
          className={mode === "form" && !editingId ? "is-on" : ""}
          aria-selected={mode === "form" && !editingId}
          onClick={openAdd}
        >
          Add team member
        </button>
      </div>
      {mode === "list" ? (
        <>
          {note ? <p>{note}</p> : null}
          {error ? <p className="admin-error">{error}</p> : null}
          {team.length ? (
            team.map((member) => (
              <article key={member.id} className="partner-team-card">
                <div>
                  <strong>{member.name}</strong>
                  <p>
                    {member.role} · {member.mobile}
                    {member.profile?.qualification ? ` · ${member.profile.qualification}` : ""}
                  </p>
                  <p className={`partner-team-status is-${member.status}`}>{teamStatusLabel(member.status)}</p>
                  {member.reviewNote ? <p>{member.reviewNote}</p> : null}
                </div>
                <div className="partner-team-actions">
                  <button type="button" disabled={busy} onClick={() => startEdit(member)}>
                    Edit details
                  </button>
                  <button type="button" disabled={busy} onClick={() => remove(member)}>
                    Remove
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p>No team members yet.</p>
          )}
        </>
      ) : (
      <form
        className="partner-team-form"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <h2>{editingId ? "Edit details" : "Add team member"}</h2>
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
        {error ? <p className="admin-error">{error}</p> : null}
        {note ? <p>{note}</p> : null}
        <div className="partner-team-actions">
          <button type="submit" className="partner-accept" disabled={busy}>
            {busy ? "Saving…" : editingId ? "Save details" : "Add to team"}
          </button>
          <button type="button" disabled={busy} onClick={showList}>
            Cancel
          </button>
        </div>
      </form>
      )}
    </section>
  );
}
