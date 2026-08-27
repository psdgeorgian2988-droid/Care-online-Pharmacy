import { useMemo, useState } from "react";
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

const STORAGE_KEY = "mediHomeStepDownBookings";
const AMBULANCE_STORAGE_KEY = "mediHomeAmbulanceRequests";
const STEPDOWN_DAY_RATE = 4999;
const TRANSFER_FEE = 2499;

const CARE_TYPES = [
  { value: "post-icu", label: "Post-ICU step-down" },
  { value: "post-surgery", label: "Post-surgery recovery" },
  { value: "rehab", label: "Rehab & physiotherapy" },
  { value: "wound", label: "Wound / drain care" },
  { value: "assisted", label: "Assisted recovery at home" },
];

const TIME_SLOTS = [
  "08:00 AM – 10:00 AM",
  "10:00 AM – 12:00 PM",
  "12:00 PM – 02:00 PM",
  "04:00 PM – 06:00 PM",
  "06:00 PM – 08:00 PM",
];

const FOCUS_FILTERS = [
  { value: "all", label: "All centres" },
  { value: "post-icu", label: "Post-ICU" },
  { value: "post-surgery", label: "Post-surgery" },
  { value: "rehab", label: "Rehab" },
  { value: "wound", label: "Wound care" },
];

const CENTRES = [
  {
    id: "dwarka-recovery",
    name: "MediHome Step-Down, Dwarka",
    area: "Dwarka Sector 12",
    city: "New Delhi",
    pin: "110075",
    address: "Plot 18, Sector 12, Dwarka, New Delhi",
    focus: ["post-icu", "assisted"],
    beds: 24,
    phone: "+91 72920 94000",
  },
  {
    id: "noida-rehab",
    name: "MediHome Recovery, Noida",
    area: "Sector 62",
    city: "Noida",
    pin: "201309",
    address: "A-42, Sector 62, Noida",
    focus: ["rehab", "post-surgery"],
    beds: 18,
    phone: "+91 72920 94000",
  },
  {
    id: "gurugram-cardiac",
    name: "MediHome Cardiac Step-Down, Gurugram",
    area: "Sushant Lok",
    city: "Gurugram",
    pin: "122002",
    address: "12, Sushant Lok-I, Gurugram",
    focus: ["post-icu", "rehab"],
    beds: 20,
    phone: "+91 72920 94000",
  },
  {
    id: "rohini-wound",
    name: "MediHome Wound & Drain Care, Rohini",
    area: "Rohini Sector 7",
    city: "New Delhi",
    pin: "110085",
    address: "B-9, Sector 7, Rohini, New Delhi",
    focus: ["wound", "post-surgery"],
    beds: 12,
    phone: "+91 72920 94000",
  },
  {
    id: "faridabad-ortho",
    name: "MediHome Ortho Recovery, Faridabad",
    area: "NIT 5",
    city: "Faridabad",
    pin: "121001",
    address: "SCO 21, NIT 5, Faridabad",
    focus: ["post-surgery", "rehab"],
    beds: 16,
    phone: "+91 72920 94000",
  },
  {
    id: "ghaziabad-icu",
    name: "MediHome Post-ICU Care, Ghaziabad",
    area: "Indirapuram",
    city: "Ghaziabad",
    pin: "201014",
    address: "Shipra Mall road, Indirapuram, Ghaziabad",
    focus: ["post-icu", "assisted"],
    beds: 22,
    phone: "+91 72920 94000",
  },
];

function readProfile() {
  return readUserProfile();
}

function focusLabel(value) {
  return CARE_TYPES.find((item) => item.value === value)?.label || value;
}

function centreMatches(centre, query, focus) {
  if (focus !== "all" && !centre.focus.includes(focus)) return false;
  const blob = [
    centre.name,
    centre.area,
    centre.city,
    centre.pin,
    centre.address,
    ...centre.focus.map(focusLabel),
  ]
    .join(" ")
    .toLowerCase();
  const tokens = String(query || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  if (!tokens.length) return true;
  return tokens.every((token) => blob.includes(token));
}

function StepDownCare() {
  const profile = useMemo(() => readProfile(), []);
  const today = new Date().toISOString().split("T")[0];
  const [tab, setTab] = useState("find");
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState("all");
  const [form, setForm] = useState({
    centreId: "",
    patientName: profile.name,
    mobile: profile.mobile,
    ...pickAddress(profile),
    ...initialBookingFor(profile),
    serviceType: "post-icu",
    date: "",
    timeSlot: "",
    durationDays: "7",
    needAmbulance: "",
  });
  const [errors, setErrors] = useState({});
  const [booking, setBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [payMethod, setPayMethod] = useState("cod");
  const [payQuote, setPayQuote] = useState(null);
  const busyWait = useBusyOverlay(submitting, "stepdown");
  const stayTotal = Math.max(1, Number(form.durationDays) || 1) * STEPDOWN_DAY_RATE;

  const selectedCentre = CENTRES.find((item) => item.id === form.centreId) || null;
  const centres = CENTRES.filter((centre) => centreMatches(centre, query, focus));

  const handleChange = (event) => {
    const { name, value } = event.target;
    const next =
      name === "mobile" || name === "pinCode" || name === "durationDays"
        ? value.replace(/\D/g, "")
        : value;
    setForm((prev) => ({ ...prev, [name]: next }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const chooseCentre = (centreId) => {
    setForm((prev) => ({ ...prev, centreId }));
    setErrors((prev) => ({ ...prev, centreId: "" }));
    setTab("book");
  };

  const validate = () => {
    const next = {};
    if (!form.centreId) next.centreId = "Select a step-down care centre.";
    if (!form.patientName.trim()) next.patientName = "Patient name is required.";
    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      next.mobile = "Enter a valid 10-digit mobile number.";
    }
    Object.assign(next, validateAddress(form));
    Object.assign(next, validateBookingFor(form, profile));
    if (!form.serviceType) next.serviceType = "Select a care type.";
    if (!form.date) next.date = "Please select a date.";
    if (!form.timeSlot) next.timeSlot = "Please select a time slot.";
    const days = Number(form.durationDays);
    if (!days || days < 1 || days > 90) {
      next.durationDays = "Enter stay or visit days between 1 and 90.";
    }
    if (form.needAmbulance !== "yes" && form.needAmbulance !== "no") {
      next.needAmbulance = "Please choose whether you need an ambulance.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    const centre = CENTRES.find((item) => item.id === form.centreId);
    const serviceLabel =
      CARE_TYPES.find((item) => item.value === form.serviceType)?.label || form.serviceType;

    setSubmitting(true);
    try {
      const queue = await holdForPartnerQueue("stepdown");
      const gps = await resolvePinLocation(form.pinCode);
      const addr = applyResolvedPin(form, gps);
      const bookingId = "MH-SD-" + Math.floor(100000 + Math.random() * 900000);
      const wantsAmbulance = form.needAmbulance === "yes";
      let ambulanceRequestId = "";
      const total = Math.max(1, Number(form.durationDays) || 1) * STEPDOWN_DAY_RATE;
      const pay = paymentFromQuote(payQuote, total);
      const payment = await settleCheckoutPayment({
        method: payMethod,
        ...pay,
        kind: "stepdown",
        pin: gps.pinCode,
        name: form.patientName.trim(),
        mobile: form.mobile,
        reference: bookingId,
        description: "MediHome step-down stay",
      });

      if (wantsAmbulance && centre) {
        ambulanceRequestId = "MH-AMB-" + Math.floor(100000 + Math.random() * 900000);
      }

      const bookingDetails = {
        bookingId,
        orderType: "stepdown",
        ...form,
        ...addr,
        patientName: form.patientName.trim(),
        pin: gps.pin,
        lat: gps.lat,
        lng: gps.lng,
        locality: gps.locality,
        mapsUrl: gps.mapsUrl,
        centreName: centre?.name || "",
        centreAddress: centre?.address || "",
        centrePin: centre?.pin || "",
        serviceLabel,
        durationDays: Number(form.durationDays),
        needAmbulance: wantsAmbulance,
        ambulanceRequestId,
        total: pay.amountRupees,
        saleRupees: pay.saleRupees,
        couponCode: pay.couponCode,
        discountRupees: pay.discountRupees,
        highTrafficWait: queue.busy || queue.waited,
        bookedAt: new Date().toLocaleString(),
        bookedAtMs: Date.now(),
        ...payment,
      };
      const trackedBooking = persistOrder(withTracking(bookingDetails, "stepdown"));

      if (wantsAmbulance && centre) {
        const ambPay = await settleCheckoutPayment({
          method: "cod",
          amountRupees: TRANSFER_FEE,
          kind: "ambulance",
          pin: gps.pinCode,
          name: form.patientName.trim(),
          mobile: form.mobile,
          reference: ambulanceRequestId,
          description: "Transfer to step-down centre",
        });
        persistOrder(
          withTracking(
            {
              requestId: ambulanceRequestId,
              patientName: form.patientName.trim(),
              mobile: form.mobile,
              pickupAddress: addr.pickupAddress,
              pinCode: gps.pinCode,
              pin: gps.pin,
              lat: gps.lat,
              lng: gps.lng,
              locality: gps.locality,
              mapsUrl: gps.mapsUrl,
              emergencyType: "non-emergency",
              destinationName: centre.name,
              destinationAddress: centre.address,
              destinationPin: centre.pin,
              linkedStepDownId: bookingId,
              notes: `Automatic transfer to ${centre.name}, ${centre.address} (PIN ${centre.pin}). Linked step-down booking ${bookingId}.`,
              total: TRANSFER_FEE,
              requestedAt: new Date().toLocaleString(),
              requestedAtMs: Date.now(),
              ...ambPay,
            },
            "ambulance"
          )
        );
      }
      setBooking(trackedBooking);
    } catch (error) {
      alert(error.message || "Booking or payment could not be completed.");
    } finally {
      setSubmitting(false);
    }
  };

  const startNew = () => {
    setBooking(null);
    setTab("find");
    setForm({
      centreId: "",
      patientName: profile.name,
      mobile: profile.mobile,
      ...pickAddress(profile),
      serviceType: "post-icu",
      date: "",
      timeSlot: "",
      durationDays: "7",
      needAmbulance: "",
    });
    setPayMethod("cod");
    setErrors({});
  };

  if (booking) {
    return (
      <>
        <style>{styles}</style>
        <div className="service-page">
          <section className="service-confirm">
            <div className="success-icon">✓</div>
            <h1>Step-Down Care Booked</h1>
            <PatienceNote kind="stepdown" shown={booking.highTrafficWait} />
            <p>
              {booking.needAmbulance
                ? "Step-down care is booked and an ambulance has been requested to the centre."
                : "Your recovery-centre request has been saved locally."}
            </p>
            <div className="confirm-card">
              <div className="confirm-head">
                <h2>Booking Details</h2>
                <span>{booking.bookingId}</span>
              </div>
              <div className="confirm-row">
                <span>Centre</span>
                <strong>{booking.centreName}</strong>
              </div>
              <div className="confirm-row">
                <span>Care type</span>
                <strong>{booking.serviceLabel}</strong>
              </div>
              <div className="confirm-row">
                <span>Patient</span>
                <strong>{booking.patientName}</strong>
              </div>
              <div className="confirm-row">
                <span>Mobile</span>
                <strong>{booking.mobile}</strong>
              </div>
              <div className="confirm-row">
                <span>Address</span>
                <strong>{booking.address}</strong>
              </div>
              <div className="confirm-row">
                <span>PIN</span>
                <strong>{booking.pinCode}</strong>
              </div>
              <PinGpsBlock record={booking} />
              <div className="confirm-row">
                <span>Start date</span>
                <strong>{booking.date}</strong>
              </div>
              <div className="confirm-row">
                <span>Time slot</span>
                <strong>{booking.timeSlot}</strong>
              </div>
              <div className="confirm-row">
                <span>Days</span>
                <strong>{booking.durationDays}</strong>
              </div>
              <div className="confirm-row">
                <span>Stay estimate</span>
                <strong>
                  ₹{Number(booking.total || 0).toLocaleString("en-IN")}
                </strong>
              </div>
              <div className="confirm-row">
                <span>Payment</span>
                <strong>
                  {booking.paymentMethod === "online"
                    ? "Paid online"
                    : "Pay at centre"}
                </strong>
              </div>
              <div className="confirm-row">
                <span>Ambulance to centre</span>
                <strong>{booking.needAmbulance ? "Yes · booked automatically" : "No"}</strong>
              </div>
              {booking.ambulanceRequestId ? (
                <div className="confirm-row">
                  <span>Ambulance ID</span>
                  <strong>{booking.ambulanceRequestId}</strong>
                </div>
              ) : null}
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
                Track live
              </button>
              {booking.ambulanceRequestId ? (
                <button
                  type="button"
                  className="service-submit"
                  onClick={() => {
                    window.location.hash = trackHref(booking.ambulanceRequestId);
                  }}
                >
                  Track ambulance
                </button>
              ) : null}
              <button type="button" className="service-submit" onClick={startNew}>
                Find another centre
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
      {busyWait ? <BusyWait kind="stepdown" traffic={busyWait} /> : null}
      <div className="lab-page">
        <header className="lab-head">
          <div>
            <p className="lab-kicker">Step-down recovery</p>
            <h1>Find A Step-Down Care Centre</h1>
            <p className="lab-lead">
              Post-ICU, Post-Surgery and Rehab centres across Delhi NCR.
            </p>
          </div>
          <div className="lab-tabs" role="tablist" aria-label="Step-down care">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "find"}
              className={tab === "find" ? "is-on" : ""}
              onClick={() => setTab("find")}
            >
              Find a centre
              <span>{CENTRES.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "book"}
              className={tab === "book" ? "is-on" : ""}
              onClick={() => setTab("book")}
            >
              Book recovery
            </button>
          </div>
        </header>

        {tab === "find" ? (
          <div className="lab-shell sd-find">
            <section className="lab-card">
              <div className="lab-card-head">
                <h2>Search Centres</h2>
                <p>Filter by PIN, area or recovery type.</p>
              </div>
              <label className="lab-label" htmlFor="sd-search">
                PIN, area or centre name
              </label>
              <input
                id="sd-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="e.g. 110075, Dwarka, Noida, post-ICU"
              />
              <div className="sd-filters" role="tablist" aria-label="Care focus">
                {FOCUS_FILTERS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={focus === item.value ? "is-on" : undefined}
                    onClick={() => setFocus(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {centres.length === 0 ? (
                <p className="sd-empty">No centres match this search. Try another PIN or area.</p>
              ) : (
                <div className="sd-centre-list">
                  {centres.map((centre) => (
                    <article
                      key={centre.id}
                      className={
                        form.centreId === centre.id ? "sd-centre is-picked" : "sd-centre"
                      }
                    >
                      <div>
                        <h3>{centre.name}</h3>
                        <p>
                          {centre.area}, {centre.city} · PIN {centre.pin}
                        </p>
                        <p>{centre.address}</p>
                        <p className="sd-meta">
                          {centre.beds} beds · {centre.focus.map(focusLabel).join(" · ")}
                        </p>
                      </div>
                      <div className="sd-centre-actions">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            `${centre.address} ${centre.pin}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Map
                        </a>
                        <button type="button" onClick={() => chooseCentre(centre.id)}>
                          Select this centre
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <form className="lab-shell" onSubmit={handleSubmit}>
            <section className="lab-card">
              <div className="lab-card-head">
                <h2>Book Recovery Care</h2>
                <p>We will confirm the centre slot over a call.</p>
              </div>
              <div className="lab-field">
                <label htmlFor="sd-centre">
                  Step-down centre <em>*</em>
                </label>
                <select
                  id="sd-centre"
                  name="centreId"
                  value={form.centreId}
                  onChange={handleChange}
                >
                  <option value="">Select a centre</option>
                  {CENTRES.map((centre) => (
                    <option key={centre.id} value={centre.id}>
                      {centre.name} ({centre.pin})
                    </option>
                  ))}
                </select>
                {errors.centreId ? <small className="lab-error">{errors.centreId}</small> : null}
                {selectedCentre ? (
                  <p className="sd-picked">
                    {selectedCentre.address}. Need a different location?{" "}
                    <button type="button" className="sd-link" onClick={() => setTab("find")}>
                      Find a centre
                    </button>
                  </p>
                ) : (
                  <p className="sd-picked">
                    Not sure which centre? Open the{" "}
                    <button type="button" className="sd-link" onClick={() => setTab("find")}>
                      Find a centre
                    </button>{" "}
                    tab.
                  </p>
                )}
              </div>

              <div className="sd-form-grid">
                <div className="lab-field" style={{ gridColumn: "1 / -1" }}>
                  <BookingForFields
                    idPrefix="sd"
                    profile={profile}
                    selectedId={form.bookedFor}
                    error={errors.bookedFor}
                    onSelect={(option) => {
                      setForm((prev) => ({ ...prev, ...bookingForPatch(option) }));
                      setErrors((prev) => ({ ...prev, bookedFor: "" }));
                    }}
                  />
                </div>
                <div className="lab-field">
                  <label htmlFor="sd-name">
                    Patient name <em>*</em>
                  </label>
                  <input
                    id="sd-name"
                    name="patientName"
                    value={form.patientName}
                    onChange={handleChange}
                    placeholder="Full name"
                  />
                  {errors.patientName ? <small className="lab-error">{errors.patientName}</small> : null}
                </div>
                <div className="lab-field">
                  <label htmlFor="sd-mobile">
                    Mobile <em>*</em>
                  </label>
                  <input
                    id="sd-mobile"
                    name="mobile"
                    type="tel"
                    inputMode="numeric"
                    maxLength="10"
                    value={form.mobile}
                    onChange={handleChange}
                    placeholder="10-digit mobile"
                  />
                  {errors.mobile ? <small className="lab-error">{errors.mobile}</small> : null}
                </div>
                <div className="lab-field sd-full">
                  <AddressFields
                    idPrefix="sd"
                    values={form}
                    errors={errors}
                    onChange={handleChange}
                    pinHint="Select the Village / Sector / Mohalla attached to this PIN."
                  />
                </div>
                <div className="lab-field">
                  <label htmlFor="sd-type">
                    Care type <em>*</em>
                  </label>
                  <select
                    id="sd-type"
                    name="serviceType"
                    value={form.serviceType}
                    onChange={handleChange}
                  >
                    {CARE_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  {errors.serviceType ? <small className="lab-error">{errors.serviceType}</small> : null}
                </div>
                <div className="lab-field">
                  <label htmlFor="sd-date">
                    Start date <em>*</em>
                  </label>
                  <input
                    id="sd-date"
                    name="date"
                    type="date"
                    min={today}
                    value={form.date}
                    onChange={handleChange}
                  />
                  {errors.date ? <small className="lab-error">{errors.date}</small> : null}
                </div>
                <div className="lab-field">
                  <label htmlFor="sd-slot">
                    Time slot <em>*</em>
                  </label>
                  <select
                    id="sd-slot"
                    name="timeSlot"
                    value={form.timeSlot}
                    onChange={handleChange}
                  >
                    <option value="">Select a slot</option>
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                  {errors.timeSlot ? <small className="lab-error">{errors.timeSlot}</small> : null}
                </div>
                <div className="lab-field">
                  <label htmlFor="sd-days">
                    Expected days <em>*</em>
                  </label>
                  <input
                    id="sd-days"
                    name="durationDays"
                    inputMode="numeric"
                    maxLength="2"
                    value={form.durationDays}
                    onChange={handleChange}
                    placeholder="e.g. 7"
                  />
                  {errors.durationDays ? (
                    <small className="lab-error">{errors.durationDays}</small>
                  ) : null}
                </div>
                <div className="lab-field sd-full">
                  <span className="lab-label" id="sd-amb-q">
                    Do you want an ambulance to reach the step-down centre? <em>*</em>
                  </span>
                  <div
                    className="sd-choice"
                    role="radiogroup"
                    aria-labelledby="sd-amb-q"
                  >
                    <label className={form.needAmbulance === "yes" ? "is-on" : undefined}>
                      <input
                        type="radio"
                        name="needAmbulance"
                        value="yes"
                        checked={form.needAmbulance === "yes"}
                        onChange={handleChange}
                      />
                      Yes
                    </label>
                    <label className={form.needAmbulance === "no" ? "is-on" : undefined}>
                      <input
                        type="radio"
                        name="needAmbulance"
                        value="no"
                        checked={form.needAmbulance === "no"}
                        onChange={handleChange}
                      />
                      No
                    </label>
                  </div>
                  {errors.needAmbulance ? (
                    <small className="lab-error">{errors.needAmbulance}</small>
                  ) : null}
                  {form.needAmbulance === "yes" ? (
                    <p className="sd-picked">
                      Yes will automatically book an ambulance from the home address
                      to{" "}
                      {selectedCentre
                        ? `${selectedCentre.name} (PIN ${selectedCentre.pin})`
                        : "the selected centre"}
                      .
                    </p>
                  ) : null}
                </div>
              </div>

              <PaymentBlock
                kind="stepdown"
                amount={stayTotal}
                pin={form.pinCode}
                method={payMethod}
                onMethodChange={setPayMethod}
                onQuoteChange={setPayQuote}
              />

              <button type="submit" className="service-submit" disabled={submitting}>
                {submitting
                  ? "Booking…"
                  : form.needAmbulance === "yes"
                    ? "Confirm booking and ambulance"
                    : "Confirm step-down booking"}
              </button>
            </section>
          </form>
        )}
      </div>
    </>
  );
}

const styles = `
.lab-page{width:100%;max-width:none;padding:18px 22px 20px 16px;box-sizing:border-box;color:#143246;background:#f6fbff}
.lab-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin:0 0 16px;flex-wrap:wrap}
.lab-kicker{margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#1a6b7a}
.lab-head h1{margin:0;font-size:24px;line-height:1.2;font-weight:700;color:#123b59}
.lab-lead{margin:6px 0 0;font-size:14px;line-height:1.45;color:#5d7180;max-width:640px}
.lab-tabs{display:inline-flex;padding:4px;border-radius:10px;background:#e8f1f6;gap:4px}
.lab-tabs button{border:0;background:transparent;color:#3d5a6c;font:inherit;font-size:13px;font-weight:700;padding:8px 14px;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;gap:8px}
.lab-tabs button.is-on{background:#fff;color:#1a6b7a;box-shadow:0 1px 3px rgba(20,50,70,.08)}
.lab-tabs span{min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#1a6b7a;color:#fff;font-size:11px;line-height:18px;text-align:center}
.lab-shell{display:grid;grid-template-columns:1fr;gap:16px;align-items:start}
.lab-card{background:#fff;border:1px solid #e4ecef;border-radius:12px;padding:16px 18px;min-width:0}
.lab-card-head{margin:0 0 14px;padding-bottom:12px;border-bottom:1px solid #eef3f6}
.lab-card-head h2{margin:0;font-size:16px;font-weight:700;color:#143246}
.lab-card-head p{margin:4px 0 0;font-size:13px;color:#5d7180;line-height:1.4}
.lab-label,.lab-field label{display:block;margin:0 0 6px;font-size:12px;font-weight:700;color:#34546b}
.lab-label em,.lab-field label em{color:#d84b4b;font-style:normal}
.lab-card>input,.lab-field input,.lab-field select,.lab-field textarea{width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid #d7e2e9;border-radius:8px;font:inherit;font-size:14px;color:#143246;outline:none;min-height:40px;background:#fff}
.lab-field textarea{min-height:64px;resize:vertical}
.lab-field{margin-top:12px}
.lab-error{display:block;margin-top:6px;color:#d84b4b;font-size:12px}
.sd-filters{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 4px}
.sd-filters button{border:1px solid #d7e2e9;background:#fff;color:#34546b;border-radius:999px;padding:6px 10px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}
.sd-filters button.is-on{background:#1a6b7a;border-color:#1a6b7a;color:#fff}
.sd-centre-list{display:grid;gap:10px;margin-top:14px}
.sd-centre{display:flex;justify-content:space-between;gap:14px;padding:14px;border:1px solid #e4ecef;border-radius:12px;background:#f7fbfe}
.sd-centre.is-picked{border-color:#1a6b7a;background:#eef7fc}
.sd-centre h3{margin:0 0 4px;font-size:16px}
.sd-centre p{margin:0 0 4px;color:#5d7180;font-size:13px;line-height:1.4}
.sd-meta{color:#1a6b7a !important;font-weight:600}
.sd-centre-actions{display:flex;flex-direction:column;align-items:stretch;justify-content:center;gap:8px;min-width:150px}
.sd-centre-actions a,.sd-centre-actions button{border:none;border-radius:8px;min-height:36px;padding:0 12px;font:inherit;font-size:13px;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.sd-centre-actions a{background:#fff;color:#1a6b7a;border:1px solid #c5d6db}
.sd-centre-actions button{background:#1a6b7a;color:#fff}
.sd-empty{margin:16px 0 0;color:#5d7180;font-size:14px}
.sd-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 12px}
.sd-full{grid-column:1/-1}
.sd-picked{margin:8px 0 0;color:#5d7180;font-size:13px}
.sd-link{border:0;background:none;padding:0;color:#1a6b7a;font:inherit;font-weight:700;cursor:pointer}
.sd-choice{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.sd-choice label{display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;border:1px solid #d7e2e9;border-radius:10px;background:#fff;font-size:15px;font-weight:800;color:#143246;cursor:pointer}
.sd-choice label.is-on{border-color:#1a6b7a;background:#e8f4f6;color:#1a6b7a}
.sd-choice input{accent-color:#1a6b7a}
.service-submit{margin-top:16px;width:100%;border:none;border-radius:8px;background:#1a6b7a;color:#fff;font-size:14px;font-weight:700;min-height:42px;cursor:pointer;font-family:inherit}
.service-page{padding:16px 20px 24px 14px;box-sizing:border-box;color:#143246}
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
.confirm-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
.confirm-actions .service-submit{width:auto;min-width:160px;margin:0}
@media (max-width:800px){
  .lab-page,.service-page{padding:14px}
  .sd-form-grid{grid-template-columns:1fr}
  .sd-centre{flex-direction:column}
  .sd-centre-actions{min-width:0}
}
`;

export default StepDownCare;
