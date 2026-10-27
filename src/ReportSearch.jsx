import { useState } from "react";

export default function ReportSearch({ title = "Search reports", onSearch, onOpen }) {
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [openingId, setOpeningId] = useState("");

  const search = async (event) => {
    event.preventDefault();
    const digits = mobile.replace(/\D/g, "");
    const mail = email.trim();
    if (!digits && !mail) {
      setRows(null);
      setError("Enter a mobile number or mail ID.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await onSearch({ mobile: digits, email: mail });
      setRows(Array.isArray(data?.reports) ? data.reports : []);
    } catch (err) {
      setRows(null);
      setError(err.message || "Could not search reports.");
    } finally {
      setBusy(false);
    }
  };

  const openReport = async (row) => {
    setOpeningId(row.id);
    setError("");
    try {
      const data = await onOpen(row.id);
      const file = data?.report;
      if (!file?.fileData) {
        setError("That report file is not saved.");
        return;
      }
      const link = document.createElement("a");
      link.href = file.fileData;
      link.download = file.fileName || "report";
      link.click();
    } catch (err) {
      setError(err.message || "Could not open that report.");
    } finally {
      setOpeningId("");
    }
  };

  return (
    <section className="report-search" aria-label="Search reports">
      <style>{`
        .report-search{display:flex;flex-direction:column;gap:10px}
        .report-search h2{margin:0;font-size:16px}
        .report-search form{display:flex;flex-wrap:wrap;gap:8px;align-items:end}
        .report-search label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:700;color:#34546b;min-width:160px;flex:1}
        .report-search input{min-height:36px;padding:6px 8px;border:1px solid #d7e2e9;border-radius:8px;font:inherit}
        .report-search button{min-height:36px;padding:8px 12px;border-radius:8px;border:1px solid #1a6b7a;background:#1a6b7a;color:#fff;font:inherit;font-weight:800;cursor:pointer}
        .report-search button.is-open{border-color:#c5d4de;background:#fff;color:#1a6b7a}
        .report-search p{margin:0;font-size:13px;color:#5d7180}
        .report-search .is-error{color:#9b2c2c}
        .report-search article{display:flex;flex-direction:column;gap:4px;padding:10px;border:1px solid #e4ecef;border-radius:10px;background:#fff}
        .report-search article strong{font-size:14px}
        .report-search article span{font-size:13px;color:#34546b}
      `}</style>
      {title ? <h2>{title}</h2> : null}
      <form onSubmit={search}>
        <label>
          Mobile number
          <input
            inputMode="numeric"
            value={mobile}
            onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit mobile"
          />
        </label>
        <label>
          Mail ID
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@email.com"
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? "Searching…" : "Search"}
        </button>
      </form>
      {error ? <p className="is-error">{error}</p> : null}
      {rows && rows.length === 0 ? <p>No report found for that mobile number or mail ID.</p> : null}
      {rows?.map((row) => (
        <article key={row.id}>
          <strong>{row.patientName || "Patient"}</strong>
          <span>
            {[row.testName, row.mobile, row.email, row.date].filter(Boolean).join(" · ")}
          </span>
          {row.hasFile ? (
            <button
              type="button"
              className="is-open"
              disabled={openingId === row.id}
              onClick={() => openReport(row)}
            >
              {openingId === row.id ? "Opening…" : "Open report"}
            </button>
          ) : (
            <span>{row.fileName || "Report saved"}</span>
          )}
        </article>
      ))}
    </section>
  );
}
