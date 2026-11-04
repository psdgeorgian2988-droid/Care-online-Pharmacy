import { useEffect, useState } from "react";
import {
  DOCTOR_SYMPTOMS,
  doctorPrescriptionFrom,
  doctorVisitSummary,
  patientMobile,
  visitsForPatient,
} from "./doctorVisit.js";
import { openPartnerReport, searchPartnerReports } from "./reportApi.js";

export function DoctorAppointmentList({ jobs = [], openId = "", onOpen, renderDetail, empty = "No appointments yet." }) {
  if (!jobs.length) return <p className="order-list-empty">{empty}</p>;
  return (
    <ul className="doctor-visit-list">
      {jobs.map((job) => {
        const id = String(job.id || job.bookingId || job.requestId || "");
        const summary = doctorVisitSummary(job);
        const open = String(openId) === id;
        return (
          <li key={id || summary.name}>
            <div className={`doctor-visit-card${open ? " is-on" : ""}`}>
              <button
                type="button"
                className={`order-list-job${open ? " is-on" : ""}`}
                onClick={() => onOpen?.(open ? "" : id)}
              >
                #{id}
              </button>
              <strong>{summary.name}</strong>
              <span>Mobile: {summary.mobile}</span>
              <span>Address: {summary.address}</span>
              <span>Time: {summary.time}</span>
              <em>Reason: {summary.reason}</em>
            </div>
            {open && renderDetail ? <div className="doctor-visit-detail">{renderDetail(job)}</div> : null}
          </li>
        );
      })}
    </ul>
  );
}

export function DoctorPatientChart({ job, jobs = [], busy = false, onSave, onOpenReport }) {
  const visits = visitsForPatient(jobs.length ? jobs : [job], job);
  const saved = job?.doctorPrescription || {};
  const [symptom, setSymptom] = useState(DOCTOR_SYMPTOMS[0]);
  const [custom, setCustom] = useState("");
  const [chosen, setChosen] = useState(() => (Array.isArray(saved.symptoms) ? saved.symptoms : []));
  const [note, setNote] = useState(saved.note || "");
  const [error, setError] = useState("");
  const [reports, setReports] = useState([]);

  const mobile = patientMobile(job);
  useEffect(() => {
    if (mobile.length !== 10) return undefined;
    let cancelled = false;
    searchPartnerReports({ mobile })
      .then((data) => {
        if (!cancelled) setReports(Array.isArray(data.reports) ? data.reports : []);
      })
      .catch(() => {
        if (!cancelled) setReports([]);
      });
    return () => {
      cancelled = true;
    };
  }, [mobile]);

  const addSymptom = (value) => {
    const next = String(value || "").replace(/\s+/g, " ").trim();
    if (next.length < 2) return;
    setChosen((current) => {
      if (current.some((row) => row.toLowerCase() === next.toLowerCase())) return current;
      return [...current, next].slice(0, 12);
    });
    setError("");
  };

  const save = async () => {
    const built = doctorPrescriptionFrom({ symptoms: chosen, note });
    if (!built.ok) {
      setError(built.error);
      return;
    }
    setError("");
    await onSave?.(built.prescription);
  };

  const openReport = async (id) => {
    const data = await openPartnerReport(id);
    if (data?.report) onOpenReport?.(data.report);
  };

  return (
    <section className="doctor-patient-chart" aria-label="Patient profile">
      <h3>Patient profile</h3>
      <p>Records from this patient's visits stay here for the next appointment.</p>
      <ul className="doctor-visit-history">
        {visits.map((visit) => {
          const summary = doctorVisitSummary(visit);
          const rx = visit.doctorPrescription;
          const id = visit.id || visit.bookingId || summary.time;
          return (
            <li key={id}>
              <strong>{summary.time}</strong>
              <span>{summary.reason}</span>
              {rx?.symptoms?.length ? <span>Prescription: {rx.symptoms.join(", ")}</span> : null}
              {rx?.note ? <span>{rx.note}</span> : null}
              {visit.reportFileName ? <span>Report: {visit.reportFileName}</span> : null}
            </li>
          );
        })}
      </ul>
      {reports.length ? (
        <div className="doctor-report-list">
          <p>Saved reports</p>
          <ul>
            {reports.map((report) => (
              <li key={report.id}>
                <button type="button" onClick={() => openReport(report.id)}>
                  {report.testName || report.fileName || "Report"} · {report.date || ""}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <form
        className="doctor-rx-form"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <h3>Write prescription</h3>
        <label>
          Symptom
          <select value={symptom} onChange={(event) => setSymptom(event.target.value)}>
            {DOCTOR_SYMPTOMS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => addSymptom(symptom)}>
          Add symptom
        </button>
        <label>
          Add another symptom
          <input
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            placeholder="Type a symptom"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            addSymptom(custom);
            setCustom("");
          }}
        >
          Add
        </button>
        {chosen.length ? (
          <ul className="doctor-symptom-list">
            {chosen.map((name) => (
              <li key={name}>
                <span>{name}</span>
                <button type="button" onClick={() => setChosen((current) => current.filter((row) => row !== name))}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No symptoms added yet.</p>
        )}
        <label>
          Medicines and advice
          <textarea value={note} rows={3} onChange={(event) => setNote(event.target.value)} />
        </label>
        {error ? <p className="admin-error">{error}</p> : null}
        <button type="submit" className="partner-accept" disabled={busy}>
          {busy ? "Saving…" : "Save prescription"}
        </button>
      </form>
    </section>
  );
}
