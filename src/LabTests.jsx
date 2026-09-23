import React, { useEffect, useMemo, useState } from "react";
import PinGpsBlock from "./PinGpsBlock";
import AssignedAgent from "./AssignedAgent";
import { resolvePinLocation } from "./pinLocation";
import {
  loadAllOrders,
  persistOrder,
  refreshOrderFromServer,
  trackHref,
  withTracking,
} from "./orderTracking";
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
import { goToHash, parseAppHash } from "./hashRoute";
import {
  addTestToCart,
  LAB_BOOKING_OPEN_EVENT,
  readTestCart,
  removeTestFromCart,
  removeTestsForPartner,
  takeRxLabCheckout,
  TEST_CART_EVENT,
} from "./medicineCartStore";

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
  ppbs: { prepType: "none", instruction: "" },
  insulin: { prepType: "fasting", instruction: PREP_COPY.fasting },
  vitb12: { prepType: "none", instruction: "" },
  crp: { prepType: "none", instruction: "" },
  esr: { prepType: "none", instruction: "" },
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

function labHashBoot() {
  try {
    const { service, lab } = parseAppHash(window.location.hash || "");
    const serviceType =
      String(service || "").toLowerCase() === "radiology" ? "radiology" : "lab";
    const labId = String(lab || "").trim();
    const known =
      serviceType === "radiology"
        ? RADIOLOGY_PARTNERS.some((row) => row.id === labId)
        : LABS.some((row) => row.id === labId);
    return {
      serviceType,
      labId: known ? labId : "",
    };
  } catch {
    return { serviceType: "lab", labId: "" };
  }
}

function LabTests() {
  const boot = useMemo(() => labHashBoot(), []);
  const rxBoot = useMemo(() => takeRxLabCheckout(), []);
  const [hideCatalog] = useState(() => Boolean(rxBoot?.tests?.length));
  const registeredProfile = useMemo(() => getRegisteredProfile(), []);
  const profile = useMemo(() => readUserProfile(), []);
  const [serviceType, setServiceType] = useState(
    rxBoot?.serviceType || boot.serviceType
  );
  const [selectedLabId, setSelectedLabId] = useState(
    rxBoot?.serviceType === "radiology"
      ? ""
      : rxBoot?.partnerId || (boot.serviceType === "lab" ? boot.labId : "")
  );
  const [selectedTestId, setSelectedTestId] = useState(rxBoot?.tests?.[0]?.id || "");
  const [selectedTests, setSelectedTests] = useState(
    rxBoot?.serviceType === "radiology" ? [] : rxBoot?.tests || []
  );
  const [labTestQuery, setLabTestQuery] = useState("");
  const [selectedRadiologyPartnerId, setSelectedRadiologyPartnerId] = useState(
    rxBoot?.serviceType === "radiology"
      ? rxBoot?.partnerId || ""
      : boot.serviceType === "radiology"
        ? boot.labId
        : ""
  );
  const [selectedImagingId, setSelectedImagingId] = useState(
    rxBoot?.serviceType === "radiology" ? rxBoot?.tests?.[0]?.id || "" : ""
  );
  const [selectedImagingTests, setSelectedImagingTests] = useState(
    rxBoot?.serviceType === "radiology" ? rxBoot?.tests || [] : []
  );
  const [imagingQuery, setImagingQuery] = useState("");
  const [flowStep, setFlowStep] = useState(() => {
    if (rxBoot?.booking) return "pay";
    if (rxBoot?.tests?.length) return "book";
    return "select";
  });
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
  const [booking, setBooking] = useState(() => rxBoot?.booking || null);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payMethod, setPayMethod] = useState("cod");
  const [payQuote, setPayQuote] = useState(null);
  const busyKind = serviceType === "radiology" ? "radiology" : "lab";
  const busyWait = useBusyOverlay(submitting || paying, busyKind);
  const [prepPopup, setPrepPopup] = useState(null);

  const selectedLab = useMemo(() => LABS.find((lab) => lab.id === selectedLabId), [selectedLabId]);
  const labTestOptions = useMemo(() => {
    const all = (selectedLab?.tests || []).map((test, index) => ({
      ...test,
      sr: test.sr || index + 1,
      code: test.code || test.id || "—",
    }));
    const q = labTestQuery.trim().toLowerCase();
    if (!q) return [];
    const matched = all.filter((test) => {
      const name = String(test.name || "").toLowerCase();
      const code = String(test.code || "").toLowerCase();
      const sr = String(test.sr || "");
      return name.includes(q) || code.includes(q) || sr.includes(q);
    });
    return matched.slice(0, 80);
  }, [selectedLab, labTestQuery]);
  const selectedRadiologyPartner = useMemo(
    () => RADIOLOGY_PARTNERS.find((partner) => partner.id === selectedRadiologyPartnerId),
    [selectedRadiologyPartnerId]
  );
  const imagingSearchResults = useMemo(() => {
    const all = selectedRadiologyPartner?.tests || [];
    const q = imagingQuery.trim().toLowerCase();
    if (!q) return [];
    return all
      .filter(
        (test) =>
          !selectedImagingTests.some((item) => item.id === test.id) &&
          String(test.name || "")
            .toLowerCase()
            .includes(q)
      )
      .slice(0, 40);
  }, [selectedRadiologyPartner, imagingQuery, selectedImagingTests]);
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
    const id = booking?.bookingId;
    const kind = booking?.serviceType || booking?.kind;
    if (!id || kind !== "radiology") return undefined;
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
  }, [
    booking?.bookingId,
    booking?.partnerConfirmed,
    booking?.slotConfirmed,
    booking?.serviceType,
    booking?.kind,
  ]);

  useEffect(() => {
    if (!prepPopup) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setPrepPopup(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prepPopup]);

  useEffect(() => {
    if (!rxBoot?.tests?.length) return;
    const kind = rxBoot.serviceType === "radiology" ? "radiology" : "lab";
    const partnerId = rxBoot.partnerId;
    const partner = (kind === "radiology" ? RADIOLOGY_PARTNERS : LABS).find(
      (row) => row.id === partnerId
    );
    rxBoot.tests.forEach((test) =>
      addTestToCart(
        test,
        {
          kind,
          partnerId,
          partnerName: partner?.name || rxBoot.partner || "",
        },
        undefined,
        { open: false }
      )
    );
  }, [rxBoot]);

  useEffect(() => {
    const sync = () => {
      const cart = readTestCart();
      if (selectedLabId) {
        setSelectedTests(
          cart.filter(
            (test) =>
              (test.kind || "lab") === "lab" && test.partnerId === selectedLabId
          )
        );
      }
      if (selectedRadiologyPartnerId) {
        setSelectedImagingTests(
          cart.filter(
            (test) =>
              test.kind === "radiology" &&
              test.partnerId === selectedRadiologyPartnerId
          )
        );
      }
    };
    sync();
    window.addEventListener(TEST_CART_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(TEST_CART_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [selectedLabId, selectedRadiologyPartnerId]);

  useEffect(() => {
    const apply = (payload) => {
      if (!payload?.tests?.length) return;
      const kind = payload.serviceType === "radiology" ? "radiology" : "lab";
      const partnerId = payload.partnerId || "";
      const partner = (kind === "radiology" ? RADIOLOGY_PARTNERS : LABS).find(
        (row) => row.id === partnerId
      );
      payload.tests.forEach((test) =>
        addTestToCart(
          test,
          { kind, partnerId, partnerName: partner?.name || "" },
          undefined,
          { open: false }
        )
      );
      setServiceType(kind);
      if (kind === "radiology") {
        setSelectedRadiologyPartnerId(partnerId);
        setSelectedImagingTests(payload.tests);
        setSelectedImagingId(payload.tests[0]?.id || "");
      } else {
        setSelectedLabId(partnerId);
        setSelectedTests(payload.tests);
        setSelectedTestId(payload.tests[0]?.id || "");
      }
      if (payload.booking) {
        setBooking(payload.booking);
        setFlowStep("pay");
      } else {
        setFlowStep("book");
      }
    };
    const onBook = (event) => apply(event.detail || {});
    window.addEventListener(LAB_BOOKING_OPEN_EVENT, onBook);
    return () => window.removeEventListener(LAB_BOOKING_OPEN_EVENT, onBook);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("mediHomeLabBooking");
      if (!raw) return;
      const saved = JSON.parse(raw);
      const id = String(saved?.bookingId || saved?.id || "");
      if (!id) return;
      const found =
        loadAllOrders().find(
          (order) =>
            String(order.bookingId || "") === id || String(order.id || "") === id
        ) || saved;
      if (found.paid || found.paymentStatus === "paid") return;
      if (found.partnerConfirmStatus === "declined") return;
      setBooking(found);
      setFlowStep("placed");
    } catch {
      /* ignore */
    }
  }, []);

  const handleServiceChange = (type) => {
    setServiceType(type);
    setFlowStep("select");
    setErrors({});
  };

  const handleRadiologyPartnerChange = (e) => {
    setSelectedRadiologyPartnerId(e.target.value);
    setSelectedImagingId("");
    setImagingQuery("");
    setServiceType("radiology");
    setFlowStep("select");
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
      removeTestFromCart(test.id, selectedRadiologyPartnerId);
      setErrors((prev) => ({ ...prev, imaging: "" }));
      return;
    }
    addTestToCart(test, {
      kind: "radiology",
      partnerId: selectedRadiologyPartnerId,
      partnerName: selectedRadiologyPartner?.name || "",
    });
    setSelectedImagingId(test.id);
    setErrors((prev) => ({ ...prev, imaging: "", radiologyPartner: "" }));
    if (test.prepType && test.prepType !== "none") {
      setPrepPopup({ test, kind: "imaging" });
    }
  };

  const clearImagingTests = () => {
    if (selectedRadiologyPartnerId) {
      removeTestsForPartner(selectedRadiologyPartnerId, "radiology");
    }
    setSelectedImagingId("");
    setImagingQuery("");
    setPrepPopup(null);
  };

  const selectPreferredLab = (labId) => {
    setSelectedLabId(labId);
    setSelectedTestId("");
    setLabTestQuery("");
    setServiceType("lab");
    setErrors((prev) => ({ ...prev, lab: "", test: "" }));
    setPrepPopup(null);
    window.requestAnimationFrame(() => {
      const search = document.getElementById("labTestSearch");
      if (search) search.focus();
      else document.getElementById("labTestPick")?.focus();
    });
  };

  const addLabTestFromDropdown = (testId) => {
    if (!testId) return;
    setServiceType("lab");
    if (!selectedLabId) {
      setErrors((prev) => ({ ...prev, lab: "Please select a lab tab first." }));
      return;
    }
    const index = selectedLab?.tests.findIndex((item) => item.id === testId) ?? -1;
    const raw = index >= 0 ? selectedLab.tests[index] : null;
    if (!raw) return;
    const test = {
      ...raw,
      sr: raw.sr || index + 1,
      code: raw.code || raw.id || "—",
    };
    if (selectedTests.some((item) => item.id === test.id)) {
      setErrors((prev) => ({ ...prev, test: "" }));
      return;
    }
    addTestToCart(test, {
      kind: "lab",
      partnerId: selectedLabId,
      partnerName: selectedLab?.name || "",
    });
    setSelectedTestId(test.id);
    setErrors((prev) => ({ ...prev, test: "", lab: "" }));
    if (test.prepType && test.prepType !== "none") {
      setPrepPopup({ test, kind: "lab" });
    }
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

  const keepPrepSelection = () => setPrepPopup(null);

  const cancelPrepSelection = () => {
    if (!prepPopup) return;
    if (prepPopup.kind === "lab") {
      if (selectedLabId) removeTestFromCart(prepPopup.test.id, selectedLabId);
      setSelectedTestId((prev) => (prev === prepPopup.test.id ? "" : prev));
    } else if (selectedRadiologyPartnerId) {
      removeTestFromCart(prepPopup.test.id, selectedRadiologyPartnerId);
      setSelectedImagingId((prev) => (prev === prepPopup.test.id ? "" : prev));
    }
    setPrepPopup(null);
  };

  const clearTests = () => {
    if (selectedLabId) removeTestsForPartner(selectedLabId, "lab");
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
    if (flowStep !== "book") return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      const kind = serviceType === "radiology" ? "radiology" : "lab";
      const queue = await holdForPartnerQueue(kind);
      const booked = withBookingIdentity(form, profile);
      const gps = await resolvePinLocation(booked.pinCode);
      const addr = applyResolvedPin(booked, gps);
      const pay = paymentFromQuote(payQuote, total);

      const bookingDetails = {
        bookingId:
          (serviceType === "lab" ? "MH-LAB-" : "MH-RAD-") +
          Math.floor(100000 + Math.random() * 900000),
        serviceType,
        preferredPartner: activePartner.name,
        preferredPartnerId: activePartner.id,
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
        ...diagnosticRequestFields(kind, {
          date: booked.date || form.date,
          timeSlot: form.timeSlot,
        }),
        paymentMethod: "pending",
        paymentStatus: "awaiting_payment",
        paid: false,
      };

      const trackedBooking = persistOrder(withTracking(bookingDetails, kind));

      setBooking(trackedBooking);
      setFlowStep(hideCatalog ? "pay" : "placed");
      if (activePartner?.id) {
        removeTestsForPartner(
          activePartner.id,
          serviceType === "radiology" ? "radiology" : "lab"
        );
      }

      localStorage.setItem("mediHomeLabBooking", JSON.stringify(trackedBooking));
      localStorage.setItem("mediHomeLastBooking", JSON.stringify(trackedBooking));
    } catch (error) {
      alert(error.message || "Booking could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!booking) return;
    setPaying(true);
    try {
      const kind = booking.kind || booking.serviceType || "lab";
      const amount = Number(booking.total || total) || 0;
      const pay = paymentFromQuote(payQuote, amount);
      const payment = await settleCheckoutPayment({
        method: payMethod,
        ...pay,
        kind,
        pin: booking.pinCode || booking.pin,
        name: booking.patientName,
        mobile: booking.mobile,
        reference: booking.bookingId || booking.id,
        description:
          kind === "radiology"
            ? "MediHome radiology booking"
            : "MediHome lab booking",
      });
      const next = persistOrder(booking, {
        ...payment,
        paymentStatus: "paid",
        paid: true,
        status: booking.partnerConfirmed ? "Confirmed" : booking.status,
      });
      setBooking(next);
      setFlowStep("paid");
      localStorage.setItem("mediHomeLabBooking", JSON.stringify(next));
      localStorage.setItem("mediHomeLastBooking", JSON.stringify(next));
    } catch (error) {
      alert(error.message || "Payment could not be completed.");
    } finally {
      setPaying(false);
    }
  };

  const startNewBooking = () => {
    setBooking(null);
    setPayMethod("cod");
    setPayQuote(null);
    setFlowStep("select");
    setServiceType("lab");
    setSelectedLabId("");
    setSelectedTestId("");
    setSelectedTests([]);
    setLabTestQuery("");
    setSelectedRadiologyPartnerId("");
    setSelectedImagingId("");
    setSelectedImagingTests([]);
    setImagingQuery("");
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

  if (booking && (flowStep === "placed" || flowStep === "pay" || flowStep === "paid")) {
    const tests = booking.tests || [];
    const partnerName =
      booking.preferredLab ||
      booking.preferredPartner ||
      booking.partner ||
      "Partner";
    const isLabBooking = (booking.serviceType || booking.kind) !== "radiology";
    return (
      <>
        <style>{styles}</style>
        {busyWait ? <BusyWait kind={busyKind} traffic={busyWait} /> : null}
        <div className="service-page lab-page">
          <section className="service-confirm">
            {flowStep === "placed" ? (
              <>
                <div className="success-icon">✓</div>
                <h1>
                  {isLabBooking
                    ? "Request sent"
                    : booking.partnerConfirmed
                      ? "Scan booking confirmed"
                      : isAwaitingCustomerSlotConfirm(booking)
                        ? "New time slot offered"
                        : "Scan request sent"}
                </h1>
                <p>
                  {isLabBooking
                    ? "Your request has been sent to the lab. Track sample collection below."
                    : booking.partnerConfirmed
                      ? "The imaging centre confirmed your slot. Track your appointment below."
                      : isAwaitingCustomerSlotConfirm(booking)
                        ? "Your requested slot was not available. Accept the centre’s offered slot to confirm the booking."
                        : "Your request has been sent to the imaging centre. The booking is confirmed after they accept your slot, or after you accept a new slot they offer."}
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
                <div className="success-icon">✓</div>
                <h1>Payment Received</h1>
                <p>Thank you. Track the visit and download reports from My Orders.</p>
              </>
            ) : null}

            <div className="confirm-card">
              <div className="confirm-head">
                <h2>Booking Details</h2>
                <span>{booking.bookingId}</span>
              </div>
              <div className="confirm-row">
                <span>{isLabBooking ? "Lab partner" : "Imaging partner"}</span>
                <strong>{partnerName}</strong>
              </div>
              <div className="tests-confirmation">
                <div className="booking-row-label">
                  {isLabBooking ? "Selected laboratory tests" : "Selected imaging studies"}
                </div>
                {tests.map((test) => (
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
                <span>{isLabBooking ? "Collection type" : "Appointment type"}</span>
                <strong>{booking.visitType === "home" ? "Home collection" : "Centre visit"}</strong>
              </div>
              <div className="confirm-row">
                <span>Date</span>
                <strong>{booking.date}</strong>
              </div>
              <div className="confirm-row">
                <span>
                  {booking.slotConfirmed
                    ? "Confirmed time slot"
                    : isAwaitingCustomerSlotConfirm(booking)
                      ? "Offered time slot"
                      : "Requested time slot"}
                </span>
                <strong>{appointmentSlotLabel(booking)}</strong>
              </div>
              <SlotOfferCard
                order={booking}
                onResolved={(next) => {
                  setBooking(next);
                  localStorage.setItem("mediHomeLabBooking", JSON.stringify(next));
                  localStorage.setItem("mediHomeLastBooking", JSON.stringify(next));
                }}
              />
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
                  {flowStep === "paid" || booking.paid
                    ? paymentMethodSummary(booking.paymentMethod, "Pay on visit / collection")
                    : "Pending — pay anytime from My Orders"}
                </strong>
              </div>
            </div>

            {flowStep !== "pay" &&
            (isLabBooking || booking.partnerConfirmed) ? (
              <AssignedAgent
                record={{
                  ...booking,
                  agentRole: isLabBooking
                    ? "Sample collection partner"
                    : "Imaging centre coordinator",
                }}
              />
            ) : null}

            {flowStep === "pay" ? (
              <form className="lab-pay-form" onSubmit={handlePayment}>
                <PaymentBlock
                  kind={isLabBooking ? "lab" : "radiology"}
                  amount={Number(booking.total) || 0}
                  pin={booking.pinCode}
                  method={payMethod}
                  onMethodChange={setPayMethod}
                  onQuoteChange={setPayQuote}
                  guestDetails={booking}
                  cashLabel="Cash On Visit / Collection"
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
                  {isLabBooking ? "Track sample collection" : "Track appointment"}
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setFlowStep("pay")}
                >
                  Pay now
                </button>
                <button type="button" className="ghost-button" onClick={startNewBooking}>
                  Book another test
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
                <button type="button" className="service-submit" onClick={startNewBooking}>
                  Book another test
                </button>
              </div>
            ) : null}
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
  const inBook = flowStep === "book";
  const labLocked = Boolean(boot.labId && isLab && selectedLabId === boot.labId);
  const radiologyLocked = Boolean(
    boot.labId && !isLab && selectedRadiologyPartnerId === boot.labId
  );
  const selectableLabTests = labTestOptions.filter(
    (test) => !selectedTests.some((item) => item.id === test.id)
  );

  return (
    <>
      <style>{styles}</style>
      {busyWait ? <BusyWait kind={busyKind} traffic={busyWait} /> : null}
      <div className="lab-page">
        <header className="lab-head">
          <div>
            <p className="lab-kicker">Diagnostics</p>
            <h1>
              {isLab
                ? selectedLab
                  ? selectedLab.name
                  : "Book Lab Tests"
                : selectedRadiologyPartner
                  ? selectedRadiologyPartner.name
                  : "Book Imaging"}
            </h1>
            <p className="lab-lead">
              {isLab
                ? "Home sample collection from your selected lab."
                : "Book imaging at your selected MediHome centre."}
            </p>
          </div>
          {hideCatalog ? null : !labLocked && !radiologyLocked ? (
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
          ) : (
            <a className="lab-change-partner" href="#home">
              Change {isLab ? "lab" : "centre"}
            </a>
          )}
        </header>

        <form className="lab-shell" onSubmit={handleBooking}>
          {hideCatalog ? null : (
          <section className="lab-card">
            <div className="lab-card-head">
              <h2>{isLab ? "Select Tests" : "Select Studies"}</h2>
              <p>
                {isLab
                  ? "Search and pick tests. They are added to the cart in the header."
                  : "Add MRI, CT, ultrasound or X-ray studies for this centre."}
              </p>
            </div>

            {isLab ? (
              <>
                {!labLocked ? (
                  <>
                    <p className="lab-label" id="lab-partner-tabs-label">
                      Diagnostic lab <em>*</em>
                    </p>
                    <div
                      className="lab-partner-tabs"
                      role="tablist"
                      aria-labelledby="lab-partner-tabs-label"
                    >
                      {LABS.map((lab) => (
                        <button
                          key={lab.id}
                          type="button"
                          role="tab"
                          aria-selected={selectedLabId === lab.id}
                          className={selectedLabId === lab.id ? "is-on" : ""}
                          onClick={() => {
                            selectPreferredLab(lab.id);
                            setFlowStep("select");
                          }}
                        >
                          {lab.name}
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
                {errors.lab ? <small className="lab-error">{errors.lab}</small> : null}

                {!inBook ? (
                  <>
                    <label className="lab-label" htmlFor="labTestSearch">
                      Search test <em>*</em>
                    </label>
                    <input
                      id="labTestSearch"
                      type="search"
                      value={labTestQuery}
                      disabled={!selectedLab}
                      autoComplete="off"
                      placeholder={
                        selectedLab
                          ? "Type test name, code, or S. No."
                          : "Select a lab first"
                      }
                      onChange={(event) => setLabTestQuery(event.target.value)}
                    />
                    {errors.test ? <small className="lab-error">{errors.test}</small> : null}

                    <div
                      className="lab-search-results"
                      role="listbox"
                      aria-label="Matching tests"
                    >
                      {!selectedLab ? (
                        <p className="lab-empty">Select a lab to search tests.</p>
                      ) : !labTestQuery.trim() ? (
                        <p className="lab-empty">
                          Start typing to see test names
                          {selectedLab.tests.length
                            ? ` (${selectedLab.tests.length} available)`
                            : ""}
                          .
                        </p>
                      ) : selectableLabTests.length === 0 ? (
                        <p className="lab-empty">No tests match “{labTestQuery.trim()}”.</p>
                      ) : (
                        selectableLabTests.map((test) => (
                          <button
                            key={test.id}
                            type="button"
                            role="option"
                            className="lab-search-row"
                            onClick={() => {
                              addLabTestFromDropdown(test.id);
                              setLabTestQuery("");
                            }}
                          >
                            <span className="lab-search-name">{test.name}</span>
                            <span className="lab-search-meta">
                              {test.code !== "—" ? `${test.code} · ` : ""}₹{test.price}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                    {selectedLab &&
                    labTestQuery.trim() &&
                    selectableLabTests.length > 0 &&
                    selectedLab.tests.length > labTestOptions.length ? (
                      <small className="lab-hint">
                        Showing {selectableLabTests.length} matches — refine search for more.
                      </small>
                    ) : null}
                  </>
                ) : (
                  <p className="lab-hint">
                    Complete patient details on the right to send this request to the partner.
                  </p>
                )}

                {selectedTests.length > 0 && !inBook ? (
                  <div className="lab-after-pick">
                    <button
                      type="button"
                      className="service-submit"
                      onClick={() => setFlowStep("book")}
                    >
                      Continue to booking
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                {!radiologyLocked ? (
                  <>
                    <label className="lab-label" htmlFor="radiologyPartner">
                      Imaging centre <em>*</em>
                    </label>
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
                  </>
                ) : null}
                {catalogErrorPartner ? (
                  <small className="lab-error">{catalogErrorPartner}</small>
                ) : null}

                {!inBook ? (
                  <>
                    <label className="lab-label" htmlFor="imagingSearch">
                      Search study <em>*</em>
                    </label>
                    <input
                      id="imagingSearch"
                      type="search"
                      value={imagingQuery}
                      disabled={!catalogPartner}
                      autoComplete="off"
                      placeholder={
                        catalogPartner
                          ? "Type study name (MRI, CT, ultrasound…)"
                          : "Select a centre first"
                      }
                      onChange={(event) => setImagingQuery(event.target.value)}
                    />
                    {catalogErrorTests ? (
                      <small className="lab-error">{catalogErrorTests}</small>
                    ) : null}
                    <div className="lab-search-results" role="listbox" aria-label="Matching studies">
                      {!catalogPartner ? (
                        <p className="lab-empty">Select a centre to search studies.</p>
                      ) : !imagingQuery.trim() ? (
                        <p className="lab-empty">
                          Start typing to see study names
                          {catalogPartner.tests.length
                            ? ` (${catalogPartner.tests.length} available)`
                            : ""}
                          .
                        </p>
                      ) : imagingSearchResults.length === 0 ? (
                        <p className="lab-empty">No studies match “{imagingQuery.trim()}”.</p>
                      ) : (
                        imagingSearchResults.map((test) => (
                          <button
                            key={test.id}
                            type="button"
                            role="option"
                            className="lab-search-row"
                            onClick={() => {
                              toggleImagingTest(test);
                              setImagingQuery("");
                            }}
                          >
                            <span className="lab-search-name">{test.name}</span>
                            <span className="lab-search-meta">₹{test.price}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <p className="lab-hint">
                    Complete patient details on the right to send this request to the centre.
                  </p>
                )}

                {selectedImagingTests.length > 0 && !inBook ? (
                  <div className="lab-after-pick">
                    <button
                      type="button"
                      className="service-submit"
                      onClick={() => setFlowStep("book")}
                    >
                      Continue to booking
                    </button>
                  </div>
                ) : null}
              </>
            )}

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
          )}

          {inBook ? (
          <section className="lab-card lab-book">
            <div className="lab-card-head">
              <h2>Patient And Slot</h2>
              <p>
                {isLab ? "Home collection or a visit to the lab." : "Centre appointment only."}
              </p>
            </div>
            <div className="lab-fields">
            {catalogTests.length ? (
              <div className="lab-selected-wrap">
                <p className="lab-label">Tests to book</p>
                <div className="lab-selected-list" aria-label="Prescription tests">
                  {catalogTests.map((test) => (
                    <div key={test.id} className="lab-selected-row">
                      <span className="lab-selected-main">
                        <strong>{test.name}</strong>
                        <em>₹{test.price}</em>
                      </span>
                    </div>
                  ))}
                </div>
                <p className="lab-label">
                  Total <strong>₹{isLab ? labTotal : radTotal}</strong>
                </p>
              </div>
            ) : null}
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
                order="ymd"
                onChange={handleChange}
              />
              <small className="lab-hint">Today or up to 6 months ahead. Slots must start at least 4 hours from now.</small>
            </div>

            <div className="lab-field">
              <label htmlFor="timeSlot">
                {isLab ? "Time slot" : "Preferred time slot"} <em>*</em>
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
              ) : !isLab ? (
                <small className="lab-hint">
                  If this slot is full, the imaging centre will offer another time. The booking is confirmed only after you accept that slot.
                </small>
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

            <div className="lab-book-foot">
              <strong>
                {activeTests.length
                  ? `${activeTests.length} selected · ₹${total}`
                  : `₹${total}`}
              </strong>
              <p className="lab-hint">
                Confirm to send this booking to the partner. You can track sample collection right away.
              </p>
              {hideCatalog ? (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => goToHash("#prescription")}
                >
                  Back to prescription
                </button>
              ) : (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setFlowStep("select")}
                >
                  Back to tests
                </button>
              )}
              <button type="submit" className="lab-submit" disabled={submitting}>
                {submitting ? "Confirming…" : "Confirm booking"}
              </button>
            </div>
            </BookingFlow>
            </div>
          </section>
          ) : null}
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
.lab-change-partner{align-self:flex-start;margin-top:4px;font-size:13px;font-weight:700;color:#1a6b7a;text-decoration:none}
.lab-change-partner:hover{text-decoration:underline}
.lab-partner-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}
.lab-partner-tabs button{border:1px solid #d3e2ea;background:#f7fbfd;color:#34546b;font:inherit;font-size:13px;font-weight:700;padding:9px 12px;border-radius:8px;cursor:pointer;line-height:1.2}
.lab-partner-tabs button.is-on{border-color:#1a6b7a;background:#1a6b7a;color:#fff;box-shadow:0 1px 3px rgba(20,50,70,.12)}
.lab-partner-tabs button:hover{border-color:#8ebcc8}
.lab-partner-tabs button.is-on:hover{border-color:#145864;background:#145864}
.lab-catalog{margin-top:10px;border:1px solid #e8eef2;border-radius:10px;overflow:auto;background:#fff;max-height:min(52vh,420px)}
.lab-catalog.is-selected{max-height:220px;margin-top:0}
.lab-catalog-head,.lab-catalog-row{display:grid;grid-template-columns:56px 88px minmax(0,1fr) 72px;gap:8px;align-items:center;width:100%;box-sizing:border-box;padding:8px 12px;text-align:left}
.lab-catalog-head{position:sticky;top:0;z-index:1;background:#f7fafc;color:#5d7180;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;border-bottom:1px solid #e8eef2}
.lab-catalog-row{border:0;border-top:1px solid #eef3f6;background:#fff;color:inherit;cursor:pointer;font:inherit}
.lab-catalog-row:hover{background:#f7fbfd}
.lab-catalog-row.is-on{background:#eef7f9}
.lab-catalog-row.is-static{cursor:default}
.lab-col-sr{font-size:12px;font-weight:700;color:#5d7180}
.lab-col-code{font-size:12px;font-weight:700;color:#1a6b7a;word-break:break-all}
.lab-col-name{font-size:13px;font-weight:600;color:#143246;min-width:0;display:flex;align-items:center;justify-content:space-between;gap:8px}
.lab-col-mrp{font-size:13px;font-weight:800;color:#143246;text-align:right}
.lab-selected-wrap{margin-top:14px}
.lab-selected-list{margin-top:12px;border:1px solid #e8eef2;border-radius:10px;overflow:hidden;background:#fff;min-height:72px}
.lab-selected-row{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:10px 14px;border:0;border-top:1px solid #eef3f6;background:#fff;box-sizing:border-box}
.lab-selected-row:first-child{border-top:0}
.lab-selected-main{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
.lab-selected-main strong{font-size:13px;font-weight:650;color:#143246}
.lab-selected-main em{font-style:normal;font-size:13px;font-weight:800;color:#1a6b7a}
.lab-after-pick{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.lab-after-pick .lab-cart-btn,.lab-after-pick .service-submit{width:auto;min-width:140px;flex:1}
.lab-after-pick .ghost-button{flex:1;min-width:140px}
.lab-pay-form{text-align:left;margin:0 0 14px}
.lab-pay-form .confirm-actions{margin-top:12px}
.lab-remove{border:0;background:none;padding:0;color:#b64b4b;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;flex-shrink:0}
.lab-shell{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:stretch}
.lab-card{background:#fff;border:1px solid #e4ecef;border-radius:12px;padding:16px 18px;min-width:0;height:100%;box-sizing:border-box}
.lab-card-head{margin:0 0 14px;padding-bottom:12px;border-bottom:1px solid #eef3f6}
.lab-card-head h2{margin:0;font-size:16px;font-weight:700;color:#143246}
.lab-card-head p{margin:4px 0 0;font-size:13px;color:#5d7180;line-height:1.4}
.lab-label{display:block;margin:0 0 6px;font-size:12px;font-weight:700;color:#34546b}
.lab-label em,.lab-field label em{color:#d84b4b;font-style:normal}
.lab-card>input[type="search"],.lab-card>select,.lab-field input,.lab-field select,.lab-field textarea{
  width:100%;box-sizing:border-box;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;font:inherit;font-size:14px;color:#143246;outline:none;height:38px;min-height:38px;background:#fff;margin-bottom:8px
}
.lab-field textarea{height:auto;min-height:64px;resize:vertical;margin-bottom:0}
.lab-card>input[type="search"]:focus,.lab-card>select:focus,.lab-field input:focus,.lab-field select:focus,.lab-field textarea:focus{border-color:#1a6b7a}
.lab-error{display:block;margin-top:6px;color:#d84b4b;font-size:12px}
.lab-hint{display:block;margin-top:6px;color:#5d7180;font-size:12px}
.lab-search-results{margin-top:8px;border:1px solid #e8eef2;border-radius:10px;overflow:auto;background:#fff;max-height:min(42vh,320px)}
.lab-search-row{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;padding:10px 12px;border:0;border-top:1px solid #eef3f6;background:#fff;text-align:left;cursor:pointer;font:inherit;color:inherit}
.lab-search-row:first-child{border-top:0}
.lab-search-row:hover,.lab-search-row:focus-visible{background:#eef7f9}
.lab-search-name{font-size:14px;font-weight:650;color:#143246;line-height:1.35}
.lab-search-meta{font-size:12px;font-weight:600;color:#5d7180}
.lab-table{margin-top:14px;border:1px solid #e8eef2;border-radius:10px;overflow:hidden;background:#fff}
.lab-table-head{display:flex;justify-content:space-between;padding:8px 14px 8px 42px;background:#f7fafc;color:#5d7180;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.lab-empty{margin:0;padding:16px 14px;text-align:center;color:#7a8b96;font-size:13px;line-height:1.45}
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
  .lab-catalog-head,.lab-catalog-row{grid-template-columns:44px 72px minmax(0,1fr) 64px;gap:6px;padding:8px 10px}
  .lab-col-name{font-size:12px}
}
`;


export default LabTests;
