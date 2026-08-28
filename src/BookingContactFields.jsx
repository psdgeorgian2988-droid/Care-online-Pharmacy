import AddressFields from "./AddressFields";
import { isOtherBooking, shouldAskBookingDetails } from "./bookingFor";
import { GENDER_OPTIONS, normalizeAge } from "./personFields";
import { noContactMobileProps, noContactNameProps } from "./noContactAutofill";

const LAYOUT = {
  service: {
    fieldClass: "field",
    nameClass: "field full",
    addressClass: "field full",
    star: "span",
    errorClass: "",
  },
  lab: {
    fieldClass: "lab-field",
    nameClass: "lab-field lab-span",
    addressClass: "lab-field lab-span",
    star: "em",
    errorClass: "lab-error",
  },
  checkout: {
    fieldClass: "booking-contact-field",
    nameClass: "booking-contact-field",
    addressClass: "booking-contact-address",
    star: "span",
    errorClass: "",
  },
};

export default function BookingContactFields({
  idPrefix = "book",
  layout = "service",
  profile = {},
  values = {},
  errors = {},
  onChange,
  nameKey = "patientName",
  nameLabel = "Name",
  pinHint,
}) {
  const skin = LAYOUT[layout] || LAYOUT.service;
  if (!shouldAskBookingDetails(values, profile)) return null;
  const Star = skin.star === "em" ? "em" : "span";
  const nameId = `${idPrefix}-name`;
  const genderId = `${idPrefix}-gender`;
  const ageId = `${idPrefix}-age`;
  const mobileId = `${idPrefix}-mobile`;

  const emit = (name, value) => {
    onChange?.({ target: { name, value } });
  };

  return (
    <>
      <style>{styles}</style>
      <div className={skin.nameClass}>
        <label htmlFor={nameId}>
          {nameLabel} <Star>*</Star>
        </label>
        <input
          id={nameId}
          name={nameKey}
          value={values[nameKey] || ""}
          onChange={onChange}
          placeholder="Full name"
          {...noContactNameProps}
        />
        {errors[nameKey] ? (
          <small className={skin.errorClass}>{errors[nameKey]}</small>
        ) : null}
      </div>
      <div className={skin.fieldClass}>
        <label htmlFor={genderId}>
          Male / Female <Star>*</Star>
        </label>
        <select
          id={genderId}
          name="gender"
          value={values.gender || ""}
          onChange={onChange}
          aria-label="Male or Female"
        >
          <option value="">Select</option>
          {GENDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.gender ? (
          <small className={skin.errorClass}>{errors.gender}</small>
        ) : null}
      </div>
      <div className={skin.fieldClass}>
        <label htmlFor={ageId}>
          Age <Star>*</Star>
        </label>
        <input
          id={ageId}
          name="age"
          inputMode="numeric"
          maxLength="3"
          value={values.age || ""}
          onChange={(event) => emit("age", normalizeAge(event.target.value))}
          placeholder="Years"
        />
        {errors.age ? (
          <small className={skin.errorClass}>{errors.age}</small>
        ) : null}
      </div>
      <div className={skin.fieldClass}>
        <label htmlFor={mobileId}>
          Mobile <Star>*</Star>
        </label>
        <input
          id={mobileId}
          name="mobile"
          maxLength="10"
          value={values.mobile || ""}
          onChange={(event) =>
            emit("mobile", event.target.value.replace(/\D/g, "").slice(0, 10))
          }
          placeholder="10-digit mobile"
          {...noContactMobileProps}
        />
        {errors.mobile ? (
          <small className={skin.errorClass}>{errors.mobile}</small>
        ) : null}
      </div>
      <div className={skin.addressClass}>
        <AddressFields
          idPrefix={idPrefix}
          values={values}
          errors={errors}
          onChange={onChange}
          pinHint={pinHint}
          showUseMyLocation={!isOtherBooking(values)}
        />
      </div>
    </>
  );
}

const styles = `
.booking-contact-field{display:flex;flex-direction:column;min-width:0;margin:0 0 12px}
.booking-contact-field label{margin-bottom:5px;font-size:12px;font-weight:700;color:#34546b}
.booking-contact-field label span,.booking-contact-field label em{color:#d84b4b;font-style:normal}
.booking-contact-field input,.booking-contact-field select{width:100%;box-sizing:border-box;height:38px;min-height:38px;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#143246;font:inherit;font-size:14px}
.booking-contact-address{margin:0 0 12px}
`;
