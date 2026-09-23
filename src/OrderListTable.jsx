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
  return (
    <div className="admin-table-wrap">
      <style>{styles}</style>
      <table className="admin-table order-list-table">
        <thead>
          <tr>
            <th>Job</th>
            <th>Type</th>
            <th>Outlet</th>
            <th>Payment mode</th>
            <th>Assigned to</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={6}>{empty}</td>
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
                    <td>{orderOutletLabel(order)}</td>
                    <td>{orderPaymentModeLabel(order, audience)}</td>
                    <td>{orderAssignedLabel(order)}</td>
                    <td>{orderTrackLabel(order) || "—"}</td>
                  </tr>
                  {open && renderDetail ? (
                    <tr className="order-list-detail">
                      <td colSpan={6}>{renderDetail(order)}</td>
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
`;
