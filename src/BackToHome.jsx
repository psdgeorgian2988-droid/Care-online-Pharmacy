import {
  goToOrderListHash,
  orderBackActor,
  orderBackHash,
  orderBackLabel,
  parseAppHash,
  readOrderBackContext,
} from "./hashRoute";

function isOrderViewHash(rawHash) {
  const { route } = parseAppHash(rawHash);
  return route === "#track" || route === "#scan" || route === "#myorders";
}

export default function BackToHome({ show = true } = {}) {
  if (!show) return null;

  const ctx = readOrderBackContext();
  const actor = orderBackActor(ctx);
  const orderView =
    typeof window !== "undefined" && isOrderViewHash(window.location.hash);

  if (actor !== "customer" && orderView) {
    const href = orderBackHash({ ...ctx, actor });
    return (
      <div className="back-to-home-bar">
        <a
          className="back-to-home-btn"
          href={href}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            goToOrderListHash({ ...ctx, actor });
          }}
        >
          ← {orderBackLabel(actor)}
        </a>
      </div>
    );
  }

  return (
    <div className="back-to-home-bar">
      <a className="back-to-home-btn" href="#home">
        ← Back to Home
      </a>
    </div>
  );
}
