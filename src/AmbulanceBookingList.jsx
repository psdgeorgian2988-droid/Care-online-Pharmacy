import { ambulanceBookingSummary } from "./ambulanceBooking.js";

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
        const summary = ambulanceBookingSummary(job);
        const open = String(openId) === id;
        return (
          <li key={id || summary.mobile}>
            <div className={`ambulance-booking-card${open ? " is-on" : ""}`}>
              <button
                type="button"
                className={`order-list-job${open ? " is-on" : ""}`}
                onClick={() => onOpen?.(open ? "" : id)}
              >
                #{id}
              </button>
              <strong>{summary.name}</strong>
              <span>Mobile: {summary.mobile}</span>
              <span>Pickup address: {summary.pickup}</span>
              <span>Drop location: {summary.drop}</span>
              <span>Ambulance: {summary.type}</span>
              <span>
                Location:{" "}
                {summary.geoHref ? (
                  <a href={summary.geoHref} target="_blank" rel="noreferrer">
                    {summary.liveGps ? "Live location" : summary.pin ? `PIN ${summary.pin}` : "Map"} · {summary.geoText}
                  </a>
                ) : (
                  summary.geoText
                )}
              </span>
            </div>
            {open && renderDetail ? <div className="doctor-visit-detail">{renderDetail(job)}</div> : null}
          </li>
        );
      })}
    </ul>
  );
}
