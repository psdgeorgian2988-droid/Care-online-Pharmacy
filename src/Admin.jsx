import { useEffect, useMemo, useState } from "react";
import {
  fetchStaffChats,
  fetchStaffOrders,
  fetchStaffPartners,
  fetchStaffSettings,
  patchStaffOrder,
  patchStaffSettings,
  publishOrder,
  replyStaffChat,
  staffLogin,
  staffLogout,
  staffToken,
} from "./adminApi";
import { cacheFeatures } from "./featureFlags";
import {
  TRACK_STEPS,
  doneLabel,
  kindLabel,
  loadAllOrders,
  persistOrder,
  trackHref,
} from "./orderTracking";
import {
  FEATURE_CATALOG,
  DEFAULT_FEATURES,
  analysisRange,
  analysisToCsv,
  compareGroups,
  filterReport,
  formatInr,
  formatPct,
  formatWhen,
  groupByOutlet,
  groupByPayment,
  groupByPin,
  growthSnapshot,
  kindGroup,
  mergeFeatures,
  monthlyMatrix,
  monthlyServiceSeries,
  orderAmount,
  orderId,
  orderOutlet,
  ordersInRange,
  pinGroup,
  previousRange,
  reportBreakdown,
  reportRange,
  summarizeSales,
  topMover,
  yoySnapshot,
} from "./salesReport";
import { OrderStatusTrack } from "./adminStatus";
import {
  BarList,
  CompareBars,
  GrowthTable,
  MonthMatrix,
  MonthStackChart,
} from "./adminCharts";
import {
  isUnassigned,
  matchesStatusFilter,
  serviceKind,
  trackKey,
} from "./orderStatus";
import DateMonthYearFields from "./DateMonthYearFields";
import { isoDateToday, isoDateYearsAgo } from "./personFields";
import { paymentMethodLabel } from "./paymentMethods";
import { settlementOpsNote } from "./paymentSplit";

function personName(order) {
  return (
    order.patientName ||
    order.fullName ||
    order.name ||
    "Not provided"
  );
}

function downloadCsv(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function Admin() {
  const [token, setToken] = useState(() => staffToken());
  const [user, setUser] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const [chats, setChats] = useState([]);
  const [chatId, setChatId] = useState("");
  const [chatDraft, setChatDraft] = useState("");
  const [partners, setPartners] = useState([]);
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reportPeriod, setReportPeriod] = useState("mtd");
  const [reportKind, setReportKind] = useState("all");
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  const [reportRows, setReportRows] = useState(null);
  const [chartPeriod, setChartPeriod] = useState("mtd");

  const loadDesk = async () => {
    setLoading(true);
    setError("");
    try {
      const [data, partnerData, settings, chatData] = await Promise.all([
        fetchStaffOrders(),
        fetchStaffPartners().catch(() => ({ partners: [] })),
        fetchStaffSettings().catch(() => ({ features: DEFAULT_FEATURES })),
        fetchStaffChats().catch(() => ({ threads: [] })),
      ]);
      setOrders(Array.isArray(data.orders) ? data.orders : []);
      setPartners(Array.isArray(partnerData.partners) ? partnerData.partners : []);
      setChats(Array.isArray(chatData.threads) ? chatData.threads : []);
      const nextFeatures = mergeFeatures(settings.features);
      setFeatures(nextFeatures);
      cacheFeatures(nextFeatures);
    } catch (err) {
      setError(err.message || "Could Not Load Orders.");
      if (String(err.message || "").toLowerCase().includes("login")) {
        staffLogout();
        setToken("");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadDesk();
  }, [token]);

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      if (filter !== "all" && serviceKind(order) !== filter) return false;
      return matchesStatusFilter(order, statusFilter);
    });
  }, [orders, filter, statusFilter]);

  const sales = useMemo(() => summarizeSales(orders), [orders]);
  const growth = useMemo(() => growthSnapshot(orders), [orders]);
  const yoy = useMemo(() => yoySnapshot(orders), [orders]);
  const range = useMemo(() => analysisRange(chartPeriod), [chartPeriod]);
  const prior = useMemo(() => previousRange(range), [range]);
  const currentRows = useMemo(
    () => ordersInRange(orders, range.fromMs, range.toMs),
    [orders, range]
  );
  const previousRows = useMemo(
    () => ordersInRange(orders, prior.fromMs, prior.toMs),
    [orders, prior]
  );
  const byServiceBars = useMemo(() => reportBreakdown(currentRows), [currentRows]);
  const byPin = useMemo(() => groupByPin(currentRows), [currentRows]);
  const byStore = useMemo(() => groupByOutlet(currentRows), [currentRows]);
  const byPay = useMemo(() => groupByPayment(currentRows), [currentRows]);
  const serviceCompare = useMemo(
    () => compareGroups(currentRows, previousRows, kindGroup),
    [currentRows, previousRows]
  );
  const pinCompare = useMemo(
    () => compareGroups(currentRows, previousRows, pinGroup),
    [currentRows, previousRows]
  );
  const storeCompare = useMemo(
    () => compareGroups(currentRows, previousRows, orderOutlet),
    [currentRows, previousRows]
  );
  const monthly = useMemo(() => monthlyServiceSeries(orders), [orders]);
  const matrixService = useMemo(
    () => monthlyMatrix(orders, (row) => ({ key: row.kind || row.orderType || "medicine", label: kindLabel(row.kind || row.orderType) }), 12),
    [orders]
  );
  const matrixPin = useMemo(() => monthlyMatrix(orders, pinGroup, 12), [orders]);
  const matrixStore = useMemo(
    () => monthlyMatrix(orders, orderOutlet, 12),
    [orders]
  );
  const mtdAov = sales.mtd.count ? sales.mtd.amount / sales.mtd.count : 0;
  const serviceUp = topMover(serviceCompare, "up");
  const serviceDown = topMover(serviceCompare, "down");
  const pinUp = topMover(pinCompare, "up");
  const pinDown = topMover(pinCompare, "down");
  const storeUp = topMover(storeCompare, "up");
  const storeDown = topMover(storeCompare, "down");

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await staffLogin(user.trim(), password);
      setToken(staffToken());
      setPassword("");
    } catch (err) {
      setError(err.message || "Login Failed.");
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
      await loadDesk();
    } catch (err) {
      setError(err.message || "Could Not Update Status.");
    }
  };

  const handleAssign = async (order, partnerId) => {
    const id = order.id || order.bookingId || order.requestId;
    setError("");
    try {
      const data = await patchStaffOrder(id, { partnerId });
      persistOrder(order, data.order || { partnerId });
      await loadDesk();
    } catch (err) {
      setError(err.message || "Could Not Assign Partner.");
    }
  };

  const importBrowserOrders = async () => {
    setError("");
    const local = loadAllOrders();
    await Promise.all(local.map((row) => publishOrder(row)));
    await loadDesk();
  };

  const handleChatReply = async (event) => {
    event.preventDefault();
    const id = chatId || chats[0]?.sessionId;
    if (!id || !chatDraft.trim()) return;
    setError("");
    try {
      const data = await replyStaffChat(id, chatDraft.trim());
      setChatDraft("");
      setChats((rows) =>
        rows.map((row) => (row.sessionId === id ? data.thread : row))
      );
    } catch (err) {
      setError(err.message || "Could Not Send Care Reply.");
    }
  };

  const toggleFeature = async (key) => {
    const next = { ...features, [key]: !features[key] };
    setFeatures(next);
    cacheFeatures(next);
    try {
      const saved = await patchStaffSettings({ features: next });
      const merged = mergeFeatures(saved.features);
      setFeatures(merged);
      cacheFeatures(merged);
    } catch (err) {
      setError(err.message || "Could Not Save Feature Switch.");
      await loadDesk();
    }
  };

  const generateReport = () => {
    const rows = filterReport(orders, {
      period: reportPeriod,
      kind: reportKind,
      from: reportFrom,
      to: reportTo,
    });
    setReportRows(rows);
  };

  const analysisCsvFor = (rows) => {
    const window = reportRange({
      period: reportPeriod,
      from: reportFrom,
      to: reportTo,
    });
    const priorWindow = previousRange(window);
    const previous = ordersInRange(orders, priorWindow.fromMs, priorWindow.toMs).filter(
      (row) => reportKind === "all" || (row.kind || row.orderType) === reportKind
    );
    return analysisToCsv({
      periodLabel: `${window.label}${reportKind !== "all" ? ` · ${reportKind}` : ""}`,
      currentLabel: "Now",
      previousLabel: "Prev",
      service: compareGroups(rows, previous, kindGroup, 50),
      pin: compareGroups(rows, previous, pinGroup, 50),
      store: compareGroups(rows, previous, orderOutlet, 50),
      payment: groupByPayment(rows),
      matrixService,
      matrixPin,
      matrixStore,
      orders: rows,
    });
  };

  const downloadReport = () => {
    const rows =
      reportRows ||
      filterReport(orders, {
        period: reportPeriod,
        kind: reportKind,
        from: reportFrom,
        to: reportTo,
      });
    downloadCsv(`medihome-analysis-${reportPeriod}.csv`, analysisCsvFor(rows));
  };

  if (!token) {
    return (
      <>
        <style>{styles}</style>
        <div className="service-page admin-page">
          <section className="service-hero">
            <span className="service-kicker">Operations</span>
            <h1>Staff Login</h1>
            <p>Assign Partners, Update Status, And See Payment Splits. This Desk Is Separate From The Public Website.</p>
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
              Sign In
            </button>
            <p className="admin-hint">
              Local Staff User: <strong>admin</strong> · Password:{" "}
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
            <span className="service-kicker">Operations</span>
            <h1>Staff Desk</h1>
            <p>
              Sales, Feature Switches, Growth Charts, And Partner Assignment.
            </p>
          </div>
          <div className="admin-hero-actions">
            <a className="admin-scan-link" href="#scan?step=pack">
              Scan Packing
            </a>
            <button type="button" onClick={loadDesk} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button type="button" onClick={importBrowserOrders}>
              Import This Browser
            </button>
            <button
              type="button"
              onClick={() => {
                staffLogout();
                setToken("");
                setOrders([]);
              }}
            >
              Sign Out
            </button>
          </div>
        </section>

        {error ? <p className="admin-error">{error}</p> : null}

        <section className="admin-panel" aria-label="Customer Care Inbox">
          <h2>Customer Care Inbox</h2>
          <p>Replies From This Desk Show In The Public Chatbox.</p>
          {chats.length === 0 ? (
            <p className="admin-muted">No Website Chats Yet.</p>
          ) : (
            <div className="admin-chat-layout">
              <ul className="admin-chat-list">
                {chats.map((row) => (
                  <li key={row.sessionId}>
                    <button
                      type="button"
                      className={
                        (chatId || chats[0]?.sessionId) === row.sessionId ? "is-on" : ""
                      }
                      onClick={() => setChatId(row.sessionId)}
                    >
                      <strong>{row.name || "Guest"}</strong>
                      <span>
                        {row.needsStaff ? "Needs Staff · " : ""}
                        {row.messages?.at(-1)?.text?.slice(0, 48) || "Empty"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="admin-chat-thread">
                {(chats.find((row) => row.sessionId === (chatId || chats[0]?.sessionId))
                  ?.messages || []
                ).map((row) => (
                  <p key={row.id} className={`admin-chat-line is-${row.from}`}>
                    <strong>{row.from === "user" ? "Customer" : row.from === "staff" ? "You" : "Bot"}:</strong>{" "}
                    {row.text}
                  </p>
                ))}
                <form onSubmit={handleChatReply} className="admin-chat-compose">
                  <input
                    value={chatDraft}
                    onChange={(event) => setChatDraft(event.target.value)}
                    placeholder="Reply To This Chat"
                  />
                  <button type="submit">Send</button>
                </form>
              </div>
            </div>
          )}
        </section>

        <section className="admin-kpis" aria-label="Sales Figures">
          <article>
            <span>Today</span>
            <strong>{formatInr(sales.today.amount)}</strong>
            <small>{sales.today.count} orders</small>
          </article>
          <article>
            <span>Month To Date</span>
            <strong>{formatInr(sales.mtd.amount)}</strong>
            <small>{sales.mtd.count} orders · AOV {formatInr(mtdAov)}</small>
          </article>
          <article>
            <span>Year To Date</span>
            <strong>{formatInr(sales.ytd.amount)}</strong>
            <small>{sales.ytd.count} orders</small>
          </article>
          <article>
            <span>Same-Day Vs Last Month</span>
            <strong className={growth.pct == null ? "is-new" : growth.pct < 0 ? "is-down" : "is-up"}>
              {formatPct(growth.pct)}
            </strong>
            <small>
              {formatInr(growth.current)} vs {formatInr(growth.previous)}
            </small>
          </article>
          <article>
            <span>Same-Day Vs Last Year</span>
            <strong className={yoy.pct == null ? "is-new" : yoy.pct < 0 ? "is-down" : "is-up"}>
              {formatPct(yoy.pct)}
            </strong>
            <small>
              {formatInr(yoy.current)} vs {formatInr(yoy.previous)}
            </small>
          </article>
          <article>
            <span>Selected Period</span>
            <strong>{formatInr(currentRows.reduce((sum, row) => sum + orderAmount(row), 0))}</strong>
            <small>
              {currentRows.length} orders · {range.label}
            </small>
          </article>
        </section>

        <p className="admin-growth-note">
          {serviceUp
            ? `Service Growth: ${kindLabel(serviceUp.key)} (${formatPct(serviceUp.pct)}).`
            : "No Service-Level Growth In This Comparison Yet."}{" "}
          {serviceDown
            ? `Service Drop: ${kindLabel(serviceDown.key)} (${formatPct(serviceDown.pct)}).`
            : ""}{" "}
          {pinUp ? `PIN Growth: ${pinUp.label} (${formatPct(pinUp.pct)}).` : ""}{" "}
          {pinDown ? `PIN Drop: ${pinDown.label} (${formatPct(pinDown.pct)}).` : ""}{" "}
          {storeUp ? `Store Growth: ${storeUp.label} (${formatPct(storeUp.pct)}).` : ""}{" "}
          {storeDown ? `Store Drop: ${storeDown.label} (${formatPct(storeDown.pct)}).` : ""}
        </p>

        <section className="admin-panel" aria-label="Feature Switches">
          <h2>Turn Features On Or Off</h2>
          <p>Off Services Stay On The Menu And Show Coming Soon Until You Turn Them Back On.</p>
          <div className="admin-switches">
            {FEATURE_CATALOG.map((row) => (
              <button
                key={row.key}
                type="button"
                role="switch"
                aria-checked={features[row.key] !== false}
                className={features[row.key] !== false ? "is-on" : ""}
                onClick={() => toggleFeature(row.key)}
              >
                <span>{row.label}</span>
                <strong>{features[row.key] !== false ? "On" : "Off"}</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="admin-panel" aria-label="Chart Period">
          <h2>Growth And Degrowth Charts</h2>
          <p>
            Compare The Selected Period With The Equal-Length Stretch Before It.
            Month Grids Always Show The Last 12 Months In IST.
          </p>
          <div className="lab-tabs admin-tabs" role="tablist">
            {[
              ["today", "Today"],
              ["mtd", "Month To Date"],
              ["ytd", "Year To Date"],
              ["last12", "Last 12 Months"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                className={chartPeriod === value ? "is-on" : ""}
                onClick={() => setChartPeriod(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <div className="admin-chart-grid">
          <BarList
            title="Sales By Service"
            caption={`${range.label} · Share Of Bookings.`}
            rows={byServiceBars.map((row) => ({
              ...row,
              label: kindLabel(row.key),
            }))}
          />
          <BarList
            title="Sales By Store"
            caption="Outlet Fulfilment From PIN Routing."
            rows={byStore}
          />
          <BarList
            title="Sales By PIN"
            caption="Top Delivery / Visit PIN Codes."
            rows={byPin}
          />
          <BarList
            title="Payment Mix"
            caption="Online Checkout Vs Cash On Delivery."
            rows={byPay}
          />
        </div>

        <div className="admin-chart-grid">
          <CompareBars
            title="Service: Now Vs Previous"
            caption={`${range.label} Against The Same Number Of Days Before.`}
            rows={serviceCompare.map((row) => ({
              ...row,
              label: kindLabel(row.key),
            }))}
            currentLabel="Now"
            previousLabel="Prev"
          />
          <CompareBars
            title="PIN: Now Vs Previous"
            caption="Where Demand Is Growing Or Shrinking."
            rows={pinCompare}
            currentLabel="Now"
            previousLabel="Prev"
          />
          <CompareBars
            title="Store: Now Vs Previous"
            caption="Outlet Growth And Degrowth."
            rows={storeCompare}
            currentLabel="Now"
            previousLabel="Prev"
          />
          <GrowthTable
            title="Movers This Period"
            caption="Largest Current Sales, With % Vs Previous Window."
            rows={serviceCompare.map((row) => ({
              ...row,
              label: kindLabel(row.key),
            }))}
          />
        </div>

        <MonthStackChart
          title="Month-Wise Sales By Service"
          caption="Last 12 Months In IST. Taller Stacks Mean Higher Sales."
          months={monthly.months}
          kinds={monthly.kinds}
        />

        <MonthMatrix
          title="Service × Month"
          caption="MoM Is The Latest Month (Days So Far) Vs The Month Before. Same-Day % In The KPI Row Is The Fairer In-Month Read."
          matrix={matrixService}
          labelHeader="Service"
        />
        <MonthMatrix
          title="PIN × Month"
          caption="PIN-Code Sales Across The Last 12 Months."
          matrix={matrixPin}
          labelHeader="PIN"
        />
        <MonthMatrix
          title="Store × Month"
          caption="Store / Outlet Sales Across The Last 12 Months."
          matrix={matrixStore}
          labelHeader="Store"
        />

        <div className="admin-chart-grid">
          <GrowthTable
            title="PIN Growth / Degrowth"
            caption={`${range.label} Vs Previous Window.`}
            rows={pinCompare}
          />
          <GrowthTable
            title="Store Growth / Degrowth"
            caption={`${range.label} vs previous window.`}
            rows={storeCompare}
          />
        </div>

        <section className="admin-panel" aria-label="Detailed Reports">
          <h2>Generate A Detailed Report</h2>
          <div className="admin-report-controls">
            <label>
              Period
              <select
                value={reportPeriod}
                onChange={(event) => setReportPeriod(event.target.value)}
              >
                <option value="today">Today</option>
                <option value="mtd">Month To Date</option>
                <option value="ytd">Year To Date</option>
                <option value="last12">Last 12 Months</option>
                <option value="custom">Custom Dates</option>
              </select>
            </label>
            <label>
              Service
              <select
                value={reportKind}
                onChange={(event) => setReportKind(event.target.value)}
              >
                <option value="all">All Services</option>
                {FEATURE_CATALOG.filter(
                  (row) => !["reports", "education"].includes(row.key)
                ).map((row) => (
                  <option key={row.key} value={row.key}>
                    {row.label}
                  </option>
                ))}
              </select>
            </label>
            {reportPeriod === "custom" ? (
              <>
                <div className="admin-dmy">
                  <DateMonthYearFields
                    idPrefix="admin-from"
                    name="reportFrom"
                    value={reportFrom}
                    min={isoDateYearsAgo(10)}
                    max={isoDateToday()}
                    label="From"
                    onChange={(event) => setReportFrom(event.target.value)}
                  />
                </div>
                <div className="admin-dmy">
                  <DateMonthYearFields
                    idPrefix="admin-to"
                    name="reportTo"
                    value={reportTo}
                    min={reportFrom || isoDateYearsAgo(10)}
                    max={isoDateToday()}
                    label="To"
                    onChange={(event) => setReportTo(event.target.value)}
                  />
                </div>
              </>
            ) : null}
            <button type="button" onClick={generateReport}>
              Generate Report
            </button>
            <button type="button" onClick={downloadReport}>
              Download Analysis CSV
            </button>
          </div>
          {reportRows ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Type</th>
                    <th>When</th>
                    <th>PIN</th>
                    <th>Store</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {reportRows.length === 0 ? (
                    <tr>
                      <td colSpan="6">No Rows For This Period.</td>
                    </tr>
                  ) : (
                    reportRows.map((row) => (
                      <tr key={orderId(row)}>
                        <td>#{orderId(row)}</td>
                        <td>{kindLabel(row.kind || row.orderType)}</td>
                        <td>{formatWhen(row)}</td>
                        <td>{row.pinCode || row.pin || "—"}</td>
                        <td>{row.outletName || "—"}</td>
                        <td>{formatInr(orderAmount(row))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <p className="admin-muted">
                {reportRows.length} rows ·{" "}
                {formatInr(reportRows.reduce((sum, row) => sum + orderAmount(row), 0))}
                {reportBreakdown(reportRows).length
                  ? ` · ${reportBreakdown(reportRows)
                      .map((row) => `${kindLabel(row.key)} ${formatInr(row.amount)}`)
                      .join(" · ")}`
                  : ""}
              </p>
            </div>
          ) : null}
        </section>

        <OrderStatusTrack
          orders={orders}
          filter={filter}
          statusFilter={statusFilter}
          onSelect={(kind, step) => {
            setFilter(kind);
            setStatusFilter(step);
            document
              .getElementById("staff-orders")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          onStatus={handleStatus}
        />

        <div id="staff-orders" className="lab-tabs admin-tabs" role="tablist">
          {[
            ["all", "All"],
            ["medicine", "Medicines"],
            ["lab", "Lab"],
            ["radiology", "Radiology"],
            ["homecare", "Home Care"],
            ["vaccination", "Vaccination"],
            ["psychologist", "Psychologist"],
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
        <div className="lab-tabs admin-tabs" role="tablist" aria-label="Status Filter">
          {[
            ["all", "All Statuses"],
            ["open", "Open"],
            ["progress", "In Progress"],
            ["unassigned", "Unassigned"],
            ["confirmed", "Confirmed"],
            ["assigned", "Assigned"],
            ["on_the_way", "On The Way"],
            ["arriving", "Arriving"],
            ["done", "Done"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={statusFilter === value ? "is-on" : ""}
              onClick={() => setStatusFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>

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
                <th>Pay / Split</th>
                <th>Partner</th>
                <th>Status</th>
                <th>Track</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="11">
                    {loading
                      ? "Loading…"
                      : "No Orders In This Status. Place A Booking, Then Refresh, Or Choose All Statuses."}
                  </td>
                </tr>
              ) : (
                filtered.map((order) => {
                  const id = order.id || order.bookingId || order.requestId;
                  const kind = serviceKind(order);
                  const step = trackKey(order);
                  return (
                    <tr
                      key={`${kind}-${id}`}
                      className={isUnassigned(order) ? "is-unassigned" : ""}
                    >
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
                        {order.split?.discountRupees > 0 ? (
                          <span className="admin-outlet-area">
                            <br />
                            Sale ₹
                            {Number(order.split.saleRupees || order.saleRupees || 0).toLocaleString("en-IN")}
                            {" · Disc ₹"}
                            {Number(order.split.discountRupees).toLocaleString("en-IN")}
                            {order.split.couponCode ? ` · ${order.split.couponCode}` : ""}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        {paymentMethodLabel(order.paymentMethod, "COD")}
                        {order.paymentStatus ? ` · ${order.paymentStatus}` : ""}
                        {order.split ? (
                          <span className="admin-outlet-area">
                            <br />
                            MH ₹{Number(order.split.platformRupees || 0).toLocaleString("en-IN")}
                            {" · "}
                            Partner ₹
                            {Number(order.split.partnerRupees || 0).toLocaleString("en-IN")}
                            {order.split.partnerPercent != null
                              ? ` (${order.split.partnerPercent}% MRP)`
                              : ""}
                            {settlementOpsNote(order.split, {
                              collector: order.collector,
                              paymentMethod: order.paymentMethod,
                            }) ? (
                              <>
                                <br />
                                {settlementOpsNote(order.split, {
                                  collector: order.collector,
                                  paymentMethod: order.paymentMethod,
                                })}
                              </>
                            ) : null}
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
                        <span className={`admin-status-pill is-${step}`}>
                          {step === "done" ? doneLabel(kind) : TRACK_STEPS.find((row) => row.key === step)?.label}
                        </span>
                        <select
                          value={step}
                          onChange={(event) => handleStatus(order, event.target.value)}
                        >
                          {TRACK_STEPS.map((row) => (
                            <option key={row.key} value={row.key}>
                              {row.key === "done" ? doneLabel(kind) : row.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <a href={trackHref(id)}>Live Track</a>
                        {" · "}
                        <a href={`#scan?id=${encodeURIComponent(id)}&step=pack`}>Scan Packing</a>
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
.admin-hero-actions button,.admin-report-controls button,.admin-scan-link{border:1px solid #d7e2e9;border-radius:6px;background:#fff;color:#1a6b7a;font:inherit;font-size:12px;font-weight:700;padding:6px 10px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
.admin-login{max-width:420px}
.admin-hint{grid-column:1/-1;margin:0;color:#5d7180;font-size:12px}
.admin-error{grid-column:1/-1;color:#d84b4b;font-size:13px}
.admin-table-wrap{overflow:auto;background:#fff;border:1px solid #e4ecef;border-radius:12px;margin-bottom:16px}
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
.admin-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:0 0 10px}
.admin-kpis article{background:#fff;border:1px solid #e4ecef;border-radius:12px;padding:12px 14px}
.admin-kpis span{display:block;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#5d7180}
.admin-kpis strong{display:block;margin:6px 0 2px;font-size:22px;color:#123b5d}
.admin-kpis .is-up,.admin-growth-table .is-up,.admin-matrix .is-up,.admin-bars .is-up{color:#1a7a45}
.admin-kpis .is-down,.admin-growth-table .is-down,.admin-matrix .is-down,.admin-bars .is-down{color:#c44b4b}
.admin-kpis .is-new,.admin-growth-table .is-new,.admin-matrix .is-new,.admin-bars .is-new{color:#c47a2c}
.admin-kpis small{color:#5d7180}
.admin-growth-note{margin:0 0 14px;font-size:13px;color:#34546b}
.admin-panel{background:#fff;border:1px solid #e4ecef;border-radius:12px;padding:14px;margin-bottom:14px}
.admin-panel h2{margin:0 0 6px;font-size:16px}
.admin-panel p{margin:0 0 10px;color:#5d7180;font-size:13px}
.admin-switches{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.admin-switches button{display:flex;justify-content:space-between;align-items:center;gap:8px;border:1px solid #d7e2e9;border-radius:10px;background:#f7fafc;padding:10px 12px;font:inherit;cursor:pointer}
.admin-switches button.is-on{background:#e7f6ef;border-color:#b7e0c8}
.admin-switches strong{font-size:12px;color:#5d7180}
.admin-switches button.is-on strong{color:#1a7a45}
.admin-chart-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
.admin-chart{background:#fff;border:1px solid #e4ecef;border-radius:12px;padding:14px}
.admin-chart-wide{margin-bottom:14px}
.admin-chart h3{margin:0 0 4px;font-size:15px}
.admin-chart-cap,.admin-muted{margin:0 0 10px;color:#5d7180;font-size:12px}
.admin-bars{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.admin-bar-meta{display:flex;justify-content:space-between;gap:8px;font-size:12px}
.admin-bar-track{height:8px;background:#eef3f6;border-radius:99px;overflow:hidden}
.admin-bar-fill{height:100%;border-radius:99px}
.admin-bar-fill.is-prev{background:#9bb7c4}
.admin-compare-tracks{display:flex;flex-direction:column;gap:3px}
.admin-compare-cap{display:block;margin-top:4px;color:#5d7180;font-size:11px}
.admin-stack-chart{display:flex;align-items:flex-end;gap:8px;height:170px;padding-top:8px}
.admin-stack-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0}
.admin-stack-bars{display:flex;flex-direction:column-reverse;justify-content:flex-start;width:100%;max-width:28px;min-height:8px}
.admin-stack-col span{font-size:10px;color:#5d7180}
.admin-legend{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;font-size:12px;color:#34546b}
.admin-legend i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:6px}
.admin-matrix-wrap{overflow:auto}
.admin-matrix{width:100%;border-collapse:collapse;font-size:11px}
.admin-matrix th,.admin-matrix td{padding:6px 8px;border-bottom:1px solid #edf1f3;text-align:right;white-space:nowrap}
.admin-matrix th:first-child,.admin-matrix td:first-child,.admin-matrix tbody th{text-align:left;font-weight:700}
.admin-matrix thead th{background:#f7fafc;font-size:10px;letter-spacing:.03em;text-transform:uppercase;color:#5d7180}
.admin-matrix .is-total th,.admin-matrix .is-total td{font-weight:800;background:#f4fbf8}
.admin-growth-table{width:100%;border-collapse:collapse;font-size:12px}
.admin-growth-table th,.admin-growth-table td{padding:6px 8px;border-bottom:1px solid #edf1f3;text-align:left}
.admin-growth-table th{font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:#5d7180}
.admin-report-controls{display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin-bottom:12px}
.admin-report-controls label{display:flex;flex-direction:column;gap:4px;font-size:12px}
.admin-report-controls select,.admin-report-controls input[type=date]{min-height:34px;border:1px solid #d7e2e9;border-radius:8px;padding:4px 8px;font:inherit}
.admin-dmy{min-width:280px;flex:1 1 280px}
.admin-status-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:0 0 12px}
.admin-status-kpis button{border:1px solid #e4ecef;border-radius:10px;background:#f7fafc;padding:10px 12px;text-align:left;font:inherit;cursor:pointer}
.admin-status-kpis button.is-on{background:#e7f1f6;border-color:#b7d0dc}
.admin-status-kpis button.is-warn{background:#fff6ef}
.admin-status-kpis span{display:block;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#5d7180}
.admin-status-kpis strong{display:block;margin-top:4px;font-size:22px;color:#123b5d}
.admin-status-matrix{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px}
.admin-status-matrix th,.admin-status-matrix td{padding:6px;border-bottom:1px solid #edf1f3;text-align:center}
.admin-status-matrix th:first-child,.admin-status-matrix td:first-child{text-align:left}
.admin-status-matrix button{border:0;background:transparent;color:inherit;font:inherit;font-weight:700;min-width:28px;padding:4px 6px;border-radius:6px;cursor:pointer}
.admin-status-cell.is-on,.admin-status-matrix button.is-on{background:#e7f1f6}
.admin-status-matrix .is-warn{color:#c47a2c}
.admin-pipe{display:grid;grid-template-columns:repeat(5,minmax(160px,1fr));gap:8px;overflow:auto;align-items:start}
.admin-pipe-col{background:#f7fafc;border:1px solid #e4ecef;border-radius:10px;padding:8px;min-height:120px}
.admin-pipe-col header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.admin-pipe-col h3{margin:0;font-size:12px}
.admin-pipe-col ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.admin-pipe-card{background:#fff;border:1px solid #e4ecef;border-radius:8px;padding:8px}
.admin-pipe-card-top{display:flex;justify-content:space-between;gap:8px;font-size:11px;color:#5d7180}
.admin-pipe-card strong{display:block;margin:4px 0 2px;font-size:13px}
.admin-pipe-card p{margin:0 0 6px;font-size:12px}
.admin-pipe-card button{border:1px solid #d7e2e9;border-radius:6px;background:#fff;color:#1a6b7a;font:inherit;font-size:11px;font-weight:700;padding:4px 8px;cursor:pointer}
.admin-pipe-col.is-confirmed header{color:#c47a2c}
.admin-pipe-col.is-assigned header{color:#2a7de1}
.admin-pipe-col.is-on_the_way header{color:#1a6b7a}
.admin-pipe-col.is-arriving header{color:#6b5b95}
.admin-pipe-col.is-done header{color:#1a7a45}
.admin-status-pill{display:inline-block;margin:0 6px 4px 0;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:800}
.admin-status-pill.is-confirmed{background:#fff3e4;color:#c47a2c}
.admin-status-pill.is-assigned{background:#e7f0ff;color:#2a7de1}
.admin-status-pill.is-on_the_way{background:#e6f4f7;color:#1a6b7a}
.admin-status-pill.is-arriving{background:#eee8f6;color:#6b5b95}
.admin-status-pill.is-done{background:#e7f6ef;color:#1a7a45}
.admin-table tr.is-unassigned{background:#fffaf4}
.admin-table td select{max-width:140px}
.admin-chat-layout{display:grid;grid-template-columns:220px 1fr;gap:10px}
.admin-chat-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;max-height:240px;overflow:auto}
.admin-chat-list button{width:100%;border:1px solid #e4ecef;border-radius:8px;background:#f7fafc;padding:8px;text-align:left;font:inherit;cursor:pointer}
.admin-chat-list button.is-on{background:#e7f1f6;border-color:#b7d0dc}
.admin-chat-list strong{display:block;font-size:13px}
.admin-chat-list span{display:block;color:#5d7180;font-size:11px}
.admin-chat-thread{border:1px solid #e4ecef;border-radius:8px;padding:8px;max-height:240px;overflow:auto;background:#f7fafc}
.admin-chat-line{margin:0 0 6px;font-size:12px}
.admin-chat-line.is-user{color:#123b5d}
.admin-chat-line.is-staff{color:#1a7a45}
.admin-chat-compose{display:flex;gap:6px;margin-top:8px}
.admin-chat-compose input{flex:1;min-height:34px;border:1px solid #d7e2e9;border-radius:8px;padding:0 8px;font:inherit}
.admin-chat-compose button{border:0;border-radius:8px;background:#1a6b7a;color:#fff;font:inherit;font-weight:700;padding:0 10px;cursor:pointer}
@media (max-width:800px){
  .admin-chat-layout{grid-template-columns:1fr}
}
@media (max-width:1100px){
  .admin-pipe{grid-template-columns:repeat(5,minmax(180px,1fr))}
}
@media (max-width:900px){
  .admin-kpis,.admin-chart-grid,.admin-switches,.admin-status-kpis{grid-template-columns:1fr 1fr}
}
@media (max-width:800px){.admin-hero{flex-direction:column}}
@media (max-width:640px){
  .admin-kpis,.admin-chart-grid,.admin-switches,.admin-status-kpis{grid-template-columns:1fr}
}
`;

export default Admin;
