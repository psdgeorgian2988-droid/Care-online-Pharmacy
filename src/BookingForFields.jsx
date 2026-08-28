import {
  bookingForOptions,
  bookingForSelectLabel,
  findBookingFor,
} from "./bookingFor";

export default function BookingForFields({
  idPrefix = "booked-for",
  profile = {},
  selectedId = "",
  error = "",
  onSelect,
  label = "Who Is This Booking For?",
}) {
  const options = bookingForOptions(profile);
  const selectId = `${idPrefix}-who`;

  return (
    <>
      <style>{styles}</style>
      <div className="book-for">
        <label htmlFor={selectId}>
          {label} <span>*</span>
        </label>
        <select
          id={selectId}
          name="bookedFor"
          value={selectedId || ""}
          onChange={(event) => onSelect?.(findBookingFor(profile, event.target.value))}
          aria-label="Who is this booking for"
        >
          <option value="">Select name</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {bookingForSelectLabel(option)}
            </option>
          ))}
        </select>
        {error ? <small className="book-for-error">{error}</small> : null}
      </div>
    </>
  );
}

const styles = `
.book-for{display:flex;flex-direction:column;min-width:0;width:100%;grid-column:1/-1}
.book-for label{margin-bottom:5px;font-size:12px;font-weight:700;color:#34546b}
.book-for label span{color:#e34d4d}
.book-for select{width:100%;box-sizing:border-box;height:38px;min-height:38px;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#143246;font:inherit;font-size:14px}
.book-for select:focus{outline:none;border-color:#1a6b7a}
.book-for-error{margin-top:4px;color:#d84b4b;font-size:12px}
`;
