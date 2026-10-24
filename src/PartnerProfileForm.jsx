import { useState } from "react";
import { savePartnerProfile } from "./partnerApi";
import { partnerProfileFrom } from "./partnerProfile";

function readPickedFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    if (file.size > 700000) {
      reject(new Error("Each file must be under 700 KB."));
      return;
    }
    const ok = /^image\//.test(file.type) || file.type === "application/pdf";
    if (!ok) {
      reject(new Error("Use a photo or PDF."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        fileName: file.name,
        fileType: file.type,
        fileData: String(reader.result || ""),
      });
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

export default function PartnerProfileForm({ partner, onSaved }) {
  const [draft, setDraft] = useState(() => partnerProfileFrom(partner));
  const [address, setAddress] = useState(partner?.address || "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const onFile = async (event, apply) => {
    setError("");
    try {
      const file = await readPickedFile(event.target.files?.[0]);
      if (file) apply(file);
    } catch (err) {
      setError(err.message || "Could not read that file.");
    }
    event.target.value = "";
  };

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNote("");
    try {
      const data = await savePartnerProfile({ address, profile: draft });
      onSaved?.(data.partner);
      setNote("Profile saved.");
    } catch (err) {
      setError(err.message || "Could not save the profile.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="partner-profile-form" onSubmit={save}>
      <h2>Profile</h2>
      <p className="admin-hint">
        Customers see this profile after you are assigned to their order.
      </p>
      <label>
        Photo
        <input
          type="file"
          accept="image/*"
          onChange={(event) =>
            onFile(event, (file) =>
              setDraft((current) => ({
                ...current,
                photoName: file.fileName,
                photoType: file.fileType,
                photoData: file.fileData,
              }))
            )
          }
        />
      </label>
      {draft.photoData ? <img className="partner-profile-photo" src={draft.photoData} alt="" /> : null}
      <label>
        Qualification
        <textarea
          value={draft.qualification}
          onChange={(event) =>
            setDraft((current) => ({ ...current, qualification: event.target.value }))
          }
          rows={3}
          placeholder="Degree, licence, or training"
        />
      </label>
      <label>
        Email
        <input
          type="email"
          value={draft.email}
          onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
          placeholder="name@email.com"
        />
      </label>
      <label>
        Mobile
        <input value={partner?.mobile || ""} readOnly />
      </label>
      <label>
        Address
        <textarea
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          rows={2}
          placeholder="Street, area, city"
        />
      </label>
      <label>
        Aadhaar number
        <input
          inputMode="numeric"
          maxLength={12}
          value={draft.aadhaarNumber}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              aadhaarNumber: event.target.value.replace(/\D/g, "").slice(0, 12),
            }))
          }
          placeholder="12-digit Aadhaar"
        />
      </label>
      <label>
        Aadhaar card
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(event) =>
            onFile(event, (file) =>
              setDraft((current) => ({
                ...current,
                aadhaarFileName: file.fileName,
                aadhaarFileType: file.fileType,
                aadhaarFileData: file.fileData,
              }))
            )
          }
        />
      </label>
      {draft.aadhaarFileName ? <p className="admin-hint">{draft.aadhaarFileName}</p> : null}
      <label>
        Police verification
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(event) =>
            onFile(event, (file) =>
              setDraft((current) => ({
                ...current,
                policeFileName: file.fileName,
                policeFileType: file.fileType,
                policeFileData: file.fileData,
              }))
            )
          }
        />
      </label>
      {draft.policeFileName ? <p className="admin-hint">{draft.policeFileName}</p> : null}
      <label>
        Certificate
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(event) =>
            onFile(event, (file) =>
              setDraft((current) => ({
                ...current,
                certificates: [
                  ...current.certificates,
                  { name: file.fileName.replace(/\.[^.]+$/, ""), ...file },
                ].slice(0, 6),
              }))
            )
          }
        />
      </label>
      {draft.certificates.length ? (
        <ul className="partner-profile-certs">
          {draft.certificates.map((item, index) => (
            <li key={`${item.fileName}-${index}`}>
              <span>{item.name || item.fileName}</span>
              <button
                type="button"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    certificates: current.certificates.filter((_, itemIndex) => itemIndex !== index),
                  }))
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="admin-error">{error}</p> : null}
      {note ? <p className="admin-hint">{note}</p> : null}
      <button type="submit" className="service-submit" disabled={busy}>
        {busy ? "Saving…" : "Save profile"}
      </button>
      <style>{`
        .partner-profile-form{display:grid;gap:8px;max-width:520px;margin:0 0 16px;padding:14px;border:1px solid #d2e8ef;border-radius:12px;background:#fff}
        .partner-profile-form h2{margin:0;font-size:18px;color:#143246}
        .partner-profile-form label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;color:#34546b}
        .partner-profile-form input,.partner-profile-form textarea{font:inherit;font-size:14px;font-weight:500;padding:8px 10px;border:1px solid #d7e2e9;border-radius:8px;color:#143246}
        .partner-profile-form input[readonly]{background:#f4f7f8}
        .partner-profile-certs{list-style:none;margin:0;padding:0;display:grid;gap:4px}
        .partner-profile-certs li{display:flex;justify-content:space-between;gap:8px;font-size:13px}
        .partner-profile-certs button{border:0;background:transparent;color:#b64b4b;font:inherit;font-weight:700;cursor:pointer}
      `}</style>
    </form>
  );
}
