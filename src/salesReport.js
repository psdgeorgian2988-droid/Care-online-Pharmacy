export const TZ = "Asia/Kolkata";

export const FEATURE_CATALOG = [
  { key: "medicine", label: "Medicines", href: "#medicine-search" },
  { key: "lab", label: "Lab Tests", href: "#labs" },
  { key: "radiology", label: "Radiology", href: "#labs" },
  { key: "homecare", label: "Home Care", href: "#homecare" },
  { key: "stepdown", label: "Step-Down Care", href: "#stepdown" },
  { key: "ambulance", label: "Ambulance", href: "#ambulance" },
  { key: "reports", label: "Reports", href: "#reports" },
  { key: "education", label: "Health Education", href: "#education" },
];

export const DEFAULT_FEATURES = Object.fromEntries(
  FEATURE_CATALOG.map((row) => [row.key, true])
);

export const ROUTE_FEATURES = {
  "#medicine-search": ["medicine"],
  "#labs": ["lab", "radiology"],
  "#homecare": ["homecare"],
  "#stepdown": ["stepdown"],
  "#ambulance": ["ambulance"],
  "#reports": ["reports"],
  "#education": ["education"],
};

export function mergeFeatures(raw) {
  return { ...DEFAULT_FEATURES, ...(raw && typeof raw === "object" ? raw : {}) };
}

export function featureEnabled(features, key) {
  if (!key) return true;
  return features?.[key] !== false;
}

export function routeEnabled(route, features) {
  const keys = ROUTE_FEATURES[route];
  if (!keys) return true;
  return keys.some((key) => featureEnabled(features, key));
}

export function pausedServiceTitle(route, features) {
  const keys = ROUTE_FEATURES[route];
  if (!keys) return "This Service";
  const paused = FEATURE_CATALOG.filter(
    (row) => keys.includes(row.key) && !featureEnabled(features, row.key)
  );
  if (paused.length === 0) {
    return FEATURE_CATALOG.find((row) => keys.includes(row.key))?.label || "This Service";
  }
  return paused.map((row) => row.label).join(" And ");
}

export function orderId(order) {
  return String(order?.id || order?.bookingId || order?.requestId || "");
}

export function orderKind(order) {
  return String(order?.kind || order?.orderType || "medicine");
}

export function orderAmount(order) {
  const value = Number(
    order?.total ?? order?.charges ?? order?.split?.totalRupees ?? 0
  );
  return Number.isFinite(value) ? value : 0;
}

export function orderTimeMs(order) {
  const candidates = [
    order?.bookedAtMs,
    order?.requestedAtMs,
    order?.sortKey,
    order?.updatedAt,
    Date.parse(order?.bookedAt || ""),
    Date.parse(order?.requestedAt || ""),
    Date.parse(order?.date || ""),
  ];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 1_000_000_000_000) return n;
  }
  return 0;
}

function calendarParts(ms) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  const get = (type) => Number(parts.find((row) => row.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function istMidnightUtc(year, month, day) {
  return Date.UTC(year, month - 1, day) - 5.5 * 60 * 60 * 1000;
}

export function periodStarts(now = Date.now()) {
  const { year, month, day } = calendarParts(now);
  return {
    today: istMidnightUtc(year, month, day),
    mtd: istMidnightUtc(year, month, 1),
    ytd: istMidnightUtc(year, 1, 1),
    now,
  };
}

export function formatInr(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

export function formatWhen(order) {
  const ms = orderTimeMs(order);
  if (ms) {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: TZ,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ms));
  }
  return order?.date || order?.bookedAt || order?.requestedAt || "—";
}

function inRange(order, fromMs, toMs) {
  const t = orderTimeMs(order);
  if (!t) return false;
  return t >= fromMs && t <= toMs;
}

export function summarizeSales(orders, now = Date.now()) {
  const { today, mtd, ytd } = periodStarts(now);
  const bucket = (fromMs) => {
    const rows = orders.filter((row) => inRange(row, fromMs, now));
    return {
      count: rows.length,
      amount: rows.reduce((sum, row) => sum + orderAmount(row), 0),
    };
  };
  return {
    today: bucket(today),
    mtd: bucket(mtd),
    ytd: bucket(ytd),
  };
}

export function reportRange({ period, from, to } = {}, now = Date.now()) {
  if (period === "custom") {
    const fromMs = from ? istMidnightUtc(...from.split("-").map(Number)) : 0;
    let toMs = now;
    if (to) {
      const [y, m, d] = to.split("-").map(Number);
      toMs = istMidnightUtc(y, m, d) + 24 * 60 * 60 * 1000 - 1;
    }
    return { fromMs, toMs, label: "Custom Dates" };
  }
  return analysisRange(period || "mtd", now);
}

export function filterReport(orders, { period, kind, from, to }, now = Date.now()) {
  const { fromMs, toMs } = reportRange({ period, from, to }, now);
  return orders.filter((row) => {
    if (kind && kind !== "all" && orderKind(row) !== kind) return false;
    return inRange(row, fromMs, toMs);
  });
}

export function reportBreakdown(orders) {
  const byKind = {};
  for (const row of orders) {
    const kind = orderKind(row);
    if (!byKind[kind]) byKind[kind] = { key: kind, label: kind, count: 0, amount: 0 };
    byKind[kind].count += 1;
    byKind[kind].amount += orderAmount(row);
  }
  return Object.values(byKind).sort((a, b) => b.amount - a.amount);
}

export function orderPin(order) {
  const pin = String(order?.pinCode || order?.pin || "").replace(/\D/g, "").slice(0, 6);
  return pin.length === 6 ? pin : "Unknown";
}

export function orderOutlet(order) {
  return {
    key: String(order?.outletId || "unassigned"),
    label: order?.outletName
      ? `${order.outletName}${order.outletArea ? ` · ${order.outletArea}` : ""}`
      : "Unassigned store",
  };
}

export function monthKey(ms) {
  const { year, month } = calendarParts(ms);
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function monthLabel(key) {
  const [year, month] = String(key).split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit" }).format(
    new Date(year, month - 1, 1)
  );
}

export function lastMonthKeys(count = 12, now = Date.now()) {
  const { year, month } = calendarParts(now);
  const keys = [];
  let y = year;
  let m = month;
  for (let i = 0; i < count; i += 1) {
    keys.unshift(`${y}-${String(m).padStart(2, "0")}`);
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
  }
  return keys;
}

function groupMap(orders, keyFn) {
  const map = {};
  for (const row of orders) {
    const meta = keyFn(row);
    const key = meta.key;
    if (!map[key]) map[key] = { key, label: meta.label, count: 0, amount: 0 };
    map[key].count += 1;
    map[key].amount += orderAmount(row);
  }
  return Object.values(map).sort((a, b) => b.amount - a.amount);
}

export function pinGroup(row) {
  const pin = orderPin(row);
  return { key: pin, label: pin };
}

export function kindGroup(row) {
  const kind = orderKind(row);
  return { key: kind, label: kind };
}

export function groupByPin(orders, limit = 12) {
  return groupMap(orders, pinGroup).slice(0, limit);
}

export function groupByOutlet(orders, limit = 8) {
  return groupMap(orders, orderOutlet).slice(0, limit);
}

export function groupByPayment(orders) {
  return groupMap(orders, (row) => {
    const online = String(row.paymentMethod || "").toLowerCase() === "online";
    return { key: online ? "online" : "cod", label: online ? "Online" : "COD" };
  });
}

export function monthlyServiceSeries(orders, now = Date.now()) {
  const keys = lastMonthKeys(12, now);
  const byMonth = Object.fromEntries(
    keys.map((key) => [key, { key, label: monthLabel(key), amount: 0, count: 0, byKind: {} }])
  );
  const kinds = new Set();
  for (const row of orders) {
    const t = orderTimeMs(row);
    if (!t) continue;
    const key = monthKey(t);
    if (!byMonth[key]) continue;
    const kind = orderKind(row);
    const amount = orderAmount(row);
    kinds.add(kind);
    byMonth[key].amount += amount;
    byMonth[key].count += 1;
    byMonth[key].byKind[kind] = (byMonth[key].byKind[kind] || 0) + amount;
  }
  return { months: keys.map((key) => byMonth[key]), kinds: [...kinds] };
}

export function changePct(current, previous) {
  if (!previous) return current ? null : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function formatPct(pct) {
  if (pct == null) return "New";
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

export function averageOrderValue(orders) {
  if (!orders.length) return 0;
  return orders.reduce((sum, row) => sum + orderAmount(row), 0) / orders.length;
}

export function analysisRange(period, now = Date.now()) {
  const starts = periodStarts(now);
  if (period === "today") {
    return { fromMs: starts.today, toMs: now, label: "Today" };
  }
  if (period === "mtd") {
    return { fromMs: starts.mtd, toMs: now, label: "Month To Date" };
  }
  if (period === "ytd") {
    return { fromMs: starts.ytd, toMs: now, label: "Year To Date" };
  }
  const keys = lastMonthKeys(12, now);
  const [year, month] = keys[0].split("-").map(Number);
  return { fromMs: istMidnightUtc(year, month, 1), toMs: now, label: "Last 12 Months" };
}

export function previousRange({ fromMs, toMs }) {
  const span = Math.max(1, toMs - fromMs);
  return { fromMs: fromMs - span, toMs: fromMs - 1 };
}

export function ordersInRange(orders, fromMs, toMs) {
  return orders.filter((row) => inRange(row, fromMs, toMs));
}

function compareRow(current, previous) {
  const curAmount = current?.amount || 0;
  const prevAmount = previous?.amount || 0;
  return {
    key: current?.key || previous?.key,
    label: current?.label || previous?.label,
    current: curAmount,
    previous: prevAmount,
    count: current?.count || 0,
    previousCount: previous?.count || 0,
    aov: current?.count ? curAmount / current.count : 0,
    pct: changePct(curAmount, prevAmount),
  };
}

export function compareGroups(currentOrders, previousOrders, keyFn, limit = 12) {
  const current = groupMap(currentOrders, keyFn);
  const previous = groupMap(previousOrders, keyFn);
  const prevByKey = Object.fromEntries(previous.map((row) => [row.key, row]));
  const seen = new Set();
  const rows = [];
  for (const row of current) {
    seen.add(row.key);
    rows.push(compareRow(row, prevByKey[row.key]));
  }
  for (const row of previous) {
    if (seen.has(row.key)) continue;
    rows.push(compareRow({ ...row, amount: 0, count: 0 }, row));
  }
  return rows
    .sort((a, b) => b.current - a.current || Math.abs(b.pct || 0) - Math.abs(a.pct || 0))
    .slice(0, limit);
}

export function topMover(rows, direction) {
  const ranked = rows.filter((row) => row.pct != null);
  if (!ranked.length) return null;
  if (direction === "down") {
    return ranked.filter((row) => row.pct < 0).sort((a, b) => a.pct - b.pct)[0] || null;
  }
  return ranked.filter((row) => row.pct > 0).sort((a, b) => b.pct - a.pct)[0] || null;
}

export function groupByPartner(orders, limit = 8) {
  return groupMap(orders, (row) => ({
    key: String(row.partnerId || row.partnerName || "unassigned"),
    label: row.partnerName || (row.partnerId ? String(row.partnerId) : "Unassigned partner"),
  })).slice(0, limit);
}

export function monthlyMatrix(orders, groupFn, monthCount = 12, now = Date.now()) {
  const keys = lastMonthKeys(monthCount, now);
  const map = {};
  for (const row of orders) {
    const t = orderTimeMs(row);
    if (!t) continue;
    const key = monthKey(t);
    if (!keys.includes(key)) continue;
    const meta = groupFn(row);
    if (!map[meta.key]) {
      map[meta.key] = {
        key: meta.key,
        label: meta.label,
        amount: 0,
        count: 0,
        byMonth: Object.fromEntries(keys.map((month) => [month, { amount: 0, count: 0 }])),
      };
    }
    const amount = orderAmount(row);
    map[meta.key].byMonth[key].amount += amount;
    map[meta.key].byMonth[key].count += 1;
    map[meta.key].amount += amount;
    map[meta.key].count += 1;
  }
  const months = keys.map((key) => ({ key, label: monthLabel(key) }));
  const rows = Object.values(map).sort((a, b) => b.amount - a.amount);
  const totals = {
    key: "total",
    label: "All",
    amount: rows.reduce((sum, row) => sum + row.amount, 0),
    count: rows.reduce((sum, row) => sum + row.count, 0),
    byMonth: Object.fromEntries(
      keys.map((key) => [
        key,
        {
          amount: rows.reduce((sum, row) => sum + row.byMonth[key].amount, 0),
          count: rows.reduce((sum, row) => sum + row.byMonth[key].count, 0),
        },
      ])
    ),
  };
  return { months, rows, totals };
}

export function yoySnapshot(orders, now = Date.now()) {
  const { year, month, day } = calendarParts(now);
  const thisStart = istMidnightUtc(year, month, 1);
  const lastStart = istMidnightUtc(year - 1, month, 1);
  const lastEnd = istMidnightUtc(year - 1, month, day) + 24 * 60 * 60 * 1000 - 1;
  const currentRows = orders.filter((row) => inRange(row, thisStart, now));
  const previousRows = orders.filter((row) => inRange(row, lastStart, lastEnd));
  const current = currentRows.reduce((sum, row) => sum + orderAmount(row), 0);
  const previous = previousRows.reduce((sum, row) => sum + orderAmount(row), 0);
  return {
    current,
    previous,
    pct: changePct(current, previous),
    currentCount: currentRows.length,
    previousCount: previousRows.length,
  };
}

export function growthSnapshot(orders, now = Date.now()) {
  const { year, month, day } = calendarParts(now);
  const thisStart = istMidnightUtc(year, month, 1);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevStart = istMidnightUtc(prevYear, prevMonth, 1);
  const prevEnd = istMidnightUtc(prevYear, prevMonth, day) + 24 * 60 * 60 * 1000 - 1;
  const thisRows = orders.filter((row) => inRange(row, thisStart, now));
  const prevRows = orders.filter((row) => inRange(row, prevStart, prevEnd));
  const current = thisRows.reduce((sum, row) => sum + orderAmount(row), 0);
  const previous = prevRows.reduce((sum, row) => sum + orderAmount(row), 0);
  const kindNow = Object.fromEntries(reportBreakdown(thisRows).map((row) => [row.key, row.amount]));
  const kindPrev = Object.fromEntries(reportBreakdown(prevRows).map((row) => [row.key, row.amount]));
  const kinds = [...new Set([...Object.keys(kindNow), ...Object.keys(kindPrev)])];
  const movers = kinds
    .map((key) => ({
      key,
      current: kindNow[key] || 0,
      previous: kindPrev[key] || 0,
      pct: changePct(kindNow[key] || 0, kindPrev[key] || 0),
    }))
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  return {
    current,
    previous,
    pct: changePct(current, previous),
    currentCount: thisRows.length,
    previousCount: prevRows.length,
    up: movers.find((row) => row.pct > 0) || null,
    down: movers.find((row) => row.pct < 0) || null,
  };
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function ordersToCsv(orders) {
  const headers = [
    "Order",
    "Type",
    "Patient",
    "Mobile",
    "PIN",
    "Outlet",
    "When",
    "Amount",
    "Payment",
    "Status",
    "Partner",
  ];
  const lines = [headers.join(",")];
  for (const row of orders) {
    lines.push(
      [
        orderId(row),
        orderKind(row),
        row.patientName || row.fullName || row.name || "",
        row.mobile || row.mobileNumber || "",
        row.pinCode || row.pin || "",
        row.outletName || "",
        formatWhen(row),
        orderAmount(row),
        `${row.paymentMethod || "cod"} ${row.paymentStatus || ""}`.trim(),
        row.status || row.trackStatus || "",
        row.partnerName || "",
      ]
        .map(csvCell)
        .join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}

function csvTable(title, headers, rows) {
  const lines = [title, headers.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvCell).join(","));
  }
  lines.push("");
  return lines.join("\n");
}

export function matrixToRows(matrix) {
  return [matrix.totals, ...matrix.rows].filter(Boolean).map((row) => [
    row.label,
    ...matrix.months.map((month) => row.byMonth[month.key]?.amount || 0),
    row.amount,
  ]);
}

export function analysisToCsv({
  periodLabel,
  currentLabel,
  previousLabel,
  service,
  pin,
  store,
  payment,
  matrixService,
  matrixPin,
  matrixStore,
  orders,
}) {
  const compareHeaders = [
    "Name",
    `${currentLabel} ₹`,
    `${previousLabel} ₹`,
    "Change %",
    "Orders now",
    "Orders prev",
  ];
  const compareRows = (rows) =>
    rows.map((row) => [
      row.label,
      row.current,
      row.previous,
      row.pct == null ? "New" : row.pct,
      row.count,
      row.previousCount,
    ]);
  const monthHeaders = (matrix) => [
    "Group",
    ...matrix.months.map((month) => month.label),
    "Total ₹",
  ];
  return [
    csvTable(`SALES ANALYSIS · ${periodLabel}`, ["Metric", "Value"], [
      ["Generated (IST)", new Intl.DateTimeFormat("en-IN", { timeZone: TZ, dateStyle: "full", timeStyle: "short" }).format(new Date())],
      ["Orders in report", orders.length],
      ["Sales in report", orders.reduce((sum, row) => sum + orderAmount(row), 0)],
    ]),
    csvTable("SERVICE GROWTH / DEGROWTH", compareHeaders, compareRows(service)),
    csvTable("PIN CODE GROWTH / DEGROWTH", compareHeaders, compareRows(pin)),
    csvTable("STORE GROWTH / DEGROWTH", compareHeaders, compareRows(store)),
    csvTable("PAYMENT MIX", ["Method", "Amount ₹", "Orders"], payment.map((row) => [row.label, row.amount, row.count])),
    csvTable("MONTH-WISE BY SERVICE", monthHeaders(matrixService), matrixToRows(matrixService)),
    csvTable("MONTH-WISE BY PIN", monthHeaders(matrixPin), matrixToRows(matrixPin)),
    csvTable("MONTH-WISE BY STORE", monthHeaders(matrixStore), matrixToRows(matrixStore)),
    "ORDER LINES",
    ordersToCsv(orders).trimEnd(),
    "",
  ].join("\n");
}
