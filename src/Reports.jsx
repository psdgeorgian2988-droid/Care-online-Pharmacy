import { useMemo, useState } from "react";

const STORAGE_KEY = "mediHomeReports";
const MAX_FILE_BYTES = 1.5 * 1024 * 1024;

/** Same bookable names as LabTests.jsx (LABS + RADIOLOGY_PARTNERS), unique. */
const LABORATORY_TESTS = [
  "Complete Blood Count (CBC)",
  "HbA1c - Diabetes Test",
  "Lipid Profile",
  "Liver Function Test (LFT)",
  "Kidney Function Test (KFT)",
  "Thyroid Profile",
  "Vitamin D Test",
  "Fasting Blood Sugar",
  "Insulin (Fasting)",
  "Complete Urine Examination",
  "Urine Culture",
  "Urine Pregnancy Test",
  "Stool Routine Examination",
  "Stool Occult Blood",
];

const RADIOLOGY_TESTS = [
  "MRI Brain",
  "CT Scan Chest",
  "Ultrasound Abdomen",
  "X-Ray Chest",
  "Doppler Lower Limb",
  "Mammography",
];

function TestNameOptions({ placeholder = "Select test name" }) {
  return (
    <>
      <option value="">{placeholder}</option>
      <optgroup label="Laboratory">
        {LABORATORY_TESTS.map((name) => (
          <option key={`lab-${name}`} value={name}>
            {name}
          </option>
        ))}
      </optgroup>
      <optgroup label="Radiology">
        {RADIOLOGY_TESTS.map((name) => (
          <option key={`rad-${name}`} value={name}>
            {name}
          </option>
        ))}
      </optgroup>
    </>
  );
}

function loadReports() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function Reports() {
  const today = new Date().toISOString().split("T")[0];
  const [reports, setReports] = useState(() => loadReports());
  const [form, setForm] = useState({
    testName: "",
    name: "",
    date: today,
    notes: "",
    fileName: "",
    fileType: "",
    fileData: "",
  });
  const [filterTest, setFilterTest] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");

  const sorted = useMemo(() => {
    const list = [...reports].sort((a, b) =>
      String(b.date || "").localeCompare(String(a.date || ""))
    );
    if (!filterTest) return list;
    return list.filter(
      (item) => item.testName === filterTest || item.name === filterTest
    );
  }, [reports, filterTest]);

  const persist = (next) => {
    setReports(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

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
      setErrors((prev) => ({ ...prev, file: "Upload a PDF or image file." }));
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || file.name.replace(/\.[^.]+$/, ""),
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
        name: prev.name || file.name.replace(/\.[^.]+$/, ""),
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileData: typeof reader.result === "string" ? reader.result : "",
      }));
    };
    reader.onerror = () => {
      setErrors((prev) => ({
        ...prev,
        file: "Could not read this file. Filename will still be saved if you submit.",
      }));
      setForm((prev) => ({
        ...prev,
        fileName: file.name,
        fileType: file.type || "",
        fileData: "",
      }));
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const next = {};
    if (!form.testName.trim()) next.testName = "Please select a test name.";
    if (!form.date) next.date = "Please select a date.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;

    const testName = form.testName.trim();
    const record = {
      id: "MH-RPT-" + Date.now(),
      testName,
      name: form.name.trim() || testName,
      date: form.date,
      notes: form.notes.trim(),
      fileName: form.fileName,
      fileType: form.fileType,
      fileData: form.fileData,
      savedAt: new Date().toLocaleString(),
    };

    persist([record, ...reports]);
    setForm({
      testName: "",
      name: "",
      date: today,
      notes: "",
      fileName: "",
      fileType: "",
      fileData: "",
    });
    setErrors({});
    setStatus("Report saved on this device.");
    event.target.reset?.();
  };

  const removeReport = (id) => {
    persist(reports.filter((item) => item.id !== id));
  };

  return (
    <>
      <style>{styles}</style>
      <div className="service-page reports-page">
        <section className="service-hero">
          <div>
            <span className="service-kicker">MediHome Reports</span>
            <h1>Save Health Reports</h1>
            <p>Keep Lab PDFs or Images on this device. Nothing is Uploaded to a Server.</p>
          </div>
        </section>

        <form className="service-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="rpt-test-name">
              Test name <span>*</span>
            </label>
            <select
              id="rpt-test-name"
              name="testName"
              value={form.testName}
              onChange={handleChange}
            >
              <TestNameOptions />
            </select>
            {errors.testName && <small>{errors.testName}</small>}
          </div>

          <div className="field">
            <label htmlFor="rpt-date">
              Report date <span>*</span>
            </label>
            <input
              id="rpt-date"
              name="date"
              type="date"
              value={form.date}
              onChange={handleChange}
            />
            {errors.date && <small>{errors.date}</small>}
          </div>

          <div className="field full">
            <label htmlFor="rpt-name">Report title (optional)</label>
            <input
              id="rpt-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Follow-up — Aug 2026"
            />
          </div>

          <div className="field full">
            <label htmlFor="rpt-file">File (PDF or image)</label>
            <input
              id="rpt-file"
              name="file"
              type="file"
              accept="application/pdf,image/*"
              onChange={handleFile}
            />
            {form.fileName && (
              <p className="file-meta">
                {form.fileName}
                {form.fileData ? " · stored on this device" : " · metadata only"}
              </p>
            )}
            {errors.file && <small>{errors.file}</small>}
          </div>

          <div className="field full">
            <label htmlFor="rpt-notes">Notes (optional)</label>
            <textarea
              id="rpt-notes"
              name="notes"
              rows="2"
              value={form.notes}
              onChange={handleChange}
              placeholder="Doctor name, findings, follow-up"
            />
          </div>

          {status && <p className="form-status">{status}</p>}

          <button type="submit" className="service-submit">
            Save report
          </button>
        </form>

        <section className="report-list" aria-label="Saved reports">
          <div className="report-list-head">
            <h2>Saved Reports</h2>
            <div className="field filter-field">
              <label htmlFor="rpt-filter">Filter by test</label>
              <select
                id="rpt-filter"
                name="filterTest"
                value={filterTest}
                onChange={(event) => setFilterTest(event.target.value)}
              >
                <TestNameOptions placeholder="All tests" />
              </select>
            </div>
          </div>
          {sorted.length === 0 ? (
            <p className="empty">
              {reports.length === 0
                ? "No reports saved yet."
                : "No reports match this test name."}
            </p>
          ) : (
            <ul>
              {sorted.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.testName || item.name}</strong>
                    {item.testName && item.name && item.name !== item.testName && (
                      <span>{item.name}</span>
                    )}
                    <span>{item.date}</span>
                    {item.fileName && <em>{item.fileName}</em>}
                    {item.notes && <p>{item.notes}</p>}
                    {item.fileData && (
                      <a href={item.fileData} target="_blank" rel="noreferrer">
                        Open saved file
                      </a>
                    )}
                  </div>
                  <button type="button" onClick={() => removeReport(item.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

const styles = `
.service-page{padding:16px 20px 24px 14px;box-sizing:border-box;color:#143246}
.service-hero{max-width:760px;margin:0 auto 12px;padding:14px 16px;border-radius:12px;background:linear-gradient(135deg,#eaf7ff,#f4fbf8)}
.service-kicker{display:block;margin-bottom:4px;font-size:11px;font-weight:800;letter-spacing:.6px;color:#1a6b7a}
.service-hero h1{margin:0 0 4px;font-size:22px}
.service-hero p{margin:0;color:#5d7180;font-size:13px;line-height:1.4}
.service-form{max-width:760px;margin:0 auto;padding:14px;background:#fff;border:1px solid #e4ecef;border-radius:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px 12px}
.service-form .field{display:flex;flex-direction:column;min-width:0}
.service-form .field.full{grid-column:1/-1}
.service-form label{margin-bottom:5px;font-size:12px;font-weight:700;color:#34546b}
.service-form label span{color:#d84b4b}
.service-form input,.service-form select,.service-form textarea{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #d7e2e9;border-radius:8px;font:inherit;font-size:14px;color:#143246;outline:none;min-height:38px;background:#fff}
.service-form textarea{min-height:56px;resize:vertical}
.service-form input:focus,.service-form select:focus,.service-form textarea:focus{border-color:#1a6b7a}
.service-form small{margin-top:4px;color:#d84b4b;font-size:12px}
.file-meta{margin:6px 0 0;color:#5d7180;font-size:12px}
.form-status{grid-column:1/-1;margin:0;padding:8px 10px;border-radius:8px;background:#e5f8ee;color:#1c9b61;font-size:13px;font-weight:600}
.service-submit{grid-column:1/-1;border:none;border-radius:8px;background:#1a6b7a;color:#fff;font-size:14px;font-weight:700;min-height:40px;cursor:pointer;font-family:inherit}
.report-list{max-width:760px;margin:16px auto 0}
.report-list-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin-bottom:8px;flex-wrap:wrap}
.report-list h2{margin:0;font-size:16px}
.report-list .filter-field{min-width:220px;flex:1;max-width:320px}
.report-list .filter-field label{margin-bottom:5px;font-size:12px;font-weight:700;color:#34546b}
.report-list .filter-field select{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #d7e2e9;border-radius:8px;font:inherit;font-size:14px;color:#143246;outline:none;min-height:38px;background:#fff}
.report-list .filter-field select:focus{border-color:#1a6b7a}
.report-list .empty{margin:0;color:#7a8b96;font-size:14px}
.report-list ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.report-list li{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:12px;background:#fff;border:1px solid #e4ecef;border-radius:10px}
.report-list strong{display:block;font-size:14px}
.report-list span,.report-list em{display:block;color:#5d7180;font-size:12px;font-style:normal;margin-top:2px}
.report-list p{margin:6px 0 0;color:#34546b;font-size:13px}
.report-list a{display:inline-block;margin-top:6px;color:#1a6b7a;font-size:13px;font-weight:700}
.report-list button{border:1px solid #d8e3e9;background:#fff;color:#b64b4b;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;flex-shrink:0}
@media (max-width:800px){.service-page{padding:14px}.service-form{grid-template-columns:1fr}}
`;

export default Reports;
