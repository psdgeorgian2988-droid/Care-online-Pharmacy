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
import BookingContactFields from "./BookingContactFields";
import BookingForFields from "./BookingForFields";
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

const STORAGE_KEY = "mediHomeAmbulanceRequests";
const AMBULANCE_FEE = {
  emergency: 3999,
  "non-emergency": 2499,
};

function readProfile() {
  return readUserProfile();
}

function Ambulance() {
  const profile = useMemo(() => readProfile(), []);
  const [form, setForm] = useState({
    patientName: profile.name,
    mobile: profile.mobile,
    ...pickAddress(profile),
    ...initialBookingFor(profile),
    emergencyType: "emergency",
    notes: "",
  });
  const [errors, setErrors] = useState({});
  const [request, setRequest] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [payMethod, setPayMethod] = useState("cod");
  const [payQuote, setPayQuote] = useState(null);
  const urgentRide = form.emergencyType === "emergency";
  const busyWait = useBusyOverlay(submitting, "ambulance", urgentRide);
  const ambFee = AMBULANCE_FEE[form.emergencyType] || AMBULANCE_FEE.emergency;

  const handleChange = (event) => {
    const { name, value } = event.target;
    const next =
      name === "mobile" || name === "pinCode" ? value.replace(/\D/g, "") : value;
    setForm((prev) => ({ ...prev, [name]: next }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const next = validateBookingDetails(form, profile);
    if (!form.emergencyType) next.emergencyType = "Select emergency type.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const booked = withBookingIdentity(form, profile);
      const urgent = form.emergencyType === "emergency";
      const queue = await holdForPartnerQueue("ambulance", { urgent });
      const gps = await resolvePinLocation(booked.pinCode);
      const addr = applyResolvedPin(booked, gps);
      const total = AMBULANCE_FEE[form.emergencyType] || AMBULANCE_FEE.emergency;
      const method =
        form.emergencyType === "emergency" ? "cod" : payMethod;
      const pay = paymentFromQuote(payQuote, total);
      const payment = await settleCheckoutPayment({
        method,
        ...pay,
        kind: "ambulance",
        pin: gps.pinCode,
        name: booked.patientName,
        mobile: booked.mobile,
        reference: `amb-${Date.now()}`,
        description: "MediHome ambulance",
      });

      const requestDetails = {
        requestId: "MH-AMB-" + Math.floor(100000 + Math.random() * 900000),
        patientName: booked.patientName,
        mobile: booked.mobile,
        ...addr,
        emergencyType: form.emergencyType,
        notes: form.notes.trim(),
        total: pay.amountRupees,
        saleRupees: pay.saleRupees,
        couponCode: pay.couponCode,
        discountRupees: pay.discountRupees,
        highTrafficWait: queue.busy || queue.waited,
        requestedAt: new Date().toLocaleString(),
        requestedAtMs: Date.now(),
        ...payment,
      };

      const trackedRequest = persistOrder(withTracking(requestDetails, "ambulance"));
      setRequest(trackedRequest);
    } catch (error) {
      alert(error.message || "Ambulance request could not be completed.");
    } finally {
      setSubmitting(false);
    }
  };

  const startNew = () => {
    setRequest(null);
    setForm({
      patientName: profile.name,
      mobile: profile.mobile,
      ...pickAddress(profile),
      ...initialBookingFor(profile),
      emergencyType: "emergency",
      notes: "",
    });
    setPayMethod("cod");
    setErrors({});
  };

  if (request) {
    return (
      <>
        <style>{styles}</style>
        <div className="service-page">
          <section className="service-confirm">
            <div className="success-icon">✓</div>
            <h1>Ambulance Requested</h1>
            <PatienceNote kind="ambulance" shown={request.highTrafficWait} />
            <p>Share this request ID if our team calls you to confirm pickup.</p>
            <div className="confirm-card">
              <div className="confirm-head">
                <h2>Request Details</h2>
                <span>{request.requestId}</span>
              </div>
              <div className="confirm-row">
                <span>Type</span>
                <strong>
                  {request.emergencyType === "emergency"
                    ? "Emergency"
                    : "Non-emergency"}
                </strong>
              </div>
              <div className="confirm-row">
                <span>Charges</span>
                <strong>
                  ₹{Number(request.total || 0).toLocaleString("en-IN")}
                </strong>
              </div>
              <div className="confirm-row">
                <span>Payment</span>
                <strong>
                  {request.paymentMethod === "online"
                    ? "Paid online"
                    : "Cash on arrival"}
                </strong>
              </div>
              <div className="confirm-row">
                <span>Patient</span>
                <strong>{request.patientName}</strong>
              </div>
              <div className="confirm-row">
                <span>Mobile</span>
                <strong>{request.mobile}</strong>
              </div>
              <div className="confirm-row">
                <span>Pickup</span>
                <strong>{request.pickupAddress}</strong>
              </div>
              {request.destinationName ? (
                <div className="confirm-row">
                  <span>Drop at</span>
                  <strong>{request.destinationName}</strong>
                </div>
              ) : null}
              <div className="confirm-row">
                <span>PIN</span>
                <strong>{request.pinCode}</strong>
              </div>
              <PinGpsBlock record={request} />
              {request.notes ? (
                <div className="confirm-row">
                  <span>Notes</span>
                  <strong>{request.notes}</strong>
                </div>
              ) : null}
            </div>
            <AssignedAgent record={request} />
            <p className="confirm-note">
              Live tracking follows the assigned ambulance toward your pickup PIN.
            </p>
            <div className="confirm-actions">
              <BillButton order={request} />
              <button
                type="button"
                className="service-submit"
                onClick={() => {
                  window.location.hash = trackHref(request.requestId);
                }}
              >
                Track live
              </button>
              <button type="button" className="service-submit" onClick={startNew}>
                Request another ambulance
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
      {busyWait ? <BusyWait kind="ambulance" traffic={busyWait} /> : null}
      <div className="service-page">
        <section className="service-hero">
          <div>
            <span className="service-kicker">MediHome Ambulance</span>
            <h1>Request An Ambulance</h1>
            <p>Emergency or Planned Transfer in Delhi NCR.</p>
          </div>
        </section>

        <form className="service-form" onSubmit={handleSubmit}>
          <div className="field full">
            <BookingForFields
              idPrefix="amb"
              profile={profile}
              selectedId={form.bookedFor}
              error={errors.bookedFor}
              onSelect={(option) => {
                setForm((prev) => ({ ...prev, ...bookingForPatch(option, profile) }));
                setErrors((prev) => ({ ...prev, bookedFor: "" }));
              }}
            />
          </div>
          <BookingContactFields
            idPrefix="amb"
            profile={profile}
            values={form}
            errors={errors}
            onChange={handleChange}
            pinHint="Select the Village / Sector / Mohalla attached to this PIN."
          />

          <div className="field">
            <label htmlFor="amb-type">
              Emergency type <span>*</span>
            </label>
            <select
              id="amb-type"
              name="emergencyType"
              value={form.emergencyType}
              onChange={handleChange}
            >
              <option value="emergency">Emergency</option>
              <option value="non-emergency">Non-emergency</option>
            </select>
            {errors.emergencyType && <small>{errors.emergencyType}</small>}
          </div>

          <div className="field full">
            <label htmlFor="amb-notes">Notes (optional)</label>
            <textarea
              id="amb-notes"
              name="notes"
              rows="2"
              value={form.notes}
              onChange={handleChange}
              placeholder="Symptoms, hospital preference, floor, etc."
            />
          </div>

          {form.emergencyType === "emergency" ? (
            <p className="pin-gps-hint">
              Emergency rides are cash on arrival.
            </p>
          ) : (
            <div className="field full">
              <PaymentBlock
                kind="ambulance"
                amount={ambFee}
                pin={form.pinCode}
                method={payMethod}
                onMethodChange={setPayMethod}
                onQuoteChange={setPayQuote}
                guestDetails={form}
              />
            </div>
          )}

          <button type="submit" className="service-submit" disabled={submitting}>
            {submitting ? "Connecting PIN to map…" : "Submit ambulance request"}
          </button>
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
.service-form input:not([type="radio"]):not([type="checkbox"]),.service-form select,.service-form textarea{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #d7e2e9;border-radius:8px;font:inherit;font-size:14px;color:#143246;outline:none;min-height:38px;background:#fff}
.service-form textarea{min-height:56px;resize:vertical}
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
.confirm-note{margin:0 0 12px;font-size:13px;color:#7c7059}
@media (max-width:800px){.service-page{padding:14px}.service-form{grid-template-columns:1fr}}
`;

export default Ambulance;
