import { orderTestName } from "./orderFullFields.js";

export default function AmbulanceBookingList({
  jobs = [],
  openId = "",
  onOpen,
  renderDetail,
  empty = "No bookings yet.",
}) {
  if (!jobs.length) return <p className="order-list-empty">{empty}</p>;
  return (
    <ul className="doctor-visit-list">
      {jobs.map((job) => {
        const id = String(job.id || job.bookingId || job.requestId || "");
        const open = String(openId) === id;
        return (
          <li key={id || orderTestName(job)}>
            <div className={`ambulance-booking-card${open ? " is-on" : ""}`}>
              <strong>{orderTestName(job)}</strong>
              <button
                type="button"
                className={`order-list-job${open ? " is-on" : ""}`}
                onClick={() => onOpen?.(open ? "" : id)}
              >
                #{id}
              </button>
            </div>
            {open && renderDetail ? <div className="doctor-visit-detail">{renderDetail(job)}</div> : null}
          </li>
        );
      })}
    </ul>
  );
}
