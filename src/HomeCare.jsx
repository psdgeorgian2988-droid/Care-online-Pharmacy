import { useMemo, useState } from "react";

const STORAGE_KEY = "mediHomeHomeCareBookings";
const SERVICE_TYPES = [
  { value: "nurse", label: "Nurse visit" },
  { value: "caregiver", label: "Caregiver" },
  { value: "physiotherapy", label: "Physiotherapy" },
];
const TIME_SLOTS = [
  "08:00 AM – 10:00 AM",
  "10:00 AM – 12:00 PM",
  "12:00 PM – 02:00 PM",
  "04:00 PM – 06:00 PM",
  "06:00 PM – 08:00 PM",
];

function readProfile() {
  try {
    const parsed = JSON.parse(localStorage.getItem("mediHomeUser") || "null");
    if (!parsed || typeof parsed !== "object") {
      return { name: "", mobile: "", address: "", pinCode: "" };
    }
    return {
      name: String(parsed.name || parsed.fullName || "").trim(),
      mobile: String(parsed.mobile || parsed.mobileNumber || "").trim(),
      address: String(parsed.address || parsed.deliveryAddress || "").trim(),
      pinCode: String(parsed.pinCode || parsed.pincode || "").trim(),
    };
  } catch {
    return { name: "", mobile: "", address: "", pinCode: "" };
  }
}

function HomeCare() {
  const profile = useMemo(() => readProfile(), []);
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    patientName: profile.name,
    mobile: profile.mobile,
    address: profile.address,
    pinCode: profile.pinCode,
    serviceType: "nurse",
    date: "",
    timeSlot: "",
  });
  const [errors, setErrors] = useState({});
  const [booking, setBooking] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const next =
      name === "mobile" || name === "pinCode" ? value.replace(/\D/g, "") : value;
    setForm((prev) => ({ ...prev, [name]: next }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.patientName.trim()) next.patientName = "Patient name is required.";
    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      next.mobile = "Enter a valid 10-digit mobile number.";
    }
    if (!form.address.trim()) next.address = "Address is required.";
    if (!/^\d{6}$/.test(form.pinCode)) next.pinCode = "Enter a valid 6-digit PIN.";
    if (!form.serviceType) next.serviceType = "Select a service type.";
    if (!form.date) next.date = "Please select a date.";
    if (!form.timeSlot) next.timeSlot = "Please select a time slot.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;

    const serviceLabel =
      SERVICE_TYPES.find((item) => item.value === form.serviceType)?.label ||
      form.serviceType;

    const bookingDetails = {
      bookingId: "MH-HC-" + Math.floor(100000 + Math.random() * 900000),
      ...form,
      patientName: form.patientName.trim(),
      address: form.address.trim(),
      serviceLabel,
      bookedAt: new Date().toLocaleString(),
      bookedAtMs: Date.now(),
    };

    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const list = Array.isArray(existing) ? existing : [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify([bookingDetails, ...list]));
    } catch {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([bookingDetails]));
    }

    setBooking(bookingDetails);
  };

  const startNew = () => {
    setBooking(null);
    setForm({
      patientName: profile.name,
      mobile: profile.mobile,
      address: profile.address,
      pinCode: profile.pinCode,
      serviceType: "nurse",
      date: "",
      timeSlot: "",
    });
    setErrors({});
  };

  if (booking) {
    return (
      <>
        <style>{styles}</style>
        <div className="service-page">
          <section className="service-confirm">
            <div className="success-icon">✓</div>
            <h1>Home care booked</h1>
            <p>Your caregiver visit request has been saved locally.</p>
            <div className="confirm-card">
              <div className="confirm-head">
                <h2>Booking details</h2>
                <span>{booking.bookingId}</span>
              </div>
              <div className="confirm-row">
                <span>Service</span>
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
              <div className="confirm-row">
                <span>Date</span>
                <strong>{booking.date}</strong>
              </div>
              <div className="confirm-row">
                <span>Time slot</span>
                <strong>{booking.timeSlot}</strong>
              </div>
            </div>
            <button type="button" className="service-submit" onClick={startNew}>
              Book another visit
            </button>
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="service-page">
        <section className="service-hero">
          <div>
            <span className="service-kicker">MediHome Home Care</span>
            <h1>Nurse, caregiver or physiotherapy at home</h1>
            <p>Book a visit for Delhi NCR. We will confirm over a call.</p>
          </div>
        </section>

        <form className="service-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="hc-name">
              Patient name <span>*</span>
            </label>
            <input
              id="hc-name"
              name="patientName"
              value={form.patientName}
              onChange={handleChange}
              placeholder="Full name"
            />
            {errors.patientName && <small>{errors.patientName}</small>}
          </div>

          <div className="field">
            <label htmlFor="hc-mobile">
              Mobile <span>*</span>
            </label>
            <input
              id="hc-mobile"
              name="mobile"
              type="tel"
              inputMode="numeric"
              maxLength="10"
              value={form.mobile}
              onChange={handleChange}
              placeholder="10-digit mobile"
            />
            {errors.mobile && <small>{errors.mobile}</small>}
          </div>

          <div className="field full">
            <label htmlFor="hc-address">
              Address <span>*</span>
            </label>
            <textarea
              id="hc-address"
              name="address"
              rows="2"
              value={form.address}
              onChange={handleChange}
              placeholder="Complete visit address"
            />
            {errors.address && <small>{errors.address}</small>}
          </div>

          <div className="field">
            <label htmlFor="hc-pin">
              PIN code <span>*</span>
            </label>
            <input
              id="hc-pin"
              name="pinCode"
              inputMode="numeric"
              maxLength="6"
              value={form.pinCode}
              onChange={handleChange}
              placeholder="6-digit PIN"
            />
            {errors.pinCode && <small>{errors.pinCode}</small>}
          </div>

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
              {SERVICE_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            {errors.serviceType && <small>{errors.serviceType}</small>}
          </div>

          <div className="field">
            <label htmlFor="hc-date">
              Date <span>*</span>
            </label>
            <input
              id="hc-date"
              name="date"
              type="date"
              min={today}
              value={form.date}
              onChange={handleChange}
            />
            {errors.date && <small>{errors.date}</small>}
          </div>

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

          <button type="submit" className="service-submit">
            Confirm home care booking
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
.service-form input,.service-form select,.service-form textarea{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #d7e2e9;border-radius:8px;font:inherit;font-size:14px;color:#143246;outline:none;min-height:38px;background:#fff}
.service-form textarea{min-height:56px;resize:vertical}
.service-form input:focus,.service-form select:focus,.service-form textarea:focus{border-color:#1a6b7a}
.service-form small{margin-top:4px;color:#d84b4b;font-size:12px}
.service-submit{grid-column:1/-1;border:none;border-radius:8px;background:#1a6b7a;color:#fff;font-size:14px;font-weight:700;min-height:40px;cursor:pointer;font-family:inherit}
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
