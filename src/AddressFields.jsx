import { ADDRESS_FIELDS } from "./addressFields";

export default function AddressFields({
  idPrefix = "addr",
  values = {},
  errors = {},
  onChange,
  pinHint = "Location is taken from this PIN.",
}) {
  const handleChange = (event) => {
    const { name, value } = event.target;
    const next =
      name === "pinCode" ? value.replace(/\D/g, "").slice(0, 6) : value;
    onChange?.({ target: { name, value: next } });
  };

  return (
    <>
      <style>{styles}</style>
      <div className="addr-fields">
        {ADDRESS_FIELDS.map((field) => {
          const id = `${idPrefix}-${field.name}`;
          const required = field.required !== false;
          return (
            <div key={field.name} className="addr-field">
              <label htmlFor={id}>
                {field.label}
                {required ? <span> *</span> : <em> (optional)</em>}
              </label>
              <input
                id={id}
                name={field.name}
                value={values[field.name] || ""}
                onChange={handleChange}
                placeholder={field.placeholder}
                inputMode={field.inputMode}
                maxLength={field.maxLength}
                autoComplete="off"
                required={required}
              />
              {errors[field.name] ? (
                <small className="addr-error">{errors[field.name]}</small>
              ) : field.name === "pinCode" && pinHint ? (
                <small className="addr-hint">{pinHint}</small>
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
}

const styles = `
.addr-fields{display:grid;grid-template-columns:1fr;gap:10px;width:100%}
.addr-field{display:flex;flex-direction:column;min-width:0}
.addr-field label{margin-bottom:5px;font-size:12px;font-weight:700;color:#34546b}
.addr-field label span{color:#e34d4d}
.addr-field label em{font-style:normal;font-weight:600;color:#7a8a92}
.addr-field input{width:100%;box-sizing:border-box;min-height:38px;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#29455a;font:inherit;font-size:13px}
.addr-field input:focus{outline:none;border-color:#35a8d2;box-shadow:0 0 0 2px rgba(53,168,210,.1)}
.addr-error{margin-top:4px;color:#d84b4b;font-size:11px}
.addr-hint{margin-top:4px;color:#5d7180;font-size:11px}
`;
