import { useEffect, useState } from "react";
import { fetchPaymentConfig } from "./paymentApi";

function formatRupee(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

export default function PaymentBlock({
  kind,
  amount,
  method,
  onMethodChange,
}) {
  const [config, setConfig] = useState({ enabled: false, testMode: true });

  useEffect(() => {
    fetchPaymentConfig().then(setConfig);
  }, []);

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
        <p className="pay-total">
          <span>Amount payable</span>
          <strong>{formatRupee(amount)}</strong>
        </p>
      </div>
    </>
  );
}

const styles = `
.pay-block{margin:12px 0;padding:12px;border:1px solid #d7e2e9;border-radius:10px;background:#f7fbfd;text-align:left}
.pay-kicker{margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#1a6b7a}
.pay-block label{display:flex;gap:10px;align-items:flex-start;margin:0 0 8px;padding:8px 10px;border:1px solid #e4ecef;border-radius:8px;background:#fff;cursor:pointer}
.pay-block label.is-on{border-color:#0639b8;background:#eaf0ff}
.pay-block input{margin-top:3px}
.pay-block strong{display:block;font-size:13px;color:#143246}
.pay-block em{display:block;margin-top:2px;font-style:normal;color:#5d7180;font-size:12px;line-height:1.35}
.pay-total{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:8px 0 0;padding-top:8px;border-top:1px solid #edf1f3;font-size:13px;color:#34546b}
.pay-total strong{font-size:15px}
`;
