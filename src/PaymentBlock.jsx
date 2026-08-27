import { useEffect, useMemo, useState } from "react";
import { fetchPaymentConfig } from "./paymentApi";
import { applyCoupon } from "./offers";
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
  const [config, setConfig] = useState({ enabled: false, testMode: true });
  const [couponDraft, setCouponDraft] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");

  useEffect(() => {
    fetchPaymentConfig().then(setConfig);
  }, []);

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

  const applyDraftCoupon = () => {
    const sale = Number(saleAmount ?? amount) || 0;
    const result = applyCoupon(couponDraft, sale);
    if (!result.ok) {
      setCouponCode("");
      setCouponMessage(result.error);
      return;
    }
    setCouponCode(result.coupon.code);
    setCouponDraft(result.coupon.code);
    setCouponMessage(`${result.coupon.label} applied. Taken from MediHome share.`);
  };

  const clearCoupon = () => {
    setCouponCode("");
    setCouponDraft("");
    setCouponMessage("");
  };

  const split = quote.split;
  const hasDiscount = quote.offerDiscountRupees > 0 || quote.couponDiscountRupees > 0;

  return (
    <>
      <style>{styles}</style>
      <div className="pay-block">
        <p className="pay-kicker">Payment</p>
        <label className={method === "cod" ? "is-on" : ""}>
          <input
            type="radio"
            name={`pay-method-${kind}`}
            checked={method === "cod"}
            onChange={() => onMethodChange("cod")}
          />
          <span>
            <strong>Cash on delivery / visit</strong>
            <em>Pay in cash when the service is completed.</em>
          </span>
        </label>
        <label className={method === "online" ? "is-on" : ""}>
          <input
            type="radio"
            name={`pay-method-${kind}`}
            checked={method === "online"}
            onChange={() => onMethodChange("online")}
          />
          <span>
            <strong>Pay online</strong>
            <em>
              {config.enabled
                ? "Secure card / UPI checkout."
                : "Online checkout (test mode until gateway keys are added)."}
            </em>
          </span>
        </label>

        <div className="pay-coupon">
          <label htmlFor={`pay-coupon-${kind}`}>Coupon or offer code</label>
          <div className="pay-coupon-row">
            <input
              id={`pay-coupon-${kind}`}
              type="text"
              value={couponDraft}
              placeholder="CARE35"
              autoComplete="off"
              onChange={(event) => {
                setCouponDraft(event.target.value.toUpperCase());
                setCouponMessage("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyDraftCoupon();
                }
              }}
            />
            <button type="button" onClick={applyDraftCoupon}>
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
            <p className="pay-coupon-hint">
              Try CARE35 for 35% off. Partner still gets their share of MRP.
              The discount comes from MediHome.
            </p>
          )}
        </div>

        <ul className="pay-split">
          <li>
            <span>Sale / MRP</span>
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
          <li>
            <span>
              Partner {split.partnerPercent}% of MRP
            </span>
            <strong>{formatRupee(split.partnerRupees)}</strong>
          </li>
          <li>
            <span>MediHome after discount</span>
            <strong>{formatRupee(split.platformRupees)}</strong>
          </li>
        </ul>
        <p className="pay-total">
          <span>Amount payable</span>
          <strong>{formatRupee(quote.payableRupees)}</strong>
        </p>
        {hasDiscount ? (
          <p className="pay-split-note">
            Partner is paid {split.partnerPercent}% of sale / MRP. Coupon and
            offer discounts are deducted from MediHome’s share only.
          </p>
        ) : (
          <p className="pay-split-note">
            Partner {split.partnerPercent}% of sale / MRP. MediHome{" "}
            {split.platformPercent}%. A coupon reduces only the MediHome part.
          </p>
        )}
      </div>
    </>
  );
}

const styles = `
.pay-block{margin:12px 0;padding:12px;border:1px solid #d7e2e9;border-radius:10px;background:#f7fbfd;text-align:left}
.pay-kicker{margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#1a6b7a}
.pay-block > label{display:flex;gap:10px;align-items:flex-start;margin:0 0 8px;padding:8px 10px;border:1px solid #e4ecef;border-radius:8px;background:#fff;cursor:pointer}
.pay-block > label.is-on{border-color:#0639b8;background:#eaf0ff}
.pay-block > label input{margin-top:3px}
.pay-block strong{display:block;font-size:13px;color:#143246}
.pay-block em{display:block;margin-top:2px;font-style:normal;color:#5d7180;font-size:12px;line-height:1.35}
.pay-coupon{margin:10px 0 0;padding:10px;border:1px dashed #c5d6e0;border-radius:8px;background:#fff}
.pay-coupon > label{display:block;margin:0 0 6px;font-size:12px;font-weight:700;color:#34546b}
.pay-coupon-row{display:flex;gap:6px;flex-wrap:wrap}
.pay-coupon-row input{flex:1;min-width:120px;border:1px solid #d7e2e9;border-radius:6px;padding:7px 8px;font:inherit;font-size:13px;text-transform:uppercase}
.pay-coupon-row button{border:1px solid #0639b8;border-radius:6px;background:#0639b8;color:#fff;font:inherit;font-size:12px;font-weight:700;padding:7px 10px;cursor:pointer}
.pay-coupon-row button.is-clear{background:#fff;color:#1a6b7a;border-color:#d7e2e9}
.pay-coupon-hint,.pay-coupon-ok,.pay-coupon-err{margin:6px 0 0;font-size:12px;line-height:1.4}
.pay-coupon-hint{color:#5d7180}
.pay-coupon-ok{color:#0f7a4a}
.pay-coupon-err{color:#c0392b}
.pay-split{list-style:none;margin:10px 0 0;padding:0;border-top:1px solid #edf1f3}
.pay-split li{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:0;padding:6px 0;font-size:13px;color:#34546b;border-bottom:1px solid #f3f6f8}
.pay-split li strong{font-size:13px}
.pay-total{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:8px 0 0;padding-top:8px;font-size:13px;color:#34546b}
.pay-total strong{font-size:15px}
.pay-split-note{margin:8px 0 0;font-size:12px;line-height:1.4;color:#5d7180}
`;
