import { useEffect, useMemo, useState } from "react";
import {
  ALL_VACCINES,
  fullVaccinationSchedule,
} from "./vaccinationSchedule";
import {
  RECORD_EVENT,
  dueSoonReminders,
  loadVaccinationStore,
  recordVaccinationDose,
  removeVaccinationPerson,
  savedReminders,
  upsertVaccinationPerson,
} from "./vaccinationRecord";
import {
  BOOKING_EVENT,
  applyPersonToBooking,
  carePlanForGroup,
  loadVaccinationBooking,
  nurseBookingHref,
  setBookingGroup,
  toggleBookingVaccine,
} from "./vaccinationBooking";
import SelectedVaccinesFields from "./SelectedVaccinesFields";
import BookingForFields from "./BookingForFields";
import {
  OTHER_BOOKING_ID,
  findBookingFor,
  hasHouseholdProfile,
  isHouseholdBooking,
} from "./bookingFor";
import { useLoginSession } from "./authSession";
import { readUserProfile } from "./addressFields";
import DateMonthYearFields from "./DateMonthYearFields";

function personFromOption(option = {}) {
  return {
    bookedFor: option.id || "",
    name: option.name || "",
    gender: option.gender || "",
    dob: option.dob || "",
    age: option.age || "",
  };
}

function Vaccination() {
  const today = new Date().toISOString().split("T")[0];
  const session = useLoginSession();
  const stored = readUserProfile();
  const profile = session?.mobile ? { ...stored, ...session } : stored;
  const isRegistered = hasHouseholdProfile(profile);
  const [store, setStore] = useState(() => loadVaccinationStore());
  const [booking, setBooking] = useState(() => loadVaccinationBooking());
  const [recordForm, setRecordForm] = useState(() => {
    const bookedFor = loadVaccinationBooking().bookedFor || "";
    return {
      id: "",
      bookedFor: bookedFor === OTHER_BOOKING_ID ? "" : bookedFor,
      name: loadVaccinationBooking().name || "",
      gender: loadVaccinationBooking().gender || "",
      dob: loadVaccinationBooking().dob || "",
    };
  });
  const [markGiven, setMarkGiven] = useState({
    personId: "",
    vaccineId: "",
    givenOn: today,
  });
  const [recordErrors, setRecordErrors] = useState({});
  const [showSchedule, setShowSchedule] = useState(false);
  const reminders = savedReminders(store);
  const soon = dueSoonReminders(store, 21);
  const scheduleGuide = useMemo(() => fullVaccinationSchedule(), []);
  const selectedPerson = isRegistered
    ? findBookingFor(profile, recordForm.bookedFor, { includeOther: false })
    : null;
  const bookHref = nurseBookingHref(carePlanForGroup(booking.group));

  useEffect(() => {
    const refresh = () => setStore(loadVaccinationStore());
    window.addEventListener(RECORD_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(RECORD_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    const refresh = () => setBooking(loadVaccinationBooking());
    window.addEventListener(BOOKING_EVENT, refresh);
    return () => window.removeEventListener(BOOKING_EVENT, refresh);
  }, []);

  useEffect(() => {
    if (!showSchedule) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setShowSchedule(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showSchedule]);

  const saveRecordPerson = (event) => {
    event.preventDefault();
    if (!isRegistered) return;
    const next = {};
    if (!isHouseholdBooking(recordForm, profile) || !selectedPerson?.name) {
      next.bookedFor = "Select a registered name.";
    }
    setRecordErrors(next);
    if (Object.keys(next).length) return;
    upsertVaccinationPerson({
      name: selectedPerson.name.trim(),
      gender: selectedPerson.gender,
      dob: selectedPerson.dob || booking.dob,
      keepRecord: true,
      remindersOn: true,
      requiredIds: booking.vaccineIds,
    });
    setStore(loadVaccinationStore());
  };

  const choosePerson = (option) => {
    if (!option || option.id === OTHER_BOOKING_ID || !option.name) {
      setRecordForm({
        id: "",
        bookedFor: "",
        name: "",
        gender: "",
        dob: "",
      });
      setRecordErrors({});
      return;
    }
    const person = personFromOption(option);
    const applied = applyPersonToBooking(person);
    setBooking(applied);
    setRecordForm({
      id: person.bookedFor,
      bookedFor: person.bookedFor,
      name: person.name,
      gender: person.gender || "",
      dob: applied.dob,
    });
    setRecordErrors({});
  };

  const chooseGroup = (group) => {
    setBooking(setBookingGroup(group));
  };

  const toggleRequired = (id) => {
    if (!id) return;
    setBooking(toggleBookingVaccine(id));
  };

  return (
    <>
      <style>{styles}</style>
      <div className="service-page">
        <section className="service-hero">
          <div>
            <span className="service-kicker">MediHome Vaccination</span>
            <h1>Vaccination Record</h1>
          </div>
          <div className="vac-hero-actions">
            <button
              type="button"
              className="vac-schedule-btn"
              onClick={() => setShowSchedule(true)}
            >
              View Schedule
            </button>
            <a className="vac-schedule-btn is-fill" href={bookHref}>
              Book Nurse Visit
            </a>
          </div>
        </section>

        {soon.length ? (
          <aside className="vac-banner" aria-live="polite">
            <strong>Due Vaccination Reminders</strong>
            <ul>
              {soon.slice(0, 4).map((row) => (
                <li key={row.id}>
                  {row.personName}: {row.vaccineName} — {row.dueOnLabel} ({row.status})
                </li>
              ))}
            </ul>
          </aside>
        ) : null}

        <section className="service-form vac-record">
          <form className="vac-record-form" onSubmit={saveRecordPerson}>
            <p className="vac-section-title">Save Record And Due Dates</p>
            {isRegistered ? (
              <div className="field full">
                <BookingForFields
                  idPrefix="vac"
                  profile={profile}
                  selectedId={recordForm.bookedFor}
                  error={recordErrors.bookedFor}
                  onSelect={choosePerson}
                  label="Select Name"
                  includeOther={false}
                />
              </div>
            ) : (
              <p className="vac-copy vac-register-hint">
                Login or create an account to save vaccination records for
                registered family members.{" "}
                <a href="#login">Login</a>
                {" · "}
                <a href="#register">Create Account</a>
              </p>
            )}
            {isRegistered ? (
              <button type="submit" className="service-submit">
                Save Record And Due Dates
              </button>
            ) : null}
          </form>

          <div className="vac-book-card">
            <p className="vac-section-title">Select Vaccines</p>
            <div className="vac-group" role="group" aria-label="Vaccination group">
              <button
                type="button"
                className={booking.group === "child" ? "is-on" : ""}
                onClick={() => chooseGroup("child")}
              >
                Children Vaccination
              </button>
              <button
                type="button"
                className={booking.group === "adult" ? "is-on" : ""}
                onClick={() => chooseGroup("adult")}
              >
                Adult Vaccination
              </button>
            </div>
            <SelectedVaccinesFields booking={booking} onToggle={toggleRequired} />
            <a className="vac-book-link" href={bookHref}>
              Continue To Nurse Booking
            </a>
          </div>

          <div className="vac-saved">
            <p className="vac-section-title">Due Dates</p>
            {reminders.length === 0 ? (
              <p className="vac-copy">No saved due dates yet.</p>
            ) : (
              <ul className="vac-reminder-list">
                {reminders.map((row) => (
                  <li key={row.id}>
                    <strong>{row.personName}</strong>
                    <span>{row.vaccineName}</span>
                    <em>
                      Due {row.dueOnLabel}
                      {row.dobEstimated ? " (estimated from age)" : ""} · {row.dueLabel}{" "}
                      · {row.status}
                    </em>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {store.people.length ? (
            <form className="vac-given" onSubmit={saveGivenDose}>
              <p className="vac-section-title">Mark A Dose As Given</p>
              <select
                value={markGiven.personId}
                onChange={(event) =>
                  setMarkGiven((prev) => ({ ...prev, personId: event.target.value }))
                }
              >
                <option value="">Person</option>
                {store.people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
              <select
                value={markGiven.vaccineId}
                onChange={(event) =>
                  setMarkGiven((prev) => ({ ...prev, vaccineId: event.target.value }))
                }
              >
                <option value="">Vaccine</option>
                {ALL_VACCINES.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
              <div className="field full">
                <DateMonthYearFields
                  idPrefix="vac-given"
                  name="givenOn"
                  value={markGiven.givenOn}
                  max={today}
                  label=""
                  onChange={(event) =>
                    setMarkGiven((prev) => ({ ...prev, givenOn: event.target.value }))
                  }
                />
              </div>
              <button type="submit" className="service-submit">
                Save Given Dose
              </button>
              {store.people.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className="vac-remove"
                  onClick={() => {
                    removeVaccinationPerson(person.id);
                    setStore(loadVaccinationStore());
                  }}
                >
                  Remove {person.name}
                </button>
              ))}
            </form>
          ) : null}
        </section>

        {showSchedule ? (
          <div
            className="vac-overlay"
            role="presentation"
            onClick={() => setShowSchedule(false)}
          >
            <div
              className="vac-guide"
              role="dialog"
              aria-modal="true"
              aria-labelledby="vac-guide-title"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="vac-guide-kicker">Government Of India</p>
              <h2 id="vac-guide-title">Vaccination Schedule</h2>
              <div className="vac-group" role="group" aria-label="Vaccination group">
                <button
                  type="button"
                  className={booking.group === "child" ? "is-on" : ""}
                  onClick={() => chooseGroup("child")}
                >
                  Children Vaccination
                </button>
                <button
                  type="button"
                  className={booking.group === "adult" ? "is-on" : ""}
                  onClick={() => chooseGroup("adult")}
                >
                  Adult Vaccination
                </button>
              </div>
              <SelectedVaccinesFields
                booking={booking}
                onToggle={toggleRequired}
                idPrefix="vac-guide"
              />
              <section>
                <h3>Children — Newborn To 16 Years</h3>
                {scheduleGuide.children.map((group) => (
                  <div key={group.when} className="vac-guide-age">
                    <strong>{group.when}</strong>
                    <ul>
                      {group.vaccines.map((row) => (
                        <li key={row.id}>
                          <button
                            type="button"
                            className={
                              booking.vaccineIds.includes(row.id) ? "is-on" : ""
                            }
                            onClick={() => toggleRequired(row.id)}
                          >
                            <span>{row.name}</span>
                            {row.girlsOnly ? <em>Girls</em> : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
              <section>
                <h3>Adults And Older Persons</h3>
                {scheduleGuide.adults.map((group) => (
                  <div key={group.when} className="vac-guide-age">
                    <strong>{group.when}</strong>
                    <ul>
                      {group.vaccines.map((row) => (
                        <li key={row.id}>
                          <button
                            type="button"
                            className={
                              booking.vaccineIds.includes(row.id) ? "is-on" : ""
                            }
                            onClick={() => toggleRequired(row.id)}
                          >
                            <span>{row.name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
              <a className="service-submit vac-guide-book" href={bookHref}>
                Continue To Nurse Booking
              </a>
              <button
                type="button"
                className="vac-schedule-btn"
                onClick={() => setShowSchedule(false)}
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );

  function saveGivenDose(event) {
    event.preventDefault();
    if (!markGiven.personId || !markGiven.vaccineId || !markGiven.givenOn) return;
    recordVaccinationDose({
      personId: markGiven.personId,
      vaccineId: markGiven.vaccineId,
      givenOn: markGiven.givenOn,
      status: "given",
    });
    setStore(loadVaccinationStore());
  }
}

const styles = `
.service-page{padding:16px 20px 24px 14px;box-sizing:border-box;color:#143246}
.service-hero{max-width:760px;margin:0 auto 12px;padding:14px 16px;border-radius:12px;background:linear-gradient(135deg,#eaf7ff,#f4fbf8);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.service-kicker{display:block;margin-bottom:4px;font-size:11px;font-weight:800;letter-spacing:.6px;color:#1a6b7a}
.service-hero h1{margin:0;font-size:22px}
.vac-hero-actions{display:flex;flex-wrap:wrap;gap:8px}
.vac-banner{max-width:760px;margin:0 auto 12px;padding:12px 14px;border-radius:12px;background:#fff6e8;border:1px solid #f0d3a0;color:#7a4b12}
.vac-banner strong{display:block;margin-bottom:6px}
.vac-banner ul{margin:0;padding-left:18px;font-size:13px;line-height:1.45}
.service-form{max-width:760px;margin:0 auto;padding:14px;background:#fff;border:1px solid #e4ecef;border-radius:12px}
.service-form label{margin-bottom:5px;font-size:12px;font-weight:700;color:#34546b}
.service-form label span{color:#d84b4b}
.service-form input:not([type="radio"]):not([type="checkbox"]),.service-form select{width:100%;box-sizing:border-box;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;font:inherit;font-size:14px;color:#143246;outline:none;height:38px;min-height:38px;background:#fff}
.service-form input:focus,.service-form select:focus{border-color:#1a6b7a}
.service-form small{margin-top:4px;color:#d84b4b;font-size:12px}
.service-submit{grid-column:1/-1;border:none;border-radius:8px;background:#1a6b7a;color:#fff;font-size:14px;font-weight:700;min-height:40px;cursor:pointer;font-family:inherit}
.vac-schedule-btn{border:1px solid #1a6b7a;border-radius:8px;background:#fff;color:#1a6b7a;font:inherit;font-size:13px;font-weight:700;min-height:40px;padding:8px 14px;cursor:pointer;white-space:nowrap;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
.vac-schedule-btn.is-fill{background:#1a6b7a;color:#fff}
.vac-schedule-btn:hover{filter:brightness(1.04)}
.vac-overlay{position:fixed;inset:0;z-index:40;display:flex;align-items:flex-start;justify-content:center;padding:20px;background:rgba(20,50,70,.46);overflow:auto}
.vac-guide{width:min(640px,100%);margin:12px auto 24px;padding:20px 20px 16px;border-radius:12px;background:#fff;border:1px solid #e4ecef;box-shadow:0 18px 48px rgba(20,50,70,.22);color:#143246}
.vac-guide-kicker{margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:#1a6b7a}
.vac-guide h2{margin:0 0 8px;font-size:20px}
.vac-guide h3{margin:16px 0 8px;font-size:14px;font-weight:800;color:#1a6b7a}
.vac-guide-age{margin:0 0 10px;padding:10px 12px;border:1px solid #e4ecef;border-radius:8px;background:#f7fbfe}
.vac-guide-age > strong{display:block;margin-bottom:6px;font-size:13px}
.vac-guide-age ul{margin:0;padding:0;list-style:none;display:grid;gap:8px}
.vac-guide-age li{display:grid;gap:2px}
.vac-guide-age li span{font-size:13px;font-weight:700;color:#143246}
.vac-guide-age li em{font-style:normal;font-size:11px;font-weight:700;color:#1a6b7a}
.vac-guide .service-submit,.vac-guide .vac-schedule-btn{margin-top:12px;width:100%;box-sizing:border-box}
.vac-guide-book{display:inline-flex;align-items:center;justify-content:center;text-decoration:none}
.vac-group{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 12px}
.vac-group button{border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#34546b;font:inherit;font-size:13px;font-weight:700;min-height:38px;height:38px;cursor:pointer}
.vac-group button.is-on{background:#1a6b7a;border-color:#1a6b7a;color:#fff}
.vac-picked{margin:0 0 12px;padding:0;list-style:none;display:grid;gap:6px;grid-column:1/-1}
.vac-picked li{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 10px;border:1px solid #e4ecef;border-radius:8px;background:#fff;font-size:13px}
.vac-picked button{border:0;background:none;color:#b64b4b;font:inherit;font-size:12px;font-weight:700;cursor:pointer}
.vac-guide-age li button{display:grid;gap:2px;width:100%;border:0;background:none;padding:0;text-align:left;cursor:pointer;font:inherit}
.vac-guide-age li button.is-on span{color:#1a6b7a}
.vac-copy{margin:0;color:#5d7180;font-size:13px;line-height:1.45}
.vac-register-hint{grid-column:1/-1}
.vac-register-hint a{color:#1a6b7a;font-weight:800;text-decoration:none}
.vac-section-title{margin:0 0 6px;font-size:14px;font-weight:800;color:#29455a;grid-column:1/-1}
.vac-record{display:grid;gap:16px}
.vac-book-card,.vac-given{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px}
.vac-record-form{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px 8px}
.vac-book-card,.vac-saved,.vac-given{padding:12px;border:1px solid #e4ecef;border-radius:10px;background:#f7fbfe}
.vac-record-form .field.full{grid-column:1/-1}
.vac-record-form .field,.vac-book-card .field{display:flex;flex-direction:column;min-width:0}
.vac-book-link{grid-column:1/-1;color:#1a6b7a;font-size:13px;font-weight:700;text-decoration:none}
.vac-reminder-list{margin:0;padding:0;list-style:none;display:grid;gap:8px}
.vac-reminder-list li{display:grid;gap:2px;padding:10px 12px;border:1px solid #e4ecef;border-radius:10px;background:#fff}
.vac-reminder-list span{font-size:13px;color:#143246}
.vac-reminder-list em{font-style:normal;font-size:12px;color:#1a6b7a}
.vac-remove{grid-column:1/-1;border:1px solid #d7e2e9;background:#fff;border-radius:8px;min-height:36px;cursor:pointer;font:inherit;font-size:12px}
@media (max-width:800px){.service-page{padding:14px}.vac-record-form{grid-template-columns:1fr 1fr 1fr}.vac-given,.vac-book-card,.vac-group{grid-template-columns:1fr 1fr}}
`;

export default Vaccination;
