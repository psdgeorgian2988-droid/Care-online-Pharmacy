import { useEffect, useMemo, useRef, useState } from "react";
import { applyCoupon, normalizeCouponCode } from "./offers";
import { quoteCheckout, resolveCollector } from "./paymentSplit";
import { useLoginSession } from "./authSession";
import GuestCheckoutRegister from "./GuestCheckoutRegister";
import { MONTH_OPTIONS } from "./personFields";
import { noContactNameProps } from "./noContactAutofill";
import {
  PAYMENT_METHOD_OPTIONS,
  emptyPaymentDetails,
  formatCardNumber,
  isOnlinePayment,
  paymentShareText,
  paymentUpiUri,
} from "./paymentMethods";
import { setCheckoutInstrument } from "./paymentInstrument";
import { loadSavedPayments } from "./savedPayments";
import QRCode from "qrcode";

function formatRupee(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function expiryYears() {
  const start = new Date().getFullYear();
  return Array.from({ length: 16 }, (_, index) => start + index);
}

function rbiNote(method) {
  if (method === "qr") {
    return "Scan this QR with any UPI app, or share it with the person who will pay. No card or bank details are collected here.";
  }
  if (method === "upi") {
    return "Your UPI ID is saved only if you tick this box, as per RBI / NPCI guidelines.";
  }
  if (method === "bank") {
    return "Only IFSC and the last 4 digits of the account are kept. The full account number is not stored.";
  }
  return "RBI tokenisation rules: only the last 4 digits and card network are kept. CVV is never saved.";
}

export default function PaymentBlock({
  kind,
  amount,
  saleAmount,
  pin,
  method,
  onMethodChange,
  onQuoteChange,
  guestDetails,
  cashLabel = "Cash On Visit",
}) {
  const user = useLoginSession();
  const [couponDraft, setCouponDraft] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const [promptOpen, setPromptOpen] = useState(false);
  const [pendingMethod, setPendingMethod] = useState("");
  const [guestSkipped, setGuestSkipped] = useState(false);
  const [guestNote, setGuestNote] = useState("");
  const [details, setDetails] = useState(emptyPaymentDetails);
  const [saveConsent, setSaveConsent] = useState(false);
  const [shareQr, setShareQr] = useState("");
  const [shareNote, setShareNote] = useState("");
  const paidOn = "customer";
  const collector = resolveCollector({ method, paidOn });
  const couponInputRef = useRef(null);
  const accountMobile = user?.mobile || guestDetails?.mobile || "";
  const saved = useMemo(
    () => loadSavedPayments(accountMobile, method),
    [accountMobile, method]
  );

  const finishGuestPrompt = (nextMethod) => {
    const chosen = nextMethod || pendingMethod;
    setPromptOpen(false);
    setPendingMethod("");
    if (chosen) onMethodChange(chosen);
  };

  const pickMethod = (next) => {
    setDetails(emptyPaymentDetails());
    setSaveConsent(false);
    if (user || guestSkipped) {
      onMethodChange(next);
      return;
    }
    setGuestNote("");
    setPendingMethod(next);
    setPromptOpen(true);
  };

  const patchDetails = (patch) => {
    setDetails((prev) => ({ ...prev, ...patch, savedId: patch.savedId ?? prev.savedId }));
  };

  const quote = useMemo(
    () =>
      quoteCheckout({
        kind,
        saleRupees: saleAmount ?? amount,
        listRupees: amount,
        couponCode,
        pin,
        collector,
        paymentMethod: method,
        paidOn,
      }),
    [kind, amount, saleAmount, couponCode, pin, collector, method, paidOn]
  );

  useEffect(() => {
    onQuoteChange?.(quote);
  }, [quote, onQuoteChange]);

  useEffect(() => {
    setCheckoutInstrument({
      method,
      details,
      save: saveConsent,
      paidOn,
    });
  }, [method, details, saveConsent, paidOn]);

  useEffect(() => {
    if (method !== "qr") {
      setShareQr("");
      setShareNote("");
      return undefined;
    }
    let cancelled = false;
    QRCode.toDataURL(paymentUpiUri({ amount: quote.payableRupees, kind }), {
      margin: 1,
      width: 196,
      color: { dark: "#143246", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setShareQr(url);
      })
      .catch(() => {
        if (!cancelled) setShareQr("");
      });
    return () => {
      cancelled = true;
    };
  }, [method, quote.payableRupees, kind]);

  const sharePayQr = async () => {
    const text = paymentShareText({ amount: quote.payableRupees, kind });
    const uri = paymentUpiUri({ amount: quote.payableRupees, kind });
    try {
      if (shareQr && navigator.share && navigator.canShare) {
        const blob = await (await fetch(shareQr)).blob();
        const file = new File([blob], "medihome-pay-qr.png", { type: "image/png" });
        const payload = { title: "MediHome Payment QR", text, files: [file] };
        if (navigator.canShare(payload)) {
          await navigator.share(payload);
          setShareNote("QR shared.");
          return;
        }
      }
      if (navigator.share) {
        await navigator.share({ title: "MediHome Payment QR", text: `${text}\n${uri}` });
        setShareNote("QR shared.");
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${uri}`);
      setShareNote("Payment link copied.");
    } catch (err) {
      if (err?.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(`${text}\n${uri}`);
        setShareNote("Payment link copied.");
      } catch {
        setShareNote("Could not share. Copy the QR from the screen.");
      }
    }
  };

  const applyDraftCoupon = (raw) => {
    const typed = raw ?? couponInputRef.current?.value ?? couponDraft;
    const code = normalizeCouponCode(typed);
    if (!code) {
      setCouponMessage("Enter a coupon code.");
      return;
    }
    const sale = Number(saleAmount ?? amount) || 0;
    const result = applyCoupon(code, sale);
    if (!result.ok) {
      setCouponMessage(result.error);
      return;
    }
    setCouponCode(result.coupon.code);
    setCouponDraft(result.coupon.code);
    setCouponMessage(`${result.coupon.label} applied.`);
  };

  const clearCoupon = () => {
    setCouponCode("");
    setCouponDraft("");
    setCouponMessage("");
  };

  const applySaved = (row) => {
    setSaveConsent(true);
    if (row.type === "upi") {
      setDetails({ ...emptyPaymentDetails(), savedId: row.id, upiId: row.upiId });
      return;
    }
    if (row.type === "bank") {
      setDetails({
        ...emptyPaymentDetails(),
        savedId: row.id,
        accountName: row.accountName || "",
        accountLast4: row.accountLast4,
        ifsc: row.ifsc,
      });
      return;
    }
    setDetails({
      ...emptyPaymentDetails(),
      savedId: row.id,
      cardLast4: row.cardLast4,
      cardBrand: row.cardBrand,
      nameOnCard: row.nameOnCard || "",
      expiryMonth: row.expiryMonth || "",
      expiryYear: row.expiryYear || "",
    });
  };

  const hasDiscount =
    quote.offerDiscountRupees > 0 ||
    quote.couponDiscountRupees > 0 ||
    quote.pointsDiscountRupees > 0;
  const showInstrument = isOnlinePayment(method) && method !== "online";
  const usingSavedCard = Boolean(details.savedId) && (method === "credit" || method === "debit");
  const usingSavedBank = Boolean(details.savedId) && method === "bank";

  return (
    <>
      <style>{styles}</style>
      <div className="pay-block">
        <p className="pay-kicker">Payment</p>
        <div className="pay-methods" role="radiogroup" aria-label="Payment method">
          {PAYMENT_METHOD_OPTIONS.map((option) => {
            const value = option.value;
            const label = value === "cod" ? cashLabel : option.label;
            return (
              <label
                key={value}
                className={method === value ? "is-on" : ""}
                onClick={() => {
                  if (method === value) pickMethod(value);
                }}
              >
                <input
                  type="radio"
                  name={`pay-method-${kind}`}
                  checked={method === value}
                  onChange={() => pickMethod(value)}
                />
                <span>{label}</span>
              </label>
            );
          })}
        </div>
        {guestNote ? <p className="pay-guest-note">{guestNote}</p> : null}

        {showInstrument ? (
          <div className="pay-instrument">
            {saved.length && method !== "qr" ? (
              <div className="pay-saved">
                <p>Saved As Per RBI Guidelines</p>
                <div className="pay-saved-row">
                  {saved.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      className={details.savedId === row.id ? "is-on" : ""}
                      onClick={() => applySaved(row)}
                    >
                      {row.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {method === "qr" ? (
              <div className="pay-share pay-span">
                {shareQr ? (
                  <img src={shareQr} alt="MediHome payment QR" />
                ) : (
                  <p className="pay-saved-cap">Preparing QR…</p>
                )}
                <p className="pay-saved-cap">
                  Scan to pay {formatRupee(quote.payableRupees)} with any UPI app.
                </p>
                <div className="pay-share-actions">
                  <button type="button" onClick={sharePayQr}>
                    Share
                  </button>
                </div>
                {shareNote ? <p className="pay-saved-cap">{shareNote}</p> : null}
              </div>
            ) : null}

            {method === "upi" ? (
              <label className="pay-field pay-span">
                UPI ID <em>*</em>
                <input
                  value={details.upiId}
                  placeholder="name@okicici"
                  autoComplete="off"
                  onChange={(event) =>
                    patchDetails({ upiId: event.target.value.trim(), savedId: "" })
                  }
                />
              </label>
            ) : null}

            {method === "credit" || method === "debit" ? (
              <>
                {usingSavedCard ? (
                  <p className="pay-saved-cap">
                    {details.cardBrand} •••• {details.cardLast4}. Enter CVV to pay.
                  </p>
                ) : (
                  <>
                    <label className="pay-field pay-span">
                      Card Number <em>*</em>
                      <input
                        inputMode="numeric"
                        autoComplete="off"
                        value={formatCardNumber(details.cardNumber)}
                        placeholder="XXXX XXXX XXXX XXXX"
                        onChange={(event) =>
                          patchDetails({
                            cardNumber: formatCardNumber(event.target.value),
                            savedId: "",
                          })
                        }
                      />
                    </label>
                    <label className="pay-field pay-span">
                      Name On Card <em>*</em>
                      <input
                        value={details.nameOnCard}
                        placeholder="Name printed on the card"
                        onChange={(event) =>
                          patchDetails({ nameOnCard: event.target.value })
                        }
                        {...noContactNameProps}
                      />
                    </label>
                    <label className="pay-field">
                      Expiry Month <em>*</em>
                      <select
                        value={details.expiryMonth}
                        onChange={(event) =>
                          patchDetails({ expiryMonth: event.target.value })
                        }
                      >
                        <option value="">Month</option>
                        {MONTH_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="pay-field">
                      Expiry Year <em>*</em>
                      <select
                        value={details.expiryYear}
                        onChange={(event) =>
                          patchDetails({ expiryYear: event.target.value })
                        }
                      >
                        <option value="">Year</option>
                        {expiryYears().map((year) => (
                          <option key={year} value={String(year)}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
                <label className="pay-field">
                  CVV <em>*</em>
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength="4"
                    value={details.cvv}
                    placeholder="XXX"
                    onChange={(event) =>
                      patchDetails({
                        cvv: event.target.value.replace(/\D/g, "").slice(0, 4),
                      })
                    }
                  />
                </label>
              </>
            ) : null}

            {method === "bank" ? (
              usingSavedBank ? (
                <p className="pay-saved-cap">
                  {details.accountName ? `${details.accountName} · ` : ""}
                  {details.ifsc} •••• {details.accountLast4}
                </p>
              ) : (
                <>
                  <label className="pay-field pay-span">
                    Account Holder Name <em>*</em>
                    <input
                      value={details.accountName}
                      placeholder="Name as in the bank account"
                      onChange={(event) =>
                        patchDetails({ accountName: event.target.value, savedId: "" })
                      }
                      {...noContactNameProps}
                    />
                  </label>
                  <label className="pay-field">
                    Account Number <em>*</em>
                    <input
                      inputMode="numeric"
                      autoComplete="off"
                      value={details.accountNumber}
                      placeholder="9 to 18 digits"
                      onChange={(event) =>
                        patchDetails({
                          accountNumber: event.target.value.replace(/\D/g, "").slice(0, 18),
                          savedId: "",
                        })
                      }
                    />
                  </label>
                  <label className="pay-field">
                    IFSC <em>*</em>
                    <input
                      autoComplete="off"
                      value={details.ifsc}
                      placeholder="HDFC0001234"
                      onChange={(event) =>
                        patchDetails({
                          ifsc: event.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9]/g, "")
                            .slice(0, 11),
                          savedId: "",
                        })
                      }
                    />
                  </label>
                </>
              )
            ) : null}

            {method !== "qr" ? (
              <label className="pay-save">
                <input
                  type="checkbox"
                  checked={saveConsent}
                  onChange={(event) => setSaveConsent(event.target.checked)}
                />
                <span>Save These Details As Per RBI Guidelines</span>
              </label>
            ) : null}
            <p className="pay-save-note">{rbiNote(method)}</p>
          </div>
        ) : null}

        <ul className="pay-split">
          <li>
            <span>Total amount</span>
            <strong>{formatRupee(quote.saleRupees)}</strong>
          </li>
          {quote.offerDiscountRupees > 0 ? (
            <li>
              <span>Offer discount</span>
              <strong>−{formatRupee(quote.offerDiscountRupees)}</strong>
            </li>
          ) : null}
          {quote.couponDiscountRupees > 0 ? (
            <li>
              <span>Coupon {quote.couponCode}</span>
              <strong>−{formatRupee(quote.couponDiscountRupees)}</strong>
            </li>
          ) : null}
          {quote.pointsDiscountRupees > 0 ? (
            <li>
              <span>
                Points
                {quote.pointsUsed ? ` (${quote.pointsUsed} pts)` : ""}
              </span>
              <strong>−{formatRupee(quote.pointsDiscountRupees)}</strong>
            </li>
          ) : null}
        </ul>
        {hasDiscount ? (
          <p className="pay-total">
            <span>Amount payable</span>
            <strong>{formatRupee(quote.payableRupees)}</strong>
          </p>
        ) : null}

        <div className="pay-coupon">
          <label htmlFor={`pay-coupon-${kind}`}>Coupon</label>
          <div className="pay-coupon-row">
            <input
              id={`pay-coupon-${kind}`}
              ref={couponInputRef}
              type="text"
              value={couponDraft}
              placeholder="CARE35"
              autoComplete="off"
              onChange={(event) => {
                setCouponDraft(normalizeCouponCode(event.target.value));
                setCouponMessage("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyDraftCoupon(event.currentTarget.value);
                }
              }}
            />
            <button type="button" onClick={() => applyDraftCoupon()}>
              Apply
            </button>
            {couponCode ? (
              <button type="button" className="is-clear" onClick={clearCoupon}>
                Remove
              </button>
            ) : null}
          </div>
          {couponMessage ? (
            <p className={quote.couponCode ? "pay-coupon-ok" : "pay-coupon-err"}>
              {couponMessage}
            </p>
          ) : (
            <p className="pay-coupon-hint">CARE35 for 35% off</p>
          )}
        </div>
      </div>
      <GuestCheckoutRegister
        details={guestDetails}
        open={promptOpen}
        onSkip={() => {
          setGuestSkipped(true);
          finishGuestPrompt();
        }}
        onRegistered={() => {
          setGuestSkipped(true);
          finishGuestPrompt();
        }}
        onNeedContact={() => {
          setGuestSkipped(true);
          setGuestNote("Complete name, mobile and address above first.");
          finishGuestPrompt();
        }}
      />
    </>
  );
}

const styles = `
.pay-block{margin:12px 0;padding:12px;border:1px solid #d7e2e9;border-radius:10px;background:#f7fbfd;text-align:left;grid-column:1/-1;width:100%;box-sizing:border-box}
.pay-kicker{margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#1a6b7a}
.pay-methods{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0}
.pay-methods + .pay-methods{margin-top:8px}
.pay-methods label{display:flex !important;flex-direction:row !important;justify-content:flex-start !important;align-items:center !important;gap:8px !important;margin:0;padding:8px 10px;min-height:40px;border:1px solid #e4ecef;border-radius:8px;background:#fff;cursor:pointer;text-align:left !important;width:auto;box-sizing:border-box}
.pay-methods label.is-on{border-color:#1a6b7a;background:#e8f4f6}
.pay-methods input[type="radio"]{width:16px !important;min-width:16px !important;max-width:16px !important;height:16px !important;min-height:16px !important;margin:0 !important;padding:0 !important;flex:0 0 16px !important;accent-color:#1a6b7a}
.pay-methods span{flex:1;min-width:0;font-size:13px;font-weight:700;color:#143246;line-height:1.25}
.pay-instrument{margin:10px 0 0;padding:10px;border:1px solid #d7e2e9;border-radius:8px;background:#fff;display:grid;grid-template-columns:1fr 1fr;gap:8px 10px}
.pay-field{display:flex;flex-direction:column;gap:4px;margin:0;font-size:12px;font-weight:700;color:#34546b}
.pay-field em{color:#d84b4b;font-style:normal}
.pay-field input,.pay-field select{width:100%;box-sizing:border-box;height:38px;min-height:38px;padding:8px 11px;border:1px solid #d7e2e9;border-radius:8px;background:#fff;color:#143246;font:inherit;font-size:14px;font-weight:500}
.pay-span,.pay-save,.pay-save-note,.pay-saved,.pay-saved-cap,.pay-share{grid-column:1/-1}
.pay-share{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}
.pay-share img{width:168px;height:168px;border:1px solid #d7e2e9;border-radius:10px;background:#fff}
.pay-share-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.pay-share-actions button{border:1px solid #1a6b7a;border-radius:8px;background:#1a6b7a;color:#fff;font:inherit;font-size:12px;font-weight:800;padding:8px 12px;cursor:pointer}
.pay-saved p{margin:0 0 6px;font-size:12px;font-weight:800;color:#1a6b7a}
.pay-saved-row{display:flex;flex-wrap:wrap;gap:6px}
.pay-saved-row button{border:1px solid #d7e2e9;border-radius:999px;background:#f7fbfd;color:#143246;font:inherit;font-size:12px;font-weight:700;padding:6px 10px;cursor:pointer}
.pay-saved-row button.is-on{border-color:#1a6b7a;background:#e8f4f6;color:#1a6b7a}
.pay-saved-cap{margin:0;font-size:12px;font-weight:700;color:#34546b}
.pay-save{display:flex;align-items:flex-start;gap:8px;margin:4px 0 0;font-size:13px;font-weight:800;color:#143246}
.pay-save input{width:16px;height:16px;margin:2px 0 0;accent-color:#1a6b7a;flex:0 0 16px}
.pay-save-note{margin:0;font-size:12px;line-height:1.4;color:#5d7180}
.pay-split{list-style:none;margin:8px 0 0;padding:8px 0 0;border-top:1px solid #edf1f3}
.pay-split li{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:0;padding:4px 0;font-size:13px;color:#34546b}
.pay-split li strong,.pay-total strong{display:inline;font-size:13px;color:#143246;text-align:right}
.pay-total{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:2px 0 0;padding-top:6px;border-top:1px solid #edf1f3;font-size:13px;color:#34546b}
.pay-total strong{font-size:15px}
.pay-coupon{margin:10px 0 0;padding:8px 10px;border:1px dashed #c5d6e0;border-radius:8px;background:#fff;display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 8px;align-items:center}
.pay-coupon > label{margin:0;font-size:12px;font-weight:700;color:#34546b}
.pay-coupon-row{display:flex;gap:6px;min-width:0}
.pay-coupon-row input{flex:1;min-width:0;height:38px;min-height:38px;border:1px solid #d7e2e9;border-radius:8px;padding:8px 11px;font:inherit;font-size:14px;color:#143246;background:#fff;text-transform:uppercase}
.pay-coupon-row button{border:1px solid #1a6b7a;border-radius:6px;background:#1a6b7a;color:#fff;font:inherit;font-size:12px;font-weight:700;padding:7px 10px;cursor:pointer;white-space:nowrap}
.pay-coupon-row button.is-clear{background:#fff;color:#1a6b7a;border-color:#d7e2e9}
.pay-coupon-hint,.pay-coupon-ok,.pay-coupon-err{grid-column:1/-1;margin:0;font-size:12px;line-height:1.4}
.pay-coupon-hint{color:#5d7180}
.pay-coupon-ok{color:#0f7a4a}
.pay-coupon-err{color:#c0392b}
.pay-guest-note{margin:8px 0 0;font-size:12px;font-weight:700;color:#b64b4b;line-height:1.4}
@media (max-width:420px){.pay-methods{grid-template-columns:1fr 1fr}.pay-instrument{grid-template-columns:1fr}.pay-coupon{grid-template-columns:1fr}.pay-coupon-row{grid-column:1/-1}}
`;
