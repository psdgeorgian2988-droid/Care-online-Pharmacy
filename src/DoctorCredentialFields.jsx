import {
  DOCTOR_COUNCILS,
  DOCTOR_EXPERIENCE,
  DOCTOR_QUALIFICATIONS,
  DOCTOR_SPECIALTIES,
} from "./doctorCredentials.js";

export default function DoctorCredentialFields({
  profile,
  onChange,
  onPhoto,
  onCertificate,
  onRemoveCertificate,
}) {
  const certificates = Array.isArray(profile.certificates) ? profile.certificates : [];
  return (
    <>
      <label>
        Specialty
        <select
          required
          value={profile.specialty || ""}
          onChange={(event) => onChange({ specialty: event.target.value })}
        >
          <option value="">Select specialty</option>
          {DOCTOR_SPECIALTIES.map((row) => (
            <option key={row.value} value={row.value}>
              {row.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Qualification
        <select
          required
          value={profile.qualification || ""}
          onChange={(event) => onChange({ qualification: event.target.value })}
        >
          <option value="">Select qualification</option>
          {DOCTOR_QUALIFICATIONS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Experience
        <select
          required
          value={profile.experienceYears || ""}
          onChange={(event) => onChange({ experienceYears: event.target.value })}
        >
          <option value="">Select experience</option>
          {DOCTOR_EXPERIENCE.map((row) => (
            <option key={row.value} value={row.value}>
              {row.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Medical registration number
        <input
          required
          minLength={3}
          value={profile.registrationNumber || ""}
          onChange={(event) => onChange({ registrationNumber: event.target.value })}
          placeholder="Council registration number"
        />
      </label>
      <label>
        Registration council
        <select
          required
          value={profile.registrationCouncil || ""}
          onChange={(event) => onChange({ registrationCouncil: event.target.value })}
        >
          <option value="">Select council</option>
          {DOCTOR_COUNCILS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Profile photo
        <input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={onPhoto} />
        {profile.photoName ? <span>{profile.photoName}</span> : <span>JPG or PNG, max 3 MB</span>}
      </label>
      <label>
        Certificates
        <input
          type="file"
          accept="image/*,.pdf,application/pdf"
          onChange={onCertificate}
        />
        <span>Degree or registration certificate. PDF or photo, max 10 MB. Add more than one if needed.</span>
      </label>
      {certificates.length ? (
        <ul className="doctor-cert-list">
          {certificates.map((row, index) => (
            <li key={`${row.fileName || row.name}-${index}`}>
              <span>{row.name || row.fileName || "Certificate"}</span>
              <button type="button" onClick={() => onRemoveCertificate(index)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
