import { useEffect, useMemo, useState } from "react";
import PinGpsBlock from "./PinGpsBlock";
import AssignedAgent from "./AssignedAgent";
import { resolvePinLocation } from "./pinLocation";
import { persistOrder, refreshOrderFromServer, trackHref, withTracking } from "./orderTracking";
import {
  appointmentSlotLabel,
  diagnosticRequestFields,
  isAwaitingCustomerSlotConfirm,
} from "./orderConfirm";
import SlotOfferCard from "./SlotOfferCard";
import PaymentBlock from "./PaymentBlock";
import { paymentFromQuote, settleCheckoutPayment } from "./paymentApi";
import BusyWait, { useBusyOverlay } from "./BusyWait";
import { holdForPartnerQueue } from "./partnerQueue";
import { BillButton } from "./OrderBill.jsx";
import BookingFlow from "./BookingFlow";
import { paymentMethodSummary } from "./paymentMethods";
import { maskMobile } from "./personFields";
import { applyResolvedPin, pickAddress, readUserProfile } from "./addressFields";
import {
  bookingForPatch,
  initialBookingFor,
  validateBookingDetails,
  withBookingIdentity,
} from "./bookingFor";
import DateMonthYearFields from "./DateMonthYearFields";
import { isoDateToday } from "./personFields";
import {
  PSY_TIME_SLOTS,
  appointmentDateError,
  appointmentSlotError,
  bookingMaxDate,
  isOpenAppointmentSlot,
  openAppointmentSlots,
} from "./appointmentSlot";
import { parseAppHash } from "./hashRoute";

const FEATURED_SPECIALTIES = [
  { value: "gp", label: "General Physician", price: 499 },
  { value: "pediatrician", label: "Pediatrician", price: 699 },
  { value: "gynecologist", label: "Gynecologist", price: 799 },
  { value: "cardiologist", label: "Cardiologist", price: 999 },
  { value: "orthopedic", label: "Orthopedic", price: 899 },
  { value: "dermatologist", label: "Dermatologist", price: 799 },
  { value: "ent", label: "ENT", price: 799 },
  { value: "nephrologist", label: "Nephrologist", price: 899 },
];

const OTHER_SPECIALTIES = [
  { value: "neurologist", label: "Neurologist", price: 999 },
  { value: "neurosurgeon", label: "Neurosurgeon", price: 1299 },
  { value: "gastroenterologist", label: "Gastroenterologist", price: 899 },
  { value: "pulmonologist", label: "Pulmonologist", price: 899 },
  { value: "endocrinologist", label: "Endocrinologist", price: 899 },
  { value: "diabetologist", label: "Diabetologist", price: 799 },
  { value: "urologist", label: "Urologist", price: 899 },
  { value: "andrologist", label: "Andrologist", price: 899 },
  { value: "oncologist", label: "Oncologist", price: 1199 },
  { value: "hematologist", label: "Hematologist", price: 999 },
  { value: "rheumatologist", label: "Rheumatologist", price: 899 },
  { value: "ophthalmologist", label: "Ophthalmologist", price: 799 },
  { value: "dentist", label: "Dentist", price: 599 },
  { value: "psychiatrist", label: "Psychiatrist", price: 999 },
  { value: "general-surgeon", label: "General Surgeon", price: 999 },
  { value: "plastic-surgeon", label: "Plastic Surgeon", price: 1299 },
  { value: "vascular-surgeon", label: "Vascular Surgeon", price: 1199 },
  { value: "hepatologist", label: "Hepatologist", price: 999 },
  { value: "allergist", label: "Allergist / Immunologist", price: 799 },
  { value: "infectious-disease", label: "Infectious Disease", price: 899 },
  { value: "geriatrician", label: "Geriatrician", price: 799 },
  { value: "pain-specialist", label: "Pain Specialist", price: 899 },
  { value: "dietitian", label: "Dietitian", price: 599 },
  { value: "sexologist", label: "Sexologist", price: 899 },
  { value: "chest-physician", label: "Chest Physician", price: 899 },
  { value: "internal-medicine", label: "Internal Medicine", price: 799 },
];

const ALL_SPECIALTIES = [...FEATURED_SPECIALTIES, ...OTHER_SPECIALTIES];

const VISIT_MODES = [
  { value: "video", label: "Video consultation" },
  { value: "home", label: "Home visit" },
  { value: "clinic", label: "Clinic" },
];

const formatRupee = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

function specialtyFromHash() {
  const service = parseAppHash(window.location.hash).service;
  if (service === "gp-video" || service === "gp-home") return "gp";
  if (!service || service === "other") return "";
  return ALL_SPECIALTIES.some((item) => item.value === service) ? service : "";
}

function isFeaturedSpecialty(value) {
  return FEATURED_SPECIALTIES.some((item) => item.value === value);
}

function modeFromHash() {
  const service = parseAppHash(window.location.hash).service;
  if (service === "gp-video") return "video";
  if (service === "gp-home") return "home";
  return "clinic";
}

function modeLabel(mode) {
  if (mode === "home") return "Home visit";
  if (mode === "video") return "Video consultation";
  return "Clinic";
}

function visitPrice(base, mode) {
  const amount = Number(base || 0);
  if (mode === "video") return Math.max(299, amount - 100);
  if (mode === "home") return amount + 300;
  return amount;
}

export default function DoctorAppointment() {
  const profile = useMemo(() => readUserProfile(), []);
  const today = isoDateToday();
  const maxVisit = bookingMaxDate();
  const [form, setForm] = useState({
    patientName: profile.name,
    mobile: profile.mobile,
    ...pickAddress(profile),
    ...initialBookingFor(profile),
    carePlan: specialtyFromHash(),
    sessionMode: modeFromHash(),
    date: "",
    timeSlot: "",
    concern: "",
  });
  const [errors, setErrors] = useState({});
  const [booking, setBooking] = useState(null);
  const [flowStep, setFlowStep] = useState("placed");
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payMethod, setPayMethod] = useState("cod");
  const [payQuote, setPayQuote] = useState(null);
  const busyWait = useBusyOverlay(submitting || paying, "doctor");
  const plan =
    ALL_SPECIALTIES.find((item) => item.value === form.carePlan) || {
      value: "",
      label: "",
      price: 799,
    };
  const showOtherSpecialty = !isFeaturedSpecialty(form.carePlan);
  const consultPrice = visitPrice(plan.price, form.sessionMode);
  const openSlots = useMemo(
    () => openAppointmentSlots(PSY_TIME_SLOTS, form.date),
    [form.date]
  );

  useEffect(() => {
    const nextPlan = specialtyFromHash();
    const nextMode = modeFromHash();
    setForm((prev) =>
      prev.carePlan === nextPlan && prev.sessionMode === nextMode
        ? prev
        : { ...prev, carePlan: nextPlan, sessionMode: nextMode }
    );
  }, []);

  useEffect(() => {
    const id = booking?.bookingId;
    if (!id) return undefined;
    if (booking.partnerConfirmed && booking.slotConfirmed) return undefined;
    let cancelled = false;
    const timer = setInterval(async () => {
      const latest = await refreshOrderFromServer(id);
      if (!cancelled && latest) setBooking(latest);
    }, 6000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [booking?.bookingId, booking?.partnerConfirmed, booking?.slotConfirmed]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const next =
      name === "mobile" || name === "pinCode" ? value.replace(/\D/g, "") : value;
    setForm((prev) => {
      const patched = { ...prev, [name]: next };
      if (
        (name === "date" || name === "timeSlot") &&
        patched.date &&
        patched.timeSlot &&
        !isOpenAppointmentSlot(patched.timeSlot, patched.date)
      ) {
        patched.timeSlot = "";
      }
      return patched;
    });
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const next = validateBookingDetails(form, profile);
    if (!form.carePlan) next.carePlan = "Select a specialty.";
    if (!form.sessionMode) next.sessionMode = "Choose video consultation, home visit, or clinic.";
    if (!form.date) next.date = "Please select an appointment date.";
    else {
      const dateError = appointmentDateError(form.date);
      if (dateError) next.date = dateError;
    }
    const slotError = appointmentSlotError(form.timeSlot, form.date, PSY_TIME_SLOTS);
    if (slotError) next.timeSlot = slotError;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const booked = withBookingIdentity(form, profile);
      const queue = await holdForPartnerQueue("doctor");
      const gps = await resolvePinLocation(booked.pinCode);
      const addr = applyResolvedPin(booked, gps);
      const pay = paymentFromQuote(payQuote, consultPrice);
      const bookingDetails = {
        bookingId: "MH-DOC-" + Math.floor(100000 + Math.random() * 900000),
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
        sessionMode: form.sessionMode,
        serviceLabel: "Doctor Appointment",
        partner: "",
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
        ...diagnosticRequestFields("doctor", {
          date: form.date,
          timeSlot: form.timeSlot,
        }),
        paymentMethod: "pending",
        paymentStatus: "awaiting_payment",
        paid: false,
      };
      const trackedBooking = persistOrder(
        withTracking(
          {
            ...bookingDetails,
            items: [
              {
                name: `${bookingDetails.serviceLabel} · ${plan.label} · ${modeLabel(form.sessionMode)}`,
                price: bookingDetails.total,
              },
            ],
          },
          "doctor"
        )
      );
      setBooking(trackedBooking);
      setFlowStep("placed");
    } catch (error) {
      alert(error.message || "Booking could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayment = async (event) => {
    event.preventDefault();
    if (!booking) return;
    setPaying(true);
    try {
      const amount = Number(booking.total) || 0;
      const pay = paymentFromQuote(payQuote, amount);
      const payment = await settleCheckoutPayment({
        method: payMethod,
        ...pay,
        kind: "doctor",
        pin: booking.pinCode || booking.pin,
        name: booking.patientName,
        mobile: booking.mobile,
        reference: booking.bookingId,
        description: "MediHome Doctor Appointment",
      });
      const next = persistOrder(booking, {
        ...payment,
        paymentStatus: "paid",
        paid: true,
        status: booking.partnerConfirmed ? "Confirmed" : booking.status,
      });
      setBooking(next);
      setFlowStep("paid");
    } catch (error) {
      alert(error.message || "Payment could not be completed.");
    } finally {
      setPaying(false);
    }
  };

  const startNew = () => {
    setBooking(null);
    setFlowStep("placed");
    setForm({
      patientName: profile.name,
      mobile: profile.mobile,
      ...pickAddress(profile),
      ...initialBookingFor(profile),
      carePlan: specialtyFromHash(),
      sessionMode: modeFromHash(),
      date: "",
      timeSlot: "",
      concern: "",
    });
    setPayMethod("cod");
    setPayQuote(null);
    setErrors({});
  };

  if (booking && (flowStep === "placed" || flowStep === "pay" || flowStep === "paid")) {
    return (
      <>
        <style>{styles}</style>
        {busyWait ? <BusyWait kind="doctor" traffic={busyWait} /> : null}
        <div className="service-page">
          <section className="service-confirm">
            <div className="success-icon">✓</div>
            <h1>
              {flowStep === "paid"
                ? "Payment received"
                : booking.partnerConfirmed
                  ? "Appointment confirmed"
                  : isAwaitingCustomerSlotConfirm(booking)
                    ? "New time slot offered"
                    : "Request sent"}
            </h1>
            <p>
              {flowStep === "paid"
                ? "Thank you. Track the appointment from My Orders anytime."
                : booking.partnerConfirmed
                  ? "The doctor confirmed your slot. Track the appointment below."
                  : "Your request was sent to the doctor. The appointment is confirmed after they accept your slot."}
            </p>
            <div className="confirm-card">
              <div className="confirm-head">
                <h2>Booking Details</h2>
                <span>{booking.bookingId}</span>
              </div>
              <div className="confirm-row">
                <span>Doctor</span>
                <strong>{booking.carePlanLabel}</strong>
              </div>
              <div className="confirm-row">
                <span>Mode</span>
                <strong>{modeLabel(booking.sessionMode)}</strong>
              </div>
              <div className="confirm-row">
                <span>Charges</span>
                <strong>{formatRupee(booking.total)}</strong>
              </div>
              <div className="confirm-row">
                <span>Payment</span>
                <strong>
                  {flowStep === "paid" || booking.paid
                    ? paymentMethodSummary(booking.paymentMethod, "Pay at visit")
                    : "Pending — pay anytime from My Orders"}
                </strong>
              </div>
              <div className="confirm-row">
                <span>Patient</span>
                <strong>{booking.patientName}</strong>
              </div>
              <div className="confirm-row">
                <span>Mobile</span>
                <strong>{maskMobile(booking.mobile)}</strong>
              </div>
              <div className="confirm-row">
                <span>PIN</span>
                <strong>{booking.pinCode}</strong>
              </div>
              <PinGpsBlock record={booking} />
              <div className="confirm-row">
                <span>Date</span>
                <strong>{booking.date}</strong>
              </div>
              <div className="confirm-row">
                <span>Time slot</span>
                <strong>{appointmentSlotLabel(booking)}</strong>
              </div>
              <SlotOfferCard order={booking} onResolved={setBooking} />
            </div>
            {booking.partnerConfirmed ? (
              <AssignedAgent
                record={{
                  ...booking,
                  agentName: booking.agentName || booking.partnerName,
                  agentMobile: booking.agentMobile || booking.partnerMobile,
                  agentRole: "Doctor",
                }}
              />
            ) : null}
            {flowStep === "pay" ? (
              <form className="service-pay-form" onSubmit={handlePayment}>
                <PaymentBlock
                  kind="doctor"
                  amount={Number(booking.total) || 0}
                  pin={booking.pinCode}
                  method={payMethod}
                  onMethodChange={setPayMethod}
                  onQuoteChange={setPayQuote}
                  guestDetails={booking}
                  cashLabel={booking.sessionMode === "video" ? "Pay after consult" : "Pay at visit"}
                />
                <div className="confirm-actions">
                  <button type="submit" className="service-submit" disabled={paying}>
                    {paying ? "Processing…" : "Pay now"}
                  </button>
                  <button type="button" className="ghost-button" onClick={() => setFlowStep("placed")}>
                    Back
                  </button>
                </div>
              </form>
            ) : (
              <div className="confirm-actions">
                <button
                  type="button"
                  className="service-submit"
                  onClick={() => {
                    window.location.hash = trackHref(booking.bookingId);
                  }}
                >
                  Track live
                </button>
                {flowStep === "placed" ? (
                  <button type="button" className="ghost-button" onClick={() => setFlowStep("pay")}>
                    Pay now
                  </button>
                ) : null}
                <BillButton order={booking} />
                <button type="button" className="ghost-button" onClick={startNew}>
                  Book another appointment
                </button>
              </div>
            )}
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      {busyWait ? <BusyWait kind="doctor" traffic={busyWait} /> : null}
      <div className="service-page">
        <section className="service-hero">
          <div>
            <span className="service-kicker">MediHome Doctors</span>
            <h1>Doctor Appointment</h1>
            <p>
              {showOtherSpecialty
                ? "Choose a specialty from the list, then pick video consultation, home visit, or clinic."
                : "Pick video consultation, home visit, or clinic for this doctor."}
            </p>
          </div>
        </section>
        <form className="service-form" onSubmit={handleSubmit}>
          <BookingFlow
            idPrefix="doc"
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
              {showOtherSpecialty ? (
                <>
                  <label htmlFor="doc-plan">
                    Specialty <span>*</span>
                  </label>
                  <select
                    id="doc-plan"
                    name="carePlan"
                    value={form.carePlan}
                    onChange={handleChange}
                  >
                    <option value="">Select a specialty</option>
                    {OTHER_SPECIALTIES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  {errors.carePlan ? <small>{errors.carePlan}</small> : null}
                </>
              ) : (
                <>
                  <span className="doc-mode-label">Specialty</span>
                  <p className="doc-specialty-lock">{plan.label}</p>
                </>
              )}
            </div>
            <div className="field full">
              <span className="doc-mode-label">
                Appointment type <span>*</span>
              </span>
              <div className="doc-mode-row" role="radiogroup" aria-label="Appointment type">
                {VISIT_MODES.map((item) => (
                  <label
                    key={item.value}
                    className={form.sessionMode === item.value ? "is-on" : ""}
                  >
                    <input
                      type="radio"
                      name="sessionMode"
                      value={item.value}
                      checked={form.sessionMode === item.value}
                      onChange={handleChange}
                    />
                    {item.label}
                    <em>{formatRupee(visitPrice(plan.price, item.value))}</em>
                  </label>
                ))}
              </div>
              {errors.sessionMode ? <small>{errors.sessionMode}</small> : null}
            </div>
            <div className="field full">
              <DateMonthYearFields
                idPrefix="doc-date"
                name="date"
                value={form.date}
                min={today}
                max={maxVisit}
                required
                error={errors.date || ""}
                label="Appointment date"
                order="ymd"
                onChange={handleChange}
              />
            </div>
            <div className="field">
              <label htmlFor="doc-slot">
                Preferred time slot <span>*</span>
              </label>
              <select id="doc-slot" name="timeSlot" value={form.timeSlot} onChange={handleChange}>
                <option value="">Select a slot</option>
                {openSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
              {errors.timeSlot ? <small>{errors.timeSlot}</small> : null}
            </div>
            <div className="field full">
              <label htmlFor="doc-concern">Reason for visit</label>
              <textarea
                id="doc-concern"
                name="concern"
                rows="2"
                value={form.concern}
                onChange={handleChange}
                placeholder="Optional. Shared with the doctor."
              />
            </div>
            <div className="field full">
              <PaymentBlock
                kind="doctor"
                amount={consultPrice}
                pin={form.pinCode}
                method={payMethod}
                onMethodChange={setPayMethod}
                onQuoteChange={setPayQuote}
                guestDetails={form}
                cashLabel={form.sessionMode === "video" ? "Pay after consult" : "Pay at visit"}
              />
            </div>
            <button type="submit" className="service-submit" disabled={submitting || !form.carePlan}>
              {submitting ? "Holding your place…" : `Send request · ${formatRupee(consultPrice)}`}
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
.service-form .field.full,.service-form .field:has(.dmy-fields){grid-column:1/-1}
.service-form label{margin-bottom:5px;font-size:12px;font-weight:700;color:#34546b}
.service-form label span,.doc-mode-label span{color:#d84b4b}
.doc-mode-label{display:block;margin-bottom:5px;font-size:12px;font-weight:700;color:#34546b}
.doc-specialty-lock{margin:0;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;background:#f7fbfd;font-size:14px;font-weight:700;color:#143246;min-height:38px;box-sizing:border-box;display:flex;align-items:center}
.doc-mode-row{display:flex;flex-wrap:wrap;gap:8px}
.doc-mode-row label{display:inline-flex;align-items:center;gap:6px;margin:0;min-height:40px;padding:0 12px;border:1px solid #d7e2e9;border-radius:8px;background:#fff;font-size:13px;font-weight:700;color:#143246;cursor:pointer}
.doc-mode-row label.is-on{border-color:#1a6b7a;background:#e8f4f6;color:#1a6b7a}
.doc-mode-row label em{font-style:normal;font-weight:600;color:#5d7180}
.doc-mode-row label.is-on em{color:#1a6b7a}
.doc-mode-row input{width:14px;min-width:14px;height:14px;margin:0;accent-color:#1a6b7a}
.service-form input:not([type="radio"]):not([type="checkbox"]),.service-form select,.service-form textarea{width:100%;box-sizing:border-box;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;font:inherit;font-size:14px;color:#143246;outline:none;height:38px;min-height:38px;background:#fff}
.service-form textarea{height:auto;min-height:56px;resize:vertical}
.service-submit{grid-column:1/-1;border:none;border-radius:8px;background:#1a6b7a;color:#fff;font-size:14px;font-weight:700;min-height:40px;cursor:pointer;font-family:inherit}
.confirm-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
.confirm-actions .service-submit,.confirm-actions .ghost-button{grid-column:auto;min-width:180px;display:inline-flex;align-items:center;justify-content:center;text-decoration:none}
.ghost-button{border:1px solid #d8e3e9;border-radius:8px;background:#fff;color:#34546b;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;min-height:40px;padding:8px 14px}
.service-pay-form{max-width:640px;margin:0 auto 14px;text-align:left}
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
@media (max-width:800px){.service-page{padding:14px}.service-form{grid-template-columns:1fr}}
`;
