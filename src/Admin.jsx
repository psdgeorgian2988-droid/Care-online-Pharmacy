import { useEffect, useMemo, useState } from "react";
import {
  fetchStaffOrders,
  fetchStaffPartners,
  patchStaffOrder,
  publishOrder,
  staffLogin,
  staffLogout,
  staffToken,
} from "./adminApi";
import {
  TRACK_STEPS,
  doneLabel,
  kindLabel,
  loadAllOrders,
  persistOrder,
} from "./orderTracking";

function personName(order) {
  return (
    order.patientName ||
    order.fullName ||
    order.name ||
    "Not provided"
  );
}

function Admin() {
  const [token, setToken] = useState(() => staffToken());
  const [user, setUser] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");

  const loadOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const [data, partnerData] = await Promise.all([
        fetchStaffOrders(),
        fetchStaffPartners().catch(() => ({ partners: [] })),
      ]);
      setOrders(Array.isArray(data.orders) ? data.orders : []);
      setPartners(Array.isArray(partnerData.partners) ? partnerData.partners : []);
    } catch (err) {
      setError(err.message || "Could not load orders.");
      if (String(err.message || "").toLowerCase().includes("login")) {
        staffLogout();
        setToken("");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadOrders();
  }, [token]);

  const filtered = useMemo(() => {
    if (filter === "all") return orders;
    return orders.filter((order) => (order.kind || order.orderType) === filter);
  }, [orders, filter]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await staffLogin(user.trim(), password);
      setToken(staffToken());
      setPassword("");
    } catch (err) {
      setError(err.message || "Login failed.");
    }
  };

  const handleStatus = async (order, trackStatus) => {
    const id = order.id || order.bookingId || order.requestId;
    const done = trackStatus === "done";
    const status =
      TRACK_STEPS.find((step) => step.key === trackStatus)?.label ||
      order.status;
    setError("");
    try {
      await patchStaffOrder(id, {
        trackStatus,
        trackCompleted: done,
        status: done ? doneLabel(order.kind || order.orderType) : status,
      });
      persistOrder(order, {
        trackStatus,
        trackCompleted: done,
        status: done ? doneLabel(order.kind || order.orderType) : status,
      });
      await loadOrders();
    } catch (err) {
      setError(err.message || "Could not update status.");
    }
  };

  const handleAssign = async (order, partnerId) => {
    const id = order.id || order.bookingId || order.requestId;
    setError("");
    try {
      const data = await patchStaffOrder(id, { partnerId });
      persistOrder(order, data.order || { partnerId });
      await loadOrders();
    } catch (err) {
      setError(err.message || "Could not assign partner.");
    }
  };

  const importBrowserOrders = async () => {
    setError("");
    const local = loadAllOrders();
    await Promise.all(local.map((row) => publishOrder(row)));
    await loadOrders();
  };

  if (!token) {
    return (
      <>
        <style>{styles}</style>
        <div className="service-page admin-page">
          <section className="service-hero">
            <span className="service-kicker">MediHome Staff</span>
            <h1>Staff Login</h1>
            <p>Operations desk for incoming orders and bookings.</p>
          </section>
          <form className="service-form admin-login" onSubmit={handleLogin}>
            <div className="field">
              <label htmlFor="staff-user">User</label>
              <input
                id="staff-user"
                value={user}
                onChange={(event) => setUser(event.target.value)}
                autoComplete="username"
              />
            </div>
            <div className="field">
              <label htmlFor="staff-pass">Password</label>
              <input
                id="staff-pass"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error ? <small className="admin-error">{error}</small> : null}
            <button type="submit" className="service-submit">
              Sign in
            </button>
            <p className="admin-hint">
              Local staff user: <strong>admin</strong> · password:{" "}
              <strong>MediHome@26</strong>
            </p>
          </form>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="service-page admin-page">
        <section className="service-hero admin-hero">
          <div>
            <span className="service-kicker">MediHome Staff</span>
            <h1>Orders</h1>
            <p>
              Incoming orders, Razorpay split, and partner assignment. Partner desk:{" "}
              <a href="#partner">#partner</a>
            </p>
          </div>
          <div className="admin-hero-actions">
            <button type="button" onClick={loadOrders} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button type="button" onClick={importBrowserOrders}>
              Import this browser
            </button>
            <button
              type="button"
              onClick={() => {
                staffLogout();
                setToken("");
                setOrders([]);
              }}
            >
              Sign out
            </button>
          </div>
        </section>

        <div className="lab-tabs admin-tabs" role="tablist">
          {[
            ["all", "All"],
            ["medicine", "Medicines"],
            ["lab", "Lab"],
            ["radiology", "Radiology"],
            ["homecare", "Home Care"],
            ["stepdown", "Step-Down"],
            ["ambulance", "Ambulance"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              className={filter === value ? "is-on" : ""}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {error ? <p className="admin-error">{error}</p> : null}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Type</th>
                <th>Patient</th>
                <th>PIN</th>
                <th>Outlet</th>
                <th>When</th>
                <th>Amount</th>
                <th>Pay / split</th>
                <th>Partner</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="10">
                    {loading
                      ? "Loading…"
                      : "No orders yet. Place a booking on the website, then Refresh. Or Import this browser."}
                  </td>
                </tr>
              ) : (
                filtered.map((order) => {
                  const id = order.id || order.bookingId || order.requestId;
                  const kind = order.kind || order.orderType;
                  return (
                    <tr key={`${kind}-${id}`}>
                      <td>#{id}</td>
                      <td>{kindLabel(kind)}</td>
                      <td>{personName(order)}</td>
                      <td>{order.pinCode || order.pin || "—"}</td>
                      <td>
                        {order.outletName ? (
                          <>
                            {order.outletName}
                            {order.outletArea ? (
                              <span className="admin-outlet-area">
                                {" "}
                                · {order.outletArea}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>{order.date || order.bookedAt || order.requestedAt || "—"}</td>
                      <td>
                        {order.total != null && order.total !== ""
                          ? `₹${Number(order.total).toLocaleString("en-IN")}`
                          : "—"}
                      </td>
                      <td>
                        {order.paymentMethod === "online" ? "Online" : "COD"}
                        {order.paymentStatus ? ` · ${order.paymentStatus}` : ""}
                        {order.split ? (
                          <span className="admin-outlet-area">
                            <br />
                            MH ₹{Number(order.split.platformRupees || 0).toLocaleString("en-IN")}
                            {" · "}
                            Partner ₹
                            {Number(order.split.partnerRupees || 0).toLocaleString("en-IN")}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <select
                          value={order.partnerId || ""}
                          onChange={(event) => handleAssign(order, event.target.value)}
                        >
                          <option value="">Unassigned</option>
                          {partners
                            .filter(
                              (row) =>
                                !row.kinds?.length ||
                                row.kinds.includes(kind) ||
                                row.id === order.partnerId
                            )
                            .map((row) => (
                              <option key={row.id} value={row.id}>
                                {row.name}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={order.trackStatus || "confirmed"}
                          onChange={(event) => handleStatus(order, event.target.value)}
                        >
                          {TRACK_STEPS.map((step) => (
                            <option key={step.key} value={step.key}>
                              {step.key === "done" ? doneLabel(kind) : step.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const styles = `
.admin-page{max-width:1240px}
.admin-tabs{margin:0 auto 12px;max-width:1240px}
.admin-hero{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.admin-hero-actions{display:flex;flex-wrap:wrap;gap:6px}
.admin-hero-actions button{border:1px solid #d7e2e9;border-radius:6px;background:#fff;color:#1a6b7a;font:inherit;font-size:12px;font-weight:700;padding:6px 10px;cursor:pointer}
.admin-login{max-width:420px}
.admin-hint{grid-column:1/-1;margin:0;color:#5d7180;font-size:12px}
.admin-error{grid-column:1/-1;color:#d84b4b;font-size:13px}
.admin-table-wrap{overflow:auto;background:#fff;border:1px solid #e4ecef;border-radius:12px}
.admin-table{width:100%;border-collapse:collapse;font-size:13px}
.admin-table th,.admin-table td{padding:8px 10px;border-bottom:1px solid #edf1f3;text-align:left;vertical-align:middle}
.admin-table th{background:#f7fafc;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#5d7180}
.admin-outlet-area{color:#5d7180;font-weight:500}
.admin-page .service-hero h1{margin:0 0 4px;font-size:22px}
.admin-page .service-kicker{display:block;margin-bottom:4px;font-size:11px;font-weight:800;letter-spacing:.6px;color:#1a6b7a}
.admin-page .service-hero{margin:0 auto 12px;padding:14px 16px;border-radius:12px;background:linear-gradient(135deg,#eaf7ff,#f4fbf8)}
.admin-page .service-form{display:grid;grid-template-columns:1fr;gap:10px;padding:14px;background:#fff;border:1px solid #e4ecef;border-radius:12px}
.admin-page .field{display:flex;flex-direction:column}
.admin-page label{margin-bottom:5px;font-size:12px;font-weight:700;color:#34546b}
.admin-page input,.admin-page .service-submit{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #d7e2e9;border-radius:8px;font:inherit}
.admin-page .service-submit{border:none;background:#1a6b7a;color:#fff;font-weight:700;min-height:40px;cursor:pointer}
.lab-tabs{display:inline-flex;flex-wrap:wrap;padding:4px;border-radius:10px;background:#e8f1f6;gap:4px}
.lab-tabs button{border:0;background:transparent;color:#3d5a6c;font:inherit;font-size:13px;font-weight:700;padding:8px 14px;border-radius:8px;cursor:pointer}
.lab-tabs button.is-on{background:#fff;color:#1a6b7a;box-shadow:0 1px 3px rgba(20,50,70,.08)}
@media (max-width:800px){.admin-hero{flex-direction:column}}
`;

export default Admin;
