import { splitPayment } from "./paymentSplit.js";
import { isOnlinePayment, validatePaymentDetails } from "./paymentMethods.js";
import {
  clearSensitiveInstrument,
  getCheckoutInstrument,
} from "./paymentInstrument.js";
import { savePaymentInstrument } from "./savedPayments.js";

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay."));
    document.head.appendChild(script);
  });
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Payment request failed.");
  }
  return data;
}

export async function fetchPaymentConfig() {
  try {
    return await parseResponse(await fetch("/api/payments/config"));
  } catch {
    return { enabled: false, keyId: "", testMode: true };
  }
}

export async function createPaymentOrder(payload) {
  return parseResponse(
    await fetch("/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

export async function verifyPayment(payload) {
  return parseResponse(
    await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

export async function confirmTestPayment(payload) {
  return parseResponse(
    await fetch("/api/payments/test-confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}

export function paymentFromQuote(quote, fallbackAmount) {
  const sale = Number(quote?.saleRupees ?? fallbackAmount) || 0;
  const payable = Number(quote?.payableRupees ?? fallbackAmount) || 0;
  return {
    amountRupees: payable,
    saleRupees: sale,
    couponCode: quote?.couponCode || "",
    discountRupees: Math.max(0, sale - payable),
  };
}

export async function settleCheckoutPayment({
  method,
  amountRupees,
  saleRupees,
  couponCode,
  kind,
  pin,
  name,
  mobile,
  reference,
  description,
}) {
  const instrument = getCheckoutInstrument();
  const detailError = validatePaymentDetails(method, instrument.details);
  if (detailError) {
    throw new Error(detailError);
  }
  const split = splitPayment(kind, amountRupees, pin, {
    saleRupees: saleRupees ?? amountRupees,
    payableRupees: amountRupees,
    couponCode,
  });
  if (!isOnlinePayment(method)) {
    return {
      paymentMethod: method || "cod",
      paymentStatus: "cod",
      paymentId: "",
      razorpayPaymentId: "",
      razorpayOrderId: "",
      saleRupees: split.saleRupees,
      couponCode: split.couponCode,
      discountRupees: split.discountRupees,
      split,
    };
  }
  if (Number(amountRupees) <= 0) {
    maybeSaveInstrument(mobile, method, instrument);
    return {
      paymentMethod: method || "online",
      paymentStatus: "paid",
      paymentId: "",
      razorpayPaymentId: "",
      razorpayOrderId: "",
      saleRupees: split.saleRupees,
      couponCode: split.couponCode,
      discountRupees: split.discountRupees,
      split,
    };
  }
  const paid = await takeOnlinePayment({
    amountRupees,
    saleRupees: split.saleRupees,
    couponCode: split.couponCode,
    kind,
    pin,
    name,
    mobile,
    reference,
    description,
  });
  maybeSaveInstrument(mobile, method, instrument);
  return {
    paymentMethod: method || "online",
    paymentStatus: paid.paymentStatus || "paid",
    paymentId: paid.paymentId || "",
    razorpayPaymentId: paid.razorpayPaymentId || "",
    razorpayOrderId: paid.razorpayOrderId || "",
    saleRupees: (paid.split || split).saleRupees,
    couponCode: (paid.split || split).couponCode,
    discountRupees: (paid.split || split).discountRupees,
    split: paid.split || split,
  };
}

function maybeSaveInstrument(mobile, method, instrument) {
  try {
    savePaymentInstrument(mobile, method, instrument.details, {
      consent: instrument.save,
    });
  } finally {
    clearSensitiveInstrument();
  }
}

export async function takeOnlinePayment({
  amountRupees,
  saleRupees,
  couponCode,
  kind,
  pin,
  name,
  mobile,
  reference,
  description,
}) {
  const created = await createPaymentOrder({
    amountRupees,
    saleRupees,
    couponCode,
    kind,
    pin,
    name,
    mobile,
    reference,
    description,
  });

  if (created.testCheckout) {
    const confirmed = await confirmTestPayment({ paymentId: created.paymentId });
    return { ok: true, ...confirmed, split: created.split, method: "online" };
  }

  await loadScript("https://checkout.razorpay.com/v1/checkout.js");
  if (!window.Razorpay) {
    throw new Error("Razorpay checkout did not load.");
  }

  return new Promise((resolve, reject) => {
    const checkout = new window.Razorpay({
      key: created.keyId,
      amount: created.amountPaise,
      currency: "INR",
      name: "MediHome",
      description: description || "MediHome payment",
      order_id: created.razorpayOrderId,
      prefill: {
        name: name || "",
        contact: mobile || "",
      },
      notes: {
        kind,
        reference: String(reference || ""),
      },
      handler: async (response) => {
        try {
          const verified = await verifyPayment({
            paymentId: created.paymentId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          resolve({ ok: true, ...verified, split: created.split, method: "online" });
        } catch (error) {
          reject(error);
        }
      },
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled.")),
      },
    });
    checkout.open();
  });
}
