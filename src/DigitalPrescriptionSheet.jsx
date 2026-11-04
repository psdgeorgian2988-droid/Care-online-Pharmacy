import { buildDigitalPrescription, show } from "./digitalRxFormat";

function Row({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{show(value)}</strong>
    </div>
  );
}

export default function DigitalPrescriptionSheet({
  source = {},
  extras = {},
  showMedicines = true,
  showTests = true,
}) {
  const doc = buildDigitalPrescription(source, extras);
  return (
    <section className="digital-rx" aria-label="Digital prescription">
      <p className="digital-rx-kicker">MediHome</p>
      <h3>{doc.title}</h3>
      <p className="digital-rx-status">{doc.status}</p>
      <p className="digital-rx-id">Prescription ID: {doc.prescriptionId}</p>
      <h4>A. Patient information</h4>
      <div className="digital-rx-grid">
        <Row label="Patient name" value={doc.patient.name} />
        <Row label="Patient ID" value={doc.patient.patientId} />
        <Row label="Age / Gender" value={doc.patient.ageGender} />
        <Row label="Mobile number" value={doc.patient.mobile} />
        <Row label="Prescription date" value={doc.patient.prescriptionDate} />
      </div>
      <h4>B. Doctor information</h4>
      <div className="digital-rx-grid">
        <Row label="Doctor name" value={doc.doctor.name} />
        <Row label="Qualification" value={doc.doctor.qualification} />
        <Row label="Registration no." value={doc.doctor.registrationNo} />
        <Row label="Hospital / Clinic" value={doc.doctor.hospital} />
      </div>
      <h4>C. Diagnosis</h4>
      <div className="digital-rx-grid">
        <Row label="Primary diagnosis" value={doc.diagnosis.primary} />
        <Row label="Secondary diagnosis" value={doc.diagnosis.secondary} />
        <Row label="Clinical notes" value={doc.diagnosis.notes} />
      </div>
      <h4>D. Medicines prescribed</h4>
      {showMedicines ? (
        doc.medicines.length ? (
        <div className="digital-rx-table" role="table">
          <div className="digital-rx-head" role="row">
            <span>Medicine</span>
            <span>Strength</span>
            <span>Dose</span>
            <span>Frequency</span>
            <span>Duration</span>
          </div>
          {doc.medicines.map((med) => (
            <div className="digital-rx-row" role="row" key={med.id || med.name}>
              <strong>
                {med.name}
                {med.uncertain ? <em> Unclear — confirm before ordering</em> : null}
              </strong>
              <span>{show(med.strength)}</span>
              <span>{show(med.dose)}</span>
              <span>{show(med.frequency)}</span>
              <span>{med.duration}</span>
            </div>
          ))}
        </div>
      ) : (
        <p>No medicines on this digital prescription.</p>
      )
      ) : (
        <p>{doc.medicines.length ? `${doc.medicines.length} listed below for confirmation.` : "No medicines on this digital prescription."}</p>
      )}
      {showTests ? (
        <>
      <h4>E. Laboratory investigations</h4>
      {doc.investigations.length ? (
        <ul>
          {doc.investigations.map((test) => (
            <li key={test.name}>{test.name}</li>
          ))}
        </ul>
      ) : (
        <p>Not on prescription</p>
      )}
        </>
      ) : null}
      <h4>F. Additional instructions</h4>
      <div className="digital-rx-grid">
        <Row label="Before / after food" value={doc.instructions.foodTiming} />
        <Row label="Special instructions" value={doc.instructions.special} />
        <Row label="Follow-up date" value={doc.instructions.followUpDate} />
      </div>
      <h4>G. Verification</h4>
      <div className="digital-rx-grid">
        <Row label="Original prescription" value={doc.verification.originalPrescription} />
        <Row label="AI extraction" value={doc.verification.aiExtraction} />
        <Row label="Pharmacist verification" value={doc.verification.pharmacistVerification} />
        <Row label="Doctor authentication" value={doc.verification.doctorAuthentication} />
      </div>
      <p className="digital-rx-note">{doc.disclaimer}</p>
    </section>
  );
}

export const digitalPrescriptionSheetStyles = `
.digital-rx{margin:8px 0;padding:10px;border:1px solid #d2e8ef;border-radius:10px;background:#fff;text-align:left}
.digital-rx-kicker{margin:0;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#1a6b7a}
.digital-rx h3{margin:2px 0;font-size:16px;color:#143246}
.digital-rx h4{margin:12px 0 6px;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#1a6b7a}
.digital-rx-status{margin:0;font-size:12px;font-weight:700;color:#1a6b7a}
.digital-rx-id,.digital-rx p{margin:4px 0;font-size:12px;color:#34546b}
.digital-rx-grid{display:grid;gap:4px}
.digital-rx-grid div{display:grid;grid-template-columns:148px 1fr;gap:8px;font-size:12px}
.digital-rx-grid span{color:#5d7180}
.digital-rx-grid strong{font-weight:700;color:#143246}
.digital-rx-table{display:grid;gap:4px}
.digital-rx-head,.digital-rx-row{display:grid;grid-template-columns:1.4fr .8fr .7fr .8fr .8fr;gap:6px;font-size:11px}
.digital-rx-head{font-weight:800;color:#5d7180}
.digital-rx-row strong{font-size:12px;color:#143246}
.digital-rx-row em{display:block;font-style:normal;font-size:10px;color:#8a5a12}
.digital-rx-note{margin-top:10px;font-size:11px;line-height:1.4;color:#34546b}
.digital-rx ul{margin:0;padding-left:16px}
@media (max-width:720px){
  .digital-rx-head{display:none}
  .digital-rx-row{grid-template-columns:1fr 1fr;padding:6px 0;border-top:1px solid #e4ecef}
  .digital-rx-grid div{grid-template-columns:1fr}
}
`;
