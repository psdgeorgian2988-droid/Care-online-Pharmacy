import { GENDER_OPTIONS } from "./personFields";

export default function PersonFields({
  idPrefix = "person",
  values = {},
  errors = {},
  onChange,
}) {
  const genderId = `${idPrefix}-gender`;
  const ageId = `${idPrefix}-age`;

  return (
    <>
      <style>{styles}</style>
      <div className="person-fields">
        <div className="person-field">
          <span id={genderId} className="person-label">
            Gender <span>*</span>
          </span>
          <div className="person-gender" role="radiogroup" aria-labelledby={genderId}>
            {GENDER_OPTIONS.map((option) => {
              const id = `${idPrefix}-gender-${option.value}`;
              return (
                <label key={option.value} htmlFor={id} className="person-gender-option">
                  <input
                    id={id}
                    type="radio"
                    name={`${idPrefix}-gender`}
                    value={option.value}
                    checked={values.gender === option.value}
                    onChange={() =>
                      onChange?.({ target: { name: "gender", value: option.value } })
                    }
                  />
                  <span>
                    {option.label} ({option.value})
                  </span>
                </label>
              );
            })}
          </div>
          {errors.gender ? <small className="person-error">{errors.gender}</small> : null}
        </div>

        <div className="person-field">
          <label htmlFor={ageId} className="person-label">
            Age <span>*</span>
          </label>
          <input
            id={ageId}
            name="age"
            inputMode="numeric"
            maxLength={3}
            placeholder="Age in years"
            value={values.age || ""}
            onChange={(event) =>
              onChange?.({
                target: {
                  name: "age",
                  value: String(event.target.value || "").replace(/\D/g, "").slice(0, 3),
                },
              })
            }
            required
          />
          {errors.age ? (
            <small className="person-error">{errors.age}</small>
          ) : (
            <small className="person-hint">Enter completed age in years.</small>
          )}
        </div>
      </div>
    </>
  );
}

const styles = `
.person-fields{display:grid;grid-template-columns:1fr;gap:10px;width:100%}
.person-field{display:flex;flex-direction:column;min-width:0}
.person-label{margin-bottom:5px;font-size:12px;font-weight:700;color:#34546b}
.person-label span{color:#e34d4d}
.person-gender{display:flex;gap:8px;flex-wrap:wrap}
.person-gender-option{display:flex;align-items:center;gap:6px;min-height:38px;padding:0 12px;border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#29455a;font-size:13px;font-weight:700;cursor:pointer}
.person-gender-option:has(input:checked){border-color:#1e8a73;background:#eef8f5}
.person-gender-option input{accent-color:#1e8a73}
.person-field input{width:100%;box-sizing:border-box;min-height:38px;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#29455a;font:inherit;font-size:13px}
.person-field input:focus{outline:none;border-color:#35a8d2;box-shadow:0 0 0 2px rgba(53,168,210,.1)}
.person-error{margin-top:4px;color:#d84b4b;font-size:11px}
.person-hint{margin-top:4px;color:#5d7180;font-size:11px}
`;
