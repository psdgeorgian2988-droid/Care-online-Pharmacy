import { formatDueAge } from "./vaccinationSchedule";
import {
  selectedBookingVaccines,
  vaccinesForGroup,
} from "./vaccinationBooking";

function SelectedVaccinesFields({ booking, onToggle, idPrefix = "vac" }) {
  const list = vaccinesForGroup(booking.group);
  const selected = selectedBookingVaccines(booking);
  const isChild = booking.group === "child";

  return (
    <>
      <div className="field full">
        <label htmlFor={`${idPrefix}-pick`}>
          {isChild ? "Child Vaccine" : "Adult Vaccine"}
        </label>
        <select
          id={`${idPrefix}-pick`}
          value=""
          onChange={(event) => {
            if (event.target.value) onToggle(event.target.value);
          }}
        >
          <option value="">
            {isChild ? "Select a child vaccine" : "Select an adult vaccine"}
          </option>
          {list.map((row) => (
            <option
              key={row.id}
              value={row.id}
              disabled={booking.vaccineIds.includes(row.id)}
            >
              {row.name}
              {isChild && formatDueAge(row) ? ` · ${formatDueAge(row)}` : ""}
              {!isChild && row.minAgeYears ? ` · ${row.minAgeYears}+ years` : ""}
            </option>
          ))}
        </select>
      </div>
      {selected.length ? (
        <div className="field full">
          <ul className="vac-picked">
            {selected.map((row) => (
              <li key={row.id}>
                <span>{row.name}</span>
                <button type="button" onClick={() => onToggle(row.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}

export default SelectedVaccinesFields;
