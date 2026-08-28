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
import { HOME_VISIT_FEE } from "./vaccinationSchedule";
import {
  BOOKING_EVENT,
  isVaccinationPlan,
  loadVaccinationBooking,
  selectedBookingVaccines,
  setBookingGroup,
  toggleBookingVaccine,
  vaccinationOrderItems,
  vaccinationVisitTotal,
} from "./vaccinationBooking";
import SelectedVaccinesFields from "./SelectedVaccinesFields";
import DateMonthYearFields from "./DateMonthYearFields";
import { isoDateToday } from "./personFields";

const LEGACY_STORAGE_KEY = "mediHomeHomeCareBookings";
const SERVICE_TYPES = [
  { value: "nurse", label: "Nurse Visit" },
  { value: "caregiver", label: "Caregiver" },
  { value: "physiotherapy", label: "Physiotherapy" },
];
const LONG_DUTY_PLANS = ["fullday", "weekly", "15days", "month"];
const CAREGIVER_PLANS = [
  { value: "visit", label: "Short visit", price: 299 },
  { value: "fullday", label: "Full day", price: 1499 },
  { value: "weekly", label: "Weekly", price: 7499 },
  { value: "15days", label: "15 days", price: 12499 },
  { value: "month", label: "Full month", price: 24999 },
];
const NURSING_PLANS = [
  { value: "im-inj", label: "IM injection", price: 249 },
  { value: "iv-inj", label: "IV injection", price: 349 },
  { value: "vaccination", label: "Adult Vaccination", price: HOME_VISIT_FEE },
  { value: "vaccination-child", label: "Children Vaccination", price: HOME_VISIT_FEE },
  { value: "cannula", label: "Cannula", price: 499 },
  { value: "dress-small", label: "Dressing small", price: 299 },
  { value: "dress-medium", label: "Dressing medium", price: 499 },
  { value: "dress-large", label: "Dressing large", price: 799 },
  { value: "nurse-other", label: "Others", price: 999 },
];
const PHYSIO_PLANS = [
  { value: "physio-1hr", label: "1 hour", price: 799 },
  { value: "physio-2hr", label: "2 hours", price: 1599 },
];
const formatRupee = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

function plansFor(serviceType) {
  if (serviceType === "caregiver") return CAREGIVER_PLANS;
  if (serviceType === "physiotherapy") return PHYSIO_PLANS;
  if (serviceType === "nurse") return NURSING_PLANS;
  return [];
}
function isLongDuty(carePlan) {
  return LONG_DUTY_PLANS.includes(carePlan);
}
function usesVisitDate(serviceType, carePlan) {
  return serviceType === "nurse" || !isLongDuty(carePlan);
}
const TIME_SLOTS = [
  "08:00 AM – 10:00 AM",
  "10:00 AM – 12:00 PM",
  "12:00 PM – 02:00 PM",
  "02:00 PM – 04:00 PM",
  "04:00 PM – 06:00 PM",
  "06:00 PM – 08:00 PM",
];

function readProfile() {
  return readUserProfile();
}

function homeCareFromHash(profile) {
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
  let service = "";
  let plan = "";
  try {
    const params = new URLSearchParams(query);
    service = (params.get("service") || "").trim();
    plan = (params.get("plan") || "").trim();
  } catch {
    service = "";
    plan = "";
  }
  const fromLink = Boolean(service || plan);
  const serviceType =
    service === "nurse" || service === "caregiver" || service === "physiotherapy"
      ? service
      : isVaccinationPlan(plan)
        ? "nurse"
        : fromLink
          ? "caregiver"
          : "";
  const plans = plansFor(serviceType);
  const carePlan = plans.some((row) => row.value === plan)
    ? plan
    : plans[0]?.value || "";
  return {
    patientName: profile.name,
    mobile: profile.mobile,
    ...pickAddress(profile),
    ...initialBookingFor(profile),
    serviceType,
    carePlan,
    date: "",
    timeSlot: "",
    otherNote: "",
    otherRate: "999",
  };
}

function HomeCare() {
  const profile = useMemo(() => readProfile(), []);
  const today = isoDateToday();
  const maxVisit = isoDateToday(
    new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate())
  );
  const [form, setForm] = useState(() => homeCareFromHash(profile));
  const [vaxBooking, setVaxBooking] = useState(() => loadVaccinationBooking());
  const [errors, setErrors] = useState({});
  const [booking, setBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [payMethod, setPayMethod] = useState("cod");
  const [payQuote, setPayQuote] = useState(null);
  const busyWait = useBusyOverlay(submitting, "homecare");

  useEffect(() => {
    const applyHash = () => {
      setForm((prev) => {
        const next = homeCareFromHash(profile);
        if (next.serviceType === prev.serviceType && next.carePlan === prev.carePlan) {
          return prev;
        }
        return {
          ...prev,
          serviceType: next.serviceType,
          carePlan: next.carePlan,
        };
      });
    };
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [profile]);

  useEffect(() => {
    const refresh = () => setVaxBooking(loadVaccinationBooking());
    window.addEventListener(BOOKING_EVENT, refresh);
    return () => window.removeEventListener(BOOKING_EVENT, refresh);
  }, []);

  const activePlans = plansFor(form.serviceType);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const next =
      name === "mobile" || name === "pinCode" || name === "otherRate"
        ? value.replace(/\D/g, "")
        : value;
    if (name === "serviceType") {
      setForm((prev) => ({
        ...prev,
        serviceType: next,
        carePlan: "",
        otherNote: "",
        otherRate: "999",
      }));
      setErrors((prev) => ({ ...prev, serviceType: "", carePlan: "" }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: next }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    if (name === "carePlan" && isVaccinationPlan(next)) {
      setVaxBooking(setBookingGroup(next === "vaccination-child" ? "child" : "adult"));
    }
  };

  const validate = () => {
    const next = validateBookingDetails(form, profile);
    if (!form.serviceType) next.serviceType = "Select a service type.";
    if (!form.carePlan) next.carePlan = "Select a care plan.";
    if (form.carePlan === "nurse-other") {
      if (!form.otherNote.trim()) next.otherNote = "Please mention the job.";
      if (!form.otherRate || Number(form.otherRate) < 1) {
        next.otherRate = "Please mention the rate.";
      }
    }
    if (!form.date) {
      next.date = usesVisitDate(form.serviceType, form.carePlan)
        ? "Please select a visit date."
        : "Please select a start date.";
    }
    if (!isLongDuty(form.carePlan) && !form.timeSlot) {
      next.timeSlot = "Please select a time slot.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const serviceLabel =
      SERVICE_TYPES.find((item) => item.value === form.serviceType)?.label ||
      form.serviceType;
    const plan =
      plansFor(form.serviceType).find((item) => item.value === form.carePlan) ||
      plansFor(form.serviceType)[0];

    setSubmitting(true);
    try {
      const booked = withBookingIdentity(form, profile);
      const queue = await holdForPartnerQueue("homecare");
      const gps = await resolvePinLocation(booked.pinCode);
      const addr = applyResolvedPin(booked, gps);
      const vaccines = selectedBookingVaccines(vaxBooking);
      const total =
        plan.value === "nurse-other"
          ? Number(form.otherRate) || plan.price
          : isVaccinationPlan(plan.value)
            ? vaccinationVisitTotal(vaxBooking)
            : plan.price;
      const pay = paymentFromQuote(payQuote, total);
      const payment = await settleCheckoutPayment({
        method: payMethod,
        ...pay,
        kind: "homecare",
        pin: gps.pinCode,
        name: booked.patientName,
        mobile: booked.mobile,
        reference: `hc-${Date.now()}`,
        description: "MediHome Home Care",
      });

      const bookingDetails = {
        bookingId: "MH-HC-" + Math.floor(100000 + Math.random() * 900000),
        ...form,
        ...booked,
        ...addr,
        patientName: booked.patientName,
        pin: gps.pin,
        lat: gps.lat,
        lng: gps.lng,
        locality: gps.locality,
        mapsUrl: gps.mapsUrl,
        serviceLabel,
        carePlan: plan.value,
        carePlanLabel: plan.label,
        otherNote: form.otherNote.trim(),
        otherRate:
          plan.value === "nurse-other" ? String(Number(form.otherRate) || plan.price) : "",
        total: pay.amountRupees,
        saleRupees: pay.saleRupees,
        couponCode: pay.couponCode,
        discountRupees: pay.discountRupees,
        highTrafficWait: queue.busy || queue.waited,
        bookedAt: new Date().toLocaleString(),
        bookedAtMs: Date.now(),
        vaccineNames: vaccines.map((row) => row.name),
        ...payment,
      };

      const trackedBooking = persistOrder(
        withTracking(
          {
            ...bookingDetails,
            items: isVaccinationPlan(plan.value)
              ? vaccinationOrderItems(vaxBooking, plan.label, bookingDetails.total)
              : [
                  {
                    name: `${serviceLabel} · ${plan.label}`,
                    price: bookingDetails.total,
                  },
                ],
          },
          "homecare"
        )
      );
      try {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {
        /* ignore */
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
    setForm({
      patientName: profile.name,
      mobile: profile.mobile,
      ...pickAddress(profile),
      ...initialBookingFor(profile),
      serviceType: "",
      carePlan: "",
      date: "",
      timeSlot: "",
      otherNote: "",
      otherRate: "999",
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
            <h1>Home Care Booked</h1>
            <PatienceNote kind="homecare" shown={booking.highTrafficWait} />
            <p>
              Your {booking.serviceLabel || "Home Care"} request has been saved
              locally.
            </p>
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
                <span>Plan</span>
                <strong>{booking.carePlanLabel}</strong>
              </div>
              {booking.vaccineNames?.length ? (
                <div className="confirm-row">
                  <span>Vaccines</span>
                  <strong>{booking.vaccineNames.join(", ")}</strong>
                </div>
              ) : null}
              {booking.carePlan === "nurse-other" && booking.otherNote ? (
                <div className="confirm-row">
                  <span>Job</span>
                  <strong>{booking.otherNote}</strong>
                </div>
              ) : null}
              <div className="confirm-row">
                <span>Charges</span>
                <strong>{formatRupee(booking.total)}</strong>
              </div>
              <div className="confirm-row">
                <span>Payment</span>
                <strong>
                  {booking.paymentMethod === "online"
                    ? "Paid online"
                    : "Cash on visit"}
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
                <span>
                  {usesVisitDate(booking.serviceType, booking.carePlan)
                    ? "Visit date"
                    : "Start date"}
                </span>
                <strong>{booking.date}</strong>
              </div>
              <div className="confirm-row">
                <span>Time slot</span>
                <strong>{booking.timeSlot || "Not required"}</strong>
              </div>
            </div>
            <AssignedAgent record={booking} />
            <div className="confirm-actions">
              {isVaccinationPlan(booking.carePlan) ? (
                <a className="service-submit" href="#vaccination">
                  Save Vaccination Record
                </a>
              ) : null}
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
                Book another visit
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
      {busyWait ? <BusyWait kind="homecare" traffic={busyWait} /> : null}
      <div className="service-page">
        <section className="service-hero">
          <div>
            <span className="service-kicker">MediHome Home Care</span>
            <h1>Nurse, Caregiver Or Physiotherapy At Home</h1>
          </div>
        </section>

        <form className="service-form" onSubmit={handleSubmit}>
          <BookingFlow
            idPrefix="hc"
            profile={profile}
            values={form}
            errors={errors}
            onSelect={(option) => {
              setForm((prev) => ({ ...prev, ...bookingForPatch(option, profile) }));
              setErrors((prev) => ({ ...prev, bookedFor: "" }));
            }}
            onChange={handleChange}
            pinHint="Select the Village / Sector / Mohalla attached to this PIN."
          >
          <div className="field">
            <label htmlFor="hc-service">
              Service type <span>*</span>
            </label>
            <select
              id="hc-service"
              name="serviceType"
              value={form.serviceType}
              onChange={handleChange}
            >
              <option value="">Select a service</option>
              {SERVICE_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            {errors.serviceType && <small>{errors.serviceType}</small>}
          </div>

          {form.serviceType ? (
          <div className="field">
            <label htmlFor="hc-plan">
              Rate <span>*</span>
            </label>
            <select
              id="hc-plan"
              name="carePlan"
              value={form.carePlan}
              onChange={handleChange}
            >
              <option value="">Select a rate</option>
              {activePlans.map((plan) => (
                <option key={plan.value} value={plan.value}>
                  {plan.label} · {formatRupee(plan.price)}
                </option>
              ))}
            </select>
            {errors.carePlan ? <small>{errors.carePlan}</small> : null}
          </div>
          ) : null}

          {form.carePlan ? (
          <>
          {isVaccinationPlan(form.carePlan) ? (
            <div className="field full">
              <SelectedVaccinesFields
                booking={vaxBooking}
                onToggle={(id) => setVaxBooking(toggleBookingVaccine(id))}
                idPrefix="hc-vac"
              />
              <a className="vac-copy" href="#vaccination">
                Vaccination Record
              </a>
            </div>
          ) : null}

          {form.carePlan === "nurse-other" ? (
            <>
              <div className="field full">
                <label htmlFor="hc-other-job">
                  Job <span>*</span>
                </label>
                <textarea
                  id="hc-other-job"
                  name="otherNote"
                  rows={3}
                  placeholder="Mention the nursing job, e.g. catheter care, Ryle’s tube"
                  value={form.otherNote}
                  onChange={handleChange}
                />
                {errors.otherNote ? <small>{errors.otherNote}</small> : null}
              </div>
              <div className="field">
                <label htmlFor="hc-other-rate">
                  Rate <span>*</span>
                </label>
                <input
                  id="hc-other-rate"
                  name="otherRate"
                  inputMode="numeric"
                  value={form.otherRate}
                  onChange={handleChange}
                  placeholder="999"
                />
                {errors.otherRate ? <small>{errors.otherRate}</small> : null}
              </div>
            </>
          ) : null}

          <div className="field full">
            <DateMonthYearFields
              idPrefix="hc-date"
              name="date"
              value={form.date}
              min={today}
              max={maxVisit}
              required
              error={errors.date || ""}
              label={
                usesVisitDate(form.serviceType, form.carePlan)
                  ? "Visit Date"
                  : "Start Date"
              }
              onChange={handleChange}
            />
          </div>

          {!isLongDuty(form.carePlan) ? (
            <div className="field">
              <label htmlFor="hc-slot">
                Time slot <span>*</span>
              </label>
              <select
                id="hc-slot"
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
          ) : null}

          <div className="field full">
            <PaymentBlock
              kind="homecare"
              amount={
                form.carePlan === "nurse-other"
                  ? Number(form.otherRate) || 999
                  : isVaccinationPlan(form.carePlan)
                    ? vaccinationVisitTotal(vaxBooking)
                    : activePlans.find((item) => item.value === form.carePlan)?.price || 0
              }
              pin={form.pinCode}
              method={payMethod}
              onMethodChange={setPayMethod}
              onQuoteChange={setPayQuote}
              guestDetails={form}
            />
          </div>

          <button type="submit" className="service-submit" disabled={submitting}>
            {submitting
              ? "Connecting PIN to map…"
              : `Confirm booking · ${formatRupee(
                  form.carePlan === "nurse-other"
                    ? Number(form.otherRate) || 999
                    : isVaccinationPlan(form.carePlan)
                      ? vaccinationVisitTotal(vaxBooking)
                      : activePlans.find((item) => item.value === form.carePlan)
                          ?.price || 0
                )}`}
          </button>
          </>
          ) : null}
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
.vac-copy{margin:0;color:#5d7180;font-size:13px;line-height:1.45}
.vac-copy a,.field.full > a.vac-copy{color:#1a6b7a;font-weight:700}
.vac-picked{margin:0 0 8px;padding:0;list-style:none;display:grid;gap:6px}
.vac-picked li{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 10px;border:1px solid #e4ecef;border-radius:8px;background:#fff;font-size:13px}
.vac-picked button{border:0;background:none;color:#b64b4b;font:inherit;font-size:12px;font-weight:700;cursor:pointer}
.service-submit{grid-column:1/-1;border:none;border-radius:8px;background:#1a6b7a;color:#fff;font-size:14px;font-weight:700;min-height:40px;cursor:pointer;font-family:inherit}
.confirm-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
.confirm-actions .service-submit{grid-column:auto;min-width:180px;display:inline-flex;align-items:center;justify-content:center;text-decoration:none}
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

export default HomeCare;
