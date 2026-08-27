import {
  TRACK_STATUS_STEPS,
  groupByTrackStatus,
  isUnassigned,
  matchesStatusFilter,
  nextTrackStep,
  serviceKind,
  statusMatrix,
  trackKey,
} from "./orderStatus";
import { formatInr, orderAmount, orderId } from "./salesReport";
import { doneLabel, kindLabel, trackHref } from "./orderTracking";

function personName(order) {
  return order.patientName || order.fullName || order.name || "Not provided";
}

function stepTitle(kind, key) {
  return key === "done" ? doneLabel(kind) : TRACK_STATUS_STEPS.find((step) => step.key === key)?.label;
}

export function OrderStatusTrack({
  orders,
  filter,
  statusFilter,
  onSelect,
  onStatus,
}) {
  const matrix = statusMatrix(orders);
  const grouped = groupByTrackStatus(
    orders.filter((order) => {
      if (filter !== "all" && serviceKind(order) !== filter) return false;
      return matchesStatusFilter(order, statusFilter);
    })
  );

  return (
    <section className="admin-panel admin-status-panel" aria-label="Order status tracker">
      <h2>Track order status</h2>
      <p>
        Live pipeline for every service. Click a count to filter the table. Advance a card to
        move the booking to the next step.
      </p>

      <div className="admin-status-kpis">
        <button type="button" className={statusFilter === "open" ? "is-on" : ""} onClick={() => onSelect("all", "open")}>
          <span>Open</span>
          <strong>{matrix.open}</strong>
        </button>
        <button type="button" className={statusFilter === "progress" ? "is-on" : ""} onClick={() => onSelect("all", "progress")}>
          <span>In progress</span>
          <strong>{matrix.inProgress}</strong>
        </button>
        <button type="button" className={statusFilter === "done" ? "is-on" : ""} onClick={() => onSelect("all", "done")}>
          <span>Done</span>
          <strong>{matrix.done}</strong>
        </button>
        <button
          type="button"
          className={`is-warn ${statusFilter === "unassigned" ? "is-on" : ""}`}
          onClick={() => onSelect("all", "unassigned")}
        >
          <span>Unassigned</span>
          <strong>{matrix.unassigned}</strong>
        </button>
      </div>

      <div className="admin-matrix-wrap">
        <table className="admin-status-matrix">
          <thead>
            <tr>
              <th>Service</th>
              {TRACK_STATUS_STEPS.map((step) => (
                <th key={step.key}>{step.key === "done" ? "Done" : step.label}</th>
              ))}
              <th>Open</th>
              <th>Need partner</th>
            </tr>
          </thead>
          <tbody>
            {matrix.byKind.map((row) => (
              <tr key={row.kind}>
                <th scope="row">
                  <button type="button" onClick={() => onSelect(row.kind, "all")}>
                    {kindLabel(row.kind)}
                  </button>
                </th>
                {TRACK_STATUS_STEPS.map((step) => (
                  <td key={step.key}>
                    <button
                      type="button"
                      className={`admin-status-cell is-${step.key} ${
                        filter === row.kind && statusFilter === step.key ? "is-on" : ""
                      }`}
                      onClick={() => onSelect(row.kind, step.key)}
                    >
                      {row[step.key] || "—"}
                    </button>
                  </td>
                ))}
                <td>
                  <button type="button" onClick={() => onSelect(row.kind, "open")}>
                    {row.open}
                  </button>
                </td>
                <td>
                  <button
                    type="button"
                    className={row.unassigned ? "is-warn" : ""}
                    onClick={() => onSelect(row.kind, "unassigned")}
                  >
                    {row.unassigned}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-pipe" role="list">
        {TRACK_STATUS_STEPS.map((step) => {
          const rows = grouped[step.key] || [];
          return (
            <div key={step.key} className={`admin-pipe-col is-${step.key}`} role="listitem">
              <header>
                <h3>{step.label}</h3>
                <strong>{rows.length}</strong>
              </header>
              {rows.length === 0 ? (
                <p className="admin-muted">None</p>
              ) : (
                <ul>
                  {rows.map((order) => {
                    const kind = serviceKind(order);
                    const id = orderId(order);
                    const stepNow = trackKey(order);
                    const next = nextTrackStep(stepNow);
                    return (
                      <li key={`${kind}-${id}`} className="admin-pipe-card">
                        <div className="admin-pipe-card-top">
                          <span>{kindLabel(kind)}</span>
                          <a href={trackHref(id)}>Track</a>
                        </div>
                        <strong>#{id}</strong>
                        <p>{personName(order)}</p>
                        <p className="admin-muted">
                          PIN {order.pinCode || order.pin || "—"}
                          {order.partnerName ? ` · ${order.partnerName}` : isUnassigned(order) ? " · No partner" : ""}
                          {` · ${formatInr(orderAmount(order))}`}
                        </p>
                        {stepNow !== "done" ? (
                          <button type="button" onClick={() => onStatus(order, next)}>
                            Move to {stepTitle(kind, next)}
                          </button>
                        ) : (
                          <small>Closed</small>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
