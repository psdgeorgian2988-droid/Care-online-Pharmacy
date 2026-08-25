function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

export const DELIVERY_OUTLETS = [
  {
    id: "MH-OUT-CD",
    name: "Central Delhi Outlet",
    area: "Connaught Place",
    phone: "9654222988",
    pins: [
      "110001",
      "110002",
      "110003",
      "110004",
      "110005",
      "110006",
      "110011",
      "110055",
    ],
    prefix4: ["1100"],
  },
  {
    id: "MH-OUT-SD",
    name: "South Delhi Outlet",
    area: "Green Park",
    phone: "9654222988",
    pins: [
      "110016",
      "110017",
      "110019",
      "110021",
      "110022",
      "110024",
      "110029",
      "110030",
      "110048",
      "110049",
      "110062",
      "110065",
      "110068",
      "110070",
    ],
  },
  {
    id: "MH-OUT-ND",
    name: "North Delhi Outlet",
    area: "Model Town",
    phone: "9654222988",
    pins: [
      "110007",
      "110009",
      "110033",
      "110034",
      "110035",
      "110036",
      "110084",
      "110088",
      "110089",
    ],
  },
  {
    id: "MH-OUT-ED",
    name: "East Delhi Outlet",
    area: "Laxmi Nagar",
    phone: "9654222988",
    pins: [
      "110031",
      "110032",
      "110051",
      "110091",
      "110092",
      "110093",
      "110094",
      "110095",
      "110096",
    ],
  },
  {
    id: "MH-OUT-WD",
    name: "West Delhi Outlet",
    area: "Janakpuri",
    phone: "9654222988",
    pins: [
      "110015",
      "110018",
      "110026",
      "110027",
      "110058",
      "110059",
      "110063",
      "110064",
      "110087",
    ],
  },
  {
    id: "MH-OUT-DWK",
    name: "Dwarka Outlet",
    area: "Dwarka",
    phone: "9654222988",
    pins: ["110075", "110077", "110078"],
  },
  {
    id: "MH-OUT-GGN",
    name: "Gurugram Outlet",
    area: "Sector 29, Gurugram",
    phone: "9654222988",
    prefix3: ["122"],
  },
  {
    id: "MH-OUT-FBD",
    name: "Faridabad Outlet",
    area: "NIT Faridabad",
    phone: "9654222988",
    prefix3: ["121"],
  },
  {
    id: "MH-OUT-NOIDA",
    name: "Noida Outlet",
    area: "Sector 18, Noida",
    phone: "9654222988",
    prefix4: ["2013"],
  },
  {
    id: "MH-OUT-GZB",
    name: "Ghaziabad Outlet",
    area: "Vaishali, Ghaziabad",
    phone: "9654222988",
    prefix3: ["201"],
  },
];

export const DEFAULT_OUTLET = {
  id: "MH-OUT-HQ",
  name: "MediHome Central Fulfilment",
  area: "Delhi NCR hub",
  phone: "9654222988",
};

export function outletForPin(pinValue) {
  const pin = digits(pinValue).slice(0, 6);
  if (pin.length !== 6) return null;

  const exact = DELIVERY_OUTLETS.find((row) =>
    (row.pins || []).includes(pin)
  );
  if (exact) return exact;

  const p4 = pin.slice(0, 4);
  const by4 = DELIVERY_OUTLETS.find((row) => (row.prefix4 || []).includes(p4));
  if (by4) return by4;

  const p3 = pin.slice(0, 3);
  const by3 = DELIVERY_OUTLETS.find((row) => (row.prefix3 || []).includes(p3));
  if (by3) return by3;

  if (p3 === "110") {
    return (
      DELIVERY_OUTLETS.find((row) => row.id === "MH-OUT-CD") || DEFAULT_OUTLET
    );
  }

  return DEFAULT_OUTLET;
}

export function withDeliveryOutlet(record) {
  const pin = record?.pinCode || record?.pin || "";
  const outlet = outletForPin(pin);
  if (!outlet) {
    return {
      ...record,
      outletId: record.outletId || "",
      outletName: record.outletName || "",
      outletArea: record.outletArea || "",
      outletPhone: record.outletPhone || "",
    };
  }
  return {
    ...record,
    outletId: outlet.id,
    outletName: outlet.name,
    outletArea: outlet.area,
    outletPhone: outlet.phone,
  };
}

export function outletLabel(record) {
  if (!record?.outletName) return "";
  return record.outletArea
    ? `${record.outletName} (${record.outletArea})`
    : record.outletName;
}
