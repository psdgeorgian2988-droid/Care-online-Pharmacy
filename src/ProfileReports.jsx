import { useEffect, useMemo, useRef, useState } from "react";
import RecordViewer from "./RecordViewer.jsx";
import AccountPopup from "./AccountPopup.jsx";
import DoseSchedule from "./DoseSchedule.jsx";
import HomePrescriptionUpload from "./HomePrescriptionUpload.jsx";
import HealthEducation from "./HealthEducation.jsx";
import { readUserProfile } from "./addressFields";
import { useLoginSession } from "./authSession";
import { loadCustomerOrders, syncMyOrdersFromServer } from "./orderTracking";
import { orderRecordId, orderTestName } from "./orderFullFields";
import { useSyncedOrderTick } from "./useSyncedOrderTick";
import { LABORATORY_TESTS, RADIOLOGY_TESTS } from "./healthTestNames";
import { accountCreatorMobile, isoDateToday } from "./personFields";
import { fetchPublicFeatures, useScheduledWebinars } from "./featureFlags";
import {
  formatWebinarDate,
  isWebinarBookable,
  readCachedWebinars,
  readSeenWebinarNotice,
  readWebinarSignups,
  saveWebinarSignup,
  webinarNotice,
  webinarSessionHref,
  writeSeenWebinarNotice,
} from "./webinars";
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

function ProfileOrderList() {
  const tick = useSyncedOrderTick();
  const [orders, setOrders] = useState(() => loadCustomerOrders());

  useEffect(() => {
    let cancelled = false;
    syncMyOrdersFromServer(loadCustomerOrders()).then((next) => {
      if (!cancelled) setOrders(Array.isArray(next) ? next : loadCustomerOrders());
    });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  if (!orders.length) return <p className="profile-order-empty">No orders yet.</p>;
  return (
    <ul className="profile-order-list">
      {orders.map((order) => (
        <li key={order.id || order.bookingId || order.requestId}>
          <span>{orderTestName(order)}</span>
          <strong>#{orderRecordId(order) || "—"}</strong>
        </li>
      ))}
    </ul>
  );
}

function ProfileWebinars() {
  const scheduled = useScheduledWebinars();
  const profile = readUserProfile();
  const [signups, setSignups] = useState(readWebinarSignups);
  const [note, setNote] = useState("");
  const bookedIds = new Set(signups.map((row) => row.webinarId));
  const openSessions = scheduled.filter((row) => isWebinarBookable(row));

  const book = (webinar) => {
    const name = String(profile.name || "").trim();
    const mobile = accountCreatorMobile(profile);
    if (!name || !/^[6-9]\d{9}$/.test(mobile)) {
      setNote("Add your name and mobile in the account before booking.");
      return;
    }
    if (bookedIds.has(webinar.id)) return;
    const entry = {
      id: `MH-WB-${Math.floor(100000 + Math.random() * 900000)}`,
      webinarId: webinar.id,
      title: webinar.title,
      name,
      mobile,
      createdAt: new Date().toLocaleString(),
    };
    setSignups(saveWebinarSignup(entry));
    setNote(`Seat reserved for ${webinar.title}. Reference ${entry.id}.`);
  };

  if (!openSessions.length && !signups.length && !note) {
    return <p className="profile-order-empty">No webinar is open.</p>;
  }

  return (
    <div className="profile-webinar-list">
      {note ? <p className="profile-report-note">{note}</p> : null}
      {openSessions.map((webinar) => {
        const booked = bookedIds.has(webinar.id);
        return (
          <article key={webinar.id} className="profile-webinar-notice" role="status">
            <div>
              <strong>Webinar scheduled.</strong>
              <span>
                {webinar.title} · {formatWebinarDate(webinar.date)} · {webinar.time}
              </span>
            </div>
            {booked ? (
              <a href={webinarSessionHref(webinar.id)}>Seat reserved</a>
            ) : (
              <button type="button" onClick={() => book(webinar)}>
                Book
              </button>
            )}
          </article>
        );
      })}
      {signups
        .filter((row) => !openSessions.some((webinar) => webinar.id === row.webinarId))
        .map((row) => (
          <article key={row.id}>
            <div>
              <strong>{row.title || "Webinar"}</strong>
              <span>{row.id}</span>
            </div>
            <a href={webinarSessionHref(row.webinarId)}>Open</a>
          </article>
        ))}
    </div>
  );
}

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
  const [panel, setPanel] = useState("");
  const [recordPick, setRecordPick] = useState("");
  const [eduPick, setEduPick] = useState("");
  const scheduledWebinars = useScheduledWebinars();
  const [seenNoticeId, setSeenNoticeId] = useState(readSeenWebinarNotice);
  const [noticeNow, setNoticeNow] = useState(() => Date.now());
  const seenWebinarIds = useRef(null);
  const webinarAlert = webinarNotice(scheduledWebinars, seenNoticeId, isoDateToday(), noticeNow);

  useEffect(() => {
    const timer = window.setInterval(() => setNoticeNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const openFromNotice = () => {
      if (sessionStorage.getItem("mediHomeOpenEducationWebinar") !== "1") return;
      sessionStorage.removeItem("mediHomeOpenEducationWebinar");
      setEduPick("webinar");
      setPanel("education");
    };
    openFromNotice();
    window.addEventListener("mediHomeEducationNotice", openFromNotice);
    return () => window.removeEventListener("mediHomeEducationNotice", openFromNotice);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const openIds = () =>
      readCachedWebinars().filter((row) => isWebinarBookable(row)).map((row) => row.id);
    const pull = async (markBaseline) => {
      try {
        await fetchPublicFeatures();
      } catch {
        /* keep the last known plan */
      }
      if (cancelled) return;
      const ids = openIds();
      const known = seenWebinarIds.current;
      if (markBaseline || known == null) {
        seenWebinarIds.current = new Set(ids);
        return;
      }
      const fresh = ids.some((id) => !known.has(id));
      seenWebinarIds.current = new Set(ids);
      if (fresh) {
        setEduPick("webinar");
        setPanel("education");
      }
    };
    pull(true);
    const timer = window.setInterval(() => pull(false), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

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
      setError("Choose a PDF or photo.");
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
          ? `${testName} saved.`
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
    <div className="profile-reports" aria-label="Records">
      <style>{reportStyles}</style>
      <div className="profile-upload-row">
        <button
          type="button"
          className={panel === "record" ? "profile-upload-tab is-record is-on" : "profile-upload-tab is-record"}
          aria-expanded={panel === "record"}
          onClick={() => {
            setRecordPick("");
            setPanel((current) => (current === "record" ? "" : "record"));
          }}
        >
          Medical Record
        </button>
        <button
          type="button"
          className={panel === "orders" ? "profile-upload-tab is-orders is-on" : "profile-upload-tab is-orders"}
          aria-expanded={panel === "orders"}
          onClick={() => setPanel((current) => (current === "orders" ? "" : "orders"))}
        >
          Orders
        </button>
        <button
          type="button"
          className={panel === "education" ? "profile-upload-tab is-education is-on" : "profile-upload-tab is-education"}
          aria-expanded={panel === "education"}
          onClick={() => {
            if (panel === "education") {
              setEduPick("");
              setPanel("");
              return;
            }
            setEduPick(webinarAlert ? "webinar" : "");
            setPanel("education");
          }}
        >
          Education
          {webinarAlert ? <span className="profile-edu-dot">New</span> : null}
        </button>
        <DoseSchedule holdClosed={Boolean(panel)} onOpen={() => setPanel("")} />
      </div>
      {panel ? (
        <AccountPopup
          title={
            panel === "record"
              ? recordPick === "prescription"
                ? "Prescription"
                : recordPick === "report"
                  ? "Report"
                  : "Medical Record"
              : panel === "orders"
                ? "Orders"
                : "Education"
          }
          onClose={() => {
            setRecordPick("");
            setEduPick("");
            setPanel("");
          }}
        >
          {panel === "orders" ? <ProfileOrderList /> : null}
          {panel === "education" && webinarAlert ? (
            <div className="profile-edu-alert" role="status">
              <strong>Webinar scheduled.</strong>
              <span>
                {webinarAlert.title} · {formatWebinarDate(webinarAlert.date)} · {webinarAlert.time}
              </span>
              <button
                type="button"
                onClick={() => {
                  writeSeenWebinarNotice(webinarAlert.id);
                  setSeenNoticeId(webinarAlert.id);
                }}
              >
                Dismiss
              </button>
            </div>
          ) : null}
          {panel === "education" && eduPick !== "learn" ? (
            <div className="profile-record-picks">
              <button
                type="button"
                className={eduPick === "webinar" ? "profile-upload-tab is-webinar is-on" : "profile-upload-tab is-webinar"}
                aria-expanded={eduPick === "webinar"}
                onClick={() => setEduPick((current) => (current === "webinar" ? "" : "webinar"))}
              >
                Book webinar
              </button>
              <button
                type="button"
                className="profile-upload-tab is-education"
                aria-expanded={false}
                onClick={() => setEduPick("learn")}
              >
                Guides
              </button>
            </div>
          ) : null}
          {panel === "education" && eduPick === "webinar" ? <ProfileWebinars /> : null}
          {panel === "education" && eduPick === "learn" ? <HealthEducation embedded /> : null}
          {panel === "record" && !recordPick ? (
            <div className="profile-record-picks">
              <button
                type="button"
                className={recordPick === "prescription" ? "profile-upload-tab is-rx is-on" : "profile-upload-tab is-rx"}
                aria-expanded={recordPick === "prescription"}
                onClick={() => setRecordPick((current) => (current === "prescription" ? "" : "prescription"))}
              >
                Prescription
              </button>
              <button
                type="button"
                className={recordPick === "report" ? "profile-upload-tab is-report is-on" : "profile-upload-tab is-report"}
                aria-expanded={recordPick === "report"}
                onClick={() => setRecordPick((current) => (current === "report" ? "" : "report"))}
              >
                Report
              </button>
            </div>
          ) : null}
          {panel === "record" && recordPick ? (
            <button type="button" className="profile-record-back" onClick={() => setRecordPick("")}>
              Back
            </button>
          ) : null}
          {panel === "record" && recordPick === "prescription" ? (
            <HomePrescriptionUpload showCart={false} idPrefix="profile" formOnly />
          ) : null}
          {panel === "record" && recordPick === "report" ? (
            <>
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
            This imaging report is stored as a file. It is not converted into a number chart.
          </p>
        ) : null}
        {testName && !imaging ? (
          <div className="profile-report-values">
            <p>
              Enter the numbers printed on this report. The next copy of the same report is
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
      {testName && groups.some((group) => group.name === testName) ? (
        <div className="profile-report-list">
          {groups.filter((group) => group.name === testName).map((group) => {
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
                  <p className="profile-report-note">Kept as a file.</p>
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
      ) : null}
            </>
          ) : null}
        </AccountPopup>
      ) : null}
      {viewer ? <RecordViewer record={viewer} onClose={() => setViewer(null)} /> : null}
    </div>
  );
}

const reportStyles = `
  .profile-upload-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;align-items:stretch}
  .profile-reports{display:grid;gap:12px}
  .profile-upload-row .dose-schedule,.profile-upload-row .dose-missed{display:contents}
  .profile-upload-row .dose-editor,.profile-upload-row .dose-missed-body{grid-column:1 / -1;width:100%}
  .profile-upload-tab,.profile-upload-row .dose-fold,.profile-upload-row .dose-missed-tab,.profile-upload-row .dose-alarm-tab{display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:100%;min-height:46px;margin:0;padding:8px 10px;border:1px solid transparent;border-radius:16px;font:inherit;font-size:13px;font-weight:800;line-height:1.2;cursor:pointer;text-align:center;box-shadow:0 1px 0 rgba(255,255,255,.75) inset, 0 6px 14px rgba(20,50,70,.06);transition:transform .12s ease, box-shadow .12s ease, background .12s ease}
  .profile-upload-tab:hover,.profile-upload-row .dose-fold:hover,.profile-upload-row .dose-missed-tab:hover,.profile-upload-row .dose-alarm-tab:hover{transform:translateY(-1px)}
  .profile-upload-tab.is-on,.profile-upload-row .dose-fold.is-on,.profile-upload-row .dose-missed-tab.is-on,.profile-upload-row .dose-alarm-tab.is-on{box-shadow:inset 0 0 0 2px currentColor, 0 6px 14px rgba(20,50,70,.08)}
  .profile-upload-tab.is-rx{background:#e3f6ee;color:#1f7a5c;border-color:#bfe4d2}
  .profile-upload-tab.is-report{background:#e3f0fb;color:#2f6394;border-color:#c5dbf2}
  .profile-upload-tab.is-orders{background:#e2f7f4;color:#1d7a70;border-color:#bfe6e0}
  .profile-upload-tab.is-record{background:#e6eef8;color:#34598a;border-color:#c9d6ee}
  .profile-edu-dot{display:inline-flex;align-items:center;margin-left:6px;padding:1px 6px;border-radius:999px;background:#0639b8;color:#fff;font-size:10px;font-weight:800;letter-spacing:.02em;line-height:1.5}
  .profile-edu-alert{display:grid;gap:2px;margin:0 0 12px;padding:12px 14px;border-radius:12px;background:#0639b8;color:#fff}
  .profile-edu-alert strong{font-size:13px;letter-spacing:.02em}
  .profile-edu-alert span{font-size:14px;font-weight:700}
  .profile-edu-alert button{justify-self:start;margin-top:6px;border:0;border-radius:8px;background:#fff;color:#0639b8;font:inherit;font-size:12px;font-weight:800;padding:6px 10px;cursor:pointer}
  .profile-record-picks{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
  .profile-record-back{justify-self:start;margin:0 0 12px;border:1px solid #c9d6ee;border-radius:999px;background:#fff;color:#34598a;font:inherit;font-size:13px;font-weight:800;min-height:34px;padding:0 14px;cursor:pointer}
  .profile-webinar-list{display:grid;gap:8px}
  .profile-webinar-list article{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;background:#f4f6fc}
  .profile-webinar-list strong{display:block;color:#143246;font-size:14px}
  .profile-webinar-list span{display:block;color:#5d7180;font-size:12px}
  .profile-webinar-list article.profile-webinar-notice{background:#0639b8;color:#fff}
  .profile-webinar-list article.profile-webinar-notice strong{color:#fff;letter-spacing:.02em}
  .profile-webinar-list article.profile-webinar-notice span{color:#e7eeff}
  .profile-webinar-list button,.profile-webinar-list a{border:0;border-radius:8px;background:#4c5688;color:#fff;font:inherit;font-size:13px;font-weight:800;text-decoration:none;padding:8px 12px;cursor:pointer}
  .profile-order-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
  .profile-order-list li{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;background:#f4fafb;font-size:14px}
  .profile-order-list span{color:#143246;font-weight:800}
  .profile-order-list strong{font-weight:800;color:#1a6b7a}
  .profile-order-empty{margin:0;color:#5d7180;font-size:14px}
  .profile-upload-row .dose-fold{background:#fbf3e4;color:#8a6230;border-color:#ead7b4}
  .profile-upload-row .dose-missed-tab{background:#fbeeee;color:#8d4e4e;border-color:#f0d0d0}
  .profile-upload-row .dose-alarm-tab{background:#f3eefb;color:#5d4f8a;border-color:#ddd2f2}
  .profile-reports>p{margin:0;color:#607589;font-size:13px;line-height:1.4}
  .profile-report-form{display:grid;gap:10px}
  .profile-report-form label{display:grid;gap:4px;font-size:12px;font-weight:700;color:#34546b}
  .profile-report-form select,.profile-report-form input{width:100%;box-sizing:border-box;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#143246;font:inherit;font-size:14px}
  .profile-report-note{margin:0;color:#5d7180;font-size:12px;line-height:1.4}
  .profile-report-note button{border:0;background:transparent;color:#1a6b7a;font:inherit;font-size:12px;font-weight:800;cursor:pointer;padding:0}
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
