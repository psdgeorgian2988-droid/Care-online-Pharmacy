import React, { useEffect, useMemo, useState } from "react";
import PinGpsBlock from "./PinGpsBlock";
import AssignedAgent from "./AssignedAgent";
import { resolvePinLocation } from "./pinLocation";
import { persistOrder, trackHref, withTracking } from "./orderTracking";
import PaymentBlock from "./PaymentBlock";
import { paymentFromQuote, settleCheckoutPayment } from "./paymentApi";
import BusyWait, { PatienceNote, useBusyOverlay } from "./BusyWait";
import { holdForPartnerQueue } from "./partnerQueue";
import { BillButton } from "./OrderBill";
import { DIAGNOSTIC_LABS, IMAGING_CENTRES } from "./diagnosticPartners";
import { paymentMethodSummary } from "./paymentMethods";
import { maskMobile } from "./personFields";
import BookingFlow from "./BookingFlow";
import {
  addressFromUnknown,
  applyResolvedPin,
  emptyAddress,
  pickAddress,
  readUserProfile,
} from "./addressFields";
import {
  bookingForPatch,
  initialBookingFor,
  validateBookingDetails,
  withBookingIdentity,
} from "./bookingFor";
import DateMonthYearFields from "./DateMonthYearFields";
import { isoDateToday } from "./personFields";
import {
  LAB_TIME_SLOTS,
  appointmentDateError,
  appointmentSlotError,
  isOpenAppointmentSlot,
  labBookingMaxDate,
  openAppointmentSlots,
} from "./appointmentSlot";

const PREP_LABEL = {
  fasting: "Fasting required",
  urine: "Urine collection",
  stool: "Stool collection",
  blood: "Preparation note",
  imaging: "Scan preparation",
  none: "",
};

const PREP_COPY = {
  fasting:
    "This test needs fasting.\n\nDo not eat or drink anything except plain water for 8–12 hours before the sample is collected. Book a morning slot (7:00 AM – 11:00 AM) so the overnight fast is complete.\n\nYou may drink water. Avoid tea, coffee, juice, milk, alcohol, chewing gum, and smoking during the fast.\n\nContinue prescribed medicines unless your doctor has asked you to hold them. Tell the technician if you have diabetes or take insulin.",
  urine:
    "Collect a midstream clean-catch sample.\n\nUse only the sterile container provided. Wash your hands and clean the genital area with water (front to back).\n\nPass a small amount of urine first and discard it. Then collect the middle of the stream in the container up to the mark. Close the lid tightly.\n\nReturn the sample within 1–2 hours (keep it cool). First-morning urine is preferred for culture and pregnancy tests. Start antibiotics only after the sample unless your doctor says otherwise.",
  stool:
    "Collect the sample carefully and keep it clean.\n\nPass stool onto a clean, dry container or collection paper — not from the toilet bowl. Transfer a small amount (about walnut-sized) into the sterile container provided.\n\nDo not mix the sample with urine, water, or toilet disinfectant. Close the lid, wash your hands, and return the sample the same day.\n\nFor occult blood: avoid collecting during menstrual bleeding or active bleeding piles unless your doctor has advised otherwise.",
  hba1c:
    "Fasting is not required for HbA1c. You may eat and drink as usual.\n\nBring a list of your current diabetes medicines if you have one.",
  thyroid:
    "Fasting is not required for a thyroid profile. You may eat as usual.\n\nTake your thyroid medicine as prescribed unless your doctor says otherwise.\n\nAvoid biotin (common in hair and skin supplements) for 48 hours if you can — it can interfere with the result.",
  mri:
    "Remove jewellery, watches, cards, and metal objects before the scan. Tell the centre about implants, a pacemaker, clips, or pregnancy.\n\nIf contrast dye is planned, you may be asked to fast for about 4 hours and share a recent kidney-function report.",
  ct:
    "Contrast CT often needs 4–6 hours of fasting (plain water may be allowed). Tell the centre about iodine allergy, kidney disease, diabetes medicines such as metformin, or pregnancy.",
  usg:
    "Ultrasound of the abdomen usually needs 6–8 hours of fasting. Water is often allowed as advised.\n\nA moderately full bladder may be required. If asked, drink water 45–60 minutes before the slot and do not empty your bladder.",
  mammo:
    "Do not apply deodorant, powder, lotion, or perfume on the chest or underarms on the day of the mammogram. Wear a two-piece outfit so you only need to undress from the waist up.",
};

const TEST_PREP = {
  cbc: { prepType: "none", instruction: "" },
  hba1c: { prepType: "blood", instruction: PREP_COPY.hba1c },
  lipid: { prepType: "fasting", instruction: PREP_COPY.fasting },
  lft: { prepType: "fasting", instruction: PREP_COPY.fasting },
  kft: { prepType: "none", instruction: "" },
  thyroid: { prepType: "blood", instruction: PREP_COPY.thyroid },
  vitd: { prepType: "none", instruction: "" },
  urine: { prepType: "urine", instruction: PREP_COPY.urine },
  "urine-culture": { prepType: "urine", instruction: PREP_COPY.urine },
  "urine-pregnancy": { prepType: "urine", instruction: PREP_COPY.urine },
  fbs: { prepType: "fasting", instruction: PREP_COPY.fasting },
  insulin: { prepType: "fasting", instruction: PREP_COPY.fasting },
  "stool-routine": { prepType: "stool", instruction: PREP_COPY.stool },
  "stool-occult": { prepType: "stool", instruction: PREP_COPY.stool },
  "mri-brain": { prepType: "imaging", instruction: PREP_COPY.mri },
  "ct-chest": { prepType: "imaging", instruction: PREP_COPY.ct },
  "usg-abdomen": { prepType: "imaging", instruction: PREP_COPY.usg },
  "xray-chest": { prepType: "none", instruction: "" },
  "doppler-leg": { prepType: "none", instruction: "" },
  mammography: { prepType: "imaging", instruction: PREP_COPY.mammo },
};

function withPrep(partners) {
  return partners.map((partner) => ({
    ...partner,
    tests: partner.tests.map((test) => ({
      ...test,
      prepType: TEST_PREP[test.id]?.prepType || "none",
      instruction: TEST_PREP[test.id]?.instruction || "",
    })),
  }));
}

const LABS = withPrep(DIAGNOSTIC_LABS);
const RADIOLOGY_PARTNERS = withPrep(IMAGING_CENTRES);

const EMPTY_FORM = {
  patientName: "",
  mobile: "",
  ...emptyAddress(),
  visitType: "home",
  date: "",
  timeSlot: "",
};

const PROFILE_KEYS = [
  "mediHomeUser",
  "medihomeUser",
  "currentUser",
  "loggedInUser",
  "userProfile",
  "profile",
  "userData",
  "user",
  "registeredUser",
  "account",
];

const firstValue = (obj, keys) => {
  if (!obj || typeof obj !== "object") return "";
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim()) {
      return String(obj[key]).trim();
    }
  }
  return "";
};

function normalizeProfile(raw) {
  if (!raw || typeof raw !== "object") return null;
  const source = raw.user && typeof raw.user === "object" ? raw.user : raw;
  const name = firstValue(source, ["name", "fullName", "userName", "username", "patientName"]);
  const mobile = firstValue(source, ["mobile", "mobileNumber", "phone", "phoneNumber", "contactNo", "contactNumber"]);
  const address = addressFromUnknown(source);
  if (
    !name &&
    !mobile &&
    !address.houseNo &&
    !address.society &&
    !address.pinCode
  ) {
    return null;
  }
  return { name, mobile, ...address };
}

function getRegisteredProfile() {
  try {
    const candidates = [];
    PROFILE_KEYS.forEach((key) => {
      const value = localStorage.getItem(key);
      if (!value) return;
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) parsed.forEach((item) => candidates.push(item));
        else candidates.push(parsed);
      } catch {
        // Ignore non-JSON localStorage values.
      }
    });

    for (const candidate of candidates) {
      const profile = normalizeProfile(candidate);
      if (profile && (profile.name || profile.mobile || profile.houseNo || profile.society || profile.pinCode)) {
        return profile;
      }
    }

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !/user|profile|account|member|customer/i.test(key)) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(key));
        const profile = normalizeProfile(parsed);
        if (profile && (profile.name || profile.mobile || profile.houseNo || profile.society || profile.pinCode)) return profile;
      } catch {
        // Ignore unrelated values.
      }
    }
  } catch {
    // localStorage may be unavailable in restricted environments.
  }
  return null;
}

function LabTests() {
  const registeredProfile = useMemo(() => getRegisteredProfile(), []);
  const profile = useMemo(() => readUserProfile(), []);
  const [serviceType, setServiceType] = useState("lab");
  const [selectedLabId, setSelectedLabId] = useState("");
  const [selectedTestId, setSelectedTestId] = useState("");
  const [selectedTests, setSelectedTests] = useState([]);
  const [selectedRadiologyPartnerId, setSelectedRadiologyPartnerId] = useState("");
  const [selectedImagingId, setSelectedImagingId] = useState("");
  const [selectedImagingTests, setSelectedImagingTests] = useState([]);
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    ...initialBookingFor(profile),
    ...(registeredProfile
      ? {
          patientName: registeredProfile.name,
          mobile: registeredProfile.mobile,
          ...pickAddress(registeredProfile),
        }
      : {}),
  }));
  const [errors, setErrors] = useState({});
  const [booking, setBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [payMethod, setPayMethod] = useState("cod");
  const [payQuote, setPayQuote] = useState(null);
  const busyKind = serviceType === "radiology" ? "radiology" : "lab";
  const busyWait = useBusyOverlay(submitting, busyKind);
  const [prepPopup, setPrepPopup] = useState(null);

  const selectedLab = useMemo(() => LABS.find((lab) => lab.id === selectedLabId), [selectedLabId]);
  const selectedRadiologyPartner = useMemo(
    () => RADIOLOGY_PARTNERS.find((partner) => partner.id === selectedRadiologyPartnerId),
    [selectedRadiologyPartnerId]
  );
  const activeTests = serviceType === "lab" ? selectedTests : selectedImagingTests;
  const activePartner = serviceType === "lab" ? selectedLab : selectedRadiologyPartner;
  const labTotal = selectedTests.reduce((sum, test) => sum + test.price, 0);
  const radTotal = selectedImagingTests.reduce((sum, test) => sum + test.price, 0);
  const total = activeTests.reduce((sum, test) => sum + test.price, 0);
  const today = isoDateToday();
  const maxVisit = labBookingMaxDate();
  const openSlots = useMemo(
    () => openAppointmentSlots(LAB_TIME_SLOTS, form.date),
    [form.date]
  );
  const prepSummaryTests = serviceType === "lab" ? selectedTests : selectedImagingTests;
  const fastingSelected = prepSummaryTests.filter((test) => test.prepType === "fasting");
  const imagingFastingSelected = prepSummaryTests.filter(
    (test) => test.id === "usg-abdomen" || test.id === "ct-chest"
  );
  const prepSummaryGroups = useMemo(() => {
    const groups = [];
    const seen = new Set();
    prepSummaryTests.forEach((test) => {
      if (!test.prepType || test.prepType === "none" || seen.has(test.prepType)) return;
      seen.add(test.prepType);
      const names = prepSummaryTests
        .filter((item) => item.prepType === test.prepType)
        .map((item) => item.name);
      groups.push({
        type: test.prepType,
        label: PREP_LABEL[test.prepType] || "Preparation",
        names,
      });
    });
    return groups;
  }, [prepSummaryTests]);

  useEffect(() => {
    if (!prepPopup) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setPrepPopup(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prepPopup]);

  const handleServiceChange = (type) => {
    setServiceType(type);
    setErrors({});
  };

  const handleRadiologyPartnerChange = (e) => {
    setSelectedRadiologyPartnerId(e.target.value);
    setSelectedImagingId("");
    setSelectedImagingTests([]);
    setServiceType("radiology");
    setErrors((prev) => ({ ...prev, radiologyPartner: "", imaging: "" }));
    setPrepPopup(null);
  };

  const toggleImagingTest = (test) => {
    setServiceType("radiology");
    if (!selectedRadiologyPartnerId) {
      setErrors((prev) => ({ ...prev, radiologyPartner: "Please select an imaging partner." }));
      return;
    }
    if (selectedImagingTests.some((item) => item.id === test.id)) {
      setSelectedImagingTests((prev) => prev.filter((item) => item.id !== test.id));
      setErrors((prev) => ({ ...prev, imaging: "" }));
      return;
    }
    setSelectedImagingTests((prev) => [...prev, test]);
    setSelectedImagingId(test.id);
    setErrors((prev) => ({ ...prev, imaging: "", radiologyPartner: "" }));
    if (test.prepType && test.prepType !== "none") {
      setPrepPopup({ test, kind: "imaging" });
    }
  };

  const clearImagingTests = () => {
    setSelectedImagingTests([]);
    setSelectedImagingId("");
    setPrepPopup(null);
  };

  const selectPreferredLab = (labId) => {
    setSelectedLabId(labId);
    setSelectedTestId("");
    setSelectedTests([]);
    setServiceType("lab");
    setErrors((prev) => ({ ...prev, lab: "", test: "" }));
    setPrepPopup(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue =
      name === "mobile" || name === "pinCode" ? value.replace(/\D/g, "") : value;
    setForm((prev) => {
      const next = { ...prev, [name]: nextValue };
      if (
        (name === "date" || name === "timeSlot") &&
        next.date &&
        next.timeSlot &&
        !isOpenAppointmentSlot(next.timeSlot, next.date)
      ) {
        next.timeSlot = "";
      }
      return next;
    });
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const toggleLabTest = (test) => {
    setServiceType("lab");
    if (!selectedLabId) {
      setErrors((prev) => ({ ...prev, lab: "Please select a preferred lab." }));
      return;
    }
    if (selectedTests.some((item) => item.id === test.id)) {
      setSelectedTests((prev) => prev.filter((item) => item.id !== test.id));
      setErrors((prev) => ({ ...prev, test: "" }));
      return;
    }
    setSelectedTests((prev) => [...prev, test]);
    setSelectedTestId(test.id);
    setErrors((prev) => ({ ...prev, test: "", lab: "" }));
    if (test.prepType && test.prepType !== "none") {
      setPrepPopup({ test, kind: "lab" });
    }
  };

  const keepPrepSelection = () => setPrepPopup(null);

  const cancelPrepSelection = () => {
    if (!prepPopup) return;
    if (prepPopup.kind === "lab") {
      setSelectedTests((prev) => prev.filter((item) => item.id !== prepPopup.test.id));
      setSelectedTestId((prev) => (prev === prepPopup.test.id ? "" : prev));
    } else {
      setSelectedImagingTests((prev) => prev.filter((item) => item.id !== prepPopup.test.id));
      setSelectedImagingId((prev) => (prev === prepPopup.test.id ? "" : prev));
    }
    setPrepPopup(null);
  };

  const clearTests = () => {
    setSelectedTests([]);
    setSelectedTestId("");
    setPrepPopup(null);
  };

  const validate = () => {
    const newErrors = validateBookingDetails(form, profile);
    if (serviceType === "lab") {
      if (!selectedLabId) newErrors.lab = "Please select a preferred lab.";
      if (selectedTests.length === 0) newErrors.test = "Please add at least one test.";
    } else {
      if (!selectedRadiologyPartnerId) newErrors.radiologyPartner = "Please select an imaging partner.";
      if (selectedImagingTests.length === 0) newErrors.imaging = "Please add at least one imaging study.";
    }

    const dateError = appointmentDateError(form.date);
    if (dateError) newErrors.date = dateError;
    const slotError = appointmentSlotError(form.timeSlot, form.date);
    if (slotError) newErrors.timeSlot = slotError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const kind = serviceType === "radiology" ? "radiology" : "lab";
      const queue = await holdForPartnerQueue(kind);
      const booked = withBookingIdentity(form, profile);
      const gps = await resolvePinLocation(booked.pinCode);
      const addr = applyResolvedPin(booked, gps);
      const pay = paymentFromQuote(payQuote, total);
      const payment = await settleCheckoutPayment({
        method: payMethod,
        ...pay,
        kind,
        pin: gps.pinCode,
        name: booked.patientName,
        mobile: booked.mobile,
        reference: `${kind}-${Date.now()}`,
        description:
          kind === "radiology"
            ? "MediHome radiology booking"
            : "MediHome lab booking",
      });

      const bookingDetails = {
        bookingId:
          (serviceType === "lab" ? "MH-LAB-" : "MH-RAD-") +
          Math.floor(100000 + Math.random() * 900000),
        serviceType,
        partner: activePartner.name,
        partnerId: activePartner.id,
        partnerGstin: activePartner.gstin,
        partnerDlNo: activePartner.dlNo,
        partnerArea: activePartner.area,
        partnerAddress: activePartner.address,
        tests: activeTests,
        total: pay.amountRupees,
        saleRupees: pay.saleRupees,
        couponCode: pay.couponCode,
        discountRupees: pay.discountRupees,
        highTrafficWait: queue.busy || queue.waited,
        ...form,
        ...booked,
        ...addr,
        pin: gps.pin,
        lat: gps.lat,
        lng: gps.lng,
        locality: gps.locality,
        mapsUrl: gps.mapsUrl,
        preferredLab: serviceType === "lab" ? activePartner.name : "",
        preferredLabId: serviceType === "lab" ? selectedLabId : "",
        visitType: serviceType === "radiology" ? "centre" : form.visitType,
        bookedAt: new Date().toLocaleString(),
        bookedAtMs: Date.now(),
        ...payment,
      };

      const trackedBooking = persistOrder(withTracking(bookingDetails, kind));

      setBooking(trackedBooking);

      localStorage.setItem("mediHomeLabBooking", JSON.stringify(trackedBooking));
      localStorage.setItem("mediHomeLastBooking", JSON.stringify(trackedBooking));
    } catch (error) {
      alert(error.message || "Payment or booking could not be completed.");
    } finally {
      setSubmitting(false);
    }
  };

  const startNewBooking = () => {
    setBooking(null);
    setPayMethod("cod");
    setServiceType("lab");
    setSelectedLabId("");
    setSelectedTestId("");
    setSelectedTests([]);
    setSelectedRadiologyPartnerId("");
    setSelectedImagingId("");
    setSelectedImagingTests([]);
    setForm({
      ...EMPTY_FORM,
      ...initialBookingFor(profile),
      ...(registeredProfile
        ? {
          patientName: registeredProfile.name,
          mobile: registeredProfile.mobile,
          ...pickAddress(registeredProfile),
          }
        : {}),
    });
    setErrors({});
    setPrepPopup(null);
  };

  if (booking) {
    return (
      <>
        <style>{styles}</style>
        <div className="service-page lab-page">
          <section className="service-confirm">
            <div className="success-icon">✓</div>
            <h1>Booking Confirmed</h1>
            <PatienceNote kind={booking.kind || booking.serviceType} shown={booking.highTrafficWait} />
            <p>
              {booking.serviceType === "lab"
                ? "Your laboratory test booking has been successfully submitted to MediHome."
                : "Your radiology appointment booking has been successfully submitted to MediHome."}
            </p>
            <div className="confirm-card">
              <div className="confirm-head">
                <h2>Booking Details</h2>
                <span>{booking.bookingId}</span>
              </div>
              <div className="confirm-row">
                <span>{booking.serviceType === "lab" ? "Preferred lab" : "Imaging partner"}</span>
                <strong>{booking.preferredLab || booking.partner}</strong>
              </div>
              <div className="tests-confirmation">
                <div className="booking-row-label">
                  {booking.serviceType === "lab" ? "Selected laboratory tests" : "Selected imaging studies"}
                </div>
                {booking.tests.map((test) => (
                  <div className="confirmation-test" key={test.id}>
                    <span>{test.name}</span>
                    <strong>₹{test.price}</strong>
                  </div>
                ))}
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
                <span>{booking.serviceType === "lab" ? "Collection type" : "Appointment type"}</span>
                <strong>{booking.visitType === "home" ? "Home collection" : "Centre visit"}</strong>
              </div>
              <div className="confirm-row">
                <span>Date</span>
                <strong>{booking.date}</strong>
              </div>
              <div className="confirm-row">
                <span>Time slot</span>
                <strong>{booking.timeSlot}</strong>
              </div>
              <div className="confirm-row">
                <span>Address</span>
                <strong>{booking.address}</strong>
              </div>
              <div className="confirm-row">
                <span>PIN code</span>
                <strong>{booking.pinCode}</strong>
              </div>
              <PinGpsBlock record={booking} />
              <div className="confirm-row">
                <span>Total</span>
                <strong>₹{booking.total}</strong>
              </div>
              <div className="confirm-row">
                <span>Payment</span>
                <strong>
                  {paymentMethodSummary(booking.paymentMethod, "Pay on visit / collection")}
                </strong>
              </div>
            </div>
            <AssignedAgent record={booking} />
            <p className="confirm-note">
              Save this booking ID. Track the assigned partner live toward your PIN.
            </p>
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
              <button type="button" className="service-submit" onClick={startNewBooking}>
                Book another test
              </button>
            </div>
          </section>
        </div>
      </>
    );
  }

  const isLab = serviceType === "lab";
  const catalogPartner = isLab ? selectedLab : selectedRadiologyPartner;
  const catalogTests = isLab ? selectedTests : selectedImagingTests;
  const catalogErrorPartner = isLab ? errors.lab : errors.radiologyPartner;
  const catalogErrorTests = isLab ? errors.test : errors.imaging;

  return (
    <>
      <style>{styles}</style>
      {busyWait ? <BusyWait kind={busyKind} traffic={busyWait} /> : null}
      <div className="lab-page">
        <header className="lab-head">
          <div>
            <p className="lab-kicker">Diagnostics</p>
            <h1>Book Lab Tests And Imaging</h1>
            <p className="lab-lead">
              Home sample collection/Booking from your trusted Lab.
            </p>
          </div>
          <div className="lab-tabs" role="tablist" aria-label="Service type">
            <button
              type="button"
              role="tab"
              aria-selected={isLab}
              className={isLab ? "is-on" : ""}
              onClick={() => handleServiceChange("lab")}
            >
              Laboratory
              {selectedTests.length > 0 ? (
                <span>{selectedTests.length}</span>
              ) : null}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isLab}
              className={!isLab ? "is-on" : ""}
              onClick={() => handleServiceChange("radiology")}
            >
              Radiology
              {selectedImagingTests.length > 0 ? (
                <span>{selectedImagingTests.length}</span>
              ) : null}
            </button>
          </div>
        </header>

        <form className="lab-shell" onSubmit={handleBooking}>
          <section className="lab-card">
            <div className="lab-card-head">
              <h2>{isLab ? "Select Tests" : "Select Studies"}</h2>
              <p>
                {isLab
                  ? "Choose a lab, then add blood, urine or pathology tests."
                  : "Choose an imaging centre, then add MRI, CT, ultrasound or X-ray."}
              </p>
            </div>

            <label className="lab-label" htmlFor={isLab ? "preferredLab" : "radiologyPartner"}>
              {isLab ? "Preferred lab" : "Imaging centre"} <em>*</em>
            </label>
            {isLab ? (
              <select
                id="preferredLab"
                value={selectedLabId}
                onChange={(e) => selectPreferredLab(e.target.value)}
              >
                <option value="">Select a diagnostic lab</option>
                {LABS.map((lab) => (
                  <option key={lab.id} value={lab.id}>
                    {lab.name}
                  </option>
                ))}
              </select>
            ) : (
              <select
                id="radiologyPartner"
                value={selectedRadiologyPartnerId}
                onChange={handleRadiologyPartnerChange}
              >
                <option value="">Select an imaging centre</option>
                {RADIOLOGY_PARTNERS.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </select>
            )}
            {catalogErrorPartner ? <small className="lab-error">{catalogErrorPartner}</small> : null}

            <div className="lab-table" role="list">
              <div className="lab-table-head">
                <span>Test</span>
                <span>Price</span>
              </div>
              {!catalogPartner ? (
                <p className="lab-empty">
                  {isLab
                    ? "Select a lab to view the test menu."
                    : "Select a centre to view available studies."}
                </p>
              ) : (
                catalogPartner.tests.map((test) => {
                  const isOn = catalogTests.some((item) => item.id === test.id);
                  const prep =
                    test.prepType && test.prepType !== "none"
                      ? PREP_LABEL[isLab ? test.prepType : "imaging"]
                      : "";
                  return (
                    <button
                      key={test.id}
                      type="button"
                      role="listitem"
                      className={isOn ? "lab-row is-on" : "lab-row"}
                      onClick={() =>
                        isLab ? toggleLabTest(test) : toggleImagingTest(test)
                      }
                    >
                      <span className="lab-check" aria-hidden="true">
                        {isOn ? "✓" : ""}
                      </span>
                      <span className="lab-row-main">
                        <strong>{test.name}</strong>
                        {prep ? <em>{prep}</em> : null}
                      </span>
                      <span className="lab-row-price">₹{test.price}</span>
                    </button>
                  );
                })
              )}
            </div>
            {catalogErrorTests ? <small className="lab-error">{catalogErrorTests}</small> : null}

            <div className="lab-card-foot">
              <p>
                {catalogTests.length
                  ? `${catalogTests.length} selected`
                  : "No tests selected"}
              </p>
              <strong>₹{isLab ? labTotal : radTotal}</strong>
              {catalogTests.length > 0 ? (
                <button
                  type="button"
                  className="lab-clear"
                  onClick={isLab ? clearTests : clearImagingTests}
                >
                  Clear
                </button>
              ) : null}
            </div>
          </section>

          <section className="lab-card lab-book">
            <div className="lab-card-head">
              <h2>Patient And Slot</h2>
              <p>
                {isLab ? "Home collection or a visit to the lab." : "Centre appointment only."}
              </p>
            </div>
            <div className="lab-fields">
            <BookingFlow
              idPrefix="lab"
              layout="lab"
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
            <div className="lab-field lab-span">
              <DateMonthYearFields
                idPrefix="lab-date"
                name="date"
                value={form.date}
                min={today}
                max={maxVisit}
                required
                error={errors.date || ""}
                label="Date"
                onChange={handleChange}
              />
              <small className="lab-hint">Today or up to 7 days ahead.</small>
            </div>

            <div className="lab-field">
              <label htmlFor="timeSlot">
                Time slot <em>*</em>
              </label>
              <select id="timeSlot" name="timeSlot" value={form.timeSlot} onChange={handleChange}>
                <option value="">Select a slot</option>
                {openSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
              {form.date && openSlots.length === 0 ? (
                <small className="lab-error">
                  No time slots left today. Choose a later date.
                </small>
              ) : errors.timeSlot ? (
                <small className="lab-error">{errors.timeSlot}</small>
              ) : null}
            </div>

            <div className="lab-field lab-span">
              {isLab ? (
                <>
                  <label htmlFor="visitType">
                    Visit type <em>*</em>
                  </label>
                  <select
                    id="visitType"
                    name="visitType"
                    value={form.visitType}
                    onChange={handleChange}
                    aria-label="Visit type"
                  >
                    <option value="home">Home collection</option>
                    <option value="centre">Centre visit</option>
                  </select>
                </>
              ) : (
                <p className="centre-note">
                  Imaging is a centre appointment at the selected partner.
                </p>
              )}
            </div>

            {prepSummaryGroups.length > 0 ? (
              <div className={`lab-field lab-span prep-summary ${fastingSelected.length ? "has-fasting" : ""}`}>
                <p className="prep-summary-kicker">Preparation</p>
                {fastingSelected.length > 0 ? (
                  <p className="prep-summary-alert">
                    Fasting required — 8–12 hours, water only, before{" "}
                    {fastingSelected.map((test) => test.name).join(", ")}.
                  </p>
                ) : null}
                {imagingFastingSelected.length > 0 ? (
                  <p className="prep-summary-alert">
                    Fasting or contrast prep may apply for{" "}
                    {imagingFastingSelected.map((test) => test.name).join(", ")}.
                  </p>
                ) : null}
                <ul>
                  {prepSummaryGroups.map((group) => (
                    <li key={group.type}>
                      <strong>{group.label}</strong>
                      <span>{group.names.join(", ")}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <PaymentBlock
              kind={serviceType === "radiology" ? "radiology" : "lab"}
              amount={total}
              pin={form.pinCode}
              method={payMethod}
              onMethodChange={setPayMethod}
              onQuoteChange={setPayQuote}
              guestDetails={form}
            />

            <div className="lab-book-foot">
              <strong>
                {activeTests.length
                  ? `${activeTests.length} selected · ₹${payQuote?.payableRupees ?? total}`
                  : `₹${payQuote?.payableRupees ?? total}`}
              </strong>
              <button type="submit" className="lab-submit" disabled={submitting}>
                {submitting ? "Connecting PIN to map…" : "Confirm booking"}
              </button>
            </div>
            </BookingFlow>
            </div>
          </section>
        </form>

        {prepPopup && (
          <div
            className="prep-overlay"
            role="presentation"
            onClick={keepPrepSelection}
          >
            <div
              className="prep-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="prep-dialog-title"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="prep-dialog-kicker">
                {PREP_LABEL[prepPopup.test.prepType] || "Preparation"}
              </p>
              <h2 id="prep-dialog-title">{prepPopup.test.name}</h2>
              <div className="prep-dialog-body">
                {prepPopup.test.instruction.split("\n\n").map((paragraph) => (
                  <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                ))}
              </div>
              <div className="prep-dialog-actions">
                <button type="button" className="ghost-button" onClick={cancelPrepSelection}>
                  Cancel
                </button>
                <button type="button" className="service-submit" onClick={keepPrepSelection}>
                  Got it
                </button>
              </div>
            </div>
          </div>
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
.lab-lead{margin:6px 0 0;font-size:14px;line-height:1.45;color:#5d7180}
.lab-tabs{display:inline-flex;padding:4px;border-radius:10px;background:#e8f1f6;gap:4px}
.lab-tabs button{border:0;background:transparent;color:#3d5a6c;font:inherit;font-size:13px;font-weight:700;padding:8px 14px;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;gap:8px}
.lab-tabs button.is-on{background:#fff;color:#1a6b7a;box-shadow:0 1px 3px rgba(20,50,70,.08)}
.lab-tabs span{min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#1a6b7a;color:#fff;font-size:11px;line-height:18px;text-align:center}
.lab-shell{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:stretch}
.lab-card{background:#fff;border:1px solid #e4ecef;border-radius:12px;padding:16px 18px;min-width:0;height:100%;box-sizing:border-box}
.lab-card-head{margin:0 0 14px;padding-bottom:12px;border-bottom:1px solid #eef3f6}
.lab-card-head h2{margin:0;font-size:16px;font-weight:700;color:#143246}
.lab-card-head p{margin:4px 0 0;font-size:13px;color:#5d7180;line-height:1.4}
.lab-label{display:block;margin:0 0 6px;font-size:12px;font-weight:700;color:#34546b}
.lab-label em,.lab-field label em{color:#d84b4b;font-style:normal}
.lab-card>select,.lab-field input,.lab-field select,.lab-field textarea{
  width:100%;box-sizing:border-box;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;font:inherit;font-size:14px;color:#143246;outline:none;height:38px;min-height:38px;background:#fff
}
.lab-field textarea{height:auto;min-height:64px;resize:vertical}
.lab-card>select:focus,.lab-field input:focus,.lab-field select:focus,.lab-field textarea:focus{border-color:#1a6b7a}
.lab-error{display:block;margin-top:6px;color:#d84b4b;font-size:12px}
.lab-hint{display:block;margin-top:6px;color:#5d7180;font-size:12px}
.lab-table{margin-top:14px;border:1px solid #e8eef2;border-radius:10px;overflow:hidden;background:#fff}
.lab-table-head{display:flex;justify-content:space-between;padding:8px 14px 8px 42px;background:#f7fafc;color:#5d7180;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.lab-empty{margin:0;padding:28px 16px;text-align:center;color:#7a8b96;font-size:13px;line-height:1.45}
.lab-row{display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;border:0;border-top:1px solid #eef3f6;background:#fff;color:inherit;text-align:left;cursor:pointer;font-family:inherit}
.lab-row:hover{background:#f7fbfd}
.lab-row.is-on{background:#f3fafb}
.lab-check{width:18px;height:18px;border-radius:4px;border:1px solid #c5d8e6;background:#fff;color:#1a6b7a;font-size:11px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
.lab-row.is-on .lab-check{border-color:#1a6b7a;background:#e8f4f6}
.lab-row-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.lab-row-main strong{font-size:14px;font-weight:600;color:#143246}
.lab-row-main em{font-style:normal;font-size:11px;font-weight:600;color:#1a6b7a}
.lab-row-price{flex-shrink:0;font-size:14px;font-weight:700;color:#143246}
.lab-card-foot{display:flex;align-items:center;gap:10px;margin-top:12px;padding-top:12px;border-top:1px solid #eef3f6;font-size:13px;color:#5d7180}
.lab-card-foot strong{margin-left:auto;font-size:15px;color:#143246}
.lab-clear{border:0;background:none;padding:0;color:#b64b4b;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit}
.lab-book{position:relative;top:auto}
.lab-fields{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px 16px;align-items:start}
.lab-field{display:flex;flex-direction:column;min-width:0}
.lab-field.lab-span,.lab-field.lab-field-full,.lab-field:has(.book-for),.lab-field:has(.addr-fields),.lab-field:has(.dmy-fields){grid-column:1/-1}
.lab-field label{margin-bottom:5px;font-size:12px;font-weight:700;color:#34546b}
.centre-note{margin:0;padding:10px 12px;border-radius:8px;background:#f7fbfe;border:1px solid #e4ecef;font-size:13px;line-height:1.45;color:#5d7180}
.lab-book-foot{margin-top:14px;padding-top:14px;border-top:1px solid #eef3f6;display:flex;flex-direction:column;gap:10px}
.lab-book-foot strong{font-size:15px;color:#143246}
.lab-submit,.service-submit{border:none;border-radius:8px;background:#1a6b7a;color:#fff;font-size:14px;font-weight:700;min-height:42px;cursor:pointer;font-family:inherit;width:100%}
.lab-submit:disabled{opacity:.7;cursor:wait}
.confirm-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
.confirm-actions .service-submit,.confirm-actions .lab-submit{width:auto;min-width:180px}
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
.confirm-note{margin:0 0 12px;font-size:13px;color:#5d7180}
.tests-confirmation{padding:8px 0;border-bottom:1px solid #edf1f3}
.booking-row-label{margin-bottom:6px;color:#5d7180;font-size:13px}
.confirmation-test{display:flex;justify-content:space-between;gap:8px;padding:3px 0;font-size:14px}
.confirmation-test strong{color:#1a6b7a}
.prep-summary{padding:12px 14px;border-radius:10px;border:1px solid #d7e8f0;background:#f7fbfd}
.prep-summary.has-fasting{border-color:#b7d4de;background:#eef7f9}
.prep-summary-kicker{margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#1a6b7a}
.prep-summary-alert{margin:0 0 8px;font-size:13px;font-weight:700;line-height:1.4;color:#143246}
.prep-summary ul{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px}
.prep-summary li{display:flex;flex-direction:column;gap:1px}
.prep-summary li strong{font-size:13px;color:#143246}
.prep-summary li span{font-size:13px;color:#5d7180;line-height:1.4}
.prep-overlay{position:fixed;inset:0;z-index:40;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(20,50,70,.46)}
.prep-dialog{width:min(440px,100%);max-height:min(86vh,620px);overflow:auto;padding:22px 22px 18px;border-radius:12px;background:#fff;border:1px solid #e4ecef;box-shadow:0 18px 48px rgba(20,50,70,.22);color:#143246}
.prep-dialog-kicker{margin:0 0 6px;font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:#1a6b7a}
.prep-dialog h2{margin:0 0 12px;font-size:18px;font-weight:700;color:#143246}
.prep-dialog-body p{margin:0 0 10px;font-size:14px;line-height:1.55;color:#34546b}
.prep-dialog-body p:last-child{margin-bottom:0}
.prep-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid #e5edf1}
.ghost-button{border:1px solid #d8e3e9;border-radius:8px;background:#fff;color:#34546b;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;min-height:40px;padding:8px 14px}
.ghost-button:hover{background:#f7fbfe}
.prep-dialog-actions .service-submit,.prep-dialog-actions .lab-submit{width:auto;min-width:112px}
@media (max-width:900px){
  .lab-page{padding:14px}
  .lab-shell,.lab-fields{grid-template-columns:1fr}
  .lab-book{position:static}
}
`;


export default LabTests;
