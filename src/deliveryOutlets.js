function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

export const DELIVERY_OUTLETS = [
  {
    id: "MH-OUT-CD",
    name: "Central Delhi Outlet",
    area: "Connaught Place",
    address: "Connaught Place, New Delhi 110001",
    phone: "7292094000",
    gstin: "07AAHCC1101C1Z5",
    dlNo: "DL-RET-20-11001",
    pharmacistName: "Rakesh Bhatia",
    pharmacistRegNo: "PCI-DL-22108",
    inChargeName: "Harish Kapoor",
    inChargeTitle: "Retailer in-charge",
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
    address: "Green Park, New Delhi 110016",
    phone: "7292094000",
    gstin: "07AAHCS1102S1Z8",
    dlNo: "DL-RET-20-11016",
    pharmacistName: "Sunita Malhotra",
    pharmacistRegNo: "PCI-DL-18440",
    inChargeName: "Meera Sethi",
    inChargeTitle: "Retailer in-charge",
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
    address: "Model Town, New Delhi 110009",
    phone: "7292094000",
    gstin: "07AAHCN1103N1Z1",
    dlNo: "DL-RET-20-11009",
    pharmacistName: "Farhan Qureshi",
    pharmacistRegNo: "PCI-DL-20911",
    inChargeName: "Anita Bedi",
    inChargeTitle: "Retailer in-charge",
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
    address: "Laxmi Nagar, Delhi 110092",
    phone: "7292094000",
    gstin: "07AAHCE1104E1Z4",
    dlNo: "DL-RET-20-11092",
    pharmacistName: "Kavita Goel",
    pharmacistRegNo: "PCI-DL-17302",
    inChargeName: "Sanjay Arora",
    inChargeTitle: "Retailer in-charge",
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
    address: "Janakpuri, New Delhi 110058",
    phone: "7292094000",
    gstin: "07AAHCW1105W1Z7",
    dlNo: "DL-RET-20-11058",
    pharmacistName: "Manoj Khurana",
    pharmacistRegNo: "PCI-DL-19855",
    inChargeName: "Ritu Malhotra",
    inChargeTitle: "Retailer in-charge",
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
    address: "Dwarka, New Delhi 110075",
    phone: "7292094000",
    gstin: "07AAHCD1106D1Z0",
    dlNo: "DL-RET-20-11075",
    pharmacistName: "Anjali Nair",
    pharmacistRegNo: "PCI-DL-21560",
    inChargeName: "Vikram Dahiya",
    inChargeTitle: "Retailer in-charge",
    pins: ["110075", "110077", "110078"],
  },
  {
    id: "MH-OUT-GGN",
    name: "Gurugram Outlet",
    area: "Sector 29, Gurugram",
    address: "Sector 29, Gurugram 122001",
    phone: "7292094000",
    gstin: "06AAHCG1220G1Z2",
    dlNo: "HR-RET-20-12200",
    pharmacistName: "Deepak Yadav",
    pharmacistRegNo: "PCI-HR-10244",
    inChargeName: "Nisha Grover",
    inChargeTitle: "Retailer in-charge",
    prefix3: ["122"],
  },
  {
    id: "MH-OUT-FBD",
    name: "Faridabad Outlet",
    area: "NIT Faridabad",
    address: "NIT Faridabad 121001",
    phone: "7292094000",
    gstin: "06AAHCF1210F1Z6",
    dlNo: "HR-RET-20-12100",
    pharmacistName: "Poonam Singh",
    pharmacistRegNo: "PCI-HR-11890",
    inChargeName: "Ajay Chauhan",
    inChargeTitle: "Retailer in-charge",
    prefix3: ["121"],
  },
  {
    id: "MH-OUT-NOIDA",
    name: "Noida Outlet",
    area: "Sector 18, Noida",
    address: "Sector 18, Noida 201301",
    phone: "7292094000",
    gstin: "09AAHCN2013N1Z9",
    dlNo: "UP-RET-20-20130",
    pharmacistName: "Vivek Sharma",
    pharmacistRegNo: "PCI-UP-33120",
    inChargeName: "Pallavi Joshi",
    inChargeTitle: "Retailer in-charge",
    prefix4: ["2013"],
  },
  {
    id: "MH-OUT-GZB",
    name: "Ghaziabad Outlet",
    area: "Vaishali, Ghaziabad",
    address: "Vaishali, Ghaziabad 201010",
    phone: "7292094000",
    gstin: "09AAHCG2010G1Z3",
    dlNo: "UP-RET-20-20101",
    pharmacistName: "Nidhi Verma",
    pharmacistRegNo: "PCI-UP-30918",
    inChargeName: "Rohit Garg",
    inChargeTitle: "Retailer in-charge",
    prefix3: ["201"],
  },
];

export const DEFAULT_OUTLET = {
  id: "MH-OUT-HQ",
  name: "MediHome Central Fulfilment",
  area: "Delhi NCR hub",
  address: "MediHome, Connaught Place, New Delhi 110001",
  phone: "7292094000",
  gstin: "07AAMCM2608Q1Z3",
  dlNo: "DL-RET-20-11000",
  pharmacistName: "Rajeev Menon",
  pharmacistRegNo: "PCI-DL-10001",
  inChargeName: "Smita Kulkarni",
  inChargeTitle: "Retailer in-charge",
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
      outletGstin: record.outletGstin || "",
      outletDlNo: record.outletDlNo || "",
      outletAddress: record.outletAddress || "",
      outletPharmacist: record.outletPharmacist || "",
      outletPharmacistReg: record.outletPharmacistReg || "",
      outletInCharge: record.outletInCharge || "",
      outletInChargeTitle: record.outletInChargeTitle || "",
    };
  }
  return {
    ...record,
    outletId: outlet.id,
    outletName: outlet.name,
    outletArea: outlet.area,
    outletPhone: outlet.phone,
    outletGstin: outlet.gstin,
    outletDlNo: outlet.dlNo,
    outletAddress: outlet.address,
    outletPharmacist: outlet.pharmacistName,
    outletPharmacistReg: outlet.pharmacistRegNo,
    outletInCharge: outlet.inChargeName,
    outletInChargeTitle: outlet.inChargeTitle,
  };
}

export function outletLabel(record) {
  if (!record?.outletName) return "";
  return record.outletArea
    ? `${record.outletName} (${record.outletArea})`
    : record.outletName;
}
