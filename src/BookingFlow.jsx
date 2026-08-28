import BookingContactFields from "./BookingContactFields";
import BookingForFields from "./BookingForFields";
import {
  bookingReadyForService,
  hasHouseholdProfile,
  shouldAskBookingDetails,
} from "./bookingFor";

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
  const showService = bookingReadyForService(values, profile);
  const waitingForName = showWho && !values.bookedFor;
  const waitingForDetails = showDetails && !showService;

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
      {waitingForName ? (
        <p className="booking-flow-hint">Select A Name To Continue.</p>
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
      {waitingForDetails ? (
        <p className="booking-flow-hint">
          Enter Name, Age, Sex, Mobile And Address To Continue.
        </p>
      ) : null}
      {showService ? <div className="booking-flow-service">{children}</div> : null}
    </>
  );
}

const styles = `
.booking-flow-who,.booking-flow-details,.booking-flow-service{display:contents}
.booking-flow-hint{grid-column:1/-1;margin:0;padding:2px 0 8px;color:#5d7180;font-size:13px;font-weight:700}
`;
