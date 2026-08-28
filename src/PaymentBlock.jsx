import { useEffect, useMemo, useRef, useState } from "react";
import { applyCoupon, normalizeCouponCode } from "./offers";
import { quoteCheckout } from "./paymentSplit";

function formatRupee(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

export default function PaymentBlock({
  kind,
  amount,
  saleAmount,
  pin,
  method,
  onMethodChange,
  onQuoteChange,
}) {
  const [couponDraft, setCouponDraft] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");
  const couponInputRef = useRef(null);

  const quote = useMemo(
    () =>
      quoteCheckout({
        kind,
        saleRupees: saleAmount ?? amount,
        listRupees: amount,
        couponCode,
        pin,
      }),
    [kind, amount, saleAmount, couponCode, pin]
  );

  useEffect(() => {
    onQuoteChange?.(quote);
  }, [quote, onQuoteChange]);

  const applyDraftCoupon = (raw) => {
    const typed =
      raw ??
      couponInputRef.current?.value ??
      couponDraft;
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

  const hasDiscount =
    quote.offerDiscountRupees > 0 ||
    quote.couponDiscountRupees > 0 ||
    quote.pointsDiscountRupees > 0;

  return (
    <>
      <style>{styles}</style>
      <div className="pay-block">
        <p className="pay-kicker">Payment</p>
        <div className="pay-methods" role="radiogroup" aria-label="Payment method">
          <label className={method === "cod" ? "is-on" : ""}>
            <input
              type="radio"
              name={`pay-method-${kind}`}
              checked={method === "cod"}
              onChange={() => onMethodChange("cod")}
            />
            <span>Cash on visit</span>
          </label>
          <label className={method === "online" ? "is-on" : ""}>
            <input
              type="radio"
              name={`pay-method-${kind}`}
              checked={method === "online"}
              onChange={() => onMethodChange("online")}
            />
            <span>Pay online</span>
          </label>
        </div>

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
    </>
  );
}

const styles = `
.pay-block{margin:12px 0;padding:12px;border:1px solid #d7e2e9;border-radius:10px;background:#f7fbfd;text-align:left;grid-column:1/-1;width:100%;box-sizing:border-box}
.pay-kicker{margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#1a6b7a}
.pay-methods{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0}
.pay-methods label{display:flex !important;flex-direction:row !important;justify-content:flex-start !important;align-items:center !important;gap:8px !important;margin:0;padding:8px 10px;min-height:40px;border:1px solid #e4ecef;border-radius:8px;background:#fff;cursor:pointer;text-align:left !important;width:auto;box-sizing:border-box}
.pay-methods label.is-on{border-color:#1a6b7a;background:#e8f4f6}
.pay-methods input[type="radio"]{width:16px !important;min-width:16px !important;max-width:16px !important;height:16px !important;min-height:16px !important;margin:0 !important;padding:0 !important;flex:0 0 16px !important;accent-color:#1a6b7a}
.pay-methods span{flex:1;min-width:0;font-size:13px;font-weight:700;color:#143246;line-height:1.25}
.pay-split{list-style:none;margin:8px 0 0;padding:8px 0 0;border-top:1px solid #edf1f3}
.pay-split li{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:0;padding:4px 0;font-size:13px;color:#34546b}
.pay-split li strong,.pay-total strong{display:inline;font-size:13px;color:#143246;text-align:right}
.pay-total{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:2px 0 0;padding-top:6px;border-top:1px solid #edf1f3;font-size:13px;color:#34546b}
.pay-total strong{font-size:15px}
.pay-coupon{margin:10px 0 0;padding:8px 10px;border:1px dashed #c5d6e0;border-radius:8px;background:#fff;display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 8px;align-items:center}
.pay-coupon > label{margin:0;font-size:12px;font-weight:700;color:#34546b}
.pay-coupon-row{display:flex;gap:6px;min-width:0}
.pay-coupon-row input{flex:1;min-width:0;border:1px solid #d7e2e9;border-radius:6px;padding:7px 8px;font:inherit;font-size:13px;text-transform:uppercase}
.pay-coupon-row button{border:1px solid #1a6b7a;border-radius:6px;background:#1a6b7a;color:#fff;font:inherit;font-size:12px;font-weight:700;padding:7px 10px;cursor:pointer;white-space:nowrap}
.pay-coupon-row button.is-clear{background:#fff;color:#1a6b7a;border-color:#d7e2e9}
.pay-coupon-hint,.pay-coupon-ok,.pay-coupon-err{grid-column:1/-1;margin:0;font-size:12px;line-height:1.4}
.pay-coupon-hint{color:#5d7180}
.pay-coupon-ok{color:#0f7a4a}
.pay-coupon-err{color:#c0392b}
@media (max-width:420px){.pay-methods{grid-template-columns:1fr 1fr}.pay-coupon{grid-template-columns:1fr}.pay-coupon-row{grid-column:1/-1}}
`;
