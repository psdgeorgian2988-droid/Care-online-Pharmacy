import { useMemo, useState } from "react";
import {
  loadBatches,
  saveBatches,
  MAX_BATCH_FILE_BYTES,
} from "./batchStore";

function BatchReports({ products = [], onChange }) {
  const today = new Date().toISOString().split("T")[0];
  const mediHome = useMemo(
    () => products.filter((item) => item.isMediHome),
    [products]
  );
  const [batches, setBatches] = useState(() => loadBatches());
  const [filterId, setFilterId] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({
    productId: "",
    batchNo: "",
    mfgDate: today,
    expiryDate: "",
    notes: "",
    fileName: "",
    fileType: "",
    fileData: "",
  });

  const persist = (next) => {
    saveBatches(next);
    setBatches(next);
    onChange?.(next);
  };

  const selectedProduct = mediHome.find(
    (item) => String(item.id) === String(form.productId)
  );

  const visible = useMemo(() => {
    const list = [...batches];
    if (!filterId) return list;
    return list.filter((item) => String(item.productId) === String(filterId));
  }, [batches, filterId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setStatus("");
  };

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    setErrors((prev) => ({ ...prev, file: "" }));
    setStatus("");
    if (!file) {
      setForm((prev) => ({
        ...prev,
        fileName: "",
        fileType: "",
        fileData: "",
      }));
      return;
    }

    const isAllowed =
      file.type.startsWith("image/") ||
      file.type === "application/pdf" ||
      /\.(pdf|png|jpe?g|webp)$/i.test(file.name);

    if (!isAllowed) {
      setErrors((prev) => ({
        ...prev,
        file: "Upload a PDF or image batch report (COA / QC).",
      }));
      event.target.value = "";
      return;
    }

    if (file.size > MAX_BATCH_FILE_BYTES) {
      setForm((prev) => ({
        ...prev,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileData: "",
      }));
      setStatus("File is over 1.5 MB, so only the filename will be saved.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileData: typeof reader.result === "string" ? reader.result : "",
      }));
    };
    reader.onerror = () => {
      setErrors((prev) => ({
        ...prev,
        file: "Could not read this file.",
      }));
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const next = {};
    if (!form.productId) next.productId = "Select a MediHome medicine.";
    if (!form.batchNo.trim()) next.batchNo = "Enter the batch number.";
    if (!form.mfgDate) next.mfgDate = "Enter manufacturing date.";
    if (!form.expiryDate) next.expiryDate = "Enter expiry date.";
    if (
      form.mfgDate &&
      form.expiryDate &&
      form.expiryDate <= form.mfgDate
    ) {
      next.expiryDate = "Expiry must be after manufacturing date.";
    }
    if (!form.fileName) {
      next.file = "Upload the batch report for this lot.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;

    const record = {
      id: "MH-BAT-" + Date.now(),
      productId: Number(form.productId),
      productName: selectedProduct?.name || "",
      composition: selectedProduct?.composition || "",
      strength: selectedProduct?.strength || "",
      batchNo: form.batchNo.trim().toUpperCase(),
      mfgDate: form.mfgDate,
      expiryDate: form.expiryDate,
      notes: form.notes.trim(),
      fileName: form.fileName,
      fileType: form.fileType,
      fileData: form.fileData,
      savedAt: new Date().toLocaleString(),
    };

    persist([record, ...batches]);
    setForm({
      productId: form.productId,
      batchNo: "",
      mfgDate: today,
      expiryDate: "",
      notes: "",
      fileName: "",
      fileType: "",
      fileData: "",
    });
    setErrors({});
    setStatus(`Batch ${record.batchNo} saved with report for ${record.productName}.`);
    event.target.reset?.();
  };

  const removeBatch = (id) => {
    persist(batches.filter((item) => item.id !== id));
  };

  return (
    <>
      <style>{styles}</style>
      <section className="batch-panel">
        <div className="batch-panel-head">
          <p className="batch-kicker">Quality</p>
          <h2>Upload new MediHome batch</h2>
          <p>
            Every MediHome SKU needs a batch report (COA / QC) when a new lot
            is added. The report stays on this device.
          </p>
        </div>

        <form className="batch-form" onSubmit={handleSubmit}>
          <div className="batch-field batch-span">
            <label htmlFor="batch-product">
              MediHome medicine <em>*</em>
            </label>
            <select
              id="batch-product"
              name="productId"
              value={form.productId}
              onChange={handleChange}
            >
              <option value="">Select MediHome brand / SKU</option>
              {mediHome.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.strength}
                </option>
              ))}
            </select>
            {errors.productId ? <small>{errors.productId}</small> : null}
          </div>

          <div className="batch-field">
            <label htmlFor="batch-no">
              Batch number <em>*</em>
            </label>
            <input
              id="batch-no"
              name="batchNo"
              value={form.batchNo}
              onChange={handleChange}
              placeholder="e.g. MH2408A12"
            />
            {errors.batchNo ? <small>{errors.batchNo}</small> : null}
          </div>

          <div className="batch-field">
            <label htmlFor="batch-mfg">
              Mfg date <em>*</em>
            </label>
            <input
              id="batch-mfg"
              name="mfgDate"
              type="date"
              value={form.mfgDate}
              onChange={handleChange}
            />
            {errors.mfgDate ? <small>{errors.mfgDate}</small> : null}
          </div>

          <div className="batch-field">
            <label htmlFor="batch-exp">
              Expiry date <em>*</em>
            </label>
            <input
              id="batch-exp"
              name="expiryDate"
              type="date"
              value={form.expiryDate}
              onChange={handleChange}
            />
            {errors.expiryDate ? <small>{errors.expiryDate}</small> : null}
          </div>

          <div className="batch-field batch-span">
            <label htmlFor="batch-file">
              Batch report PDF or image <em>*</em>
            </label>
            <input
              id="batch-file"
              name="file"
              type="file"
              accept="application/pdf,image/*"
              onChange={handleFile}
            />
            {form.fileName ? (
              <p className="batch-file-meta">
                {form.fileName}
                {form.fileData ? " · stored on this device" : " · filename only"}
              </p>
            ) : (
              <p className="batch-file-meta">
                Required for every new lot: COA, assay, or QC batch report.
              </p>
            )}
            {errors.file ? <small>{errors.file}</small> : null}
          </div>

          <div className="batch-field batch-span">
            <label htmlFor="batch-notes">Notes (optional)</label>
            <textarea
              id="batch-notes"
              name="notes"
              rows="2"
              value={form.notes}
              onChange={handleChange}
              placeholder="Assay, dissolution, packing line, remarks"
            />
          </div>

          {status ? <p className="batch-status">{status}</p> : null}

          <button type="submit" className="batch-submit">
            Save batch with report
          </button>
        </form>

        <div className="batch-list-head">
          <h3>Saved batches</h3>
          <select
            value={filterId}
            onChange={(event) => setFilterId(event.target.value)}
            aria-label="Filter by MediHome medicine"
          >
            <option value="">All MediHome SKUs</option>
            {mediHome.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        {visible.length === 0 ? (
          <p className="batch-empty">No batch reports uploaded yet.</p>
        ) : (
          <ul className="batch-list">
            {visible.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.productName}</strong>
                  <span>
                    Batch {item.batchNo} · Mfg {item.mfgDate} · Exp{" "}
                    {item.expiryDate}
                  </span>
                  {item.fileName ? <em>{item.fileName}</em> : null}
                  {item.notes ? <p>{item.notes}</p> : null}
                  {item.fileData ? (
                    <a href={item.fileData} target="_blank" rel="noreferrer">
                      Open batch report
                    </a>
                  ) : null}
                </div>
                <button type="button" onClick={() => removeBatch(item.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

const styles = `
.batch-panel{margin:0 0 16px;padding:16px;border:1px solid #d7e6ee;border-radius:12px;background:#fff;color:#143246}
.batch-kicker{margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#1a6b7a}
.batch-panel-head h2{margin:0;font-size:18px}
.batch-panel-head p{margin:4px 0 0;font-size:13px;color:#5d7180;line-height:1.4}
.batch-form{margin-top:14px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px 12px}
.batch-field{display:flex;flex-direction:column;min-width:0}
.batch-field.batch-span{grid-column:1/-1}
.batch-field label{margin-bottom:5px;font-size:12px;font-weight:700;color:#34546b}
.batch-field em{color:#d84b4b;font-style:normal}
.batch-field input,.batch-field select,.batch-field textarea{width:100%;box-sizing:border-box;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;font:inherit;font-size:14px;color:#143246;outline:none;height:38px;min-height:38px;background:#fff}
.batch-field textarea{height:auto;min-height:56px;resize:vertical}
.batch-field input:focus,.batch-field select:focus,.batch-field textarea:focus{border-color:#1a6b7a}
.batch-field small{margin-top:4px;color:#d84b4b;font-size:12px}
.batch-file-meta{margin:6px 0 0;color:#5d7180;font-size:12px}
.batch-status{grid-column:1/-1;margin:0;padding:8px 10px;border-radius:8px;background:#e5f8ee;color:#1c9b61;font-size:13px;font-weight:600}
.batch-submit{grid-column:1/-1;border:none;border-radius:8px;background:#1a6b7a;color:#fff;font-size:14px;font-weight:700;min-height:42px;cursor:pointer;font-family:inherit}
.batch-list-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:16px 0 8px;flex-wrap:wrap}
.batch-list-head h3{margin:0;font-size:15px}
.batch-list-head select{min-width:220px;height:38px;min-height:38px;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;font:inherit;font-size:14px;color:#143246;background:#fff}
.batch-empty{margin:0;color:#7a8b96;font-size:13px}
.batch-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.batch-list li{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:12px;border:1px solid #e4ecef;border-radius:10px;background:#f7fbfd}
.batch-list strong{display:block;font-size:14px}
.batch-list span,.batch-list em{display:block;margin-top:2px;color:#5d7180;font-size:12px;font-style:normal}
.batch-list p{margin:6px 0 0;font-size:13px;color:#34546b}
.batch-list a{display:inline-block;margin-top:6px;color:#1a6b7a;font-size:13px;font-weight:700}
.batch-list button{border:1px solid #d8e3e9;background:#fff;color:#b64b4b;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;flex-shrink:0}
@media (max-width:800px){.batch-form{grid-template-columns:1fr}.batch-list-head select{width:100%;min-width:0}}
`;

export default BatchReports;
