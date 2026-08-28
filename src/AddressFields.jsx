import { useEffect, useRef, useState } from "react";
import {
  ADDRESS_FIELDS,
  addressConfirmRows,
  isAddressConfirmed,
} from "./addressFields";
import { lookupPinDirectory, detectPinFromLocation } from "./pinLocation";

function pinAreas(values) {
  return Array.isArray(values.areas) ? values.areas.filter(Boolean) : [];
}

function digitsPin(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 6);
}

function matchAreaName(areas, hint) {
  const wanted = String(hint || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  if (!wanted) return "";
  const exact = areas.find(
    (name) =>
      String(name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "") === wanted
  );
  if (exact) return exact;
  if (wanted.length < 5) return "";
  return (
    areas.find((name) => {
      const key = String(name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "");
      return key.includes(wanted) || (key.length >= 5 && wanted.includes(key));
    }) || ""
  );
}

export default function AddressFields({
  idPrefix = "addr",
  values = {},
  errors = {},
  onChange,
  pinHint = "Enter the PIN Code to choose Village / Sector / Mohalla.",
}) {
  const [pinStatus, setPinStatus] = useState("");
  const [locating, setLocating] = useState(false);
  const pinRequest = useRef(0);
  const suggestedArea = useRef("");

  const patch = (name, value) => {
    onChange?.({ target: { name, value } });
  };

  const clearPinFields = () => {
    if (values.area) patch("area", "");
    if (pinAreas(values).length) patch("areas", []);
    if (values.city) patch("city", "");
    if (values.district) patch("district", "");
    if (values.state) patch("state", "");
    if (isAddressConfirmed(values.addressConfirmed)) patch("addressConfirmed", "");
  };

  useEffect(() => {
    const pin = digitsPin(values.pinCode);
    if (pin.length !== 6) {
      setPinStatus("");
      clearPinFields();
      return undefined;
    }

    const requestId = ++pinRequest.current;
    setPinStatus("Looking up PIN…");
    lookupPinDirectory(pin).then((row) => {
      if (requestId !== pinRequest.current) return;
      if (!row?.city) {
        setPinStatus("This PIN Code was not found.");
        clearPinFields();
        return;
      }
      const areas = Array.isArray(row.areas) ? row.areas : [];
      setPinStatus(
        areas.length
          ? "Select the Village / Sector / Mohalla for this PIN."
          : ""
      );
      patch("areas", areas);
      const hint = suggestedArea.current;
      suggestedArea.current = "";
      const matched = matchAreaName(areas, hint);
      const nextArea = areas.includes(values.area)
        ? values.area
        : matched || (areas.length === 1 ? areas[0] : "");
      if (values.area !== nextArea) patch("area", nextArea);
      if (values.city !== row.city) patch("city", row.city);
      if (values.district !== row.district) patch("district", row.district);
      if (values.state !== row.state) patch("state", row.state);
      if (isAddressConfirmed(values.addressConfirmed)) patch("addressConfirmed", "");
    });
    return undefined;
    // Only re-run when the PIN changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.pinCode]);

  const handleUseLocation = async (event) => {
    event.preventDefault();
    if (locating) return;
    setLocating(true);
    setPinStatus("Detecting PIN from your location…");
    try {
      const found = await detectPinFromLocation();
      suggestedArea.current = found.suggestedArea || "";
      if (digitsPin(values.pinCode) === found.pin) {
        const matched = matchAreaName(pinAreas(values), found.suggestedArea);
        if (matched && values.area !== matched) patch("area", matched);
        setPinStatus("PIN filled from your location. Recheck Village / Sector / Mohalla.");
      } else {
        patch("pinCode", found.pin);
        setPinStatus("PIN filled from your location. Recheck Village / Sector / Mohalla.");
      }
    } catch (error) {
      setPinStatus(
        error?.message || "Could not detect a PIN Code. Please enter it."
      );
    } finally {
      setLocating(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    const next =
      name === "pinCode" ? value.replace(/\D/g, "").slice(0, 6) : value;
    onChange?.({ target: { name, value: next } });
    if (name !== "addressConfirmed" && isAddressConfirmed(values.addressConfirmed)) {
      onChange?.({ target: { name: "addressConfirmed", value: "" } });
    }
  };

  const pin = digitsPin(values.pinCode);
  const areas = pinAreas(values);
  const pinMissing = pinStatus.includes("not found");
  const showAfterPin = pin.length === 6 && !pinMissing;
  const confirmId = `${idPrefix}-addressConfirmed`;
  const confirmRows = addressConfirmRows(values);
  const showConfirm = showAfterPin && Boolean(values.city && values.district && values.state);

  return (
    <>
      <style>{styles}</style>
      <div className="addr-fields">
        {ADDRESS_FIELDS.map((field) => {
          if (field.hidden) return null;
          if (field.afterPin && !showAfterPin) return null;

          const id = `${idPrefix}-${field.name}`;
          const auto = Boolean(field.auto);
          const selectable = Boolean(field.select);
          return (
            <div
              key={field.name}
              className={`addr-field${auto ? " addr-auto" : ""}${
                selectable ? " addr-select" : ""
              }`}
            >
              <label htmlFor={id}>
                {field.label}
                {field.required === false ? (
                  <em> (optional)</em>
                ) : (
                  <span> *</span>
                )}
              </label>
              {selectable ? (
                <select
                  id={id}
                  name="area"
                  value={values.area || ""}
                  onChange={handleChange}
                  required
                  disabled={!areas.length}
                >
                  <option value="">
                    {areas.length
                      ? "Select Village / Sector / Mohalla"
                      : "Looking up PIN…"}
                  </option>
                  {areas.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : field.name === "pinCode" ? (
                <div className="addr-pin-row">
                  <input
                    id={id}
                    name={field.name}
                    value={values[field.name] || ""}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    inputMode={field.inputMode}
                    maxLength={field.maxLength}
                    autoComplete="off"
                    required
                  />
                  <button
                    type="button"
                    className="addr-locate-btn"
                    onClick={handleUseLocation}
                    disabled={locating}
                  >
                    {locating ? "Detecting…" : "Use My Location"}
                  </button>
                </div>
              ) : (
                <input
                  id={id}
                  name={field.name}
                  value={values[field.name] || ""}
                  onChange={auto ? undefined : handleChange}
                  placeholder={field.placeholder}
                  inputMode={field.inputMode}
                  maxLength={field.maxLength}
                  autoComplete="off"
                  required={field.required !== false}
                  readOnly={auto}
                  tabIndex={auto ? -1 : undefined}
                />
              )}
              {errors[field.name] ? (
                <small className="addr-error">{errors[field.name]}</small>
              ) : field.name === "pinCode" ? (
                <small
                  className={
                    pinMissing || /allow location|could not|not available/i.test(pinStatus)
                      ? "addr-error"
                      : "addr-hint"
                  }
                >
                  {pinStatus ||
                    "Enter the PIN Code, or tap Use My Location to fill it from GPS."}
                </small>
              ) : selectable ? (
                <small className="addr-hint">
                  Only the Village / Sector / Mohalla attached to this PIN Code
                  can be selected.
                </small>
              ) : field.hint ? (
                <small className="addr-hint">{field.hint}</small>
              ) : null}
            </div>
          );
        })}

        {showConfirm ? (
          <div className="addr-confirm">
            <p className="addr-confirm-title">Please Recheck These Details</p>
            <dl>
              {confirmRows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value || "—"}</dd>
                </div>
              ))}
            </dl>
            <label htmlFor={confirmId} className="addr-confirm-check">
              <input
                id={confirmId}
                name="addressConfirmed"
                type="checkbox"
                value="yes"
                checked={isAddressConfirmed(values.addressConfirmed)}
                onChange={(event) => {
                  onChange?.({
                    target: {
                      name: "addressConfirmed",
                      value: event.target.checked ? "yes" : "",
                    },
                  });
                }}
              />
              <span>I have rechecked and confirm these details are correct.</span>
            </label>
            {errors.addressConfirmed ? (
              <small className="addr-error">{errors.addressConfirmed}</small>
            ) : (
              <small className="addr-hint">
                Confirm the details above before submitting.
              </small>
            )}
          </div>
        ) : null}
      </div>
    </>
  );
}

const styles = `
.addr-fields{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px 16px;width:100%;grid-column:1/-1}
.addr-field{display:flex;flex-direction:column;min-width:0}
.addr-field:has(.addr-pin-row),
.addr-field.addr-select,
.addr-confirm{grid-column:1/-1}
.addr-field label{margin-bottom:5px;font-size:12px;font-weight:700;color:#34546b}
.addr-field label span{color:#e34d4d}
.addr-field label em{font-style:normal;font-weight:600;color:#7a8a92}
.addr-field input,
.addr-field select{width:100%;box-sizing:border-box;height:38px;min-height:38px;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#29455a;font:inherit;font-size:13px}
.addr-field input:focus,
.addr-field select:focus{outline:none;border-color:#1a6b7a;box-shadow:none}
.addr-field.addr-auto input{background:#f3f7fa;color:#3a5568;border-color:#d3e0e8;cursor:default}
.addr-field.addr-select select{background:#fff;cursor:pointer;height:38px}
.addr-field.addr-select select:disabled{background:#f3f7fa;color:#7a8a92;cursor:default}
.addr-pin-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}
.addr-pin-row input{flex:1;min-width:0;height:38px}
.addr-locate-btn{box-sizing:border-box;height:38px;min-height:38px;padding:0 12px;border:1px solid #1a6b7a;border-radius:8px;background:#1a6b7a;color:#fff;font:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap}
.addr-locate-btn:disabled{opacity:.7;cursor:wait}
.addr-error{margin-top:4px;color:#d84b4b;font-size:11px}
.addr-hint{margin-top:4px;color:#5d7180;font-size:11px}
.addr-confirm{padding:12px;border:1px solid #d3e6f3;border-radius:12px;background:#f7fbfe}
.addr-confirm-title{margin:0 0 8px;font-size:13px;font-weight:800;color:#29455a}
.addr-confirm dl{margin:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:6px 16px}
.addr-confirm dl > div{display:grid;gap:2px;align-items:start}
.addr-confirm dt{font-size:11px;font-weight:700;color:#5d7180}
.addr-confirm dd{margin:0;font-size:13px;font-weight:700;color:#29455a;word-break:break-word}
.addr-confirm-check{display:flex;gap:8px;align-items:flex-start;margin-top:10px;font-size:13px;font-weight:700;color:#29455a}
.addr-confirm-check input{width:16px;height:16px;margin-top:2px;flex:0 0 auto;accent-color:#1a6b7a}
@media (max-width:800px){
  .addr-fields,.addr-confirm dl{grid-template-columns:1fr}
}
`;
