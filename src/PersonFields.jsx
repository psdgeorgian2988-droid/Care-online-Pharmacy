import {
  GENDER_OPTIONS,
  ageFromDob,
  isoDateToday,
  isoDateYearsAgo,
} from "./personFields";
import DateMonthYearFields from "./DateMonthYearFields";

export default function PersonFields({
  idPrefix = "person",
  values = {},
  errors = {},
  onChange,
}) {
  const genderId = `${idPrefix}-gender`;
  const age = values.dob ? ageFromDob(values.dob) : "";

  return (
    <>
      <style>{styles}</style>
      <div className="person-fields">
        <div className="person-field">
          <label htmlFor={genderId} className="person-label">
            Gender <span>*</span>
          </label>
          <select
            id={genderId}
            name="gender"
            value={values.gender || ""}
            onChange={(event) =>
              onChange?.({ target: { name: "gender", value: event.target.value } })
            }
            required
            aria-label="Gender"
          >
            <option value="">Select</option>
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.gender ? <small className="person-error">{errors.gender}</small> : null}
        </div>

        <div className="person-field person-dob">
          <DateMonthYearFields
            idPrefix={`${idPrefix}-dob`}
            name="dob"
            value={values.dob || ""}
            max={isoDateToday()}
            min={isoDateYearsAgo(120)}
            required
            error={errors.dob || ""}
            onChange={onChange}
          />
          {!errors.dob && age !== "" ? (
            <small className="person-age">{age} years</small>
          ) : null}
        </div>
      </div>
    </>
  );
}

const styles = `
.person-fields{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px 8px;width:100%;grid-column:1/-1}
.person-dob{grid-column:1/-1}
.person-field{display:flex;flex-direction:column;min-width:0}
.person-label{margin-bottom:5px;font-size:12px;font-weight:700;color:#34546b}
.person-label span{color:#e34d4d}
.person-field input,.person-field select{width:100%;box-sizing:border-box;height:38px;min-height:38px;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#143246;font:inherit;font-size:14px}
.person-field input:focus,.person-field select:focus{outline:none;border-color:#1a6b7a;box-shadow:none}
.person-error{margin-top:4px;color:#d84b4b;font-size:11px}
.person-age{margin-top:4px;color:#34546b;font-size:12px;font-weight:700}
@media (max-width:800px){.person-fields{grid-template-columns:1fr 1fr 1fr}}
`;
