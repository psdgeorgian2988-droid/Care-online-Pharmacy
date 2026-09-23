import { useState } from "react";
import { hasPartnerRxShare } from "./rxPartnerShare";

function durationLabel(med) {
  return med?.duration || "Not specified";
}

function timesLabel(med) {
  return med?.timesPerDay || "Not specified";
}

export default function RxShareCard({
  record,
  title = "Prescription for partner confirm",
  editable = false,
  busy = false,
  onCorrectMedicine,
}) {
  const [editingId, setEditingId] = useState("");
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  if (!hasPartnerRxShare(record)) return null;
  const share = record.rxShare || {};
  const digital = share.digital || null;
  const fileName = share.fileName || record.prescription || "";
  const original = share.originalFile || "";
  const isPdf = share.originalKind === "pdf" || /\.pdf$/i.test(fileName);

  const save = async (med) => {
    const nextName = editName.trim();
    if (!nextName || !onCorrectMedicine) return;
    setError("");
    try {
      await onCorrectMedicine(med, nextName);
      setEditingId("");
      setEditName("");
    } catch (err) {
      setError(err.message || "Could not save the corrected name.");
    }
  };

  return (
    <section className="rx-share-card" aria-label={title}>
      <p className="rx-share-kicker">{title}</p>
      <p className="rx-share-lead">
        Original copy and AI digital prescription are shared with this partner for
        confirmation.
        {editable
          ? " If a generated medicine name is wrong, correct it here. The customer order uses the same name."
          : ""}
      </p>
      <div className="rx-share-split">
        <div className="rx-share-pane">
          <h4>Original Rx</h4>
          {original && !isPdf ? (
            <img src={original} alt={fileName || "Original prescription"} />
          ) : original && isPdf ? (
            <iframe title={fileName || "Original prescription PDF"} src={original} />
          ) : fileName ? (
            <p>File on order: {fileName}</p>
          ) : (
            <p>No original file attached.</p>
          )}
          {fileName && original ? <p className="rx-share-file">{fileName}</p> : null}
        </div>
        <div className="rx-share-pane">
          <h4>AI digital Rx</h4>
          {!digital ? (
            <p>No digital prescription generated.</p>
          ) : (
            <>
              {digital.patientName ? (
                <p>
                  <span>Patient</span> {digital.patientName}
                </p>
              ) : null}
              {digital.doctorName ? (
                <p>
                  <span>Doctor</span> {digital.doctorName}
                </p>
              ) : null}
              {digital.date ? (
                <p>
                  <span>Date</span> {digital.date}
                </p>
              ) : null}
              {digital.medicinesConfirmed ? (
                <p className="rx-share-ok">Patient confirmed medicine names</p>
              ) : null}
              {error ? <p className="rx-share-error">{error}</p> : null}
              {digital.medicines?.length ? (
                <ol>
                  {digital.medicines.map((med) => {
                    const key = med.id || med.name;
                    const editing = editingId === key;
                    return (
                      <li key={key}>
                        <strong>{med.name}</strong>
                        {med.strength ? ` ${med.strength}` : ""}
                        {med.form ? ` · ${med.form}` : ""}
                        {med.partnerCorrected ? (
                          <em className="rx-share-fixed">
                            Partner corrected
                            {med.asWritten && med.asWritten !== med.name
                              ? ` from ${med.asWritten}`
                              : ""}
                          </em>
                        ) : med.userCorrected ? (
                          <em className="rx-share-fixed">Customer corrected</em>
                        ) : null}
                        <em>
                          {durationLabel(med)} · {timesLabel(med)}
                        </em>
                        {editable ? (
                          editing ? (
                            <div className="rx-share-edit">
                              <input
                                value={editName}
                                onChange={(event) => setEditName(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    save(med);
                                  }
                                  if (event.key === "Escape") {
                                    setEditingId("");
                                    setEditName("");
                                  }
                                }}
                                placeholder="Correct medicine name"
                                disabled={busy}
                                autoComplete="off"
                                spellCheck={false}
                              />
                              <button
                                type="button"
                                className="partner-accept"
                                disabled={busy || !editName.trim()}
                                onClick={() => save(med)}
                              >
                                Save name
                              </button>
                              <button
                                type="button"
                                className="partner-decline"
                                disabled={busy}
                                onClick={() => {
                                  setEditingId("");
                                  setEditName("");
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="rx-share-correct"
                              disabled={busy}
                              onClick={() => {
                                setEditingId(key);
                                setEditName(med.name || "");
                                setError("");
                              }}
                            >
                              Make correction
                            </button>
                          )
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p>No medicines on the digital Rx.</p>
              )}
              {digital.tests?.length ? (
                <ul>
                  {digital.tests.map((test) => (
                    <li key={test.id || test.name}>{test.name}</li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export const rxShareCardStyles = `
.rx-share-card{margin:8px 0 0;padding:10px;border:1px solid #d2e8ef;border-radius:10px;background:#f7fbfd;text-align:left}
.rx-share-kicker{margin:0 0 4px;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#1a6b7a}
.rx-share-lead{margin:0 0 8px;font-size:12px;line-height:1.4;color:#34546b}
.rx-share-split{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.rx-share-pane{min-width:0;padding:8px;border:1px solid #e4ecef;border-radius:8px;background:#fff}
.rx-share-pane h4{margin:0 0 6px;font-size:12px;font-weight:800;color:#143246}
.rx-share-pane p,.rx-share-pane li{margin:0 0 4px;font-size:12px;color:#34546b;line-height:1.35}
.rx-share-pane span{display:inline-block;min-width:58px;color:#5d7180;font-weight:700}
.rx-share-pane img{display:block;width:100%;max-height:220px;object-fit:contain;border-radius:6px;background:#f3f7f9}
.rx-share-pane iframe{width:100%;height:180px;border:0;border-radius:6px;background:#fff}
.rx-share-pane ol,.rx-share-pane ul{margin:6px 0 0;padding-left:16px}
.rx-share-pane em{display:block;font-style:normal;font-size:11px;color:#5d7180}
.rx-share-fixed{color:#1a6b7a !important;font-weight:700}
.rx-share-file{margin-top:6px !important;font-size:11px !important;word-break:break-all}
.rx-share-ok{color:#1a6b7a !important;font-weight:700}
.rx-share-error{color:#b64b4b !important;font-weight:700}
.rx-share-correct{margin-top:4px;border:1px solid #1a6b7a;border-radius:6px;background:#fff;color:#1a6b7a;font:inherit;font-size:11px;font-weight:800;min-height:28px;padding:4px 8px;cursor:pointer}
.rx-share-edit{display:grid;gap:6px;margin-top:6px}
.rx-share-edit input{width:100%;box-sizing:border-box;min-height:32px;padding:6px 8px;border:1px solid #d7e2e9;border-radius:6px;font:inherit;font-size:12px}
@media (max-width:720px){
  .rx-share-split{grid-template-columns:1fr}
}
`;
