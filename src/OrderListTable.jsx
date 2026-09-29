import { Fragment } from "react";
import { kindLabel } from "./orderTracking";
import {
  orderAssignedLabel,
  orderKind,
  orderOutletLabel,
  orderPaymentModeLabel,
  orderRecordId,
  orderTrackLabel,
} from "./orderFullFields";

export default function OrderListTable({
  orders = [],
  audience = "customer",
  empty = "No orders.",
  openId = "",
  onOpen,
  renderDetail,
}) {
  const compact = audience === "customer";
  const colSpan = compact ? 3 : 6;
  if (compact) {
    return (
      <div className="order-list-cards">
        <style>{styles}</style>
        {orders.length === 0 ? (
          <p className="order-list-empty">{empty}</p>
        ) : (
          <ul>
            {orders.map((order) => {
              const id = orderRecordId(order);
              const open = String(openId) === String(id);
              return (
                <li key={`${orderKind(order)}-${id}`}>
                  <button
                    type="button"
                    className={`order-list-card${open ? " is-on" : ""}`}
                    onClick={() => onOpen?.(open ? "" : id, order)}
                  >
                    <strong>#{id}</strong>
                    <span>{kindLabel(orderKind(order))}</span>
                    <em>{orderTrackLabel(order) || "—"}</em>
                  </button>
                  {open && renderDetail ? (
                    <div className="order-list-card-detail">{renderDetail(order)}</div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }
  return (
    <div className="admin-table-wrap">
      <style>{styles}</style>
      <table className="admin-table order-list-table">
        <thead>
          <tr>
            <th>Job</th>
            <th>Type</th>
            {compact ? null : <th>Outlet</th>}
            {compact ? null : <th>Payment mode</th>}
            {compact ? null : <th>Assigned to</th>}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={colSpan}>{empty}</td>
            </tr>
          ) : (
            orders.map((order) => {
              const id = orderRecordId(order);
              const open = String(openId) === String(id);
              return (
                <Fragment key={`${orderKind(order)}-${id}`}>
                  <tr className={open ? "is-open" : ""}>
                    <td>
                      <button
                        type="button"
                        className={`order-list-job${open ? " is-on" : ""}`}
                        onClick={() => onOpen?.(open ? "" : id, order)}
                      >
                        #{id}
                      </button>
                    </td>
                    <td>{kindLabel(orderKind(order))}</td>
                    {compact ? null : <td>{orderOutletLabel(order)}</td>}
                    {compact ? null : <td>{orderPaymentModeLabel(order, audience)}</td>}
                    {compact ? null : <td>{orderAssignedLabel(order)}</td>}
                    <td>{orderTrackLabel(order) || "—"}</td>
                  </tr>
                  {open && renderDetail ? (
                    <tr className="order-list-detail">
                      <td colSpan={colSpan}>{renderDetail(order)}</td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

const styles = `
.order-list-job{border:0;background:none;padding:0;color:#1a6b7a;font:inherit;font-weight:800;cursor:pointer;text-decoration:underline}
.order-list-job.is-on{color:#143246}
.order-list-table tr.is-open td{background:#f7fbfd}
.order-list-detail td{background:#fbfefe}
.order-list-cards{width:100%}
.order-list-cards ul{list-style:none;margin:0;padding:0;display:grid;gap:14px}
.order-list-empty{margin:0;padding:20px 4px;color:#5d7180;font-size:15px}
.order-list-card{width:100%;display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:20px 18px;border:1px solid #e4ecef;border-radius:14px;background:#fff;box-shadow:0 1px 0 rgba(20,50,70,.04);text-align:left;cursor:pointer;font:inherit;color:#143246}
.order-list-card.is-on{border-color:#1a6b7a;background:#f7fbfd}
.order-list-card strong{color:#1a6b7a;font-size:16px;font-weight:800;word-break:break-word}
.order-list-card span{color:#34546b;font-size:15px;font-weight:600}
.order-list-card em{font-style:normal;color:#1a6b7a;font-size:13px;font-weight:800}
.order-list-card-detail{margin-top:8px;padding:12px;border:1px solid #e4ecef;border-radius:12px;background:#fbfefe}
`;
