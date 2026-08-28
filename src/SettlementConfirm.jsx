import { settlementSummary } from "./paymentSplit";

export default function SettlementConfirm({ split, variant = "row" }) {
  const text = settlementSummary(split);
  if (!text) return null;
  if (variant === "p") {
    return (
      <p>
        <strong>Settlement:</strong> {text}
      </p>
    );
  }
  return (
    <div className="confirm-row">
      <span>Settlement</span>
      <strong>{text}</strong>
    </div>
  );
}
