import { bookingForOptions } from "./bookingFor";

export default function BookingForFields({
  idPrefix = "booked-for",
  profile = {},
  selectedId = "",
  error = "",
  onSelect,
}) {
  const options = bookingForOptions(profile);

  return (
    <>
      <style>{styles}</style>
      <div className="book-for">
        <p className="book-for-title">
          Who Is This Booking For? <span>*</span>
        </p>
        <p className="book-for-copy">
          Choose yourself or a saved family member for this medicine or service.
        </p>
        <div className="book-for-list" role="radiogroup" aria-label="Who is this booking for">
          {options.map((option) => {
            const id = `${idPrefix}-${option.id}`;
            const selected = selectedId === option.id;
            return (
              <label
                key={option.id}
                htmlFor={id}
                className={`book-for-option${selected ? " is-on" : ""}`}
              >
                <input
                  id={id}
                  type="radio"
                  name={`${idPrefix}-bookedFor`}
                  value={option.id}
                  checked={selected}
                  onChange={() => onSelect?.(option)}
                />
                <span>
                  <strong>{option.id === "self" ? "Myself" : option.name}</strong>
                  <em>{option.label.replace(/^Myself · /, "")}</em>
                </span>
              </label>
            );
          })}
        </div>
        {options.length < 2 ? (
          <small className="book-for-hint">
            Add family members in Profile to book medicines or services for them.
          </small>
        ) : null}
        {error ? <small className="book-for-error">{error}</small> : null}
      </div>
    </>
  );
}

const styles = `
.book-for{display:grid;gap:8px;width:100%}
.book-for-title{margin:0;font-size:13px;font-weight:800;color:#29455a}
.book-for-title span{color:#e34d4d}
.book-for-copy{margin:0;font-size:12px;color:#5d7180;line-height:1.4}
.book-for-list{display:grid;gap:8px}
.book-for-option{display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border:1px solid #d7e2e9;border-radius:10px;background:#fff;cursor:pointer}
.book-for-option.is-on{border-color:#1e8a73;background:#eef8f5}
.book-for-option input{margin-top:3px;accent-color:#1e8a73}
.book-for-option span{display:grid;gap:2px}
.book-for-option strong{font-size:13px;color:#29455a}
.book-for-option em{font-style:normal;font-size:12px;color:#5d7180}
.book-for-hint{color:#5d7180;font-size:11px}
.book-for-error{color:#d84b4b;font-size:11px}
`;
