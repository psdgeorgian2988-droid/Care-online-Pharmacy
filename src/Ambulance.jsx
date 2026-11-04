import { useEffect, useMemo, useRef, useState } from "react";
import PinGpsBlock from "./PinGpsBlock";
import ShareAmbulanceLive from "./ShareAmbulanceLive";
import { captureLiveGps, locationErrorMessage, mapsUrlForCoords, osmEmbedUrl, resolvePinLocation, watchLiveGps } from "./pinLocation";
import { apiFetch } from "./apiBase.js";
import {
  ambulanceFee,
  ambulanceIsUrgent,
  AMBULANCE_TYPES,
  ambulanceTypeLabel,
  placedCoords,
  urgentAmbulanceErrors,
} from "./ambulanceBooking.js";
import AutofillTrap from "./AutofillTrap";
import { persistAndSendOrder, persistLocalOrder, refreshOrderFromServer, trackHref, withTracking } from "./orderTracking";
import { goHomeAfterPaidCheckout } from "./checkoutComplete";
import { parseAppHash } from "./hashRoute";
import { initialOrderStatus, isAwaitingPartnerConfirm, awaitingPartnerMessage } from "./orderConfirm";
import PaymentBlock from "./PaymentBlock";
import { paymentFromQuote, settleCheckoutPayment } from "./paymentApi";
import {
  checkoutPaymentPersistFields,
  checkoutUsesPayCta,
  paymentMethodSummary,
  persistUnsettledCheckoutFields,
  showCustomerPayNow,
} from "./paymentMethods";
import BusyWait, { useBusyOverlay } from "./BusyWait";
import { holdForPartnerQueue } from "./partnerQueue";
import { BillButton } from "./OrderBill.jsx";
import BookingFlow from "./BookingFlow";
import {
  applyResolvedPin,
  pickAddress,
  readUserProfile,
  validateAddress,
} from "./addressFields";
import {
  accountOwnerBooking,
  validateBookingDetails,
  withBookingIdentity,
} from "./bookingFor";
import { maskMobile } from "./personFields";

function readProfile() {
  return readUserProfile();
}

function NearestAmbulanceNote({ offer, note }) {
  if (offer) {
    const away = Number.isFinite(Number(offer.distanceKm)) ? ` · ${offer.distanceKm} km away` : "";
    return (
      <p className="pin-gps-hint">
        Nearest free {ambulanceTypeLabel(offer.ambulanceType)}: {offer.vehicleNumber}
        {offer.driverName ? ` · ${offer.driverName}` : ""}
        {away}
      </p>
    );
  }
  if (note) return <small>{note}</small>;
  return null;
}

function PickupMap({ form }) {
  if (!placedCoords(form.lat, form.lng)) return null;
  return (
    <>
      <iframe
        className="amb-location-map"
        title="Starting point"
        src={osmEmbedUrl(
          Math.round(Number(form.lat) * 1000) / 1000,
          Math.round(Number(form.lng) * 1000) / 1000
        )}
      />
      <a
        className="amb-location-link"
        href={form.mapsUrl || `https://www.google.com/maps?q=${form.lat},${form.lng}`}
        target="_blank"
        rel="noreferrer"
      >
        {form.liveGps ? "Booking location" : form.pinCode ? `PIN ${form.pinCode}` : "Map"} · {Number(form.lat).toFixed(5)}, {Number(form.lng).toFixed(5)}
      </a>
    </>
  );
}

function StartPoint({
  form,
  errors,
  locationNote,
  sharingLocation,
  watchingLocation,
  locatingPin,
  onChange,
  onShare,
  onTrack,
  showAddress = true,
}) {
  const addressMode = form.startMode === "address";
  return (
    <div className="field full amb-location">
      <p className="amb-location-kicker">Starting point</p>
      <div className="amb-start-choice" role="radiogroup" aria-label="Starting point">
        <label>
          <input
            type="radio"
            name="startMode"
            value="here"
            checked={!addressMode}
            onChange={onChange}
          />
          Where this booking is made
        </label>
        <label>
          <input
            type="radio"
            name="startMode"
            value="address"
            checked={addressMode}
            onChange={onChange}
          />
          Address and PIN
        </label>
      </div>
      {addressMode ? (
        showAddress ? (
          <>
            <label htmlFor="amb-pickup">
              Pickup address <span>*</span>
            </label>
            <textarea
              id="amb-pickup"
              name="pickupAddress"
              rows="2"
              value={form.pickupAddress || ""}
              onChange={onChange}
              placeholder="House, street, or landmark"
            />
            {errors.pickupAddress ? <small>{errors.pickupAddress}</small> : null}
            <div className="amb-pin-row">
              <input
                id="amb-track-pin"
                name="pinCode"
                value={form.pinCode || ""}
                onChange={onChange}
                placeholder="6-digit PIN"
                inputMode="numeric"
                maxLength={6}
                aria-label="PIN code"
              />
              <button type="button" className="amb-location-btn" onClick={() => onTrack()} disabled={locatingPin}>
                {locatingPin ? "Locating…" : "Track by PIN"}
              </button>
            </div>
            <PickupMap form={form} />
          </>
        ) : (
          <p className="pin-gps-hint">Enter the pickup address and PIN below.</p>
        )
      ) : (
        <>
          <p className="pin-gps-hint">The ambulance starts from the place where you are making this booking.</p>
          <button
            type="button"
            className="amb-location-btn"
            onClick={onShare}
            disabled={sharingLocation || watchingLocation || locatingPin}
          >
            {sharingLocation ? "Reading location…" : watchingLocation ? "Live location on" : "Share live location"}
          </button>
          {form.liveGps ? <PickupMap form={form} /> : null}
        </>
      )}
      {errors.location ? <small>{errors.location}</small> : null}
      {locationNote ? <small>{locationNote}</small> : null}
      {addressMode ? (
        <div className="amb-share-dear">
          <label htmlFor="amb-dear">Share the ambulance location with your dear one</label>
          <input
            id="amb-dear"
            name="dearOneMobile"
            value={form.dearOneMobile || ""}
            onChange={onChange}
            placeholder="Their 10-digit mobile"
            inputMode="numeric"
            maxLength={10}
            aria-label="Dear one's mobile"
          />
          <p className="pin-gps-hint">
            This pickup is a different place from where you are booking. After you book, send them the ambulance’s live location.
          </p>
          {errors.dearOneMobile ? <small>{errors.dearOneMobile}</small> : null}
        </div>
      ) : null}
    </div>
  );
}

function Ambulance() {
  const profile = useMemo(() => readProfile(), []);
  const [form, setForm] = useState({
    patientName: profile.name,
    mobile: profile.mobile,
    ...pickAddress(profile),
    ...accountOwnerBooking(profile),
    emergencyType: (() => {
      const service = parseAppHash(typeof window !== "undefined" ? window.location.hash : "").service;
      if (service === "life-support") return "life-support";
      if (service === "patient-transport" || service === "non-emergency" || service === "transfer") {
        return "patient-transport";
      }
      return "emergency";
    })(),
    notes: "",
    destinationAddress: "",
    pickupAddress: "",
    startMode: "here",
    dearOneMobile: "",
    lat: null,
    lng: null,
    mapsUrl: "",
    liveGps: false,
  });
  const [errors, setErrors] = useState({});
  const [request, setRequest] = useState(null);
  const [flowStep, setFlowStep] = useState("placed");
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payMethod, setPayMethod] = useState("cod");
  const [payReady, setPayReady] = useState(true);
  const [payQuote, setPayQuote] = useState(null);
  const [sharingLocation, setSharingLocation] = useState(false);
  const [watchingLocation, setWatchingLocation] = useState(false);
  const [locatingPin, setLocatingPin] = useState(false);
  const [locationNote, setLocationNote] = useState("");
  const [offer, setOffer] = useState(null);
  const [offerNote, setOfferNote] = useState("");
  const stopLiveWatch = useRef(null);
  const pinRequest = useRef(0);
  const urgentRide = ambulanceIsUrgent(form.emergencyType);
  const busyWait = useBusyOverlay(submitting || paying, "ambulance", urgentRide);
  const ambFee = ambulanceFee(form.emergencyType);

  useEffect(() => {
    const applyHash = () => {
      const { service } = parseAppHash(window.location.hash);
      const next =
        service === "life-support"
          ? "life-support"
          : service === "patient-transport" || service === "non-emergency" || service === "transfer"
            ? "patient-transport"
            : service === "emergency"
              ? "emergency"
              : "";
      if (!next) return;
      setForm((prev) =>
        prev.emergencyType === next ? prev : { ...prev, emergencyType: next }
      );
    };
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  useEffect(() => () => stopLiveWatch.current?.(), []);

  useEffect(() => {
    const addressStart = form.startMode === "address";
    const pin = addressStart ? String(form.pinCode || "").replace(/\D/g, "") : "";
    const gpsReady = form.liveGps === true && placedCoords(form.lat, form.lng);
    const addressReady = addressStart && (/^\d{6}$/.test(pin) || placedCoords(form.lat, form.lng));
    if (!form.emergencyType || (!gpsReady && !addressReady)) {
      setOffer(null);
      setOfferNote("");
      return undefined;
    }
    let cancelled = false;
    const params = new URLSearchParams({
      type: form.emergencyType,
      lat: placedCoords(form.lat, form.lng) ? String(form.lat) : "",
      lng: placedCoords(form.lat, form.lng) ? String(form.lng) : "",
      pin,
    });
    apiFetch(`/api/ambulance/nearest?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setOffer(data?.ambulance || null);
        setOfferNote(data?.ambulance ? "" : "No free ambulance of this type is available nearby.");
      })
      .catch(() => {
        if (!cancelled) setOfferNote("");
      });
    return () => {
      cancelled = true;
    };
  }, [form.emergencyType, form.lat, form.lng, form.pinCode, form.startMode, form.liveGps]);

  useEffect(() => {
    const id = request?.id || request?.requestId || request?.bookingId;
    if (!id || !isAwaitingPartnerConfirm(request)) return undefined;
    let cancelled = false;
    const tick = async () => {
      const latest = await refreshOrderFromServer(id);
      if (!cancelled && latest) setRequest(latest);
    };
    tick();
    const timer = window.setInterval(tick, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [request?.id, request?.requestId, request?.bookingId, request?.partnerConfirmStatus, request?.partnerConfirmed, request?.teamMemberId]);

  const applyLiveFix = (live) => {
    setSharingLocation(false);
    setWatchingLocation(true);
    setLocationNote("");
    setForm((prev) => ({
      ...prev,
      lat: live.lat,
      lng: live.lng,
      mapsUrl: live.mapsUrl,
      liveGps: true,
    }));
    setErrors((prev) => ({ ...prev, location: "" }));
  };

  const shareLocation = () => {
    if (sharingLocation || watchingLocation || locatingPin) return;
    pinRequest.current += 1;
    setSharingLocation(true);
    setLocationNote("");
    stopLiveWatch.current?.();
    stopLiveWatch.current = watchLiveGps(applyLiveFix, (error) => {
      setSharingLocation(false);
      setWatchingLocation(false);
      setLocationNote(
        locationErrorMessage(error) || "Location could not be read. Allow location and try again."
      );
    });
  };

  const trackByPin = async (rawPin) => {
    const pin = String(rawPin ?? form.pinCode ?? "").replace(/\D/g, "").slice(0, 6);
    if (!/^\d{6}$/.test(pin)) {
      setErrors((prev) => ({ ...prev, location: "Enter a 6-digit PIN to track." }));
      return;
    }
    const requestId = ++pinRequest.current;
    setLocatingPin(true);
    setLocationNote("");
    stopLiveWatch.current?.();
    stopLiveWatch.current = null;
    setWatchingLocation(false);
    setSharingLocation(false);
    try {
      const gps = await resolvePinLocation(pin);
      if (requestId !== pinRequest.current) return;
      if (!Number.isFinite(Number(gps.lat)) || !Number.isFinite(Number(gps.lng))) {
        throw new Error("This PIN could not be placed on the map.");
      }
      setForm((prev) => ({
        ...prev,
        pinCode: pin,
        lat: gps.lat,
        lng: gps.lng,
        mapsUrl: mapsUrlForCoords(gps.lat, gps.lng) || gps.mapsUrl,
        liveGps: false,
        locality: gps.locality || prev.locality || "",
      }));
      setErrors((prev) => ({ ...prev, location: "" }));
    } catch (error) {
      if (requestId !== pinRequest.current) return;
      setLocationNote(error.message || "Could not track this PIN.");
    } finally {
      if (requestId === pinRequest.current) setLocatingPin(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === "startMode") {
      stopLiveWatch.current?.();
      stopLiveWatch.current = null;
      setWatchingLocation(false);
      setSharingLocation(false);
      setForm((prev) => ({
        ...prev,
        startMode: value === "address" ? "address" : "here",
        lat: null,
        lng: null,
        mapsUrl: "",
        liveGps: false,
      }));
      setErrors((prev) => ({ ...prev, location: "", pickupAddress: "" }));
      setOffer(null);
      setOfferNote("");
      return;
    }
    const next =
      name === "mobile" || name === "dearOneMobile"
        ? value.replace(/\D/g, "")
        : name === "pinCode"
          ? value.replace(/\D/g, "").slice(0, 6)
          : value;
    setForm((prev) => ({ ...prev, [name]: next }));
    setErrors((prev) => ({ ...prev, [name]: "", ...(name === "pinCode" ? { location: "" } : {}) }));
    if (name === "pinCode" && /^\d{6}$/.test(next)) void trackByPin(next);
  };

  const validate = () => {
    if (ambulanceIsUrgent(form.emergencyType)) {
      const next = urgentAmbulanceErrors(form);
      setErrors(next);
      return Object.keys(next).length === 0;
    }
    const next = {
      ...validateBookingDetails(form, profile),
      ...(form.startMode === "address" ? validateAddress(form) : {}),
    };
    if (!form.emergencyType) next.emergencyType = "Select emergency type.";
    if (form.startMode !== "address" && (form.liveGps !== true || !placedCoords(form.lat, form.lng))) {
      next.location = "Share the location where you are booking.";
    }
    if (form.startMode === "address") {
      const dear = String(form.dearOneMobile || "").replace(/\D/g, "");
      if (dear && !/^[6-9]\d{9}$/.test(dear)) {
        next.dearOneMobile = "Enter a 10-digit mobile, or leave it blank.";
      }
    }
    if (String(form.destinationAddress || "").trim().length < 3) {
      next.destinationAddress = "Enter the drop location.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const urgent = ambulanceIsUrgent(form.emergencyType);
      const booked = urgent
        ? { ...form, mobile: String(form.mobile || "").replace(/\D/g, ""), patientName: profile.name || "Customer" }
        : {
            ...withBookingIdentity(form, profile),
            ...pickAddress(form),
          };
      const queue = await holdForPartnerQueue("ambulance", { urgent });
      let addr = booked;
      let live = placedCoords(form.lat, form.lng) ? form : null;
      if (urgent) {
        const addressStart = form.startMode === "address";
        if (!live) {
          if (!addressStart) {
            try {
              live = await captureLiveGps();
            } catch {
              live = null;
            }
          }
        }
        if (!live) {
          setErrors((prev) => ({
            ...prev,
            location: addressStart
              ? "Enter a 6-digit PIN for this address."
              : "Share the location where you are booking.",
          }));
          return;
        }
        const here = `${Number(live.lat).toFixed(5)}, ${Number(live.lng).toFixed(5)}`;
        const pin = String(form.pinCode || live.pinCode || "").replace(/\D/g, "").slice(0, 6);
        const line = String(form.pickupAddress || "").trim();
        addr = addressStart
          ? {
              ...booked,
              address: `${line}, ${pin}`,
              pickupAddress: `${line}, ${pin}`,
              pinCode: pin,
              lat: live.lat,
              lng: live.lng,
              mapsUrl: live.mapsUrl,
              liveGps: false,
            }
          : {
              ...booked,
              address: `Live location ${here}`,
              pickupAddress: `Live location ${here}`,
              lat: live.lat,
              lng: live.lng,
              mapsUrl: live.mapsUrl,
              liveGps: true,
            };
      } else if (form.startMode !== "address") {
        if (!live) {
          try {
            live = await captureLiveGps();
          } catch {
            live = null;
          }
        }
        if (!live) {
          setErrors((prev) => ({ ...prev, location: "Share the location where you are booking." }));
          return;
        }
        const here = `${Number(live.lat).toFixed(5)}, ${Number(live.lng).toFixed(5)}`;
        addr = {
          ...booked,
          address: `Live location ${here}`,
          pickupAddress: `Live location ${here}`,
          lat: live.lat,
          lng: live.lng,
          mapsUrl: live.mapsUrl,
          liveGps: true,
        };
      } else {
        const gps = await resolvePinLocation(booked.pinCode);
        addr = applyResolvedPin(booked, gps);
      }
      const total = ambulanceFee(form.emergencyType);
      const pay = paymentFromQuote(payQuote, total);

      const requestDetails = {
        requestId: "MH-AMB-" + Math.floor(100000 + Math.random() * 900000),
        patientName: booked.patientName,
        mobile: booked.mobile,
        ...addr,
        ...(live
          ? { lat: live.lat, lng: live.lng, mapsUrl: live.mapsUrl, liveGps: live.liveGps === true }
          : { liveGps: false }),
        emergencyType: form.emergencyType,
        destinationAddress: String(form.destinationAddress || "").trim(),
        startMode: form.startMode === "address" ? "address" : "here",
        dearOneMobile: String(form.dearOneMobile || "").replace(/\D/g, "").slice(0, 10),
        notes: form.notes.trim(),
        partner: offer?.partnerName || "MediHome Ambulance",
        total: pay.amountRupees,
        saleRupees: pay.saleRupees,
        couponCode: pay.couponCode,
        discountRupees: pay.discountRupees,
        highTrafficWait: queue.busy || queue.waited,
        requestedAt: new Date().toLocaleString(),
        requestedAtMs: Date.now(),
        kind: "ambulance",
        orderType: "ambulance",
        ...initialOrderStatus("ambulance"),
        status: "Waiting for the ambulance to accept",
        ...persistUnsettledCheckoutFields(
          ambulanceIsUrgent(form.emergencyType) ? "cod" : payMethod
        ),
      };

      const res = await apiFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestDetails),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.order) {
        const message = data.error || "No free ambulance of this type is available nearby.";
        setOffer(null);
        setOfferNote(message);
        setErrors((prev) => ({ ...prev, location: message }));
        return;
      }
      const trackedRequest = persistLocalOrder(
        withTracking({ ...requestDetails, ...data.order, kind: "ambulance" }, "ambulance")
      );
      setRequest(trackedRequest);
      setFlowStep("placed");
    } catch (error) {
      alert(error.message || "Ambulance request could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayment = async (event) => {
    event.preventDefault();
    if (!request) return;
    setPaying(true);
    try {
      const amount = Number(request.total) || 0;
      const method =
        request.emergencyType && ambulanceIsUrgent(request.emergencyType) ? "cod" : payMethod;
      const pay = paymentFromQuote(payQuote, amount);
      const payment = await settleCheckoutPayment({
        method,
        ...pay,
        kind: "ambulance",
        pin: request.pinCode || request.pin,
        name: request.patientName,
        mobile: request.mobile,
        reference: request.requestId,
        description: "MediHome ambulance",
      });
      await persistAndSendOrder(request, {
        ...payment,
        paymentStatus: "paid",
        paid: true,
        status: request.partnerConfirmed ? "Confirmed" : request.status,
      });
      goHomeAfterPaidCheckout();
    } catch (error) {
      alert(error.message || "Payment could not be completed.");
    } finally {
      setPaying(false);
    }
  };

  const startNew = () => {
    setRequest(null);
    setFlowStep("placed");
    setForm({
      patientName: profile.name,
      mobile: profile.mobile,
      ...pickAddress(profile),
      ...accountOwnerBooking(profile),
      emergencyType: "emergency",
      notes: "",
      destinationAddress: "",
      pickupAddress: "",
      startMode: "here",
      dearOneMobile: "",
      lat: null,
      lng: null,
      mapsUrl: "",
      liveGps: false,
    });
    setPayMethod("cod");
    setPayQuote(null);
    setLocationNote("");
    setSharingLocation(false);
    setWatchingLocation(false);
    setLocatingPin(false);
    stopLiveWatch.current?.();
    stopLiveWatch.current = null;
    setErrors({});
  };

  if (request && (flowStep === "placed" || flowStep === "pay" || flowStep === "paid")) {
    return (
      <>
        <style>{styles}</style>
        {busyWait ? <BusyWait kind="ambulance" traffic={busyWait} /> : null}
        <div className="service-page">
          <section className="service-confirm">
            {flowStep === "placed" && request.partnerConfirmed === true ? (
              <>
                <div className="success-icon">✓</div>
                <h1>Booking Confirmed</h1>
                <p>The ambulance driver accepted. Your booking is confirmed.</p>
              </>
            ) : null}
            {flowStep === "placed" &&
            String(request.partnerConfirmStatus || "").toLowerCase() === "declined" ? (
              <>
                <div className="success-icon">!</div>
                <h1>No ambulance accepted</h1>
                <p>Every free ambulance of this type is engaged or declined the request.</p>
              </>
            ) : null}
            {flowStep === "placed" && isAwaitingPartnerConfirm(request) ? (
              <>
                <div className="success-icon">…</div>
                <h1>Waiting for the driver</h1>
                <p>{awaitingPartnerMessage("ambulance")}</p>
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
                <div className="success-icon">✓</div>
                <h1>Payment Received</h1>
                <p>Thank you. Track the ambulance from My Orders anytime.</p>
              </>
            ) : null}
            <div className="confirm-card">
              <div className="confirm-head">
                <h2>Request Details</h2>
                <span>{request.requestId}</span>
              </div>
              <div className="confirm-row">
                <span>Service</span>
                <strong>{request.partner || "MediHome Ambulance"}</strong>
              </div>
              <div className="confirm-row">
                <span>Type</span>
                <strong>
                  {ambulanceTypeLabel(request.emergencyType)}
                </strong>
              </div>
              <div className="confirm-row">
                <span>Ambulance</span>
                <strong>
                  {[
                    request.vehicleNumber,
                    request.ambulanceDriver || request.technicianName,
                    Number.isFinite(Number(request.ambulanceDistanceKm))
                      ? `${request.ambulanceDistanceKm} km`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Searching"}
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
                  {flowStep === "paid" ||
                  request.paid ||
                  !showCustomerPayNow(request)
                    ? paymentMethodSummary(request.paymentMethod, "Cash on arrival")
                    : "Pending — pay anytime from My Orders"}
                </strong>
              </div>
              <div className="confirm-row">
                <span>Patient</span>
                <strong>{request.patientName}</strong>
              </div>
              <div className="confirm-row">
                <span>Mobile</span>
                <strong>{maskMobile(request.mobile)}</strong>
              </div>
              <div className="confirm-row">
                <span>Pickup Address</span>
                <strong>{request.pickupAddress}</strong>
              </div>
              <div className="confirm-row">
                <span>Pickup PIN</span>
                <strong>{request.pinCode}</strong>
              </div>
              <div className="confirm-row">
                <span>Location</span>
                <strong>
                  {Number.isFinite(Number(request.lat)) && Number.isFinite(Number(request.lng)) ? (
                    <a href={request.mapsUrl || `https://www.google.com/maps?q=${request.lat},${request.lng}`} target="_blank" rel="noreferrer">
                      {request.liveGps ? "Live location" : "Map"} · {Number(request.lat).toFixed(5)}, {Number(request.lng).toFixed(5)}
                    </a>
                  ) : (
                    "Shared from the pickup PIN"
                  )}
                </strong>
              </div>
              <div className="confirm-row">
                <span>Drop location</span>
                <strong>{request.destinationAddress || "—"}</strong>
              </div>
              <PinGpsBlock record={request} />
              {request.notes ? (
                <div className="confirm-row">
                  <span>Notes</span>
                  <strong>{request.notes}</strong>
                </div>
              ) : null}
            </div>
            <ShareAmbulanceLive order={request} />
            {request.partnerConfirmed === true ? (
              <AssignedAgent
                record={{
                  ...request,
                  agentName: request.ambulanceDriver || request.technicianName,
                  agentMobile: request.ambulanceDriverMobile || request.technicianMobile,
                  agentVehicle: request.vehicleNumber,
                  agentRole: "Ambulance driver",
                }}
              />
            ) : null}
            {flowStep === "pay" && showCustomerPayNow(request) ? (
              <form className="service-pay-form" onSubmit={handlePayment}>
                <PaymentBlock
                  kind="ambulance"
                  amount={Number(request.total) || 0}
                  pin={request.pinCode}
                  method={
                    ambulanceIsUrgent(request.emergencyType) ? "cod" : payMethod
                  }
                  onMethodChange={setPayMethod}
                  onQuoteChange={setPayQuote}
                  onReadyChange={setPayReady}
                  guestDetails={request}
                  cashLabel="Cash on arrival"
                />
                <div className="confirm-actions">
                  <button type="submit" className="service-submit" disabled={paying || !payReady}>
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
                {request.partnerConfirmed === true ? (
                  <button
                    type="button"
                    className="service-submit"
                    onClick={() => {
                      window.location.hash = trackHref(request.requestId);
                    }}
                  >
                    Track live
                  </button>
                ) : null}
                {showCustomerPayNow(request) ? (
                  <button
                    type="button"
                    className="service-submit"
                    onClick={() => setFlowStep("pay")}
                  >
                    Pay now
                  </button>
                ) : null}
                <BillButton order={request} />
                <button type="button" className="ghost-button" onClick={startNew}>
                  Request another ambulance
                </button>
              </div>
            ) : null}
            {flowStep === "paid" ? (
              <div className="confirm-actions">
                {request.partnerConfirmed === true ? (
                  <button
                    type="button"
                    className="service-submit"
                    onClick={() => {
                      window.location.hash = trackHref(request.requestId);
                    }}
                  >
                    Track live
                  </button>
                ) : null}
                <BillButton order={request} />
                <button type="button" className="ghost-button" onClick={startNew}>
                  Request another ambulance
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
      {busyWait ? <BusyWait kind="ambulance" traffic={busyWait} /> : null}
      <div className="service-page">
        <section className="service-hero">
          <div>
            <span className="service-kicker">MediHome Ambulance</span>
            <h1>Request An Ambulance</h1>
          </div>
        </section>

        <form className="service-form" onSubmit={handleSubmit} autoComplete="off">
          <AutofillTrap />
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
              <option value="">Select a service</option>
              {AMBULANCE_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            {errors.emergencyType && <small>{errors.emergencyType}</small>}
          </div>

          {urgentRide ? (
            <>
              <div className="field">
                <label htmlFor="amb-mobile">
                  Mobile number <span>*</span>
                </label>
                <input
                  id="amb-mobile"
                  name="mobile"
                  value={form.mobile}
                  onChange={handleChange}
                  placeholder="10-digit mobile"
                  inputMode="numeric"
                  maxLength={10}
                  autoComplete="tel"
                />
                {errors.mobile ? <small>{errors.mobile}</small> : null}
              </div>
              <StartPoint
                form={form}
                errors={errors}
                locationNote={locationNote}
                sharingLocation={sharingLocation}
                watchingLocation={watchingLocation}
                locatingPin={locatingPin}
                onChange={handleChange}
                onShare={shareLocation}
                onTrack={trackByPin}
              />
              <div className="field full">
                <label htmlFor="amb-drop">
                  Drop location <span>*</span>
                </label>
                <textarea
                  id="amb-drop"
                  name="destinationAddress"
                  rows="2"
                  value={form.destinationAddress}
                  onChange={handleChange}
                  placeholder="Hospital, home, or place to take the patient"
                />
                {errors.destinationAddress ? <small>{errors.destinationAddress}</small> : null}
              </div>
              <NearestAmbulanceNote offer={offer} note={offerNote} />
              <p className="pin-gps-hint">Cash on arrival.</p>
              <button type="submit" className="service-submit" disabled={submitting || Boolean(offerNote)}>
                {submitting ? "Booking ambulance…" : "Book ambulance"}
              </button>
            </>
          ) : (
          <>
          <StartPoint
            form={form}
            errors={errors}
            locationNote={locationNote}
            sharingLocation={sharingLocation}
            watchingLocation={watchingLocation}
            locatingPin={locatingPin}
            onChange={handleChange}
            onShare={shareLocation}
            onTrack={trackByPin}
            showAddress={false}
          />
          <BookingFlow
            idPrefix="amb"
            profile={profile}
            values={form}
            errors={errors}
            askWho={false}
            alwaysAskAddress={form.startMode === "address"}
            addressTitle="Pickup Address"
            onChange={handleChange}
            pinHint="Select the Village / Sector / Mohalla attached to this PIN."
          >
          <div className="field full">
            <label htmlFor="amb-drop">
              Drop location <span>*</span>
            </label>
            <textarea
              id="amb-drop"
              name="destinationAddress"
              rows="2"
              value={form.destinationAddress}
              onChange={handleChange}
              placeholder="Hospital, home, or place to take the patient"
            />
            {errors.destinationAddress ? <small>{errors.destinationAddress}</small> : null}
          </div>

          <div className="field full">
            <label htmlFor="amb-notes">Notes (optional)</label>
            <textarea
              id="amb-notes"
              name="notes"
              rows="2"
              value={form.notes}
              onChange={handleChange}
              placeholder="Symptoms, floor, landmark for the crew, etc."
            />
          </div>

          <div className="field full">
            <PaymentBlock
              kind="ambulance"
              amount={ambFee}
              pin={form.pinCode}
              method={payMethod}
              onMethodChange={setPayMethod}
              onQuoteChange={setPayQuote}
              onReadyChange={setPayReady}
              guestDetails={form}
            />
          </div>

          <NearestAmbulanceNote offer={offer} note={offerNote} />
          <button type="submit" className="service-submit" disabled={submitting || Boolean(offerNote)}>
            {submitting ? "Connecting PIN to map…" : "Confirm request"}
          </button>
          </BookingFlow>
          </>
          )}
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
.service-form small.pin-gps-hint,.pin-gps-hint{color:#5d7180}
.amb-location{display:flex;flex-direction:column;align-items:flex-start;gap:8px}
.amb-location-kicker{margin:0;font-size:12px;font-weight:800;color:#1a6b7a}
.amb-start-choice{display:flex;flex-wrap:wrap;gap:8px;width:100%}
.amb-start-choice label{display:flex;align-items:center;gap:6px;margin:0;border:1px solid #d7e2e9;border-radius:8px;padding:8px 10px;font-size:13px;font-weight:700;color:#143246}
.amb-start-choice input{width:auto;height:auto;min-height:0}
.amb-share-dear{width:100%;display:flex;flex-direction:column;gap:6px}
.amb-share-dear label{margin:0}
.amb-location-btn{border:0;border-radius:8px;background:#1a6b7a;color:#fff;font:inherit;font-size:13px;font-weight:800;min-height:38px;padding:0 14px;cursor:pointer}
.amb-location-btn:disabled{opacity:.65;cursor:wait}
.amb-location-link{color:#1a6b7a;font-size:13px;font-weight:800}
.amb-pin-row{display:flex;gap:8px;width:100%;align-items:center}
.amb-pin-row input{flex:1;min-width:0}
.amb-pin-row .amb-location-btn{flex:0 0 auto}
.amb-location-map{width:100%;height:180px;border:0;border-radius:10px;background:#e8eef2}
.confirm-row a{color:#1a6b7a;font-weight:800}
.service-submit{grid-column:1/-1;border:none;border-radius:8px;background:#1a6b7a;color:#fff;font-size:14px;font-weight:700;min-height:40px;cursor:pointer;font-family:inherit}
.confirm-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
.confirm-actions .service-submit,.confirm-actions .ghost-button{grid-column:auto;min-width:180px;display:inline-flex;align-items:center;justify-content:center;text-decoration:none}
.ghost-button{border:1px solid #d8e3e9;border-radius:8px;background:#fff;color:#34546b;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;min-height:40px;padding:8px 14px;box-sizing:border-box}
.ghost-button:hover{background:#f7fbfe}
.service-pay-form{max-width:640px;margin:0 auto 14px;text-align:left}
.service-confirm{max-width:640px;margin:12px auto;text-align:center}
.success-icon{width:52px;height:52px;margin:0 auto 10px;border-radius:50%;background:#e5f8ee;color:#1c9b61;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800}
.service-confirm h1{margin:0 0 6px;font-size:22px}
.service-confirm p{margin:0 0 14px;color:#5d7180;font-size:14px}
.confirm-card{text-align:left;background:#fff;border:1px solid #e4ecef;border-radius:12px;padding:14px;margin-bottom:14px}
.confirm-head{display:flex;justify-content:space-between;align-items:center;gap:10px;padding-bottom:8px;margin-bottom:4px;border-bottom:1px solid #e5edf1}
.confirm-head h2{margin:0;font-size:16px}
.confirm-head span{padding:5px 9px;border-radius:6px;background:#e8f4f6;color:#1a6b7a;font-size:12px;font-weight:800}
.confirm-row{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:9px 0;border-bottom:1px solid #edf1f3;font-size:14px}
.confirm-row span{color:#5d7180;flex-shrink:0}
.confirm-row strong{text-align:right;min-width:0;flex:1;overflow-wrap:anywhere;white-space:pre-wrap;word-break:break-word}
.service-form textarea#amb-hospital-name,.service-form textarea#amb-hospital-address{min-height:56px;overflow-wrap:anywhere;white-space:pre-wrap;word-break:break-word}
.confirm-row:last-child{border-bottom:none}
.confirm-note{margin:0 0 12px;font-size:13px;color:#7c7059}
@media (max-width:800px){.service-page{padding:14px}.service-form{grid-template-columns:1fr}}
`;

export default Ambulance;
