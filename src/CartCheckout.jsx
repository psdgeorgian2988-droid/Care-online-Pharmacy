import { useEffect, useMemo, useState } from "react";
import PinGpsBlock from "./PinGpsBlock";
import AssignedAgent from "./AssignedAgent";
import { BillButton } from "./OrderBill.jsx";
import { resolvePinLocation } from "./pinLocation";
import { persistOrder, trackHref, withTracking } from "./orderTracking";
import { buildPartnerRxShare } from "./rxPartnerShare";
import {
  checkMedicineAvailability,
  medicineAwaitingPharmacyFields,
  diagnosticRequestFields,
} from "./orderConfirm";
import PaymentBlock from "./PaymentBlock";
import { paymentFromQuote, settleCheckoutPayment } from "./paymentApi";
import { paymentMethodSummary } from "./paymentMethods";
import BusyWait, { PatienceNote, useBusyOverlay } from "./BusyWait";
import { holdForPartnerQueue } from "./partnerQueue";
import { findDiagnosticParty } from "./diagnosticPartners";
import BookingFlow from "./BookingFlow";
import DateMonthYearFields from "./DateMonthYearFields";
import {
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
import { isoDateToday } from "./personFields";
import {
  LAB_TIME_SLOTS,
  appointmentDateError,
  appointmentSlotError,
  isOpenAppointmentSlot,
  labBookingMaxDate,
  openAppointmentSlots,
} from "./appointmentSlot";
import { goToHash } from "./hashRoute";
import {
  MEDICINE_CART_EVENT,
  TEST_CART_EVENT,
  readMedicineCart,
  readTestCart,
  updateMedicineBatch,
  writeMedicineCart,
  writeTestCart,
} from "./medicineCartStore";
import MedicineBatchPick from "./MedicineBatchPick.jsx";
import {
  PRESCRIPTION_EVENT,
  hasPrescriptionDraft,
  prescriptionDraftName,
  readPrescriptionDraft,
} from "./prescriptionDraft";

function money(value) {
  return `₹${Number(value || 0)}`;
}

function requiresPrescription(medicine) {
  return Boolean(medicine?.prescription || medicine?.prescriptionRequired);
}

function groupTests(tests) {
  const groups = [];
  const index = new Map();
  for (const test of tests) {
    const key = `${test.kind || "lab"}:${test.partnerId}`;
    if (!index.has(key)) {
      const group = {
        key,
        kind: test.kind === "radiology" ? "radiology" : "lab",
        partnerId: test.partnerId,
        partnerName: test.partnerName || "Partner lab",
        items: [],
      };
      index.set(key, group);
      groups.push(group);
    }
    index.get(key).items.push(test);
  }
  return groups;
}

function paymentKindFor(medicines, tests) {
  if (medicines.length && tests.length) return "cart";
  if (medicines.length) return "medicine";
  if (tests.some((test) => test.kind === "radiology") && tests.every((test) => test.kind === "radiology")) {
    return "radiology";
  }
  return tests.length ? "lab" : "cart";
}

export default function CartCheckout() {
  const [medicines, setMedicines] = useState(() => readMedicineCart());
  const [tests, setTests] = useState(() => readTestCart());
  const profile = useMemo(() => readUserProfile() || {}, []);
  const [whoFor, setWhoFor] = useState(() => initialBookingFor(profile));
  const [fullName, setFullName] = useState(profile.name || "");
  const [mobileNumber, setMobileNumber] = useState(profile.mobile || "");
  const [delivery, setDelivery] = useState(() => ({
    ...emptyAddress(),
    ...pickAddress(profile),
  }));
  const [form, setForm] = useState(() => ({
    visitType: "home",
    date: "",
    timeSlot: "",
  }));
  const [errors, setErrors] = useState({});
  const [rxDraft, setRxDraft] = useState(() => readPrescriptionDraft());
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [payMethod, setPayMethod] = useState("cod");
  const [payQuote, setPayQuote] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [confirmed, setConfirmed] = useState(null);
  const busyWait = useBusyOverlay(placing, "medicine");

  useEffect(() => {
    const sync = () => {
      setMedicines(readMedicineCart());
      setTests(readTestCart());
    };
    const syncRx = () => setRxDraft(readPrescriptionDraft());
    window.addEventListener(MEDICINE_CART_EVENT, sync);
    window.addEventListener(TEST_CART_EVENT, sync);
    window.addEventListener(PRESCRIPTION_EVENT, syncRx);
    window.addEventListener("storage", sync);
    window.addEventListener("storage", syncRx);
    return () => {
      window.removeEventListener(MEDICINE_CART_EVENT, sync);
      window.removeEventListener(TEST_CART_EVENT, sync);
      window.removeEventListener(PRESCRIPTION_EVENT, syncRx);
      window.removeEventListener("storage", sync);
      window.removeEventListener("storage", syncRx);
    };
  }, []);

  const testGroups = useMemo(() => groupTests(tests), [tests]);
  const testTotal = tests.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const medicineTotal = medicines.reduce(
    (sum, item) => sum + Number(item.price || 0) * (item.quantity || 1),
    0
  );
  const medicineMrp = medicines.reduce(
    (sum, item) =>
      sum + Number(item.mrp || item.price || 0) * (item.quantity || 1),
    0
  );
  const billTotal = testTotal + medicineTotal;
  const billSale = testTotal + medicineMrp;
  const needsRx = medicines.some(requiresPrescription);
  const rxName = prescriptionFile?.name || rxDraft?.fileName || prescriptionDraftName();
  const hasRx = Boolean(prescriptionFile) || hasPrescriptionDraft() || Boolean(rxDraft?.fileName);
  const today = isoDateToday();
  const maxVisit = labBookingMaxDate();
  const openSlots = useMemo(
    () => openAppointmentSlots(LAB_TIME_SLOTS, form.date),
    [form.date]
  );
  const kind = paymentKindFor(medicines, tests);
  const empty = !medicines.length && !tests.length;

  const patchForm = (name, value) => {
    setForm((prev) => {
      const next = { ...prev, [name]: value };
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

  const placeOrder = async () => {
    if (empty) {
      alert("Your cart is empty.");
      return;
    }
    const source = {
      ...whoFor,
      patientName: fullName,
      mobile: mobileNumber,
      ...delivery,
    };
    const detailsErrors = validateBookingDetails(source, profile);
    if (tests.length) {
      const dateError = appointmentDateError(form.date);
      if (dateError) detailsErrors.date = dateError;
      const slotError = appointmentSlotError(form.timeSlot, form.date);
      if (slotError) detailsErrors.timeSlot = slotError;
    }
    if (Object.keys(detailsErrors).length) {
      setErrors(detailsErrors);
      alert(Object.values(detailsErrors)[0]);
      return;
    }
    if (needsRx && !hasRx) {
      alert("Please upload your prescription.");
      return;
    }

    setPlacing(true);
    try {
      if (medicines.length) {
        const availability = checkMedicineAvailability(medicines, medicines);
        if (!availability.ok) {
          alert(availability.message);
          return;
        }
      }
      if (medicines.length) await holdForPartnerQueue("medicine");
      if (tests.length) {
        await holdForPartnerQueue(
          tests.some((test) => test.kind === "radiology") ? "radiology" : "lab"
        );
      }
      const booked = withBookingIdentity(source, profile);
      const gps = await resolvePinLocation(booked.pinCode);
      const addr = applyResolvedPin(booked, gps);
      const pay = paymentFromQuote(payQuote, billTotal);
      const payment = await settleCheckoutPayment({
        method: payMethod,
        ...pay,
        kind,
        pin: gps.pinCode,
        name: booked.patientName,
        mobile: booked.mobile,
        reference: `cart-${Date.now()}`,
        description: "MediHome cart checkout",
      });
      const paid = isPaidMethod(payMethod, payment);

      let medicineOrder = null;
      if (medicines.length) {
        const availability = checkMedicineAvailability(medicines, medicines);
        medicineOrder = persistOrder(
          withTracking(
            {
              id: Date.now(),
              items: medicines.map((item) => ({
                id: item.id,
                name: item.name,
                salt: item.salt,
                strength: item.strength,
                packSize: item.packSize,
                category: item.category,
                price: item.price,
                mrp: item.mrp,
                prescription: requiresPrescription(item),
                quantity: item.quantity || 1,
                batchId: item.batchId || "",
                batchNo: item.batchNo || "",
                batchMfgDate: item.batchMfgDate || "",
                batchExpiryDate: item.batchExpiryDate || "",
              })),
              total: medicineTotal,
              saleRupees: medicineMrp,
              couponCode: pay.couponCode,
              discountRupees: pay.discountRupees,
              date: new Date().toLocaleString(),
              fullName: booked.patientName,
              ...whoFor,
              ...booked,
              mobileNumber: booked.mobile,
              prescription: rxName,
              ...buildPartnerRxShare("medicine"),
              ...addr,
              ...medicineAwaitingPharmacyFields(availability),
              ...payment,
              cartCheckout: true,
              paymentStatus: paid ? payment.paymentStatus || "paid" : payment.paymentStatus,
            },
            "medicine"
          )
        );
      }

      const testOrders = [];
      for (const group of testGroups) {
        const partner =
          findDiagnosticParty(group.kind, { id: group.partnerId, name: group.partnerName }) ||
          {};
        const groupTotal = group.items.reduce(
          (sum, item) => sum + Number(item.price || 0),
          0
        );
        const bookingDetails = {
          bookingId:
            (group.kind === "lab" ? "MH-LAB-" : "MH-RAD-") +
            Math.floor(100000 + Math.random() * 900000),
          serviceType: group.kind,
          kind: group.kind,
          preferredPartner: partner.name || group.partnerName,
          preferredPartnerId: partner.id || group.partnerId,
          partner: partner.name || group.partnerName,
          partnerId: partner.id || group.partnerId,
          partnerGstin: partner.gstin,
          partnerDlNo: partner.dlNo,
          partnerArea: partner.area,
          partnerAddress: partner.address,
          tests: group.items,
          total: groupTotal,
          saleRupees: groupTotal,
          couponCode: pay.couponCode,
          discountRupees: 0,
          ...booked,
          ...addr,
          visitType: group.kind === "radiology" ? "centre" : form.visitType,
          date: form.date,
          timeSlot: form.timeSlot,
          bookedAt: new Date().toLocaleString(),
          bookedAtMs: Date.now(),
          ...diagnosticRequestFields(group.kind, {
            date: form.date,
            timeSlot: form.timeSlot,
          }),
          ...payment,
          paid,
          paymentStatus: paid ? "paid" : payment.paymentStatus || "cod",
          cartCheckout: true,
        };
        const tracked = persistOrder(withTracking(bookingDetails, group.kind));
        testOrders.push(tracked);
        localStorage.setItem("mediHomeLabBooking", JSON.stringify(tracked));
        localStorage.setItem("mediHomeLastBooking", JSON.stringify(tracked));
      }

      writeMedicineCart([]);
      writeTestCart([]);
      setConfirmed({
        medicineOrder,
        testOrders,
        booked,
        addr,
        payment,
        total: pay.amountRupees,
        paid,
      });
    } catch (error) {
      alert(error.message || "Payment or order could not be completed.");
    } finally {
      setPlacing(false);
    }
  };

  if (confirmed) {
    const firstId =
      confirmed.medicineOrder?.id || confirmed.testOrders[0]?.bookingId || "";
    const awaitingPharmacy =
      Boolean(confirmed.medicineOrder) &&
      !confirmed.medicineOrder.partnerConfirmed;
    const onlyMedicine =
      Boolean(confirmed.medicineOrder) && !confirmed.testOrders.length;
    return (
      <section className="cart-checkout-page">
        <div className="checkout-panel">
          <h1>
            {awaitingPharmacy
              ? "Request sent to pharmacy"
              : confirmed.testOrders.some((row) => row.serviceType === "radiology") &&
                !confirmed.medicineOrder
                ? "Request sent"
                : "Order confirmed"}
          </h1>
          <PatienceNote kind="medicine" shown={false} />
          <p>
            Thank you, {confirmed.booked.patientName}.{" "}
            {awaitingPharmacy
              ? "Your medicine order was sent to the pharmacy for this PIN. It is confirmed after they review the prescription."
              : onlyMedicine
                ? "Your medicine order is confirmed."
                : "Medicines and tests in this cart were billed together."}
          </p>
          {confirmed.testOrders.some((row) => row.serviceType === "radiology") ? (
            <p>
              Imaging bookings stay as requests until the centre accepts your
              preferred slot, or until you accept a new slot they offer.
            </p>
          ) : null}
          <p>
            <strong>Total paid:</strong> {money(confirmed.total)}
          </p>
          <p>
            <strong>Payment:</strong>{" "}
            {paymentMethodSummary(
              confirmed.payment.paymentMethod,
              "Cash on delivery / visit"
            )}
          </p>
          {confirmed.medicineOrder ? (
            <p>
              <strong>Medicine order:</strong> #{confirmed.medicineOrder.id}
            </p>
          ) : null}
          {confirmed.testOrders.map((row) => (
            <p key={row.bookingId}>
              <strong>
                {row.serviceType === "radiology" ? "Imaging" : "Lab"} booking:
              </strong>{" "}
              {row.bookingId} · {row.partner}
            </p>
          ))}
          <PinGpsBlock record={confirmed.addr} />
          {confirmed.medicineOrder && !awaitingPharmacy ? (
            <AssignedAgent record={confirmed.medicineOrder} />
          ) : null}
          <div className="cart-actions">
            {confirmed.medicineOrder ? (
              <BillButton
                order={confirmed.medicineOrder}
                className="cart-btn cart-btn-primary"
              />
            ) : null}
            {firstId ? (
              <button
                type="button"
                className="cart-btn cart-btn-primary"
                onClick={() => {
                  window.location.hash = trackHref(firstId);
                }}
              >
                Track live
              </button>
            ) : null}
            <button
              type="button"
              className="cart-btn cart-btn-secondary"
              onClick={() => goToHash("#myorders")}
            >
              View my orders
            </button>
            <button
              type="button"
              className="cart-btn cart-btn-secondary"
              onClick={() => goToHash("#home")}
            >
              Back to Home
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="cart-checkout-page">
      {busyWait ? <BusyWait kind="medicine" traffic={busyWait} /> : null}
      <header className="cart-checkout-head">
        <p className="shop-cart-kicker">Billing</p>
        <h1>Checkout</h1>
        <p>Pay for medicines and tests together through one payment.</p>
      </header>

      {empty ? (
        <div className="checkout-panel">
          <p>Your cart is empty.</p>
          <div className="cart-actions">
            <button
              type="button"
              className="cart-btn cart-btn-secondary"
              onClick={() => goToHash("#medicine-search")}
            >
              Order medicines
            </button>
            <button
              type="button"
              className="cart-btn cart-btn-secondary"
              onClick={() => goToHash("#labs")}
            >
              Book tests
            </button>
          </div>
        </div>
      ) : (
        <div className="checkout-panel">
          <section className="cart-bill" aria-label="Bill">
            <h2>Bill</h2>
            {tests.length ? (
              <div className="cart-bill-block">
                <h3>Tests</h3>
                {testGroups.map((group) => (
                  <div key={group.key}>
                    <p className="cart-bill-partner">
                      {group.partnerName}
                      <span>{group.kind === "radiology" ? "Imaging" : "Lab"}</span>
                    </p>
                    <ul>
                      {group.items.map((test) => (
                        <li key={`${group.key}:${test.id}`}>
                          <span>{test.name}</span>
                          <strong>{money(test.price)}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <p className="cart-bill-sub">Tests total {money(testTotal)}</p>
              </div>
            ) : null}
            {medicines.length ? (
              <div className="cart-bill-block">
                <h3>Medicines</h3>
                <ul>
                  {medicines.map((item) => (
                    <li key={item.id}>
                      <span>
                        {item.name} × {item.quantity || 1}
                        <MedicineBatchPick
                          item={item}
                          onChange={(next) => updateMedicineBatch(item.id, next)}
                        />
                      </span>
                      <strong>
                        {money(item.price * (item.quantity || 1))}
                      </strong>
                    </li>
                  ))}
                </ul>
                <p className="cart-bill-sub">
                  Medicines total {money(medicineTotal)}
                </p>
              </div>
            ) : null}
            <p className="cart-bill-total">Payable {money(billTotal)}</p>
          </section>

          <BookingFlow
            idPrefix="cart"
            layout="checkout"
            profile={profile}
            values={{
              ...whoFor,
              patientName: fullName,
              mobile: mobileNumber,
              ...delivery,
            }}
            errors={errors}
            onSelect={(option) => {
              const patch = bookingForPatch(option, profile);
              setWhoFor(patch);
              setFullName(patch.patientName || "");
              setMobileNumber(patch.mobile || "");
              setDelivery({
                ...emptyAddress(),
                ...pickAddress(patch),
              });
              setErrors({});
            }}
            onChange={(event) => {
              const { name, value } = event.target;
              if (name === "patientName") {
                setFullName(value);
                setErrors((prev) => ({ ...prev, patientName: "" }));
                return;
              }
              if (name === "mobile") {
                setMobileNumber(value.replace(/\D/g, ""));
                setErrors((prev) => ({ ...prev, mobile: "" }));
                return;
              }
              if (name === "gender" || name === "age" || name === "dob") {
                setWhoFor((prev) => ({ ...prev, [name]: value }));
                setErrors((prev) => ({ ...prev, [name]: "" }));
                return;
              }
              if (name === "date" || name === "timeSlot" || name === "visitType") {
                patchForm(name, value);
                return;
              }
              setDelivery((prev) => ({
                ...prev,
                [name]:
                  name === "pinCode" ? value.replace(/\D/g, "") : value,
              }));
              setErrors((prev) => ({ ...prev, [name]: "" }));
            }}
            pinHint="Select the Village / Sector / Mohalla attached to this PIN."
          >
            {tests.length ? (
              <div className="cart-checkout-slot">
                <DateMonthYearFields
                  idPrefix="cart-date"
                  name="date"
                  value={form.date}
                  min={today}
                  max={maxVisit}
                  required
                  error={errors.date || ""}
                  label="Test / scan date"
                  order="ymd"
                  onChange={(event) => patchForm("date", event.target.value)}
                />
                <label htmlFor="cartTimeSlot">
                  {tests.some((test) => test.kind === "radiology")
                    ? "Preferred time slot"
                    : "Time slot"}{" "}
                  <em>*</em>
                  <select
                    id="cartTimeSlot"
                    name="timeSlot"
                    value={form.timeSlot}
                    onChange={(event) => patchForm("timeSlot", event.target.value)}
                  >
                    <option value="">Select a slot</option>
                    {openSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </label>
                {errors.timeSlot ? (
                  <small className="lab-error">{errors.timeSlot}</small>
                ) : null}
                {tests.some((test) => (test.kind || "lab") === "lab") ? (
                  <label htmlFor="cartVisitType">
                    Sample collection
                    <select
                      id="cartVisitType"
                      name="visitType"
                      value={form.visitType}
                      onChange={(event) => patchForm("visitType", event.target.value)}
                    >
                      <option value="home">Home collection</option>
                      <option value="centre">Centre visit</option>
                    </select>
                  </label>
                ) : null}
              </div>
            ) : null}

            {needsRx && !hasRx ? (
              <div className="checkout-rx">
                <label htmlFor="cartRx">Prescription</label>
                <input
                  id="cartRx"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(event) => setPrescriptionFile(event.target.files[0])}
                />
              </div>
            ) : needsRx ? (
              <div className="checkout-rx is-ready">
                <p>Using uploaded prescription: {rxName}</p>
              </div>
            ) : null}

            <PaymentBlock
              kind={kind}
              amount={billTotal}
              saleAmount={billSale}
              pin={delivery.pinCode}
              method={payMethod}
              onMethodChange={setPayMethod}
              onQuoteChange={setPayQuote}
              cashLabel="Cash On Delivery / Visit"
              guestDetails={{
                name: fullName,
                mobile: mobileNumber,
                gender: whoFor.gender,
                dob: whoFor.dob,
                age: whoFor.age,
                ...delivery,
              }}
            />

            <div className="cart-actions">
              <button
                type="button"
                className="cart-btn cart-btn-primary"
                onClick={placeOrder}
                disabled={placing}
              >
                {placing ? "Processing payment…" : `Pay ${money(billTotal)}`}
              </button>
              <button
                type="button"
                className="cart-btn cart-btn-secondary"
                onClick={() => goToHash("#home")}
              >
                Continue shopping
              </button>
            </div>
          </BookingFlow>
        </div>
      )}
    </section>
  );
}

function isPaidMethod(method, payment) {
  if (payment?.paid) return true;
  const status = String(payment?.paymentStatus || "").toLowerCase();
  if (status === "paid") return true;
  const key = String(method || payment?.paymentMethod || "").toLowerCase();
  return key !== "cod" && key !== "pending" && Boolean(key);
}
