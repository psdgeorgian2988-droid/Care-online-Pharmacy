import { useState } from "react";
import DateMonthYearFields from "./DateMonthYearFields";
import { isoDateDaysAhead, isoDateToday } from "./personFields";
import {
  WEBINAR_BOOK_DAYS_AHEAD,
  WEBINAR_TIME_SLOTS,
  WEBINAR_TOPICS,
  cancelWebinar,
  formatWebinarDate,
  isWebinarBookable,
  scheduleWebinar,
} from "./webinars";

export default function AdminWebinars({ webinars, onChange, onError }) {
  const today = isoDateToday();
  const maxDate = isoDateDaysAhead(WEBINAR_BOOK_DAYS_AHEAD);
  const [topicId, setTopicId] = useState(WEBINAR_TOPICS[0].id);
  const [date, setDate] = useState("");
  const [time, setTime] = useState(WEBINAR_TIME_SLOTS[1]);
  const [busy, setBusy] = useState(false);

  const save = async (next) => {
    setBusy(true);
    onError?.("");
    try {
      await onChange(next);
    } catch (err) {
      onError?.(err.message || "Could Not Save The Webinar.");
    } finally {
      setBusy(false);
    }
  };

  const handleSchedule = async (event) => {
    event.preventDefault();
    const made = scheduleWebinar({ topicId, date, time, now: Date.now() });
    if (!made.ok) {
      onError?.(made.error);
      return;
    }
    await save([made.webinar, ...webinars.filter((row) => row.id !== made.webinar.id)]);
    setDate("");
  };

  return (
    <section className="admin-panel" aria-label="Webinar Schedule">
      <h2>Schedule A Live Webinar</h2>
      <p>
        Customers Can Book A Seat Only After You Set A Date And Time. The App
        Then Shows A Notification Until They Open Or Dismiss It.
      </p>
      <form className="admin-webinar-form" onSubmit={handleSchedule}>
        <label>
          Topic
          <select value={topicId} onChange={(event) => setTopicId(event.target.value)}>
            {WEBINAR_TOPICS.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.title}
              </option>
            ))}
          </select>
        </label>
        <DateMonthYearFields
          idPrefix="admin-webinar-date"
          name="date"
          value={date}
          min={today}
          max={maxDate}
          required
          label="Date"
          order="ymd"
          onChange={(event) => setDate(event.target.value)}
        />
        <label>
          Time
          <select value={time} onChange={(event) => setTime(event.target.value)}>
            {WEBINAR_TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Schedule Webinar"}
        </button>
      </form>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Webinar</th>
              <th>When</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {webinars.length === 0 ? (
              <tr>
                <td colSpan="4">No Webinar Is Scheduled. Booking Stays Closed.</td>
              </tr>
            ) : (
              webinars.map((row) => (
                <tr key={row.id}>
                  <td>{row.title}</td>
                  <td>
                    {formatWebinarDate(row.date)} · {row.time}
                  </td>
                  <td>
                    {row.status === "cancelled"
                      ? "Cancelled"
                      : isWebinarBookable(row)
                        ? "Open For Booking"
                        : "Ended"}
                  </td>
                  <td>
                    {row.status === "scheduled" && isWebinarBookable(row) ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => save(cancelWebinar(webinars, row.id))}
                      >
                        Cancel
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <style>{styles}</style>
    </section>
  );
}

const styles = `
.admin-webinar-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;align-items:end;margin:0 0 14px}
.admin-webinar-form label{display:flex;flex-direction:column;font-size:12px;font-weight:700;color:#34546b}
.admin-webinar-form select,.admin-webinar-form button{height:38px;border:1px solid #d7e2e9;border-radius:8px;font:inherit;padding:0 10px}
.admin-webinar-form button{border:none;background:#1a6b7a;color:#fff;font-weight:700;cursor:pointer}
.admin-webinar-form button:disabled{opacity:.6;cursor:wait}
`;
