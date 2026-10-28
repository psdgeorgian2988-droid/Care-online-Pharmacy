import { useEffect, useState } from "react";
import { AdminSectionGuard } from "./adminLeave";
import { createStaffMedicine, fetchStaffMedicines } from "./adminApi";

const CATEGORIES = [
  "Diabetes",
  "Hypertension",
  "Cholesterol",
  "Cardiology",
  "Thyroid",
  "Kidney Care",
  "Respiratory",
  "Bone & Joint",
  "Supplements",
  "Pain Relief",
  "Gastric",
  "Infection",
  "Allergy",
  "Neurology",
  "Urology",
  "Women's Health",
  "Dermatology",
  "Other",
];

const emptyMedicine = () => ({
  name: "",
  brand: "",
  strength: "",
  composition: "",
  manufacturer: "",
  packSize: "",
  category: "Other",
  mrp: "",
  price: "",
  prescription: true,
  photos: [],
  mfgDate: "",
  expiryDate: "",
  batchNo: "",
  batchReportName: "",
  batchReportType: "",
  batchReportData: "",
});

const PHOTO_LIMIT = 45;
const PHOTO_BYTES = 3 * 1024 * 1024;

function readPhotoFile(file) {
  return new Promise((resolve, reject) => {
    if (file.size > PHOTO_BYTES) {
      reject(new Error(`${file.name || "A photo"} is larger than 3 MB.`));
      return;
    }
    const type = String(file.type || "").toLowerCase();
    const jpeg = type === "image/jpeg" || /\.jpe?g$/i.test(file.name || "");
    const png = type === "image/png" || /\.png$/i.test(file.name || "");
    if (!jpeg && !png) {
      reject(new Error("Each photo must be JPG or PNG."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        fileName: file.name || (png ? "photo.png" : "photo.jpg"),
        fileType: png ? "image/png" : "image/jpeg",
        fileData: String(reader.result || ""),
      });
    reader.onerror = () => reject(new Error("Could not read that photo."));
    reader.readAsDataURL(file);
  });
}

export default function AdminMedicines() {
  const [medicines, setMedicines] = useState([]);
  const [draft, setDraft] = useState(emptyMedicine);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchStaffMedicines()
      .then((data) => {
        if (!cancelled) setMedicines(Array.isArray(data.medicines) ? data.medicines : []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setField = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  const onPhotos = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    const room = PHOTO_LIMIT - draft.photos.length;
    if (room <= 0) {
      setError("A medicine can have up to 45 photos.");
      return;
    }
    const next = files.slice(0, room);
    if (files.length > room) setError("A medicine can have up to 45 photos.");
    else setError("");
    try {
      const photos = [];
      for (const file of next) photos.push(await readPhotoFile(file));
      setDraft((current) => ({ ...current, photos: [...current.photos, ...photos] }));
    } catch (err) {
      setError(err.message || "Could not add those photos.");
    }
  };

  const save = async (event) => {
    event?.preventDefault?.();
    setBusy(true);
    setError("");
    setNote("");
    try {
      const data = await createStaffMedicine({
        name: draft.name,
        brand: draft.brand,
        strength: draft.strength,
        salt: draft.composition,
        composition: draft.composition,
        manufacturer: draft.manufacturer,
        packSize: draft.packSize,
        category: draft.category,
        mrp: Number(draft.mrp),
        price: draft.price === "" ? Number(draft.mrp) : Number(draft.price),
        prescription: draft.prescription,
        photos: draft.photos,
        mfgDate: draft.mfgDate,
        expiryDate: draft.expiryDate,
        batchNo: draft.batchNo,
        batchReport: draft.batchReportData
          ? {
              fileName: draft.batchReportName,
              fileType: draft.batchReportType,
              fileData: draft.batchReportData,
            }
          : null,
      });
      setMedicines(data.medicines || []);
      setDraft(emptyMedicine());
      setNote(`${data.medicine?.name || "Medicine"} saved.`);
      return true;
    } catch (err) {
      setError(err.message || "Could not save the medicine.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const formDirty = Boolean(
    draft.name ||
      draft.brand ||
      draft.strength ||
      draft.composition ||
      draft.manufacturer ||
      draft.packSize ||
      draft.mrp ||
      draft.price ||
      draft.photos.length ||
      draft.mfgDate ||
      draft.expiryDate ||
      draft.batchNo ||
      draft.batchReportData
  );

  return (
    <section className="admin-panel admin-feature-panel" aria-label="Add medicine">
      <AdminSectionGuard dirty={formDirty} save={formDirty ? save : () => true} />
      {error ? <p className="admin-error">{error}</p> : null}
      {note ? <p className="admin-hint">{note}</p> : null}
      <form className="admin-partner-create" onSubmit={save}>
        <h3>Add medicine</h3>
        <div className="admin-partner-grid">
          <label>
            Medicine name
            <input value={draft.name} onChange={(event) => setField("name", event.target.value)} required />
          </label>
          <label>
            Brand name
            <input value={draft.brand} onChange={(event) => setField("brand", event.target.value)} required />
          </label>
          <label>
            Strength
            <input value={draft.strength} onChange={(event) => setField("strength", event.target.value)} required />
          </label>
          <label>
            Manufactured by
            <input
              value={draft.manufacturer}
              onChange={(event) => setField("manufacturer", event.target.value)}
              required
            />
          </label>
          <label>
            Manufacturing date
            <input type="date" value={draft.mfgDate} onChange={(event) => setField("mfgDate", event.target.value)} />
          </label>
          <label>
            Expiry date
            <input type="date" value={draft.expiryDate} onChange={(event) => setField("expiryDate", event.target.value)} />
          </label>
          <label>
            Batch number
            <input value={draft.batchNo} onChange={(event) => setField("batchNo", event.target.value)} />
          </label>
          <label>
            Batch report
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                if (file.size > 10 * 1024 * 1024) {
                  setError("Batch report must be 10 MB or smaller.");
                  return;
                }
                const type = String(file.type || "").toLowerCase();
                const pdf = type === "application/pdf" || /\.pdf$/i.test(file.name || "");
                const jpeg = type === "image/jpeg" || /\.jpe?g$/i.test(file.name || "");
                const png = type === "image/png" || /\.png$/i.test(file.name || "");
                if (!pdf && !jpeg && !png) {
                  setError("Batch report must be a PDF, JPG, or PNG.");
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  setError("");
                  setDraft((current) => ({
                    ...current,
                    batchReportName: file.name,
                    batchReportType: pdf ? "application/pdf" : png ? "image/png" : "image/jpeg",
                    batchReportData: String(reader.result || ""),
                  }));
                };
                reader.onerror = () => setError("Could not read that batch report.");
                reader.readAsDataURL(file);
              }}
            />
            <span>{draft.batchReportName || "PDF, JPG, or PNG, up to 10 MB."}</span>
          </label>
          <label>
            Composition
            <input value={draft.composition} onChange={(event) => setField("composition", event.target.value)} />
          </label>
          <label>
            Pack size
            <input
              value={draft.packSize}
              placeholder="10 tablets"
              onChange={(event) => setField("packSize", event.target.value)}
            />
          </label>
          <label>
            Category
            <select value={draft.category} onChange={(event) => setField("category", event.target.value)}>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label>
            MRP ₹
            <input
              type="number"
              min={1}
              step="0.01"
              value={draft.mrp}
              onChange={(event) => setField("mrp", event.target.value)}
              required
            />
          </label>
          <label>
            Selling price ₹
            <input
              type="number"
              min={0}
              step="0.01"
              value={draft.price}
              onChange={(event) => setField("price", event.target.value)}
            />
          </label>
          <label>
            Photos
            <input
              type="file"
              accept="image/jpeg,image/png,.jpg,.jpeg,.png"
              multiple
              onChange={onPhotos}
            />
            <span>
              {draft.photos.length} of 45 photos. Each photo can be up to 3 MB.
            </span>
            {draft.photos.map((photo, index) => (
              <span key={`${photo.fileName}-${index}`}>
                {photo.fileName}
                <button
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      photos: current.photos.filter((_, photoIndex) => photoIndex !== index),
                    }))
                  }
                >
                  Remove
                </button>
              </span>
            ))}
          </label>
          <label>
            <span>Prescription required</span>
            <input
              type="checkbox"
              checked={draft.prescription}
              onChange={(event) => setField("prescription", event.target.checked)}
            />
          </label>
        </div>
        <div className="admin-feature-actions">
          <button type="submit" className="admin-feature-save" disabled={busy}>
            {busy ? "Saving…" : "Save medicine"}
          </button>
          <button
            type="button"
            className="admin-feature-reset"
            onClick={() => {
              setDraft(emptyMedicine());
              setError("");
            }}
          >
            Clear
          </button>
        </div>
      </form>
      {medicines.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Brand</th>
                <th>Strength</th>
                <th>MRP</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.brand || "—"}</td>
                  <td>{row.strength || "—"}</td>
                  <td>₹{row.mrp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
