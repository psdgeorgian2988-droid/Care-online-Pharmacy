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
import BookingFlow from "./BookingFlow";
import {
  applyResolvedPin,
  pickAddress,
  readUserProfile,
} from "./addressFields";
import {
  bookingForPatch,
  initialBookingFor,
  validateBookingDetails,
  withBookingIdentity,
} from "./bookingFor";

const PLANS = [
  { value: "video-45", label: "Video 45 min", price: 999, mode: "video" },
  { value: "video-60", label: "Video 60 min", price: 1499, mode: "video" },
  { value: "followup-30", label: "Follow-up 30 min", price: 699, mode: "video" },
  { value: "child-45", label: "Child / teen 45 min", price: 1299, mode: "video" },
  { value: "couple-60", label: "Couple / family 60 min", price: 2499, mode: "video" },
  { value: "home-60", label: "Home visit 60 min", price: 1999, mode: "home" },
];

const TIME_SLOTS = [
  "08:00 AM – 10:00 AM",
  "10:00 AM – 12:00 PM",
  "12:00 PM – 02:00 PM",
  "02:00 PM – 04:00 PM",
  "04:00 PM – 06:00 PM",
  "06:00 PM – 08:00 PM",
];

const formatRupee = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

function readProfile() {
  return readUserProfile();
}

function Psychologist() {
  const profile = useMemo(() => readProfile(), []);
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    patientName: profile.name,
    mobile: profile.mobile,
    ...pickAddress(profile),
    ...initialBookingFor(profile),
    carePlan: "video-45",
    date: "",
    timeSlot: "",
    concern: "",
  });
  const [errors, setErrors] = useState({});
  const [booking, setBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [payMethod, setPayMethod] = useState("cod");
  const [payQuote, setPayQuote] = useState(null);
  const busyWait = useBusyOverlay(submitting, "psychologist");
  const plan = PLANS.find((item) => item.value === form.carePlan) || PLANS[0];

  const handleChange = (event) => {
    const { name, value } = event.target;
    const next =
      name === "mobile" || name === "pinCode" ? value.replace(/\D/g, "") : value;
    setForm((prev) => ({ ...prev, [name]: next }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const next = validateBookingDetails(form, profile);
    if (!form.carePlan) next.carePlan = "Select a session.";
    if (!form.date) next.date = "Please select a session date.";
    if (!form.timeSlot) next.timeSlot = "Please select a time slot.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const booked = withBookingIdentity(form, profile);
      const queue = await holdForPartnerQueue("psychologist");
      const gps = await resolvePinLocation(booked.pinCode);
      const addr = applyResolvedPin(booked, gps);
      const pay = paymentFromQuote(payQuote, plan.price);
      const payment = await settleCheckoutPayment({
        method: payMethod,
        ...pay,
        kind: "psychologist",
        pin: gps.pinCode,
        name: booked.patientName,
        mobile: booked.mobile,
        reference: `psy-${Date.now()}`,
        description: "MediHome Psychologist Consultation",
      });

      const bookingDetails = {
        bookingId: "MH-PSY-" + Math.floor(100000 + Math.random() * 900000),
        patientName: booked.patientName,
        mobile: booked.mobile,
        ...addr,
        pin: gps.pin,
        lat: gps.lat,
        lng: gps.lng,
        locality: gps.locality,
        mapsUrl: gps.mapsUrl,
        carePlan: plan.value,
        carePlanLabel: plan.label,
        sessionMode: plan.mode,
        serviceLabel: "Psychologist Consultation",
        concern: form.concern.trim(),
        date: form.date,
        timeSlot: form.timeSlot,
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
            items: [
              {
                name: `${bookingDetails.serviceLabel} · ${plan.label}`,
                price: bookingDetails.total,
              },
            ],
          },
          "psychologist"
        )
      );
      setBooking(trackedBooking);
    } catch (error) {
      alert(error.message || "Payment or booking could not be completed.");
    } finally {
      setSubmitting(false);
    }
  };

  const startNew = () => {
    setBooking(null);
    setForm({
      patientName: profile.name,
      mobile: profile.mobile,
      ...pickAddress(profile),
      ...initialBookingFor(profile),
      carePlan: "video-45",
      date: "",
      timeSlot: "",
      concern: "",
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
            <h1>Consultation Booked</h1>
            <PatienceNote kind="psychologist" shown={booking.highTrafficWait} />
            <p>Your psychologist session is saved. Share this ID if care calls you.</p>
            <div className="confirm-card">
              <div className="confirm-head">
                <h2>Booking Details</h2>
                <span>{booking.bookingId}</span>
              </div>
              <div className="confirm-row">
                <span>Service</span>
                <strong>{booking.serviceLabel}</strong>
              </div>
              <div className="confirm-row">
                <span>Session</span>
                <strong>{booking.carePlanLabel}</strong>
              </div>
              <div className="confirm-row">
                <span>Mode</span>
                <strong>{booking.sessionMode === "home" ? "Home visit" : "Video"}</strong>
              </div>
              <div className="confirm-row">
                <span>Charges</span>
                <strong>{formatRupee(booking.total)}</strong>
              </div>
              <div className="confirm-row">
                <span>Payment</span>
                <strong>
                  {booking.paymentMethod === "online" ? "Paid online" : "Pay at session"}
                </strong>
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
                <span>Session date</span>
                <strong>{booking.date}</strong>
              </div>
              <div className="confirm-row">
                <span>Time slot</span>
                <strong>{booking.timeSlot}</strong>
              </div>
              {booking.concern ? (
                <div className="confirm-row">
                  <span>Note</span>
                  <strong>{booking.concern}</strong>
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
              <button type="button" className="service-submit" onClick={startNew}>
                Book another session
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
      {busyWait ? <BusyWait kind="psychologist" traffic={busyWait} /> : null}
      <div className="service-page">
        <section className="service-hero">
          <div>
            <span className="service-kicker">MediHome Psychologist</span>
            <h1>Psychologist Consultation At Home Or On Video</h1>
            <p>
              Confidential sessions with a MediHome psychologist. Video from
              anywhere in Delhi NCR, or a home visit at your PIN.
            </p>
          </div>
        </section>

        <form className="service-form" onSubmit={handleSubmit}>
          <BookingFlow
            idPrefix="psy"
            profile={profile}
            values={form}
            errors={errors}
            onSelect={(option) => {
              setForm((prev) => ({ ...prev, ...bookingForPatch(option, profile) }));
              setErrors((prev) => ({ ...prev, bookedFor: "" }));
            }}
            onChange={handleChange}
            pinHint="City, District and State fill from this PIN."
          >
          <div className="field full">
            <label htmlFor="psy-plan">
              Session <span>*</span>
            </label>
            <select
              id="psy-plan"
              name="carePlan"
              value={form.carePlan}
              onChange={handleChange}
            >
              <option value="">Select a session</option>
              {PLANS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label} · {formatRupee(item.price)}
                </option>
              ))}
            </select>
            {errors.carePlan ? <small>{errors.carePlan}</small> : null}
          </div>

          <div className="field">
            <label htmlFor="psy-date">
              Session date <span>*</span>
            </label>
            <input
              id="psy-date"
              name="date"
              type="date"
              min={today}
              value={form.date}
              onChange={handleChange}
            />
            {errors.date && <small>{errors.date}</small>}
          </div>

          <div className="field">
            <label htmlFor="psy-slot">
              Time slot <span>*</span>
            </label>
            <select
              id="psy-slot"
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
            {errors.timeSlot && <small>{errors.timeSlot}</small>}
          </div>

          <div className="field full">
            <label htmlFor="psy-concern">What would you like help with?</label>
            <textarea
              id="psy-concern"
              name="concern"
              rows="2"
              value={form.concern}
              onChange={handleChange}
              placeholder="Optional. Kept private with your psychologist."
            />
          </div>

          <div className="field full">
            <PaymentBlock
              kind="psychologist"
              amount={plan.price}
              pin={form.pinCode}
              method={payMethod}
              onMethodChange={setPayMethod}
              onQuoteChange={setPayQuote}
              guestDetails={form}
            />
          </div>

          <button type="submit" className="service-submit" disabled={submitting}>
            {submitting
              ? "Holding your place…"
              : `Confirm session · ${formatRupee(plan.price)}`}
          </button>
          </BookingFlow>
        </form>
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
.service-form{max-width:760px;margin:0 auto;padding:14px;background:#fff;border:1px solid #e4ecef;border-radius:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px 12px}
.service-form .field{display:flex;flex-direction:column;min-width:0}
.service-form .field.full{grid-column:1/-1}
.service-form label{margin-bottom:5px;font-size:12px;font-weight:700;color:#34546b}
.service-form label span{color:#d84b4b}
.service-form input:not([type="radio"]):not([type="checkbox"]),.service-form select,.service-form textarea{width:100%;box-sizing:border-box;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;font:inherit;font-size:14px;color:#143246;outline:none;height:38px;min-height:38px;background:#fff}
.service-form textarea{height:auto;min-height:56px;resize:vertical}
.service-form input:focus,.service-form select:focus,.service-form textarea:focus{border-color:#1a6b7a}
.service-form small{margin-top:4px;color:#d84b4b;font-size:12px}
.service-form small.pin-gps-hint{color:#5d7180}
.service-submit{grid-column:1/-1;border:none;border-radius:8px;background:#1a6b7a;color:#fff;font-size:14px;font-weight:700;min-height:40px;cursor:pointer;font-family:inherit}
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
@media (max-width:800px){.service-page{padding:14px}.service-form{grid-template-columns:1fr}}
`;

export default Psychologist;
