import { useEffect, useMemo, useState } from "react";
import PinGpsBlock from "./PinGpsBlock";
import AssignedAgent from "./AssignedAgent";
import { resolvePinLocation } from "./pinLocation";
import { persistOrder, trackHref, withTracking } from "./orderTracking";
import PaymentBlock from "./PaymentBlock";
import { paymentFromQuote, settleCheckoutPayment } from "./paymentApi";
import BusyWait, { PatienceNote, useBusyOverlay } from "./BusyWait";
import { holdForPartnerQueue } from "./partnerQueue";
import { BillButton } from "./OrderBill";
import AddressFields from "./AddressFields";
import BookingForFields from "./BookingForFields";
import {
  applyResolvedPin,
  pickAddress,
  readUserProfile,
  validateAddress,
} from "./addressFields";
import {
  bookingForPatch,
  initialBookingFor,
  validateBookingFor,
} from "./bookingFor";
import {
  ALL_VACCINES,
  CHILD_MAX_YEARS,
  HOME_VISIT_FEE,
  SENIOR_MIN_YEARS,
  SLOTS,
  UIP_DISCLAIMER,
  ageGroupFromYears,
  ageMonthsFromDob,
  ageYearsFromDob,
  dueDateFromBirth,
  formatDisplayDate,
  suggestVaccines,
  visitTotal,
  yearsToMonths,
} from "./vaccinationSchedule";
import {
  RECORD_EVENT,
  dueSoonReminders,
  loadVaccinationStore,
  recordBookingDoses,
  recordVaccinationDose,
  removeVaccinationPerson,
  savedReminders,
  upsertVaccinationPerson,
} from "./vaccinationRecord";

const formatRupee = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

function readProfile() {
  return readUserProfile();
}

function Vaccination() {
  const profile = useMemo(() => readProfile(), []);
  const today = new Date().toISOString().split("T")[0];
  const [pageTab, setPageTab] = useState("schedule");
  const [store, setStore] = useState(() => loadVaccinationStore());
  const [form, setForm] = useState(() => ({
    ...initialBookingFor(profile),
    mobile: profile.mobile,
    ...pickAddress(profile),
    group: ageGroupFromYears(profile.age) || "child",
    ageYears: profile.age || "",
    extraMonths: "",
    dob: "",
    gender: profile.gender || "",
    includeEndemic: false,
    keepRecord: true,
    remindersOn: true,
    selectedIds: [],
    date: "",
    timeSlot: "",
  }));
  const [recordForm, setRecordForm] = useState({
    id: "",
    name: "",
    gender: "",
    dob: "",
    ageYears: "",
    includeEndemic: false,
    keepRecord: true,
    remindersOn: true,
  });
  const [markGiven, setMarkGiven] = useState({ personId: "", vaccineId: "", givenOn: today });
  const [errors, setErrors] = useState({});
  const [recordErrors, setRecordErrors] = useState({});
  const [booking, setBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [payMethod, setPayMethod] = useState("cod");
  const [payQuote, setPayQuote] = useState(null);
  const busyWait = useBusyOverlay(submitting, "vaccination");

  useEffect(() => {
    const refresh = () => setStore(loadVaccinationStore());
    window.addEventListener(RECORD_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(RECORD_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const group = form.group || ageGroupFromYears(Number(form.ageYears || 0)) || "child";
  const ageYears =
    group === "child" && form.dob
      ? ageYearsFromDob(form.dob)
      : Number(form.ageYears || 0);
  const ageMonths =
    group === "child" && form.dob
      ? ageMonthsFromDob(form.dob)
      : yearsToMonths(form.ageYears || 0, form.extraMonths || 0);
  const suggestions = suggestVaccines({
    group,
    ageYears,
    ageMonths,
    includeEndemic: form.includeEndemic,
    gender: form.gender,
  }).map((row) => ({
    ...row,
    dueOn: form.dob ? dueDateFromBirth(form.dob, row) : "",
  }));
  const selectedVaccines = suggestions.filter((row) => form.selectedIds.includes(row.id));
  const total = visitTotal(selectedVaccines, HOME_VISIT_FEE);
  const reminders = savedReminders(store);
  const soon = dueSoonReminders(store, 21);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    let next = type === "checkbox" ? checked : value;
    if (name === "mobile" || name === "pinCode" || name === "ageYears" || name === "extraMonths") {
      next = String(value || "").replace(/\D/g, "");
    }
    setForm((prev) => {
      const patch = { [name]: next };
      if (name === "ageYears" || name === "extraMonths" || name === "dob") {
        const years =
          name === "dob"
            ? ageYearsFromDob(next)
            : name === "ageYears"
              ? Number(next || 0)
              : Number(prev.ageYears || 0);
        patch.group = ageGroupFromYears(years) || prev.group;
        if (name === "dob" && next) {
          patch.ageYears = String(ageYearsFromDob(next) ?? "");
        }
      }
      if (name === "remindersOn" && next) patch.keepRecord = true;
      if (name === "group") {
        patch.selectedIds = [];
        if (next === "senior") patch.dob = "";
      }
      return { ...prev, ...patch };
    });
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleBookingFor = (option) => {
    const years = Number(option.age || 0);
    setForm((prev) => ({
      ...prev,
      ...bookingForPatch(option),
      gender: option.gender || prev.gender,
      ageYears: option.age || prev.ageYears,
      group: ageGroupFromYears(years) || prev.group,
      selectedIds: [],
    }));
    setErrors((prev) => ({ ...prev, bookedFor: "" }));
  };

  const toggleVaccine = (id) => {
    setForm((prev) => ({
      ...prev,
      selectedIds: prev.selectedIds.includes(id)
        ? prev.selectedIds.filter((row) => row !== id)
        : [...prev.selectedIds, id],
    }));
    setErrors((prev) => ({ ...prev, selectedIds: "" }));
  };

  const personFromForm = () => ({
    id: form.bookedFor && form.bookedFor !== "self" ? form.bookedFor : `self-${profile.mobile || "me"}`,
    name: form.patientName.trim() || form.bookedForName || profile.name,
    relation: form.bookedForRelation || "self",
    gender: form.gender,
    dob: form.dob,
    ageYears: form.ageYears,
    ageMonths: form.extraMonths,
    keepRecord: form.keepRecord,
    remindersOn: form.remindersOn,
    includeEndemic: form.includeEndemic,
  });

  const validate = () => {
    const next = { ...validateBookingFor(form, profile) };
    if (!form.patientName.trim()) next.patientName = "Patient name is required.";
    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      next.mobile = "Enter a valid 10-digit mobile number.";
    }
    Object.assign(next, validateAddress(form));
    if (!form.selectedIds.length) next.selectedIds = "Select at least one due vaccine.";
    if (!form.date) next.date = "Please select a visit date.";
    if (!form.timeSlot) next.timeSlot = "Please select a time slot.";
    if ((form.keepRecord || form.remindersOn) && !form.dob && !form.ageYears) {
      next.dob = "Add date of birth (or age) so due dates can be saved.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const queue = await holdForPartnerQueue("vaccination");
      const gps = await resolvePinLocation(form.pinCode);
      const addr = applyResolvedPin(form, gps);
      const pay = paymentFromQuote(payQuote, total);
      const payment = await settleCheckoutPayment({
        method: payMethod,
        ...pay,
        kind: "vaccination",
        pin: gps.pinCode,
        name: form.patientName.trim(),
        mobile: form.mobile,
        reference: `vac-${Date.now()}`,
        description: "MediHome Vaccination Visit",
      });
      const bookingDetails = {
        bookingId: "MH-VAC-" + Math.floor(100000 + Math.random() * 900000),
        ...form,
        ...addr,
        patientName: form.patientName.trim(),
        pin: gps.pin,
        lat: gps.lat,
        lng: gps.lng,
        locality: gps.locality,
        mapsUrl: gps.mapsUrl,
        serviceLabel: "Vaccination Home Visit",
        vaccines: selectedVaccines.map((row) => ({
          id: row.id,
          name: row.name,
          dueOn: row.dueOn,
          dueLabel: row.dueLabel,
          status: row.status,
        })),
        total: pay.amountRupees,
        saleRupees: pay.saleRupees,
        couponCode: pay.couponCode,
        discountRupees: pay.discountRupees,
        highTrafficWait: queue.busy || queue.waited,
        bookedAt: new Date().toLocaleString(),
        bookedAtMs: Date.now(),
        ...payment,
      };
      const trackedBooking = persistOrder(
        withTracking(
          {
            ...bookingDetails,
            items: selectedVaccines.map((row) => ({
              name: row.name,
              price: row.price,
            })).concat([{ name: "Nurse home visit", price: HOME_VISIT_FEE }]),
          },
          "vaccination"
        )
      );
      if (form.keepRecord || form.remindersOn) {
        recordBookingDoses({
          person: personFromForm(),
          vaccineIds: form.selectedIds,
          visitDate: form.date,
          bookingId: trackedBooking.bookingId,
        });
        setStore(loadVaccinationStore());
      }
      setBooking(trackedBooking);
    } catch (error) {
      alert(error.message || "Payment or booking could not be completed.");
    } finally {
      setSubmitting(false);
    }
  };

  const startNew = () => {
    setBooking(null);
    setForm((prev) => ({
      ...prev,
      selectedIds: [],
      date: "",
      timeSlot: "",
    }));
    setPayMethod("cod");
    setErrors({});
  };

  const saveRecordPerson = (event) => {
    event.preventDefault();
    const next = {};
    if (!recordForm.name.trim()) next.name = "Name is required.";
    if (!recordForm.gender) next.gender = "Select Male or Female.";
    if (!recordForm.dob && !recordForm.ageYears) {
      next.dob = "Enter date of birth so due dates can be saved.";
    }
    if (!recordForm.keepRecord && !recordForm.remindersOn) {
      next.keepRecord = "Turn on record, reminders, or both.";
    }
    setRecordErrors(next);
    if (Object.keys(next).length) return;
    upsertVaccinationPerson({
      ...recordForm,
      name: recordForm.name.trim(),
      remindersOn: recordForm.remindersOn,
      keepRecord: recordForm.keepRecord || recordForm.remindersOn,
    });
    setStore(loadVaccinationStore());
    setRecordForm({
      id: "",
      name: "",
      gender: "",
      dob: "",
      ageYears: "",
      includeEndemic: false,
      keepRecord: true,
      remindersOn: true,
    });
  };

  const saveGivenDose = (event) => {
    event.preventDefault();
    if (!markGiven.personId || !markGiven.vaccineId || !markGiven.givenOn) return;
    recordVaccinationDose({
      personId: markGiven.personId,
      vaccineId: markGiven.vaccineId,
      givenOn: markGiven.givenOn,
      status: "given",
    });
    setStore(loadVaccinationStore());
  };

  if (booking) {
    return (
      <>
        <style>{styles}</style>
        <div className="service-page">
          <section className="service-confirm">
            <div className="success-icon">✓</div>
            <h1>Vaccination Visit Booked</h1>
            <PatienceNote kind="vaccination" shown={booking.highTrafficWait} />
            <p>A nurse visit has been saved. Due dates stay on the vaccination record if you kept reminders on.</p>
            <div className="confirm-card">
              <div className="confirm-head">
                <h2>Booking Details</h2>
                <span>{booking.bookingId}</span>
              </div>
              <div className="confirm-row">
                <span>Patient</span>
                <strong>{booking.patientName}</strong>
              </div>
              {(booking.vaccines || []).map((row) => (
                <div className="confirm-row" key={row.id}>
                  <span>{row.name}</span>
                  <strong>{row.dueOn ? formatDisplayDate(row.dueOn) : row.dueLabel}</strong>
                </div>
              ))}
              <div className="confirm-row">
                <span>Charges</span>
                <strong>{formatRupee(booking.total)}</strong>
              </div>
              <div className="confirm-row">
                <span>Visit</span>
                <strong>
                  {booking.date} · {booking.timeSlot}
                </strong>
              </div>
              <div className="confirm-row">
                <span>Address</span>
                <strong>{booking.address}</strong>
              </div>
              <PinGpsBlock record={booking} />
            </div>
            <AssignedAgent record={booking} />
            <div className="confirm-actions">
              <BillButton order={booking} />
              <button
                type="button"
                className="service-submit"
                onClick={() => {
                  window.location.hash = trackHref(booking.bookingId);
                }}
              >
                Track Live
              </button>
              <button type="button" className="service-submit" onClick={startNew}>
                Book Another Visit
              </button>
            </div>
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      {busyWait ? <BusyWait kind="vaccination" traffic={busyWait} /> : null}
      <div className="service-page">
        <section className="service-hero">
          <div>
            <span className="service-kicker">MediHome Vaccination</span>
            <h1>Children And Older Persons — Government Of India Schedule</h1>
            <p>
              Suggestions follow the Universal Immunisation Programme (MoHFW / NHM) and NCDC
              guidance for older adults. You can keep a record and save the date each due
              vaccine should be given.
            </p>
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

        <div className="lab-tabs vac-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className={pageTab === "schedule" ? "is-on" : ""}
            onClick={() => setPageTab("schedule")}
          >
            Suggest And Book
          </button>
          <button
            type="button"
            role="tab"
            className={pageTab === "record" ? "is-on" : ""}
            onClick={() => setPageTab("record")}
          >
            Record And Reminders
          </button>
        </div>

        {pageTab === "record" ? (
          <section className="service-form vac-record">
            <form className="vac-record-form" onSubmit={saveRecordPerson}>
              <p className="vac-section-title">Keep Vaccination Record</p>
              <p className="vac-copy">
                Optional. Save the person, doses already given, and the date each remaining
                Government of India dose should be done.
              </p>
              <div className="field">
                <label htmlFor="vac-rec-name">
                  Name <span>*</span>
                </label>
                <input
                  id="vac-rec-name"
                  value={recordForm.name}
                  onChange={(event) =>
                    setRecordForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                />
                {recordErrors.name ? <small>{recordErrors.name}</small> : null}
              </div>
              <div className="field">
                <label htmlFor="vac-rec-gender">
                  Male / Female <span>*</span>
                </label>
                <select
                  id="vac-rec-gender"
                  value={recordForm.gender}
                  onChange={(event) =>
                    setRecordForm((prev) => ({ ...prev, gender: event.target.value }))
                  }
                >
                  <option value="">Select</option>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                </select>
                {recordErrors.gender ? <small>{recordErrors.gender}</small> : null}
              </div>
              <div className="field">
                <label htmlFor="vac-rec-dob">Date Of Birth</label>
                <input
                  id="vac-rec-dob"
                  type="date"
                  max={today}
                  value={recordForm.dob}
                  onChange={(event) =>
                    setRecordForm((prev) => ({ ...prev, dob: event.target.value }))
                  }
                />
                {recordErrors.dob ? <small>{recordErrors.dob}</small> : null}
              </div>
              <div className="field">
                <label htmlFor="vac-rec-age">Age (If DOB Not Known)</label>
                <input
                  id="vac-rec-age"
                  inputMode="numeric"
                  value={recordForm.ageYears}
                  onChange={(event) =>
                    setRecordForm((prev) => ({
                      ...prev,
                      ageYears: event.target.value.replace(/\D/g, ""),
                    }))
                  }
                />
              </div>
              <label className="vac-check">
                <input
                  type="checkbox"
                  checked={recordForm.keepRecord}
                  onChange={(event) =>
                    setRecordForm((prev) => ({ ...prev, keepRecord: event.target.checked }))
                  }
                />
                Keep Vaccination Record
              </label>
              <label className="vac-check">
                <input
                  type="checkbox"
                  checked={recordForm.remindersOn}
                  onChange={(event) =>
                    setRecordForm((prev) => ({
                      ...prev,
                      remindersOn: event.target.checked,
                      keepRecord: event.target.checked ? true : prev.keepRecord,
                    }))
                  }
                />
                Save Due-Date Reminders
              </label>
              <label className="vac-check">
                <input
                  type="checkbox"
                  checked={recordForm.includeEndemic}
                  onChange={(event) =>
                    setRecordForm((prev) => ({
                      ...prev,
                      includeEndemic: event.target.checked,
                    }))
                  }
                />
                JE-Endemic District (Government Notified)
              </label>
              {recordErrors.keepRecord ? <small>{recordErrors.keepRecord}</small> : null}
              <button type="submit" className="service-submit">
                Save Record And Due Dates
              </button>
            </form>

            <div className="vac-saved">
              <p className="vac-section-title">Saved Reminders — When The Dose Should Be Done</p>
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
                        {row.dobEstimated ? " (estimated from age)" : ""} · {row.dueLabel} ·{" "}
                        {row.status}
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
                <input
                  type="date"
                  max={today}
                  value={markGiven.givenOn}
                  onChange={(event) =>
                    setMarkGiven((prev) => ({ ...prev, givenOn: event.target.value }))
                  }
                />
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
        ) : (
          <form className="service-form" onSubmit={handleSubmit}>
            <div className="field full">
              <BookingForFields
                idPrefix="vac"
                profile={profile}
                selectedId={form.bookedFor}
                error={errors.bookedFor}
                onSelect={handleBookingFor}
              />
            </div>

            <div className="field">
              <label htmlFor="vac-name">
                Patient Name <span>*</span>
              </label>
              <input
                id="vac-name"
                name="patientName"
                value={form.patientName}
                onChange={handleChange}
              />
              {errors.patientName ? <small>{errors.patientName}</small> : null}
            </div>
            <div className="field">
              <label htmlFor="vac-mobile">
                Mobile <span>*</span>
              </label>
              <input
                id="vac-mobile"
                name="mobile"
                type="tel"
                inputMode="numeric"
                maxLength="10"
                value={form.mobile}
                onChange={handleChange}
              />
              {errors.mobile ? <small>{errors.mobile}</small> : null}
            </div>

            <div className="field">
              <span className="plan-label">Schedule</span>
              <div className="care-plans vac-groups" role="radiogroup">
                <label className={group === "child" ? "is-on" : undefined}>
                  <input
                    type="radio"
                    name="group"
                    value="child"
                    checked={form.group === "child"}
                    onChange={handleChange}
                  />
                  <strong>Children</strong>
                  <em>UIP / NIS</em>
                </label>
                <label className={group === "senior" ? "is-on" : undefined}>
                  <input
                    type="radio"
                    name="group"
                    value="senior"
                    checked={form.group === "senior"}
                    onChange={handleChange}
                  />
                  <strong>Older Persons</strong>
                  <em>MoHFW / NCDC</em>
                </label>
              </div>
            </div>

            <div className="field">
              <label htmlFor="vac-gender">Male / Female</label>
              <select id="vac-gender" name="gender" value={form.gender} onChange={handleChange}>
                <option value="">Select</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="vac-dob">Date Of Birth</label>
              <input
                id="vac-dob"
                type="date"
                name="dob"
                max={today}
                value={form.dob}
                onChange={handleChange}
              />
              {errors.dob ? <small>{errors.dob}</small> : null}
            </div>
            <div className="field">
              <label htmlFor="vac-age">Age (Years)</label>
              <input
                id="vac-age"
                name="ageYears"
                inputMode="numeric"
                value={form.ageYears}
                onChange={handleChange}
              />
            </div>
            {group === "child" && Number(form.ageYears || 0) < 2 ? (
              <div className="field">
                <label htmlFor="vac-months">Extra Months (Infants)</label>
                <input
                  id="vac-months"
                  name="extraMonths"
                  inputMode="numeric"
                  value={form.extraMonths}
                  onChange={handleChange}
                />
              </div>
            ) : null}

            <label className="vac-check full">
              <input
                type="checkbox"
                name="includeEndemic"
                checked={form.includeEndemic}
                onChange={handleChange}
              />
              JE-Endemic District (Only If Notified By The Government Of India)
            </label>
            <label className="vac-check full">
              <input
                type="checkbox"
                name="keepRecord"
                checked={form.keepRecord}
                onChange={handleChange}
              />
              Keep Vaccination Record For This Person
            </label>
            <label className="vac-check full">
              <input
                type="checkbox"
                name="remindersOn"
                checked={form.remindersOn}
                onChange={handleChange}
              />
              Save Reminder With The Date Each Due Vaccine Should Be Done
            </label>

            <div className="field full">
              <span className="plan-label">
                Suggested Vaccines (Government Schedule) <span>*</span>
              </span>
              {group === "adult" || (group === "senior" && suggestions.length === 0) ? (
                <p className="vac-copy">
                  UIP is for children up to {CHILD_MAX_YEARS - 1} years. Government adult
                  recommendations listed here start at 60 years (COVID-19) and {SENIOR_MIN_YEARS === 50 ? "65" : SENIOR_MIN_YEARS}{" "}
                  years (influenza and pneumococcal).
                </p>
              ) : null}
              <div className="vac-suggest">
                {suggestions.length === 0 ? (
                  <p className="vac-copy">Enter age or date of birth to see due vaccines.</p>
                ) : (
                  suggestions.map((row) => (
                    <label key={row.id} className={form.selectedIds.includes(row.id) ? "is-on" : ""}>
                      <input
                        type="checkbox"
                        checked={form.selectedIds.includes(row.id)}
                        onChange={() => toggleVaccine(row.id)}
                      />
                      <span>
                        <strong>{row.name}</strong>
                        <em>
                          {row.status} · {row.dueLabel}
                          {row.dueOn ? ` · do on ${formatDisplayDate(row.dueOn)}` : ""}
                        </em>
                        <small>{row.note}</small>
                      </span>
                    </label>
                  ))
                )}
              </div>
              {errors.selectedIds ? <small>{errors.selectedIds}</small> : null}
            </div>

            <div className="field full">
              <AddressFields
                idPrefix="vac"
                values={form}
                errors={errors}
                onChange={handleChange}
                pinHint="Select the Village / Sector / Mohalla attached to this PIN."
              />
            </div>
            <div className="field">
              <label htmlFor="vac-date">
                Visit Date <span>*</span>
              </label>
              <input
                id="vac-date"
                type="date"
                name="date"
                min={today}
                value={form.date}
                onChange={handleChange}
              />
              {errors.date ? <small>{errors.date}</small> : null}
            </div>
            <div className="field">
              <label htmlFor="vac-slot">
                Time Slot <span>*</span>
              </label>
              <select id="vac-slot" name="timeSlot" value={form.timeSlot} onChange={handleChange}>
                <option value="">Select a slot</option>
                {SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
              {errors.timeSlot ? <small>{errors.timeSlot}</small> : null}
            </div>

            <PaymentBlock
              kind="vaccination"
              amount={total}
              pin={form.pinCode}
              method={payMethod}
              onMethodChange={setPayMethod}
              onQuoteChange={setPayQuote}
            />

            <p className="vac-disclaimer">{UIP_DISCLAIMER}</p>
            <button type="submit" className="service-submit" disabled={submitting}>
              {submitting
                ? "Connecting PIN To Map…"
                : `Confirm Visit · ${formatRupee(total)}`}
            </button>
          </form>
        )}
      </div>
    </>
  );
}

const styles = `
.service-page{padding:16px 20px 24px 14px;box-sizing:border-box;color:#143246}
.service-hero{max-width:760px;margin:0 auto 12px;padding:14px 16px;border-radius:12px;background:linear-gradient(135deg,#eaf7ff,#f4fbf8)}
.service-kicker{display:block;margin-bottom:4px;font-size:11px;font-weight:800;letter-spacing:.6px;color:#1a6b7a}
.service-hero h1{margin:0 0 4px;font-size:22px}
.service-hero p{margin:0;color:#5d7180;font-size:13px;line-height:1.4}
.vac-banner{max-width:760px;margin:0 auto 12px;padding:12px 14px;border-radius:12px;background:#fff6e8;border:1px solid #f0d3a0;color:#7a4b12}
.vac-banner strong{display:block;margin-bottom:6px}
.vac-banner ul{margin:0;padding-left:18px;font-size:13px;line-height:1.45}
.vac-tabs{max-width:760px;margin:0 auto 12px;display:flex;gap:8px}
.vac-tabs button{border:1px solid #d7e2e9;background:#fff;border-radius:999px;padding:8px 14px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;color:#34546b}
.vac-tabs button.is-on{background:#1a6b7a;color:#fff;border-color:#1a6b7a}
.service-form{max-width:760px;margin:0 auto;padding:14px;background:#fff;border:1px solid #e4ecef;border-radius:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px 12px}
.service-form .field{display:flex;flex-direction:column;min-width:0}
.service-form .field.full,.service-form .full{grid-column:1/-1}
.service-form label,.plan-label{margin-bottom:5px;font-size:12px;font-weight:700;color:#34546b}
.service-form label span,.plan-label span{color:#d84b4b}
.care-plans{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.care-plans label{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:12px 8px;border:1px solid #d7e2e9;border-radius:10px;background:#fff;cursor:pointer;text-align:center}
.care-plans label.is-on{border-color:#1a6b7a;background:#e8f4f6}
.care-plans input{position:absolute;opacity:0;pointer-events:none}
.care-plans strong{font-size:13px;color:#143246}
.care-plans em{font-style:normal;font-size:11px;color:#5d7180}
.service-form input,.service-form select,.service-form textarea{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #d7e2e9;border-radius:8px;font:inherit;font-size:14px;color:#143246;outline:none;min-height:38px;background:#fff}
.service-form input:focus,.service-form select:focus{border-color:#1a6b7a}
.service-form small{margin-top:4px;color:#d84b4b;font-size:12px}
.service-submit{grid-column:1/-1;border:none;border-radius:8px;background:#1a6b7a;color:#fff;font-size:14px;font-weight:700;min-height:40px;cursor:pointer;font-family:inherit}
.vac-check{display:flex;align-items:flex-start;gap:8px;font-size:13px;color:#29455a;font-weight:600}
.vac-check input{width:auto;min-height:0;margin-top:3px}
.vac-suggest{display:grid;gap:8px}
.vac-suggest label{display:flex;gap:8px;align-items:flex-start;padding:10px 12px;border:1px solid #d7e2e9;border-radius:10px;background:#fff;cursor:pointer}
.vac-suggest label.is-on{border-color:#1e8a73;background:#eef8f5}
.vac-suggest input{width:auto;min-height:0;margin-top:4px}
.vac-suggest span{display:grid;gap:2px}
.vac-suggest strong{font-size:13px;color:#143246}
.vac-suggest em{font-style:normal;font-size:12px;color:#1a6b7a}
.vac-suggest small{color:#5d7180;font-size:11px;font-weight:400}
.vac-copy{margin:0;color:#5d7180;font-size:13px;line-height:1.45}
.vac-disclaimer{grid-column:1/-1;margin:0;font-size:12px;color:#5d7180;line-height:1.45}
.vac-section-title{margin:0 0 6px;font-size:14px;font-weight:800;color:#29455a;grid-column:1/-1}
.vac-record{display:grid;gap:16px}
.vac-record-form,.vac-given{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px}
.vac-reminder-list{margin:0;padding:0;list-style:none;display:grid;gap:8px}
.vac-reminder-list li{display:grid;gap:2px;padding:10px 12px;border:1px solid #e4ecef;border-radius:10px;background:#f7fbfc}
.vac-reminder-list span{font-size:13px;color:#143246}
.vac-reminder-list em{font-style:normal;font-size:12px;color:#1a6b7a}
.vac-remove{grid-column:1/-1;border:1px solid #d7e2e9;background:#fff;border-radius:8px;min-height:36px;cursor:pointer;font:inherit;font-size:12px}
.confirm-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
.confirm-actions .service-submit{grid-column:auto;min-width:180px}
.service-confirm{max-width:640px;margin:12px auto;text-align:center}
.success-icon{width:52px;height:52px;margin:0 auto 10px;border-radius:50%;background:#e5f8ee;color:#1c9b61;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800}
.service-confirm h1{margin:0 0 6px;font-size:22px}
.service-confirm p{margin:0 0 14px;color:#5d7180;font-size:14px}
.confirm-card{text-align:left;background:#fff;border:1px solid #e4ecef;border-radius:12px;padding:14px;margin-bottom:14px}
.confirm-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding-bottom:8px;margin-bottom:4px;border-bottom:1px solid #e5edf1}
.confirm-head h2{margin:0;font-size:16px}
.confirm-head span{padding:5px 9px;border-radius:6px;background:#e8f4f6;color:#1a6b7a;font-size:12px;font-weight:800}
.confirm-row{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #edf1f3;font-size:14px}
.confirm-row span{color:#5d7180}
.confirm-row strong{text-align:right}
.confirm-row:last-child{border-bottom:none}
@media (max-width:800px){.service-page{padding:14px}.service-form,.vac-record-form,.vac-given{grid-template-columns:1fr}}
`;

export default Vaccination;
