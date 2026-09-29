import BookingContactFields from "./BookingContactFields";
import BookingForFields from "./BookingForFields";
import AddressFields from "./AddressFields.jsx";
import { hasHouseholdProfile, shouldAskBookingDetails } from "./bookingFor";

export default function BookingFlow({
  idPrefix = "book",
  profile = {},
  values = {},
  errors = {},
  onSelect,
  onChange,
  layout = "service",
  pinHint,
  askWho = true,
  alwaysAskAddress = false,
  alwaysAskDetails = false,
  addressTitle = "",
  children,
}) {
  const showWho = askWho && hasHouseholdProfile(profile);
  const showDetails = alwaysAskDetails || shouldAskBookingDetails(values, profile);
  const showAddressOnly = alwaysAskAddress && !showDetails;

  return (
    <>
      <style>{styles}</style>
      {showWho ? (
        <div className={`booking-flow-who${layout === "checkout" ? " is-stack" : ""}`}>
          <BookingForFields
            idPrefix={idPrefix}
            profile={profile}
            selectedId={values.bookedFor}
            error={errors.bookedFor}
            onSelect={onSelect}
          />
        </div>
      ) : null}
      {showDetails ? (
        <div className={`booking-flow-details${layout === "checkout" ? " is-stack" : ""}`}>
          <BookingContactFields
            idPrefix={idPrefix}
            layout={layout}
            profile={profile}
            values={values}
            errors={errors}
            onChange={onChange}
            pinHint={pinHint}
            addressTitle={addressTitle}
            alwaysAsk={alwaysAskDetails}
          />
        </div>
      ) : null}
      {showAddressOnly ? (
        <div className="field full booking-flow-address">
          {addressTitle ? (
            <p className="booking-address-title">{addressTitle}</p>
          ) : null}
          <AddressFields
            idPrefix={idPrefix}
            values={values}
            errors={errors}
            onChange={onChange}
          />
        </div>
      ) : null}
      <div className={`booking-flow-service${layout === "checkout" ? " is-stack" : ""}`}>
        {children}
      </div>
    </>
  );
}

const styles = `
.booking-flow-who,.booking-flow-details,.booking-flow-service{
  display:grid;
  grid-template-columns:minmax(0,1fr) minmax(0,1fr);
  gap:12px 16px;
  min-width:0;
  grid-column:1/-1;
}
.booking-flow-who{
  display:flex;
  flex-direction:column;
  gap:12px;
}
.booking-flow-who.is-stack,.booking-flow-details.is-stack,.booking-flow-service.is-stack{
  display:flex;
  flex-direction:column;
  gap:12px;
  min-width:0;
  grid-column:1/-1;
}
.booking-flow-address{display:flex;flex-direction:column;min-width:0;grid-column:1/-1}
.booking-address-title{margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:.4px;color:#1a6b7a}
`;
