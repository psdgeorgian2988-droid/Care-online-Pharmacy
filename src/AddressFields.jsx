import { useEffect, useRef, useState } from "react";
import { ADDRESS_FIELDS } from "./addressFields";
import { lookupPinDirectory } from "./pinLocation";

export default function AddressFields({
  idPrefix = "addr",
  values = {},
  errors = {},
  onChange,
  pinHint = "City, District and State are filled from this PIN.",
}) {
  const [pinStatus, setPinStatus] = useState("");
  const pinRequest = useRef(0);

  const patch = (name, value) => {
    onChange?.({ target: { name, value } });
  };

  useEffect(() => {
    const pin = String(values.pinCode || "").replace(/\D/g, "").slice(0, 6);
    if (pin.length !== 6) {
      setPinStatus("");
      if (values.city || values.district || values.state) {
        patch("city", "");
        patch("district", "");
        patch("state", "");
      }
      return undefined;
    }

    const requestId = ++pinRequest.current;
    setPinStatus("Looking up PIN…");
    lookupPinDirectory(pin).then((row) => {
      if (requestId !== pinRequest.current) return;
      if (!row?.city) {
        setPinStatus("This PIN Code was not found.");
        patch("city", "");
        patch("district", "");
        patch("state", "");
        return;
      }
      setPinStatus("");
      if (values.city !== row.city) patch("city", row.city);
      if (values.district !== row.district) patch("district", row.district);
      if (values.state !== row.state) patch("state", row.state);
    });
    return undefined;
    // Only re-run when the PIN changes; city/district/state are filled from that lookup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.pinCode]);

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
          const required = field.required !== false && !field.auto;
          const auto = Boolean(field.auto);
          return (
            <div
              key={field.name}
              className={`addr-field${auto ? " addr-auto" : ""}`}
            >
              <label htmlFor={id}>
                {field.label}
                {auto ? (
                  <em> (from PIN)</em>
                ) : required ? (
                  <span> *</span>
                ) : (
                  <em> (optional)</em>
                )}
              </label>
              <input
                id={id}
                name={field.name}
                value={values[field.name] || ""}
                onChange={auto ? undefined : handleChange}
                placeholder={field.placeholder}
                inputMode={field.inputMode}
                maxLength={field.maxLength}
                autoComplete="off"
                required={required}
                readOnly={auto}
                tabIndex={auto ? -1 : undefined}
              />
              {errors[field.name] ? (
                <small className="addr-error">{errors[field.name]}</small>
              ) : field.name === "pinCode" ? (
                <small
                  className={
                    pinStatus && pinStatus.includes("not found")
                      ? "addr-error"
                      : "addr-hint"
                  }
                >
                  {pinStatus || pinHint}
                </small>
              ) : field.hint && !auto ? (
                <small className="addr-hint">{field.hint}</small>
              ) : auto && values[field.name] ? (
                <small className="addr-hint">Filled from PIN Code.</small>
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
.addr-field.addr-auto input{background:#f3f7fa;color:#3a5568;border-color:#d3e0e8;cursor:default}
.addr-error{margin-top:4px;color:#d84b4b;font-size:11px}
.addr-hint{margin-top:4px;color:#5d7180;font-size:11px}
@media (min-width:640px){
  .addr-fields{grid-template-columns:1fr 1fr 1fr}
  .addr-field:nth-child(1),
  .addr-field:nth-child(2),
  .addr-field:nth-child(3),
  .addr-field:nth-child(7){grid-column:1/-1}
}
`;
