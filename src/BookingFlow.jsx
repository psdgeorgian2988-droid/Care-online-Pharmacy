import BookingContactFields from "./BookingContactFields";
import BookingForFields from "./BookingForFields";
import AddressFields from "./AddressFields";
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
  addressTitle = "",
  children,
}) {
  const showWho = askWho && hasHouseholdProfile(profile);
  const showDetails = shouldAskBookingDetails(values, profile);
  const showAddressOnly = alwaysAskAddress && !showDetails;

  return (
    <>
      <style>{styles}</style>
      {showWho ? (
        <div className="booking-flow-who">
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
        <div className="booking-flow-details">
          <BookingContactFields
            idPrefix={idPrefix}
            layout={layout}
            profile={profile}
            values={values}
            errors={errors}
            onChange={onChange}
            pinHint={pinHint}
            addressTitle={addressTitle}
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
      <div className="booking-flow-service">{children}</div>
    </>
  );
}

const styles = `
.booking-flow-who,.booking-flow-details,.booking-flow-service{display:contents}
.booking-flow-address{display:flex;flex-direction:column;min-width:0;grid-column:1/-1}
.booking-address-title{margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:.4px;color:#1a6b7a}
`;
