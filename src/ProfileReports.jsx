import { useEffect, useMemo, useState } from "react";
import RecordViewer from "./RecordViewer.jsx";
import { readUserProfile } from "./addressFields";
import { useLoginSession } from "./authSession";
import { LABORATORY_TESTS, RADIOLOGY_TESTS } from "./healthTestNames";
import { isoDateToday } from "./personFields";
import {
  buildCustomerMedicalRecord,
  loadMedicalRecords,
  MEDICAL_RECORD_EVENT,
  recordsForPatient,
  saveMedicalRecords,
} from "./medicalRecord";
import {
  defaultReportPatientId,
  householdReportPeople,
  personLabel,
} from "./reportPeople";
import {
  cleanReportValues,
  compareReportPair,
  groupReportsByName,
  isImagingReportName,
  panelForReport,
} from "./reportCompare";

const MAX_FILE_BYTES = 1.5 * 1024 * 1024;

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Could not read this file."));
    reader.readAsDataURL(file);
  });
}

function CompareChart({ rows, previousDate, currentDate }) {
  const comparable = rows.filter((row) => row.previous != null && row.current != null);
  if (!comparable.length) return null;
  return (
    <div className="profile-report-chart" aria-label="Comparison of the last two reports">
      <p>
        Previous {previousDate || "report"} compared with current {currentDate || "report"}
      </p>
      <ul>
        {comparable.map((row) => {
          const span = Math.max(Math.abs(row.previous), Math.abs(row.current), 0.0001);
          const previousWidth = `${Math.max(4, (Math.abs(row.previous) / span) * 100)}%`;
          const currentWidth = `${Math.max(4, (Math.abs(row.current) / span) * 100)}%`;
          const delta = row.current - row.previous;
          const deltaLabel = `${delta > 0 ? "+" : ""}${Number(delta.toFixed(2))}`;
          return (
            <li key={row.name}>
              <div className="profile-report-chart-name">
                <strong>{row.name}</strong>
                <span>
                  {row.unit ? `${row.unit} · ` : ""}
                  {deltaLabel}
                </span>
              </div>
              <div className="profile-report-bars" aria-hidden="true">
                <i style={{ width: previousWidth }} />
                <b style={{ width: currentWidth }} />
              </div>
              <div className="profile-report-chart-values">
                <span>Previous {row.previous}</span>
                <span>Current {row.current}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function ProfileReports() {
  const session = useLoginSession();
  const profile = readUserProfile();
  const people = useMemo(
    () => householdReportPeople(profile, session),
    [profile, session]
  );
  const [records, setRecords] = useState(() => loadMedicalRecords());
  const [memberId, setMemberId] = useState(() => defaultReportPatientId(people));
  const [testName, setTestName] = useState("");
  const [date, setDate] = useState(isoDateToday);
  const [file, setFile] = useState(null);
  const [values, setValues] = useState([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState(null);

  useEffect(() => {
    const refresh = () => setRecords(loadMedicalRecords());
    window.addEventListener(MEDICAL_RECORD_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(MEDICAL_RECORD_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    if (!people.some((row) => row.id === memberId)) {
      setMemberId(defaultReportPatientId(people));
    }
  }, [people, memberId]);

  const imaging = isImagingReportName(testName);
  const mine = recordsForPatient(records, memberId, people);
  const groups = groupReportsByName(mine);

  const chooseReport = (name) => {
    setTestName(name);
    setError("");
    setStatus("");
    setValues(isImagingReportName(name) ? [] : panelForReport(name));
  };

  const updateValue = (index, value) => {
    setValues((rows) => rows.map((row, i) => (i === index ? { ...row, value } : row)));
  };

  const addValueRow = () => {
    setValues((rows) => [...rows, { name: "", unit: "", value: "" }]);
  };

  const saveReport = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");
    if (!testName) {
      setError("Choose which report this is.");
      return;
    }
    if (!date) {
      setError("Choose the report date.");
      return;
    }
    if (!file) {
      setError("Choose a PDF or photo of the report.");
      return;
    }
    const allowed =
      file.type.startsWith("image/") ||
      file.type === "application/pdf" ||
      /\.(pdf|png|jpe?g|webp)$/i.test(file.name);
    if (!allowed) {
      setError("Upload a PDF or photo.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Report must be under 1.5 MB.");
      return;
    }
    setBusy(true);
    try {
      const fileData = await readFile(file);
      const person = people.find((row) => row.id === memberId) || people[0] || null;
      const kind = imaging ? "radiology" : "lab";
      const record = buildCustomerMedicalRecord(
        kind,
        {
          memberId: person?.id || memberId,
          testName,
          date,
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileData,
          reportKind: kind,
        },
        {
          person,
          people,
          now: new Date(),
        }
      );
      record.values = imaging ? [] : cleanReportValues(values);
      const next = [record, ...loadMedicalRecords().filter((row) => row.id !== record.id)];
      saveMedicalRecords(next);
      setRecords(next);
      setFile(null);
      setValues(imaging ? [] : panelForReport(testName));
      const input = document.getElementById("profile-report-file");
      if (input) input.value = "";
      setStatus(
        imaging
          ? `${testName} saved as uploaded.`
          : record.values.length
            ? `${testName} saved. Numbers can be compared with the previous ${testName}.`
            : `${testName} saved. Add the numbers next time to compare it.`
      );
    } catch (err) {
      setError(err.message || "Could not save this report.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="profile-card profile-reports" aria-label="Upload reports">
      <style>{reportStyles}</style>
      <h2>Reports</h2>
      <form className="profile-report-form" onSubmit={saveReport}>
        {people.length > 1 ? (
          <label>
            Whose report
            <select value={memberId} onChange={(event) => setMemberId(event.target.value)}>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {personLabel(person)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          Which report
          <select value={testName} onChange={(event) => chooseReport(event.target.value)}>
            <option value="">Select report</option>
            <optgroup label="Laboratory">
              {LABORATORY_TESTS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Imaging">
              {RADIOLOGY_TESTS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label>
          Report date
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label>
          Report file
          <input
            id="profile-report-file"
            type="file"
            accept="image/*,.pdf,application/pdf"
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              setError("");
            }}
          />
        </label>
        {testName && imaging ? (
          <p className="profile-report-note">
            This imaging report is stored as uploaded. It is not converted into a number chart.
          </p>
        ) : null}
        {testName && !imaging ? (
          <div className="profile-report-values">
            <p>
              Enter the numbers printed on this report. The next upload of the same report is
              compared with these.
            </p>
            {values.map((row, index) => (
              <div className="profile-report-value" key={`${row.name}-${index}`}>
                <input
                  aria-label={`Result name ${index + 1}`}
                  value={row.name}
                  placeholder="Result"
                  onChange={(event) =>
                    setValues((rows) =>
                      rows.map((item, i) =>
                        i === index ? { ...item, name: event.target.value } : item
                      )
                    )
                  }
                />
                <input
                  aria-label={`${row.name || "Result"} value`}
                  value={row.value}
                  inputMode="decimal"
                  placeholder="Value"
                  onChange={(event) => updateValue(index, event.target.value)}
                />
                <input
                  aria-label={`${row.name || "Result"} unit`}
                  value={row.unit}
                  placeholder="Unit"
                  onChange={(event) =>
                    setValues((rows) =>
                      rows.map((item, i) =>
                        i === index ? { ...item, unit: event.target.value } : item
                      )
                    )
                  }
                />
              </div>
            ))}
            <button type="button" className="profile-report-add" onClick={addValueRow}>
              Add result
            </button>
          </div>
        ) : null}
        {error ? <small className="profile-error">{error}</small> : null}
        {status ? <p className="profile-success">{status}</p> : null}
        <button type="submit" className="profile-save-btn" disabled={busy}>
          {busy ? "Saving report…" : "Save report"}
        </button>
      </form>

      {groups.length ? (
        <div className="profile-report-list">
          {groups.map((group) => {
            const [current, previous] = group.reports;
            const compared = group.kind === "radiology" ? [] : compareReportPair(current, previous);
            return (
              <article key={group.name} className="profile-report-group">
                <h3>{group.name}</h3>
                <ul>
                  {group.reports.map((report) => (
                    <li key={report.id || `${group.name}-${report.date}-${report.savedAt}`}>
                      <span>{report.date || "Undated"}</span>
                      {report.fileData ? (
                        <button type="button" onClick={() => setViewer(report)}>
                          View file
                        </button>
                      ) : (
                        <span>File name saved</span>
                      )}
                    </li>
                  ))}
                </ul>
                {group.kind === "radiology" ? (
                  <p className="profile-report-note">Kept as uploaded.</p>
                ) : (
                  <CompareChart
                    rows={compared}
                    previousDate={previous?.date || ""}
                    currentDate={current?.date || ""}
                  />
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="profile-report-note">No reports saved for this person yet.</p>
      )}
      {viewer ? <RecordViewer record={viewer} onClose={() => setViewer(null)} /> : null}
    </section>
  );
}

const reportStyles = `
  .profile-reports h2{margin:0;color:#123b59;font-size:16px}
  .profile-reports>p{margin:0;color:#607589;font-size:13px;line-height:1.4}
  .profile-report-form{display:grid;gap:10px}
  .profile-report-form label{display:grid;gap:4px;font-size:12px;font-weight:700;color:#34546b}
  .profile-report-form select,.profile-report-form input{width:100%;box-sizing:border-box;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#143246;font:inherit;font-size:14px}
  .profile-report-note{margin:0;color:#5d7180;font-size:12px;line-height:1.4}
  .profile-report-values{display:grid;gap:8px}
  .profile-report-values>p{margin:0;color:#5d7180;font-size:12px}
  .profile-report-value{display:grid;grid-template-columns:1.4fr .8fr .7fr;gap:6px}
  .profile-report-add{justify-self:start;border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#1a6b7a;font:inherit;font-size:12px;font-weight:800;padding:8px 10px;cursor:pointer}
  .profile-report-list{display:grid;gap:12px}
  .profile-report-group{display:grid;gap:8px;padding-top:8px;border-top:1px solid #e6eef2}
  .profile-report-group h3{margin:0;color:#123b59;font-size:15px}
  .profile-report-group ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}
  .profile-report-group li{display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:13px;color:#34546b}
  .profile-report-group li button{border:0;background:transparent;color:#1a6b7a;font:inherit;font-weight:800;cursor:pointer}
  .profile-report-chart{display:grid;gap:8px}
  .profile-report-chart>p{margin:0;font-size:12px;font-weight:700;color:#1a6b7a}
  .profile-report-chart ul{list-style:none;margin:0;padding:0;display:grid;gap:10px}
  .profile-report-chart-name,.profile-report-chart-values{display:flex;justify-content:space-between;gap:8px;font-size:12px;color:#34546b}
  .profile-report-bars{display:grid;gap:3px}
  .profile-report-bars i,.profile-report-bars b{display:block;height:8px;border-radius:99px}
  .profile-report-bars i{background:#b7d4dc}
  .profile-report-bars b{background:#1a6b7a}
  @media (max-width:640px){
    .profile-report-value{grid-template-columns:1fr}
  }
`;
