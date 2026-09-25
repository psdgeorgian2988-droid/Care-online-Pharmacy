import { useEffect, useMemo, useState } from "react";
import PinGpsBlock from "./PinGpsBlock";
import AssignedAgent from "./AssignedAgent";
import {
  detectPinFromLocation,
  locationErrorMessage,
  resolvePinLocation,
} from "./pinLocation";
import { persistOrder, refreshOrderFromServer, trackHref, withTracking } from "./orderTracking";
import { awaitingPartnerMessage, initialOrderStatus } from "./orderConfirm";
import { orderCurrentStatus } from "./orderStatus";
import {
  isStepdownAdmitted,
  isStepdownDischarged,
  stepdownBookingDecision,
  stepdownStageLabel,
} from "./stepdownDesk";
import {
  STEPDOWN_DAY_RATE,
  isStepdownRoomRentPaid,
  stepdownDayRate,
  stepdownRoomRentTotal,
} from "./stepdownBill";
import { STEPDOWN_CANCEL_POLICY, isStepdownCancelled } from "./stepdownCancel";
import StepdownCancelBlock from "./StepdownCancelBlock.jsx";
import PaymentBlock from "./PaymentBlock";
import { paymentFromQuote, settleCheckoutPayment } from "./paymentApi";
import BusyWait, { useBusyOverlay } from "./BusyWait";
import { holdForPartnerQueue } from "./partnerQueue";
import BookingFlow from "./BookingFlow";
import {
  applyResolvedPin,
  emptyAddress,
  readUserProfile,
} from "./addressFields";
import {
  bookingForPatch,
  OTHER_BOOKING_ID,
  SELF_BOOKING_ID,
  validateBookingDetails,
  withBookingIdentity,
} from "./bookingFor";
import DateMonthYearFields from "./DateMonthYearFields";
import { isoDateToday, isValidMobile, maskMobile } from "./personFields";
import {
  appointmentDateError,
  bookingMaxDate,
  isOpenAppointmentSlot,
} from "./appointmentSlot";
import { paymentMethodSummary } from "./paymentMethods";
import BookingDocumentUpload from "./BookingDocumentUpload.jsx";

const STORAGE_KEY = "mediHomeStepDownBookings";
const AMBULANCE_STORAGE_KEY = "mediHomeAmbulanceRequests";
const TRANSFER_FEE = 2499;

const CARE_TYPES = [
  { value: "post-icu", label: "Post-ICU step-down" },
  { value: "post-surgery", label: "Post-surgery recovery" },
  { value: "rehab", label: "Rehab & physiotherapy" },
  { value: "wound", label: "Wound / drain care" },
  { value: "assisted", label: "Assisted recovery at home" },
];

const TIME_SLOTS = ["2:00 PM"];
const CHECK_IN_TIME = TIME_SLOTS[0];

function emptyStepdownForm() {
  return {
    centreId: "",
    patientName: "",
    mobile: "",
    ...emptyAddress(),
    bookedFor: "",
    bookedForName: "",
    bookedForRelation: "",
    gender: "",
    age: "",
    dob: "",
    serviceType: "",
    date: "",
    timeSlot: CHECK_IN_TIME,
    durationDays: "",
    needAmbulance: "",
    attendantMobile: "",
    alternateMobile: "",
    pickupPinCode: "",
    pickupLandmark: "",
    pickupArea: "",
    pickupCity: "",
    pickupDistrict: "",
    pickupState: "",
    pickupAddress: "",
    pickupLat: null,
    pickupLng: null,
    pickupMapsUrl: "",
  };
}

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
  const today = isoDateToday();
  const maxVisit = bookingMaxDate();
  const [tab, setTab] = useState("find");
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState("all");
  const [form, setForm] = useState(() => emptyStepdownForm());
  const [errors, setErrors] = useState({});
  const [booking, setBooking] = useState(null);
  const [flowStep, setFlowStep] = useState("placed");
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [payMethod, setPayMethod] = useState("cod");
  const [payQuote, setPayQuote] = useState(null);
  const [dischargeDraft, setDischargeDraft] = useState(null);
  const [rxDraft, setRxDraft] = useState(null);
  const [locatingPickup, setLocatingPickup] = useState(false);
  const busyWait = useBusyOverlay(submitting || paying, "stepdown");
  const stayTotal = Math.max(1, Number(form.durationDays) || 1) * STEPDOWN_DAY_RATE;
  const openSlots = useMemo(
    () =>
      form.date
        ? TIME_SLOTS.filter((slot) => isOpenAppointmentSlot(slot, form.date, new Date(), 0))
        : TIME_SLOTS,
    [form.date]
  );

  const selectedCentre = CENTRES.find((item) => item.id === form.centreId) || null;
  const centres = CENTRES.filter((centre) => centreMatches(centre, query, focus));

  const handleChange = (event) => {
    const { name, value } = event.target;
    const next =
      name === "mobile" ||
        name === "attendantMobile" ||
        name === "alternateMobile" ||
        name === "pinCode" ||
        name === "pickupPinCode" ||
        name === "durationDays"
        ? value.replace(/\D/g, "")
        : value;
    setForm((prev) => {
      const patched = { ...prev, [name]: next };
      if (name === "needAmbulance" && next === "yes" && !patched.pickupPinCode) {
        patched.pickupPinCode = patched.pinCode || "";
      }
      if (name === "date" || name === "timeSlot") {
        if (patched.date && isOpenAppointmentSlot(CHECK_IN_TIME, patched.date, new Date(), 0)) {
          patched.timeSlot = CHECK_IN_TIME;
        } else if (
          patched.date &&
          patched.timeSlot &&
          !isOpenAppointmentSlot(patched.timeSlot, patched.date, new Date(), 0)
        ) {
          patched.timeSlot = "";
        }
      }
      return patched;
    });
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handlePickupLocation = async () => {
    if (locatingPickup) return;
    setLocatingPickup(true);
    setErrors((prev) => ({ ...prev, pickupPinCode: "" }));
    try {
      const found = await detectPinFromLocation();
      const pin = String(found.pin || found.pinCode || "").replace(/\D/g, "");
      const parts = [
        found.suggestedArea || "",
        found.city || "",
        found.district && found.district !== found.city ? found.district : "",
        found.state || "",
        pin,
      ].filter(Boolean);
      setForm((prev) => ({
        ...prev,
        pickupPinCode: pin,
        pickupArea: found.suggestedArea || prev.pickupArea || "",
        pickupCity: found.city || "",
        pickupDistrict: found.district || found.city || "",
        pickupState: found.state || "",
        pickupLat: found.lat ?? null,
        pickupLng: found.lng ?? null,
        pickupMapsUrl: found.mapsUrl || "",
        pickupAddress: parts.join(", "),
      }));
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        pickupPinCode:
          locationErrorMessage(error) ||
          "Could not detect pickup. Enter the hospital PIN or try again.",
      }));
    } finally {
      setLocatingPickup(false);
    }
  };

  const chooseCentre = (centreId) => {
    setForm((prev) => ({ ...prev, centreId }));
    setErrors((prev) => ({ ...prev, centreId: "" }));
    setTab("book");
  };

  const validate = () => {
    const next = {};
    if (!form.centreId) next.centreId = "Select a step-down care centre.";
    Object.assign(next, validateBookingDetails(form, profile, { forceDetails: true }));
    if (!form.serviceType) next.serviceType = "Select a care type.";
    if (!form.date) {
      next.date = "Please select a date.";
    } else {
      const dateError = appointmentDateError(form.date);
      if (dateError) next.date = dateError;
    }
    if (!form.timeSlot) {
      next.timeSlot = "Check-in is at 2:00 PM.";
    } else if (
      form.date &&
      !isOpenAppointmentSlot(CHECK_IN_TIME, form.date, new Date(), 0)
    ) {
      next.timeSlot = "2:00 PM check-in has passed for this date. Choose a later date.";
    }
    const days = Number(form.durationDays);
    if (!days || days < 1 || days > 90) {
      next.durationDays = "Enter stay or visit days between 1 and 90.";
    }
    if (form.needAmbulance !== "yes" && form.needAmbulance !== "no") {
      next.needAmbulance = "Please choose whether you need an ambulance.";
    }
    if (form.needAmbulance === "yes") {
      const pickupPin = String(form.pickupPinCode || form.pinCode || "").replace(/\D/g, "");
      if (!/^\d{6}$/.test(pickupPin)) {
        next.pickupPinCode = "Enter the ambulance pickup PIN or tap Pickup Location.";
      }
    }
    const alternateMobile = String(form.alternateMobile || form.attendantMobile || "").replace(/\D/g, "");
    if (alternateMobile && !isValidMobile(alternateMobile)) {
      next.alternateMobile = "Enter a valid 10-digit Alternate Mobile No, or leave it blank.";
    }
    if (!dischargeDraft?.fileData) {
      next.dischargeSummary = "Upload the hospital Discharge Summary.";
    }
    if (!rxDraft?.fileData) {
      next.prescription = "Upload the prescription.";
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
      const booked = withBookingIdentity(form, profile, { forceDetails: true });
      const queue = await holdForPartnerQueue("stepdown");
      const pin = String(booked.pinCode || selectedCentre?.pin || centre?.pin || "").replace(/\D/g, "");
      const gps = await resolvePinLocation(pin);
      const addr = applyResolvedPin(booked, gps);
      const bookingId = "MH-SD-" + Math.floor(100000 + Math.random() * 900000);
      const wantsAmbulance = form.needAmbulance === "yes";
      let ambulanceRequestId = "";
      const total = Math.max(1, Number(form.durationDays) || 1) * STEPDOWN_DAY_RATE;
      const pay = paymentFromQuote(payQuote, total);

      const pickupPin = String(
        form.pickupPinCode || booked.pinCode || pin
      ).replace(/\D/g, "");
      const pickupGps =
        wantsAmbulance && /^\d{6}$/.test(pickupPin)
          ? await resolvePinLocation(pickupPin)
          : null;
      const pickupAddress =
        form.pickupAddress ||
        [
          form.pickupLandmark,
          form.pickupArea || pickupGps?.locality || pickupGps?.area,
          form.pickupCity || pickupGps?.city,
          pickupPin,
        ]
          .filter(Boolean)
          .join(", ") ||
        addr.pickupAddress ||
        addr.address;

      if (wantsAmbulance && centre) {
        ambulanceRequestId = "MH-AMB-" + Math.floor(100000 + Math.random() * 900000);
      }

      const bookingDetails = {
        bookingId,
        orderType: "stepdown",
        ...form,
        ...booked,
        ...addr,
        patientName: booked.patientName,
        pin: gps.pin,
        lat: gps.lat,
        lng: gps.lng,
        locality: gps.locality,
        mapsUrl: gps.mapsUrl,
        centreName: centre?.name || "",
        centreAddress: centre?.address || "",
        centrePin: centre?.pin || "",
        partner: centre?.name || "",
        serviceLabel,
        durationDays: Number(form.durationDays),
        dayRate: STEPDOWN_DAY_RATE,
        needAmbulance: wantsAmbulance,
        ambulanceRequestId,
        ambulancePickupPin: pickupPin,
        ambulancePickupAddress: pickupAddress,
        ambulancePickupLandmark: form.pickupLandmark || "",
        alternateMobile: String(form.alternateMobile || "").replace(/\D/g, ""),
        attendantMobile: String(form.alternateMobile || form.attendantMobile || "").replace(/\D/g, ""),
        total: pay.amountRupees,
        saleRupees: pay.saleRupees,
        couponCode: pay.couponCode,
        discountRupees: pay.discountRupees,
        highTrafficWait: queue.busy || queue.waited,
        bookedAt: new Date().toLocaleString(),
        bookedAtMs: Date.now(),
        ...initialOrderStatus("stepdown"),
        paymentMethod: "pending",
        paymentStatus: "awaiting_payment",
        paid: false,
        dischargeSummaryName: dischargeDraft?.fileName || "",
        dischargeSummaryType: dischargeDraft?.fileType || "",
        dischargeSummaryFile: dischargeDraft?.fileData || "",
        prescriptionName: rxDraft?.fileName || "",
        prescriptionType: rxDraft?.fileType || "",
        prescriptionFile: rxDraft?.fileData || "",
        prescription: rxDraft?.fileName || "",
      };
      const trackedBooking = persistOrder(withTracking(bookingDetails, "stepdown"));

      if (wantsAmbulance && centre) {
        const ambPay = paymentFromQuote(null, TRANSFER_FEE);
        persistOrder(
          withTracking(
            {
              requestId: ambulanceRequestId,
              patientName: booked.patientName,
              mobile: booked.mobile,
              pickupAddress,
              pinCode: pickupGps?.pinCode || pickupPin || gps.pinCode,
              pin: pickupGps?.pin || pickupPin || gps.pin,
              lat: form.pickupLat ?? pickupGps?.lat ?? gps.lat,
              lng: form.pickupLng ?? pickupGps?.lng ?? gps.lng,
              locality:
                form.pickupArea ||
                pickupGps?.locality ||
                pickupGps?.area ||
                gps.locality,
              mapsUrl: form.pickupMapsUrl || pickupGps?.mapsUrl || gps.mapsUrl,
              emergencyType: "non-emergency",
              destinationName: centre.name,
              destinationAddress: centre.address,
              destinationPin: centre.pin,
              linkedStepDownId: bookingId,
              partner: "MediHome Ambulance",
              notes: [
                `Automatic transfer to ${centre.name}, ${centre.address} (PIN ${centre.pin}).`,
                form.pickupLandmark ? `Pickup: ${form.pickupLandmark}.` : "",
                `Linked step-down booking ${bookingId}.`,
              ]
                .filter(Boolean)
                .join(" "),
              total: ambPay.amountRupees,
              saleRupees: ambPay.saleRupees,
              couponCode: ambPay.couponCode,
              discountRupees: ambPay.discountRupees,
              requestedAt: new Date().toLocaleString(),
              requestedAtMs: Date.now(),
              ...partnerAcceptFields(),
              trackStatus: "assigned",
              status: "Partner assigned — ambulance transfer",
              paymentMethod: "pending",
              paymentStatus: "awaiting_payment",
              paid: false,
            },
            "ambulance"
          )
        );
      }
      setBooking(trackedBooking);
      setFlowStep("placed");
      setForm(emptyStepdownForm());
      setDischargeDraft(null);
      setRxDraft(null);
      setErrors({});
      setPayQuote(null);
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
        kind: "stepdown",
        pin: booking.pinCode || booking.pin,
        name: booking.patientName,
        mobile: booking.mobile,
        reference: booking.bookingId,
        description: "MediHome step-down stay",
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

  const handleCancelBooking = (fields) => {
    if (!booking || !fields) return;
    setCancelling(true);
    try {
      const next = persistOrder(booking, fields);
      setBooking(next);
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    const id = booking?.bookingId || booking?.id;
    if (!id || (flowStep !== "placed" && flowStep !== "paid")) return undefined;
    let cancelled = false;
    const tick = async () => {
      const latest = await refreshOrderFromServer(id);
      if (!cancelled && latest) setBooking(latest);
    };
    tick();
    const timer = setInterval(tick, 6000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [booking?.bookingId, booking?.id, flowStep]);

  const startNew = () => {
    setBooking(null);
    setFlowStep("placed");
    setTab("find");
    setForm(emptyStepdownForm());
    setDischargeDraft(null);
    setRxDraft(null);
    setPayMethod("cod");
    setPayQuote(null);
    setErrors({});
  };

  if (booking && (flowStep === "placed" || flowStep === "pay" || flowStep === "paid")) {
    const partnerName = booking.partner || booking.centreName || "Recovery centre";
    const cancelled = isStepdownCancelled(booking);
    const admitted = isStepdownAdmitted(booking);
    const backHome = isStepdownDischarged(booking);
    const decision = stepdownBookingDecision(booking);
    const statusLabel = orderCurrentStatus(booking);
    const stageLabel = stepdownStageLabel(booking);
    return (
      <>
        <style>{styles}</style>
        {busyWait ? <BusyWait kind="stepdown" traffic={busyWait} /> : null}
        <div className="service-page">
          <section className="service-confirm">
            {flowStep === "placed" ? (
              <>
                <div className="success-icon">
                  {cancelled || decision === "unavailable" ? "!" : "✓"}
                </div>
                <h1>
                  {cancelled
                    ? "Booking Cancelled"
                    : decision === "unavailable"
                      ? "Not Available"
                      : stageLabel}
                </h1>
                <p>
                  {cancelled
                    ? "This step-down booking has been cancelled."
                    : backHome
                      ? "The centre has sent the patient back home."
                      : admitted
                      ? "The centre has admitted the patient."
                      : decision === "confirmed"
                        ? booking.needAmbulance
                          ? "Your recovery stay and ambulance transfer are accepted. Track below."
                          : "Your recovery stay is accepted. Track the centre below."
                        : decision === "unavailable"
                          ? "The centre marked this booking Not Available. It is not confirmed."
                          : awaitingPartnerMessage("stepdown")}
                </p>
              </>
            ) : null}
            {flowStep === "pay" ? (
              <>
                <div className="success-icon">₹</div>
                <h1>Payment</h1>
                <p>Pay now or continue tracking — you can also pay later from My Orders.</p>
              </>
            ) : null}
            {flowStep === "paid" ? (
              <>
                <div className="success-icon">{cancelled ? "!" : "✓"}</div>
                <h1>{cancelled ? "Booking Cancelled" : "Payment Received"}</h1>
                <p>
                  {cancelled
                    ? "This step-down booking has been cancelled."
                    : "Thank you. Track the stay from My Orders anytime."}
                </p>
              </>
            ) : null}
            <div className="confirm-card">
              <div className="confirm-head">
                <h2>Booking Details</h2>
                <span>{booking.bookingId}</span>
              </div>
              <div className="confirm-row">
                <span>Status</span>
                <strong>{statusLabel}</strong>
              </div>
              <div className="confirm-row">
                <span>Centre</span>
                <strong>{partnerName}</strong>
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
                <strong>{maskMobile(booking.mobile)}</strong>
              </div>
              {booking.alternateMobile || booking.attendantMobile ? (
                <div className="confirm-row">
                  <span>Alternate Mobile No</span>
                  <strong>{maskMobile(booking.alternateMobile || booking.attendantMobile)}</strong>
                </div>
              ) : null}
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
                <span>Check-in time</span>
                <strong>{booking.timeSlot || CHECK_IN_TIME}</strong>
              </div>
              <div className="confirm-row">
                <span>No of Days</span>
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
                  {flowStep === "paid" || booking.paid
                    ? paymentMethodSummary(booking.paymentMethod, "Pay at centre")
                    : "Pending — pay anytime from My Orders"}
                </strong>
              </div>
              <div className="confirm-row">
                <span>Discharge Summary</span>
                <strong>
                  {booking.dischargeSummaryFile ? (
                    <a href={booking.dischargeSummaryFile} target="_blank" rel="noreferrer">
                      {booking.dischargeSummaryName || "View"}
                    </a>
                  ) : (
                    booking.dischargeSummaryName || "Not uploaded"
                  )}
                </strong>
              </div>
              <div className="confirm-row">
                <span>Prescription</span>
                <strong>
                  {booking.prescriptionFile ? (
                    <a href={booking.prescriptionFile} target="_blank" rel="noreferrer">
                      {booking.prescriptionName || booking.prescription || "View"}
                    </a>
                  ) : (
                    booking.prescriptionName || booking.prescription || "Not uploaded"
                  )}
                </strong>
              </div>
              <div className="confirm-row">
                <span>Ambulance to centre</span>
                <strong>{booking.needAmbulance ? "Yes · booked with stay" : "No"}</strong>
              </div>
              {booking.needAmbulance ? (
                <div className="confirm-row">
                  <span>Pickup Location</span>
                  <strong>
                    {[
                      booking.ambulancePickupLandmark,
                      booking.ambulancePickupAddress,
                      booking.ambulancePickupPin,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Home address"}
                  </strong>
                </div>
              ) : null}
              {booking.ambulanceRequestId ? (
                <div className="confirm-row">
                  <span>Ambulance ID</span>
                  <strong>{booking.ambulanceRequestId}</strong>
                </div>
              ) : null}
              {booking.patientAccountId ? (
                <div className="confirm-row">
                  <span>Patient account</span>
                  <strong>{booking.patientAccountId}</strong>
                </div>
              ) : null}
              {booking.inchargeName ? (
                <div className="confirm-row">
                  <span>Centre in-charge</span>
                  <strong>
                    {booking.inchargeName}
                    {booking.inchargeMobile ? ` · ${booking.inchargeMobile}` : ""}
                  </strong>
                </div>
              ) : null}
            </div>
            {flowStep !== "pay" ? (
              <AssignedAgent
                record={{
                  ...booking,
                  agentRole: booking.inchargeRole || booking.agentRole || "Centre in-charge",
                }}
              />
            ) : null}
            {flowStep !== "pay" ? (
              <StepdownCancelBlock
                order={booking}
                busy={cancelling}
                onCancel={handleCancelBooking}
              />
            ) : null}
            {flowStep === "pay" && !cancelled ? (
              <form className="service-pay-form" onSubmit={handlePayment}>
                <PaymentBlock
                  kind="stepdown"
                  amount={Number(booking.total) || 0}
                  pin={booking.pinCode}
                  method={payMethod}
                  onMethodChange={setPayMethod}
                  onQuoteChange={setPayQuote}
                  guestDetails={booking}
                  cashLabel="Pay at centre"
                />
                <div className="confirm-actions">
                  <button type="submit" className="service-submit" disabled={paying}>
                    {paying ? "Processing…" : "Pay now"}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setFlowStep("placed")}
                  >
                    Back
                  </button>
                </div>
              </form>
            ) : null}
            {flowStep === "placed" ? (
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
                {!cancelled ? (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setFlowStep("pay")}
                  >
                    Pay now
                  </button>
                ) : null}
                {booking.ambulanceRequestId ? (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      window.location.hash = trackHref(booking.ambulanceRequestId);
                    }}
                  >
                    Track ambulance
                  </button>
                ) : null}
                <button type="button" className="ghost-button" onClick={startNew}>
                  Find another centre
                </button>
              </div>
            ) : null}
            {flowStep === "paid" ? (
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
                {booking.ambulanceRequestId ? (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      window.location.hash = trackHref(booking.ambulanceRequestId);
                    }}
                  >
                    Track ambulance
                  </button>
                ) : null}
                <button type="button" className="ghost-button" onClick={startNew}>
                  Find another centre
                </button>
              </div>
            ) : null}
          </section>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      {busyWait ? <BusyWait kind="stepdown" traffic={busyWait} /> : null}
      <div className={tab === "book" ? "lab-page sd-book-page" : "lab-page"}>
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
              <div className="sd-form-grid">
                <BookingFlow
                  idPrefix="sd"
                  layout="lab"
                  profile={profile}
                  values={form}
                  errors={errors}
                  alwaysAskDetails
                  alwaysAskAddress
                  onSelect={(option) => {
                    const clearIdentity = !option || option.id === SELF_BOOKING_ID || option.id === OTHER_BOOKING_ID;
                    setForm((prev) => ({
                      ...prev,
                      ...(clearIdentity
                        ? {
                            bookedFor: option?.id || "",
                            bookedForName: "",
                            bookedForRelation:
                              option?.id === OTHER_BOOKING_ID
                                ? "other"
                                : option?.id === SELF_BOOKING_ID
                                  ? "self"
                                  : "",
                            patientName: "",
                            gender: "",
                            age: "",
                            dob: "",
                            mobile: "",
                            ...emptyAddress(),
                          }
                        : bookingForPatch(option, profile)),
                    }));
                    setErrors((prev) => ({ ...prev, bookedFor: "" }));
                  }}
                  onChange={handleChange}
                  pinHint="Select the Village / Sector / Mohalla attached to this PIN."
                >
                <div className="lab-field sd-wide">
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
                    <option value="">Select a service</option>
                    {CARE_TYPES.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  {errors.serviceType ? <small className="lab-error">{errors.serviceType}</small> : null}
                </div>
                <div className="lab-field">
                  <label htmlFor="sd-alternate">Alternate Mobile No</label>
                  <input
                    id="sd-alternate"
                    name="alternateMobile"
                    inputMode="numeric"
                    maxLength="10"
                    autoComplete="off"
                    value={form.alternateMobile}
                    onChange={handleChange}
                    placeholder="Optional 10-digit mobile"
                  />
                  {errors.alternateMobile ? (
                    <small className="lab-error">{errors.alternateMobile}</small>
                  ) : (
                    <small className="lab-hint">Optional</small>
                  )}
                </div>
                <div className="lab-field sd-wide">
                  <DateMonthYearFields
                    idPrefix="sd-date"
                    name="date"
                    value={form.date}
                    min={today}
                    max={maxVisit}
                    required
                    error={errors.date || ""}
                    label="Start Date"
                    order="ymd"
                    onChange={handleChange}
                  />
                  <small className="lab-hint">Today or up to 6 months ahead.</small>
                </div>
                <div className="lab-field">
                  <label htmlFor="sd-slot">
                    Check-in time <em>*</em>
                  </label>
                  <select
                    id="sd-slot"
                    name="timeSlot"
                    value={form.timeSlot}
                    onChange={handleChange}
                  >
                    {openSlots.includes(CHECK_IN_TIME) || !form.date ? (
                      <option value={CHECK_IN_TIME}>{CHECK_IN_TIME}</option>
                    ) : (
                      <option value="">Select a date first</option>
                    )}
                  </select>
                  {form.date && openSlots.length === 0 ? (
                    <small className="lab-error">
                      2:00 PM check-in has passed for today. Choose a later date.
                    </small>
                  ) : errors.timeSlot ? (
                    <small className="lab-error">{errors.timeSlot}</small>
                  ) : (
                    <small className="lab-hint">Check-in is at 2:00 PM.</small>
                  )}
                </div>
                <div className="lab-field">
                  <label htmlFor="sd-days">
                    No of Days <em>*</em>
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
                    <div className="sd-pickup">
                      <p className="sd-picked">
                        An ambulance will be booked with this stay to{" "}
                        {selectedCentre
                          ? `${selectedCentre.name} (PIN ${selectedCentre.pin})`
                          : "the selected centre"}
                        . Set the pickup location below.
                      </p>
                      <label htmlFor="sd-pickup-pin">Pickup Location <em>*</em></label>
                      <div className="sd-pickup-row">
                        <input
                          id="sd-pickup-pin"
                          name="pickupPinCode"
                          inputMode="numeric"
                          maxLength="6"
                          value={form.pickupPinCode}
                          onChange={handleChange}
                          placeholder="Pickup PIN"
                        />
                        <button
                          type="button"
                          className="sd-pickup-btn"
                          onClick={handlePickupLocation}
                          disabled={locatingPickup}
                        >
                          {locatingPickup ? "Detecting…" : "Pickup Location"}
                        </button>
                      </div>
                      <input
                        id="sd-pickup-note"
                        name="pickupLandmark"
                        value={form.pickupLandmark}
                        onChange={handleChange}
                        placeholder="Ward, floor, gate or hospital name"
                      />
                      {form.pickupAddress || form.pickupCity ? (
                        <p className="sd-picked">
                          Pickup:{" "}
                          {[form.pickupLandmark, form.pickupAddress || [form.pickupArea, form.pickupCity, form.pickupPinCode].filter(Boolean).join(", ")]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      ) : (
                        <p className="sd-picked">
                          Tap Pickup Location to use the current GPS PIN, or type the hospital PIN.
                        </p>
                      )}
                      {errors.pickupPinCode ? (
                        <small className="lab-error">{errors.pickupPinCode}</small>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              <div className="lab-field sd-docs">
                <BookingDocumentUpload
                  idPrefix="sd-discharge"
                  label="Discharge Summary"
                  ask="Upload a photo or PDF of the hospital Discharge Summary."
                  readyText="Discharge Summary uploaded"
                  uploadLabel="Upload summary"
                  draft={dischargeDraft}
                  onChange={(next) => {
                    setDischargeDraft(next);
                    setErrors((prev) => ({ ...prev, dischargeSummary: "" }));
                  }}
                  error={errors.dischargeSummary || ""}
                />
              </div>
              <div className="lab-field sd-docs">
                <BookingDocumentUpload
                  idPrefix="sd-rx"
                  label="Prescription"
                  ask="Upload a photo or PDF of the prescription along with the Discharge Summary."
                  readyText="Prescription uploaded"
                  uploadLabel="Upload Rx"
                  draft={rxDraft}
                  onChange={(next) => {
                    setRxDraft(next);
                    setErrors((prev) => ({ ...prev, prescription: "" }));
                  }}
                  error={errors.prescription || ""}
                />
              </div>
              <div className="field full sd-pay">
                <PaymentBlock
                  kind="stepdown"
                  amount={stayTotal}
                  pin={form.pinCode}
                  method={payMethod}
                  onMethodChange={setPayMethod}
                  onQuoteChange={setPayQuote}
                  guestDetails={form}
                />
              </div>

              <p className="sd-cancel-policy-note">{STEPDOWN_CANCEL_POLICY}</p>
              <button type="submit" className="service-submit sd-amb-submit" disabled={submitting}>
                {submitting
                  ? "Booking…"
                  : form.needAmbulance === "yes"
                    ? "Confirm booking and ambulance"
                    : "Confirm step-down booking"}
              </button>
                </BookingFlow>
              </div>
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
.lab-card>input:not([type="radio"]):not([type="checkbox"]),.lab-field input:not([type="radio"]):not([type="checkbox"]),.lab-field select,.lab-field textarea{width:100%;box-sizing:border-box;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;font:inherit;font-size:14px;color:#143246;outline:none;height:38px;min-height:38px;background:#fff}
.lab-field textarea{height:auto;min-height:64px;resize:vertical}
.lab-field{margin-top:12px}
.lab-error{display:block;margin-top:6px;color:#d84b4b;font-size:12px}
.lab-hint{display:block;margin-top:6px;color:#5d7180;font-size:12px}
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
.sd-wide{grid-column:span 2}
.sd-docs,.sd-pay{grid-column:1/-1}
.sd-picked{margin:8px 0 0;color:#5d7180;font-size:13px}
.app-customer .lab-page.sd-book-page,
.app-frame .lab-page.sd-book-page,
.lab-page.sd-book-page{
  max-width:none!important;
  width:100%!important;
  margin-left:0!important;
  margin-right:0!important;
  padding:8px 14px 10px!important;
  box-sizing:border-box;
}
.sd-book-page .lab-kicker,.sd-book-page .lab-lead{display:none}
.sd-book-page .lab-head{margin:0 0 6px;align-items:center}
.sd-book-page .lab-head h1{font-size:16px}
.sd-book-page .lab-card{padding:8px 10px}
.sd-book-page .lab-card-head{display:none}
.sd-book-page .sd-form-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:8px 10px;align-items:start}
.sd-book-page .lab-field{margin-top:0}
.sd-book-page .book-for{grid-column:1/-1}
.sd-book-page .lab-field.lab-span{grid-column:span 2}
.sd-book-page .sd-wide{grid-column:span 2}
.sd-book-page .sd-docs{grid-column:span 2}
.sd-book-page .sd-pay{grid-column:span 3}
.sd-book-page .sd-amb-submit{grid-column:span 1;align-self:end;width:100%;min-height:36px}
.sd-book-page .lab-field input:not([type="radio"]):not([type="checkbox"]),
.sd-book-page .lab-field select,
.sd-book-page .dmy-row select{height:34px;min-height:34px}
.sd-book-page .lab-hint{display:none}
.sd-book-page .sd-picked{margin:2px 0 0;font-size:11px}
.sd-book-page .addr-fields{grid-template-columns:repeat(4,minmax(0,1fr));gap:6px 10px}
.sd-book-page .addr-field:has(.addr-pin-row){grid-column:span 2}
.sd-book-page .addr-confirm{padding:6px 8px}
.sd-book-page .addr-confirm-title,.sd-book-page .addr-confirm dl{display:none}
.sd-book-page .addr-confirm-check{margin-top:0;font-size:12px}
.sd-book-page .pay-block{margin:0}
.sd-book-page .pay-kicker{margin:0 0 4px}
.sd-book-page .lab-field .checkout-rx p{display:none}
.sd-book-page .checkout-rx-btn{min-height:28px;font-size:11px}
.sd-book-page .service-submit{margin-top:4px;min-height:36px}
.sd-link{border:0;background:none;padding:0;color:#1a6b7a;font:inherit;font-weight:700;cursor:pointer}
.sd-choice{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.lab-field .sd-choice label{display:inline-flex;align-items:center;justify-content:center;gap:5px;width:auto;min-width:52px;max-width:max-content;margin:0;min-height:24px;height:24px;padding:0 8px;border:1px solid #d7e2e9;border-radius:6px;background:#fff;font-size:11px;font-weight:700;line-height:1;color:#143246;cursor:pointer;box-sizing:border-box}
.lab-field .sd-choice label.is-on{border-color:#1a6b7a;background:#e8f4f6;color:#1a6b7a}
.lab-field .sd-choice input{width:12px;min-width:12px;max-width:12px;height:12px;min-height:12px;margin:0;padding:0;border:none;background:transparent;accent-color:#1a6b7a;flex:0 0 12px}
.sd-pickup{margin-top:10px;display:grid;gap:8px}
.sd-pickup-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}
.sd-pickup-btn{border:0;border-radius:8px;background:#1a6b7a;color:#fff;font:inherit;font-size:12px;font-weight:800;min-height:38px;padding:0 12px;cursor:pointer;white-space:nowrap}
.sd-pickup-btn:disabled{opacity:.65;cursor:wait}
.sd-cancel-policy-note{grid-column:1/-1;margin:4px 0 0;padding:8px 10px;border:1px solid #ead8c4;border-radius:8px;background:#fff8f0;font-size:12px;line-height:1.4;color:#8a4b12}
.sd-book-page .sd-cancel-policy-note{grid-column:1/-1;display:block}
.sd-amb-submit{width:auto;min-width:0;min-height:32px;padding:0 14px;font-size:13px}
.lab-field .checkout-rx{margin:0}
.lab-field .checkout-rx label{display:block;margin:0 0 6px;font-size:12px;font-weight:700;color:#34546b}
.lab-field .checkout-rx label em{color:#d84b4b;font-style:normal}
.lab-field .checkout-rx p{margin:0 0 8px;font-size:13px;color:#5d7180;line-height:1.4}
.lab-field .checkout-rx.is-ready p{color:#1a6b7a;font-weight:700}
.lab-field .checkout-rx input[type="file"]{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.checkout-rx-actions{display:flex;flex-wrap:wrap;gap:8px}
.checkout-rx-btn{border:1px solid #c5d6db;border-radius:8px;background:#1a6b7a;color:#fff;font:inherit;font-size:12px;font-weight:700;min-height:34px;padding:0 12px;cursor:pointer}
.checkout-rx-btn.is-quiet{background:#fff;color:#1a6b7a}
.checkout-rx-btn:disabled{opacity:.65;cursor:wait}
.checkout-rx-error{display:block;margin-top:6px;color:#d84b4b;font-size:12px}
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
.confirm-actions .service-submit,.confirm-actions .ghost-button{width:auto;min-width:160px;margin:0;display:inline-flex;align-items:center;justify-content:center;text-decoration:none}
.ghost-button{border:1px solid #d8e3e9;border-radius:8px;background:#fff;color:#34546b;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;min-height:40px;padding:8px 14px;box-sizing:border-box}
.ghost-button:hover{background:#f7fbfe}
.service-pay-form{max-width:640px;margin:0 auto 14px;text-align:left}
.sd-book-page .lab-field.lab-span:has(.addr-fields){grid-column:1/-1}
@media (max-width:1100px){
  .sd-book-page .sd-form-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
  .sd-book-page .sd-pay{grid-column:1/-1}
  .sd-book-page .sd-amb-submit{grid-column:1/-1}
}
@media (max-width:800px){
  .lab-page,.service-page{padding:14px}
  .sd-form-grid{grid-template-columns:1fr}
  .sd-wide,.sd-docs,.sd-pay{grid-column:1/-1}
  .sd-book-page .sd-form-grid{grid-template-columns:1fr 1fr}
  .sd-book-page .addr-fields{grid-template-columns:1fr 1fr}
  .sd-centre{flex-direction:column}
  .sd-centre-actions{min-width:0}
}
`;

export default StepDownCare;
