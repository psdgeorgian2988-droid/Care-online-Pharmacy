export const STOCK_COVER = 1.5;

export function skuKey(item) {
  if (item?.id != null && String(item.id).trim() !== "") {
    return `id:${item.id}`;
  }
  const name = String(item?.name || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return name ? `name:${name}` : "name:unknown";
}

export function itemBrand(item) {
  const brand = String(item?.brand || "").trim();
  if (brand) return brand;
  const name = String(item?.name || "").trim();
  if (/^medihome\b/i.test(name)) return "MediHome";
  const first = name.split(/\s+/)[0];
  return first || "Unknown";
}

export function itemQty(item) {
  const n = Number(item?.quantity);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function stockTarget(soldQty) {
  return Math.ceil(Number(soldQty || 0) * STOCK_COVER);
}

export function toMaintain(soldQty, currentQty) {
  return stockTarget(soldQty) - Number(currentQty || 0);
}

export function stockStatus(soldQty, currentQty) {
  const current = Number(currentQty || 0);
  const need = toMaintain(soldQty, current);
  if (current <= 0 && Number(soldQty || 0) > 0) return "Out Of Stock";
  if (current <= 0) return "Out Of Stock";
  if (need > 0) return "Need Stock";
  if (need < 0) return "Surplus";
  return "OK";
}

export function soldFromOrders(orders, fromMs, toMs) {
  const map = {};
  for (const order of orders) {
    const kind = String(order?.kind || order?.orderType || "");
    if (kind && kind !== "medicine") continue;
    const items = Array.isArray(order?.items) ? order.items : [];
    if (!items.length) continue;
    const t = Number(order.bookedAtMs || order.sortKey || order.updatedAt || 0);
    if (fromMs && t && t < fromMs) continue;
    if (toMs && t && t > toMs) continue;
    const outletId = String(order.outletId || "unassigned");
    const outletName = order.outletName || "Unassigned Store";
    for (const item of items) {
      const key = `${outletId}::${skuKey(item)}`;
      if (!map[key]) {
        map[key] = {
          outletId,
          outletName,
          skuKey: skuKey(item),
          brand: itemBrand(item),
          name: item.name || "Medicine",
          salt: item.salt || "",
          packSize: item.packSize || "",
          sold: 0,
        };
      }
      map[key].sold += itemQty(item);
      if (item.brand) map[key].brand = itemBrand(item);
    }
  }
  return Object.values(map);
}

export function mergeStockRows(soldRows, stockItems) {
  const map = {};
  for (const row of soldRows) {
    map[`${row.outletId}::${row.skuKey}`] = {
      ...row,
      current: 0,
    };
  }
  for (const item of stockItems || []) {
    const key = `${item.outletId}::${item.skuKey}`;
    if (!map[key]) {
      map[key] = {
        outletId: item.outletId,
        outletName: item.outletName || item.outletId,
        skuKey: item.skuKey,
        brand: item.brand || "Unknown",
        name: item.name || item.skuKey,
        salt: item.salt || "",
        packSize: item.packSize || "",
        sold: 0,
        current: 0,
      };
    }
    map[key].current = Number(item.qty || 0);
    if (item.name) map[key].name = item.name;
    if (item.brand) map[key].brand = item.brand;
    if (item.outletName) map[key].outletName = item.outletName;
  }
  return Object.values(map)
    .map((row) => {
      const need = toMaintain(row.sold, row.current);
      return {
        ...row,
        target: stockTarget(row.sold),
        need,
        maintain: Math.max(0, need),
        surplus: Math.max(0, -need),
        status: stockStatus(row.sold, row.current),
      };
    })
    .sort((a, b) => b.maintain - a.maintain || b.sold - a.sold || a.brand.localeCompare(b.brand));
}

export function brandStoreMatrix(rows, outlets) {
  const brands = [...new Set(rows.map((row) => row.brand))].sort();
  const stores = outlets.length
    ? outlets
    : [...new Map(rows.map((row) => [row.outletId, { id: row.outletId, name: row.outletName }])).values()];
  const byBrandStore = {};
  for (const row of rows) {
    const key = `${row.brand}::${row.outletId}`;
    if (!byBrandStore[key]) {
      byBrandStore[key] = { sold: 0, current: 0 };
    }
    byBrandStore[key].sold += row.sold;
    byBrandStore[key].current += row.current;
  }
  return brands.map((brand) => {
    const cells = stores.map((store) => {
      const cell = byBrandStore[`${brand}::${store.id}`] || { sold: 0, current: 0 };
      const need = toMaintain(cell.sold, cell.current);
      return {
        outletId: store.id,
        sold: cell.sold,
        current: cell.current,
        target: stockTarget(cell.sold),
        maintain: Math.max(0, need),
        status: stockStatus(cell.sold, cell.current),
      };
    });
    const sold = cells.reduce((sum, cell) => sum + cell.sold, 0);
    const current = cells.reduce((sum, cell) => sum + cell.current, 0);
    const need = toMaintain(sold, current);
    return {
      brand,
      sold,
      current,
      target: stockTarget(sold),
      maintain: Math.max(0, need),
      status: stockStatus(sold, current),
      cells,
    };
  });
}

export function stockSummary(rows) {
  return {
    skus: rows.length,
    needSkus: rows.filter((row) => row.maintain > 0).length,
    outSkus: rows.filter((row) => row.status === "Out Of Stock").length,
    packsToMaintain: rows.reduce((sum, row) => sum + row.maintain, 0),
    onHand: rows.reduce((sum, row) => sum + row.current, 0),
  };
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function stockToCsv(rows) {
  const headers = [
    "Store",
    "Brand",
    "SKU",
    "Sold",
    "Target 1.5x",
    "Current",
    "To Maintain",
    "Surplus",
    "Status",
  ];
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.outletName,
        row.brand,
        row.name,
        row.sold,
        row.target,
        row.current,
        row.maintain,
        row.surplus,
        row.status,
      ]
        .map(csvCell)
        .join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
