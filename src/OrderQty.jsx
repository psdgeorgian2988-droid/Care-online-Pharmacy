export function clampOrderQty(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 1;
  return Math.min(99, Math.max(1, n));
}

export default function OrderQty({ value = 1, onChange, label = "Quantity" }) {
  const qty = clampOrderQty(value);
  const setQty = (next) => onChange?.(clampOrderQty(next));
  return (
    <span className="order-qty" onClick={(event) => event.stopPropagation()}>
      <style>{styles}</style>
      <span>{label}</span>
      <button type="button" aria-label={`Fewer ${label}`} onClick={() => setQty(qty - 1)}>
        −
      </button>
      <input
        type="number"
        min="1"
        max="99"
        inputMode="numeric"
        value={qty}
        aria-label={label}
        onChange={(event) => setQty(event.target.value)}
      />
      <button type="button" aria-label={`More ${label}`} onClick={() => setQty(qty + 1)}>
        +
      </button>
    </span>
  );
}

const styles = `
.order-qty{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#34546b}
.order-qty button{width:28px;height:28px;border:1px solid #c5d8e0;border-radius:8px;background:#fff;color:#1a6b7a;font:inherit;font-size:16px;font-weight:800;cursor:pointer}
.order-qty input{width:48px;height:28px;box-sizing:border-box;border:1px solid #c5d8e0;border-radius:8px;text-align:center;font:inherit;font-size:13px;font-weight:800;color:#143246}
.order-qty input::-webkit-outer-spin-button,.order-qty input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.order-qty-line{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;padding:6px 0}
`;
