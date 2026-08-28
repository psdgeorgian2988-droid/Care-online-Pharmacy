import BookingContactFields from "./BookingContactFields";
import BookingForFields from "./BookingForFields";
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
  children,
}) {
  const showWho = hasHouseholdProfile(profile);
  const showDetails = shouldAskBookingDetails(values, profile);

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
          />
        </div>
      ) : null}
      <div className="booking-flow-service">{children}</div>
    </>
  );
}

const styles = `
.booking-flow-who,.booking-flow-details,.booking-flow-service{display:contents}
`;
