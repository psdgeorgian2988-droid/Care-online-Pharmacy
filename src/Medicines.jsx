import { useState, useEffect, useMemo, useRef } from "react";
import PinGpsBlock from "./PinGpsBlock";
import AssignedAgent from "./AssignedAgent";
import { BillButton } from "./OrderBill.jsx";
import { resolvePinLocation } from "./pinLocation";
import { persistAndSendOrder, trackHref, withTracking } from "./orderTracking";
import { goHomeAfterPaidCheckout } from "./checkoutComplete";
import { buildPartnerRxShare } from "./rxPartnerShare";
import {
  checkMedicineAvailability,
  medicineAwaitingPharmacyFields,
} from "./orderConfirm";
import { buildIndiaCombos } from "./indiaMedicineCombos";
import PaymentBlock from "./PaymentBlock";
import { paymentFromQuote, settleCheckoutPayment } from "./paymentApi";
import {
  checkoutPaymentPersistFields,
  checkoutUsesPayCta,
  paymentMethodSummary,
} from "./paymentMethods";
import BusyWait, { PatienceNote, useBusyOverlay } from "./BusyWait";
import { holdForPartnerQueue } from "./partnerQueue";
import BookingFlow from "./BookingFlow";
import {
  addressFromUnknown,
  applyResolvedPin,
  emptyAddress,
  pickAddress,
} from "./addressFields";
import {
  bookingForPatch,
  initialBookingFor,
  validateBookingDetails,
  withBookingIdentity,
} from "./bookingFor";
import { monthlySavingForCart, monthlySavingForItem, resolveCartAdd } from "./medicineCartCompare";
import {
  MEDICINE_CART_EVENT,
  MEDICINE_CHECKOUT_OPEN_EVENT,
  openShopCart,
  peekRxLabCheckout,
  readMedicineCart,
  takeRxMedicineCheckout,
  writeMedicineCart,
} from "./medicineCartStore";
import { withPickedBatch } from "./batchStore";
import {
  fileFromPrescriptionDraft,
  hasPrescriptionDraft,
  prescriptionDraftName,
  readPrescriptionDraft,
} from "./prescriptionDraft";
import { goToHash, parseAppHash } from "./hashRoute";
import MedicineSearchTools from "./MedicineSearchTools";
import { matchExactMediHomeFromPhoto } from "./medicineStripSearch";
import { groupMedicineFamilies, medicineInCategory } from "./medicineSaltGroups";

function readHomeMedicineSearch() {
  const hash = window.location.hash || "";
  let value = hash.startsWith("#") ? hash.slice(1) : hash;
  try {
    value = decodeURIComponent(value);
  } catch {
    value = value.replace(/%3F/gi, "?").replace(/%3D/gi, "=");
  }
  const queryIndex = value.indexOf("?");
  if (queryIndex !== -1) {
    const fromHash = new URLSearchParams(value.slice(queryIndex + 1)).get("q");
    if (fromHash && fromHash.trim()) {
      return fromHash.trim();
    }
  }

  try {
    return (sessionStorage.getItem("mediHomeMedicineSearch") || "").trim();
  } catch {
    return "";
  }
}

function readSavedProfile() {
  try {
    const parsed = JSON.parse(localStorage.getItem("mediHomeUser") || "null");
    if (!parsed || typeof parsed !== "object") return null;
    return {
      name: String(parsed.name || parsed.fullName || "").trim(),
      mobile: String(parsed.mobile || parsed.mobileNumber || "").trim(),
      gender: parsed.gender || "",
      age: parsed.age || "",
      familyMembers: Array.isArray(parsed.familyMembers) ? parsed.familyMembers : [],
      ...addressFromUnknown(parsed),
    };
  } catch {
    return null;
  }
}

const CATEGORY_PACK_ART = {
  Diabetes: "/meds/pack-green.svg",
  Hypertension: "/meds/pack-navy.svg",
  Cholesterol: "/meds/pack-navy.svg",
  Cardiology: "/meds/pack-rose.svg",
  Thyroid: "/meds/pack-blue.svg",
  "Kidney Care": "/meds/pack-slate.svg",
  Respiratory: "/meds/pack-sky.svg",
  "Bone & Joint": "/meds/pack-amber.svg",
  Supplements: "/meds/pack-gold.svg",
  "Pain Relief": "/meds/pack-amber.svg",
  Gastric: "/meds/pack-violet.svg",
  Infection: "/meds/pack-gold.svg",
  Allergy: "/meds/pack-rose.svg",
  Neurology: "/meds/pack-violet.svg",
  Urology: "/meds/pack-slate.svg",
  "Women's Health": "/meds/pack-rose.svg",
  Dermatology: "/meds/pack-amber.svg",
};

function withHouseBrand(medicine) {
  const brand = medicine.brand || "MediHome";
  const isMediHome =
    medicine.isMediHome ?? String(brand).toLowerCase() === "medihome";
  return {
    ...medicine,
    brand,
    composition: medicine.composition || `${medicine.salt} ${medicine.strength}`,
    isMediHome,
    aliases: medicine.aliases || [],
    image:
      medicine.image ||
      (isMediHome
        ? "/meds/pack-medihome.svg"
        : CATEGORY_PACK_ART[medicine.category] || "/meds/pack-navy.svg"),
  };
}

const seedMedicines = [
  withHouseBrand({
    id: 1,
    name: "MediHome Metformin 500 mg",
    salt: "Metformin",
    strength: "500 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 50,
    price: 45,
    prescription: true,
    aliases: ["Glycomet", "Glucophage"],
  }),
  withHouseBrand({
    id: 2,
    name: "MediHome Metformin 500 mg + Glimepiride 1 mg",
    salt: "Metformin + Glimepiride",
    strength: "500 mg + 1 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 95,
    price: 85,
    prescription: true,
    aliases: ["Glycomet GP", "Gluconorm G"],
  }),
  withHouseBrand({
    id: 3,
    name: "MediHome Telmisartan 40 mg",
    salt: "Telmisartan",
    strength: "40 mg",
    packSize: "10 tablets",
    category: "Hypertension",
    mrp: 40,
    price: 35,
    prescription: true,
    aliases: ["Telma", "Telvas"],
  }),
  withHouseBrand({
    id: 4,
    name: "MediHome Amlodipine 5 mg",
    salt: "Amlodipine",
    strength: "5 mg",
    packSize: "10 tablets",
    category: "Hypertension",
    mrp: 45,
    price: 40,
    prescription: true,
    aliases: ["Amlong", "Stamlo", "Amlovas"],
  }),
  withHouseBrand({
    id: 5,
    name: "MediHome Atorvastatin 10 mg",
    salt: "Atorvastatin",
    strength: "10 mg",
    packSize: "10 tablets",
    category: "Cholesterol",
    mrp: 65,
    price: 55,
    prescription: true,
    aliases: ["Atorva", "Storvas", "Lipitor"],
  }),
  withHouseBrand({
    id: 6,
    name: "MediHome Vitamin D3",
    salt: "Cholecalciferol",
    strength: "As applicable",
    packSize: "10 tablets",
    category: "Supplements",
    mrp: 140,
    price: 120,
    prescription: false,
    aliases: ["Uprise D3", "Calcirol"],
  }),
  withHouseBrand({
    id: 7,
    name: "MediHome Clopidogrel 75 mg",
    salt: "Clopidogrel",
    strength: "75 mg",
    packSize: "10 tablets",
    category: "Cardiology",
    mrp: 90,
    price: 78,
    prescription: true,
    aliases: ["Clopitab", "Plavix", "Deplatt"],
  }),
  withHouseBrand({
    id: 8,
    name: "MediHome Aspirin 75 mg",
    salt: "Acetylsalicylic acid",
    strength: "75 mg",
    packSize: "14 tablets",
    category: "Cardiology",
    mrp: 25,
    price: 18,
    prescription: true,
    aliases: ["Ecosprin", "Disprin"],
  }),
  withHouseBrand({
    id: 9,
    name: "MediHome Thyroxine 50 mcg",
    salt: "Levothyroxine",
    strength: "50 mcg",
    packSize: "30 tablets",
    category: "Thyroid",
    mrp: 80,
    price: 68,
    prescription: true,
    aliases: ["Thyronorm", "Eltroxin"],
  }),
  withHouseBrand({
    id: 10,
    name: "MediHome Thyroxine 100 mcg",
    salt: "Levothyroxine",
    strength: "100 mcg",
    packSize: "30 tablets",
    category: "Thyroid",
    mrp: 95,
    price: 82,
    prescription: true,
    aliases: ["Thyronorm", "Eltroxin"],
  }),
  withHouseBrand({
    id: 11,
    name: "MediHome Sevelamer 400 mg",
    salt: "Sevelamer",
    strength: "400 mg",
    packSize: "10 tablets",
    category: "Kidney Care",
    mrp: 220,
    price: 195,
    prescription: true,
    aliases: ["Renvela", "Sevcar"],
  }),
  withHouseBrand({
    id: 12,
    name: "MediHome Sodium Bicarbonate 500 mg",
    salt: "Sodium bicarbonate",
    strength: "500 mg",
    packSize: "10 tablets",
    category: "Kidney Care",
    mrp: 40,
    price: 32,
    prescription: true,
    aliases: ["Nodosis"],
  }),
  withHouseBrand({
    id: 13,
    name: "MediHome Montelukast 10 mg",
    salt: "Montelukast",
    strength: "10 mg",
    packSize: "10 tablets",
    category: "Respiratory",
    mrp: 110,
    price: 95,
    prescription: true,
    aliases: ["Montair", "Singulair", "Montek"],
  }),
  withHouseBrand({
    id: 14,
    name: "MediHome Budesonide Inhaler",
    salt: "Budesonide",
    strength: "200 mcg",
    packSize: "1 inhaler",
    category: "Respiratory",
    mrp: 380,
    price: 340,
    prescription: true,
    aliases: ["Budecort"],
  }),
  withHouseBrand({
    id: 15,
    name: "MediHome Calcium + Vitamin D3",
    salt: "Calcium carbonate + Cholecalciferol",
    strength: "500 mg + 250 IU",
    packSize: "15 tablets",
    category: "Bone & Joint",
    mrp: 90,
    price: 75,
    prescription: false,
    aliases: ["Shelcal", "Calcimax"],
  }),
  withHouseBrand({
    id: 16,
    name: "MediHome Aceclofenac 100 mg",
    salt: "Aceclofenac",
    strength: "100 mg",
    packSize: "10 tablets",
    category: "Bone & Joint",
    mrp: 55,
    price: 48,
    prescription: true,
    aliases: ["Hifenac", "Zerodol"],
  }),
  withHouseBrand({
    id: 17,
    name: "MediHome Paracetamol 650 mg",
    salt: "Paracetamol",
    strength: "650 mg",
    packSize: "15 tablets",
    category: "Pain Relief",
    mrp: 32,
    price: 22,
    prescription: false,
    aliases: ["Dolo", "Crocin", "Calpol", "Dolo 650", "Crocin 650"],
  }),
  withHouseBrand({
    id: 18,
    name: "MediHome Paracetamol 500 mg",
    salt: "Paracetamol",
    strength: "500 mg",
    packSize: "15 tablets",
    category: "Pain Relief",
    mrp: 22,
    price: 15,
    prescription: false,
    aliases: ["Crocin", "Calpol"],
  }),
  withHouseBrand({
    id: 19,
    name: "MediHome Pantoprazole 40 mg",
    salt: "Pantoprazole",
    strength: "40 mg",
    packSize: "10 tablets",
    category: "Gastric",
    mrp: 95,
    price: 68,
    prescription: true,
    aliases: ["Pan", "Pan 40", "Pantocid", "Pantop"],
  }),
  withHouseBrand({
    id: 20,
    name: "MediHome Pantoprazole + Domperidone",
    salt: "Pantoprazole + Domperidone",
    strength: "40 mg + 30 mg",
    packSize: "10 capsules",
    category: "Gastric",
    mrp: 140,
    price: 98,
    prescription: true,
    aliases: ["Pan-D", "Pan D", "Pantop-D", "Pantocid D"],
  }),
  withHouseBrand({
    id: 21,
    name: "MediHome Azithromycin 500 mg",
    salt: "Azithromycin",
    strength: "500 mg",
    packSize: "3 tablets",
    category: "Infection",
    mrp: 79,
    price: 55,
    prescription: true,
    aliases: ["Azithral", "Azee", "Azithral 500"],
  }),
  withHouseBrand({
    id: 22,
    name: "MediHome Cetirizine 10 mg",
    salt: "Cetirizine",
    strength: "10 mg",
    packSize: "10 tablets",
    category: "Allergy",
    mrp: 28,
    price: 16,
    prescription: false,
    aliases: ["Cetzine", "Okacet", "Zyrtec", "Alerid"],
  }),
  withHouseBrand({
    id: 23,
    name: "MediHome Omeprazole 20 mg",
    salt: "Omeprazole",
    strength: "20 mg",
    packSize: "15 capsules",
    category: "Gastric",
    mrp: 55,
    price: 38,
    prescription: true,
    aliases: ["Omez", "Ocid"],
  }),
  withHouseBrand({
    id: 24,
    name: "MediHome Ibuprofen + Paracetamol",
    salt: "Ibuprofen + Paracetamol",
    strength: "400 mg + 325 mg",
    packSize: "10 tablets",
    category: "Pain Relief",
    mrp: 45,
    price: 32,
    prescription: false,
    aliases: ["Combiflam", "Ibugesic Plus"],
  }),
  withHouseBrand({
    id: 25,
    name: "MediHome Amoxicillin + Clavulanate 625",
    salt: "Amoxicillin + Clavulanic acid",
    strength: "500 mg + 125 mg",
    packSize: "6 tablets",
    category: "Infection",
    mrp: 180,
    price: 132,
    prescription: true,
    aliases: ["Augmentin", "Augmentin 625", "Clavam"],
  }),
  withHouseBrand({
    id: 26,
    name: "MediHome Rabeprazole + Domperidone",
    salt: "Rabeprazole + Domperidone",
    strength: "20 mg + 30 mg",
    packSize: "10 capsules",
    category: "Gastric",
    mrp: 130,
    price: 92,
    prescription: true,
    aliases: ["Razo-D", "Razo D", "Rabicip D"],
  }),
  {
    id: 27,
    name: "Dolo 650",
    brand: "Dolo",
    salt: "Paracetamol",
    composition: "Paracetamol 650 mg",
    strength: "650 mg",
    packSize: "15 tablets",
    category: "Pain Relief",
    mrp: 34,
    price: 30,
    prescription: false,
    isMediHome: false,
    aliases: ["Dolo 650", "Dolo-650"],
  },
  {
    id: 28,
    name: "Crocin 650 Advance",
    brand: "Crocin",
    salt: "Paracetamol",
    composition: "Paracetamol 650 mg",
    strength: "650 mg",
    packSize: "15 tablets",
    category: "Pain Relief",
    mrp: 36,
    price: 32,
    prescription: false,
    isMediHome: false,
    aliases: ["Crocin 650", "Crocin Advance"],
  },
  {
    id: 29,
    name: "Calpol 650",
    brand: "Calpol",
    salt: "Paracetamol",
    composition: "Paracetamol 650 mg",
    strength: "650 mg",
    packSize: "15 tablets",
    category: "Pain Relief",
    mrp: 33,
    price: 29,
    prescription: false,
    isMediHome: false,
    aliases: ["Calpol 650"],
  },
  {
    id: 30,
    name: "Crocin 500",
    brand: "Crocin",
    salt: "Paracetamol",
    composition: "Paracetamol 500 mg",
    strength: "500 mg",
    packSize: "15 tablets",
    category: "Pain Relief",
    mrp: 24,
    price: 20,
    prescription: false,
    isMediHome: false,
    aliases: ["Crocin 500"],
  },
  {
    id: 31,
    name: "Pan-D",
    brand: "Pan-D",
    salt: "Pantoprazole + Domperidone",
    composition: "Pantoprazole + Domperidone 40 mg + 30 mg",
    strength: "40 mg + 30 mg",
    packSize: "10 capsules",
    category: "Gastric",
    mrp: 155,
    price: 142,
    prescription: true,
    isMediHome: false,
    aliases: ["Pan D", "Pantop D", "Pantocid D"],
  },
  {
    id: 32,
    name: "Pan 40",
    brand: "Pan",
    salt: "Pantoprazole",
    composition: "Pantoprazole 40 mg",
    strength: "40 mg",
    packSize: "10 tablets",
    category: "Gastric",
    mrp: 110,
    price: 98,
    prescription: true,
    isMediHome: false,
    aliases: ["Pan 40", "Pantocid", "Pantop 40"],
  },
  {
    id: 33,
    name: "Glycomet 500",
    brand: "Glycomet",
    salt: "Metformin",
    composition: "Metformin 500 mg",
    strength: "500 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 42,
    price: 38,
    prescription: true,
    isMediHome: false,
    aliases: ["Glucophage", "Glyciphage"],
  },
  {
    id: 34,
    name: "Telma 40",
    brand: "Telma",
    salt: "Telmisartan",
    composition: "Telmisartan 40 mg",
    strength: "40 mg",
    packSize: "10 tablets",
    category: "Hypertension",
    mrp: 78,
    price: 70,
    prescription: true,
    isMediHome: false,
    aliases: ["Telvas 40", "Telmikind"],
  },
  {
    id: 35,
    name: "Amlong 5",
    brand: "Amlong",
    salt: "Amlodipine",
    composition: "Amlodipine 5 mg",
    strength: "5 mg",
    packSize: "10 tablets",
    category: "Hypertension",
    mrp: 52,
    price: 46,
    prescription: true,
    isMediHome: false,
    aliases: ["Stamlo", "Amlovas"],
  },
  {
    id: 36,
    name: "Atorva 10",
    brand: "Atorva",
    salt: "Atorvastatin",
    composition: "Atorvastatin 10 mg",
    strength: "10 mg",
    packSize: "10 tablets",
    category: "Cholesterol",
    mrp: 72,
    price: 64,
    prescription: true,
    isMediHome: false,
    aliases: ["Storvas", "Lipitor"],
  },
  {
    id: 37,
    name: "Ecosprin 75",
    brand: "Ecosprin",
    salt: "Acetylsalicylic acid",
    composition: "Acetylsalicylic acid 75 mg",
    strength: "75 mg",
    packSize: "14 tablets",
    category: "Cardiology",
    mrp: 22,
    price: 19,
    prescription: true,
    isMediHome: false,
    aliases: ["Disprin"],
  },
  {
    id: 38,
    name: "Thyronorm 50",
    brand: "Thyronorm",
    salt: "Levothyroxine",
    composition: "Levothyroxine 50 mcg",
    strength: "50 mcg",
    packSize: "30 tablets",
    category: "Thyroid",
    mrp: 118,
    price: 108,
    prescription: true,
    isMediHome: false,
    aliases: ["Eltroxin"],
  },
  {
    id: 39,
    name: "Montair 10",
    brand: "Montair",
    salt: "Montelukast",
    composition: "Montelukast 10 mg",
    strength: "10 mg",
    packSize: "10 tablets",
    category: "Respiratory",
    mrp: 145,
    price: 132,
    prescription: true,
    isMediHome: false,
    aliases: ["Montek", "Singulair"],
  },
  {
    id: 40,
    name: "Azithral 500",
    brand: "Azithral",
    salt: "Azithromycin",
    composition: "Azithromycin 500 mg",
    strength: "500 mg",
    packSize: "3 tablets",
    category: "Infection",
    mrp: 89,
    price: 79,
    prescription: true,
    isMediHome: false,
    aliases: ["Azee", "Azithral 500"],
  },
  {
    id: 41,
    name: "Cetzine 10",
    brand: "Cetzine",
    salt: "Cetirizine",
    composition: "Cetirizine 10 mg",
    strength: "10 mg",
    packSize: "10 tablets",
    category: "Allergy",
    mrp: 22,
    price: 18,
    prescription: false,
    isMediHome: false,
    aliases: ["Okacet", "Zyrtec", "Alerid"],
  },
  {
    id: 42,
    name: "Omez 20",
    brand: "Omez",
    salt: "Omeprazole",
    composition: "Omeprazole 20 mg",
    strength: "20 mg",
    packSize: "15 capsules",
    category: "Gastric",
    mrp: 62,
    price: 54,
    prescription: true,
    isMediHome: false,
    aliases: ["Ocid"],
  },
  {
    id: 43,
    name: "Combiflam",
    brand: "Combiflam",
    salt: "Ibuprofen + Paracetamol",
    composition: "Ibuprofen + Paracetamol 400 mg + 325 mg",
    strength: "400 mg + 325 mg",
    packSize: "10 tablets",
    category: "Pain Relief",
    mrp: 48,
    price: 42,
    prescription: false,
    isMediHome: false,
    aliases: ["Ibugesic Plus"],
  },
  {
    id: 44,
    name: "Augmentin 625",
    brand: "Augmentin",
    salt: "Amoxicillin + Clavulanic acid",
    composition: "Amoxicillin + Clavulanic acid 500 mg + 125 mg",
    strength: "500 mg + 125 mg",
    packSize: "6 tablets",
    category: "Infection",
    mrp: 195,
    price: 178,
    prescription: true,
    isMediHome: false,
    aliases: ["Clavam", "Augmentin 625 Duo"],
  },
  {
    id: 45,
    name: "Hifenac 100",
    brand: "Hifenac",
    salt: "Aceclofenac",
    composition: "Aceclofenac 100 mg",
    strength: "100 mg",
    packSize: "10 tablets",
    category: "Bone & Joint",
    mrp: 68,
    price: 60,
    prescription: true,
    isMediHome: false,
    aliases: ["Zerodol"],
  },
  {
    id: 46,
    name: "Shelcal 500",
    brand: "Shelcal",
    salt: "Calcium carbonate + Cholecalciferol",
    composition: "Calcium carbonate + Cholecalciferol 500 mg + 250 IU",
    strength: "500 mg + 250 IU",
    packSize: "15 tablets",
    category: "Bone & Joint",
    mrp: 112,
    price: 98,
    prescription: false,
    isMediHome: false,
    aliases: ["Calcimax"],
  },
  {
    id: 47,
    name: "Razo-D",
    brand: "Razo-D",
    salt: "Rabeprazole + Domperidone",
    composition: "Rabeprazole + Domperidone 20 mg + 30 mg",
    strength: "20 mg + 30 mg",
    packSize: "10 capsules",
    category: "Gastric",
    mrp: 148,
    price: 134,
    prescription: true,
    isMediHome: false,
    aliases: ["Razo D", "Rabicip D"],
  },
  {
    id: 48,
    name: "Thyronorm 100",
    brand: "Thyronorm",
    salt: "Levothyroxine",
    composition: "Levothyroxine 100 mcg",
    strength: "100 mcg",
    packSize: "30 tablets",
    category: "Thyroid",
    mrp: 142,
    price: 128,
    prescription: true,
    isMediHome: false,
    aliases: ["Eltroxin 100"],
  },
  {
    id: 49,
    name: "Dolo 500",
    brand: "Dolo",
    salt: "Paracetamol",
    composition: "Paracetamol 500 mg",
    strength: "500 mg",
    packSize: "15 tablets",
    category: "Pain Relief",
    mrp: 26,
    price: 22,
    prescription: false,
    isMediHome: false,
    aliases: ["Dolo-500"],
  },
  {
    id: 50,
    name: "Dolo 250",
    brand: "Dolo",
    salt: "Paracetamol",
    composition: "Paracetamol 250 mg",
    strength: "250 mg",
    packSize: "15 tablets",
    category: "Pain Relief",
    mrp: 22,
    price: 19,
    prescription: false,
    isMediHome: false,
    aliases: ["Dolo-250", "Dolo Suspension"],
  },
  {
    id: 51,
    name: "Clopitab 75",
    brand: "Clopitab",
    salt: "Clopidogrel",
    composition: "Clopidogrel 75 mg",
    strength: "75 mg",
    packSize: "10 tablets",
    category: "Cardiology",
    mrp: 98,
    price: 88,
    prescription: true,
    isMediHome: false,
    aliases: ["Plavix", "Deplatt"],
  },
  {
    id: 52,
    name: "Glycomet-GP 1",
    brand: "Glycomet GP",
    salt: "Metformin + Glimepiride",
    composition: "Metformin + Glimepiride 500 mg + 1 mg",
    strength: "500 mg + 1 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 108,
    price: 96,
    prescription: true,
    isMediHome: false,
    aliases: ["Glycomet GP", "Gluconorm G"],
  },
  {
    id: 53,
    name: "Uprise-D3",
    brand: "Uprise D3",
    salt: "Cholecalciferol",
    composition: "Cholecalciferol As applicable",
    strength: "As applicable",
    packSize: "10 tablets",
    category: "Supplements",
    mrp: 165,
    price: 148,
    prescription: false,
    isMediHome: false,
    aliases: ["Uprise D3", "Calcirol"],
  },
  {
    id: 54,
    name: "Budecort Inhaler",
    brand: "Budecort",
    salt: "Budesonide",
    composition: "Budesonide 200 mcg",
    strength: "200 mcg",
    packSize: "1 inhaler",
    category: "Respiratory",
    mrp: 410,
    price: 378,
    prescription: true,
    isMediHome: false,
    aliases: ["Budecort 200"],
  },
  {
    id: 55,
    name: "Renvela 400",
    brand: "Renvela",
    salt: "Sevelamer",
    composition: "Sevelamer 400 mg",
    strength: "400 mg",
    packSize: "10 tablets",
    category: "Kidney Care",
    mrp: 248,
    price: 226,
    prescription: true,
    isMediHome: false,
    aliases: ["Sevcar"],
  },
  {
    id: 56,
    name: "Nodosis 500",
    brand: "Nodosis",
    salt: "Sodium bicarbonate",
    composition: "Sodium bicarbonate 500 mg",
    strength: "500 mg",
    packSize: "10 tablets",
    category: "Kidney Care",
    mrp: 48,
    price: 42,
    prescription: true,
    isMediHome: false,
    aliases: ["Sodamint"],
  },
  {
    id: 57,
    name: "Zerodol 100",
    brand: "Zerodol",
    salt: "Aceclofenac",
    composition: "Aceclofenac 100 mg",
    strength: "100 mg",
    packSize: "10 tablets",
    category: "Bone & Joint",
    mrp: 72,
    price: 64,
    prescription: true,
    isMediHome: false,
    aliases: ["Hifenac"],
  },
  {
    id: 58,
    name: "Azee 500",
    brand: "Azee",
    salt: "Azithromycin",
    composition: "Azithromycin 500 mg",
    strength: "500 mg",
    packSize: "3 tablets",
    category: "Infection",
    mrp: 92,
    price: 82,
    prescription: true,
    isMediHome: false,
    aliases: ["Azithral"],
  },
  {
    id: 59,
    name: "Becosules Z",
    brand: "Becosules",
    salt: "Vitamin B complex + Zinc",
    composition: "Vitamin B complex + Zinc",
    strength: "As on pack",
    packSize: "20 capsules",
    category: "Supplements",
    mrp: 48,
    price: 42,
    prescription: false,
    isMediHome: false,
    aliases: ["Becosules", "Becosules Z"],
  },
  {
    id: 60,
    name: "Glucophage 500",
    brand: "Glucophage",
    salt: "Metformin",
    composition: "Metformin 500 mg",
    strength: "500 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 46,
    price: 40,
    prescription: true,
    isMediHome: false,
    aliases: ["Glycomet", "Glyciphage"],
  },
  {
    id: 61,
    name: "Stamlo 5",
    brand: "Stamlo",
    salt: "Amlodipine",
    composition: "Amlodipine 5 mg",
    strength: "5 mg",
    packSize: "10 tablets",
    category: "Hypertension",
    mrp: 58,
    price: 50,
    prescription: true,
    isMediHome: false,
    aliases: ["Amlong", "Amlovas"],
  },
  {
    id: 62,
    name: "Lipitor 10",
    brand: "Lipitor",
    salt: "Atorvastatin",
    composition: "Atorvastatin 10 mg",
    strength: "10 mg",
    packSize: "10 tablets",
    category: "Cholesterol",
    mrp: 185,
    price: 168,
    prescription: true,
    isMediHome: false,
    aliases: ["Atorva", "Storvas"],
  },
  {
    id: 63,
    name: "Eltroxin 50",
    brand: "Eltroxin",
    salt: "Levothyroxine",
    composition: "Levothyroxine 50 mcg",
    strength: "50 mcg",
    packSize: "30 tablets",
    category: "Thyroid",
    mrp: 126,
    price: 112,
    prescription: true,
    isMediHome: false,
    aliases: ["Thyronorm 50", "Eltroxin"],
  },
  {
    id: 64,
    name: "Pantocid 40",
    brand: "Pantocid",
    salt: "Pantoprazole",
    composition: "Pantoprazole 40 mg",
    strength: "40 mg",
    packSize: "10 tablets",
    category: "Gastric",
    mrp: 118,
    price: 104,
    prescription: true,
    isMediHome: false,
    aliases: ["Pan 40", "Pantop"],
  },
  {
    id: 65,
    name: "Zyrtec 10",
    brand: "Zyrtec",
    salt: "Cetirizine",
    composition: "Cetirizine 10 mg",
    strength: "10 mg",
    packSize: "10 tablets",
    category: "Allergy",
    mrp: 38,
    price: 32,
    prescription: false,
    isMediHome: false,
    aliases: ["Cetzine", "Okacet", "Alerid"],
  },
  {
    id: 66,
    name: "Sevcar 400",
    brand: "Sevcar",
    salt: "Sevelamer",
    composition: "Sevelamer 400 mg",
    strength: "400 mg",
    packSize: "10 tablets",
    category: "Kidney Care",
    mrp: 236,
    price: 214,
    prescription: true,
    isMediHome: false,
    aliases: ["Renvela"],
  },
  {
    id: 67,
    name: "Telvas 40",
    brand: "Telvas",
    salt: "Telmisartan",
    composition: "Telmisartan 40 mg",
    strength: "40 mg",
    packSize: "10 tablets",
    category: "Hypertension",
    mrp: 74,
    price: 66,
    prescription: true,
    isMediHome: false,
    aliases: ["Telma", "Telmikind"],
  },
  {
    id: 68,
    name: "Storvas 10",
    brand: "Storvas",
    salt: "Atorvastatin",
    composition: "Atorvastatin 10 mg",
    strength: "10 mg",
    packSize: "10 tablets",
    category: "Cholesterol",
    mrp: 88,
    price: 78,
    prescription: true,
    isMediHome: false,
    aliases: ["Atorva", "Lipitor"],
  },
  {
    id: 69,
    name: "Pantop 40",
    brand: "Pantop",
    salt: "Pantoprazole",
    composition: "Pantoprazole 40 mg",
    strength: "40 mg",
    packSize: "10 tablets",
    category: "Gastric",
    mrp: 102,
    price: 90,
    prescription: true,
    isMediHome: false,
    aliases: ["Pan", "Pantocid"],
  },
  {
    id: 70,
    name: "Okacet 10",
    brand: "Okacet",
    salt: "Cetirizine",
    composition: "Cetirizine 10 mg",
    strength: "10 mg",
    packSize: "10 tablets",
    category: "Allergy",
    mrp: 24,
    price: 20,
    prescription: false,
    isMediHome: false,
    aliases: ["Cetzine", "Zyrtec"],
  },
  {
    id: 71,
    name: "Clavam 625",
    brand: "Clavam",
    salt: "Amoxicillin + Clavulanic acid",
    composition: "Amoxicillin + Clavulanic acid 500 mg + 125 mg",
    strength: "500 mg + 125 mg",
    packSize: "6 tablets",
    category: "Infection",
    mrp: 168,
    price: 152,
    prescription: true,
    isMediHome: false,
    aliases: ["Augmentin", "Augmentin 625"],
  },
  {
    id: 72,
    name: "Plavix 75",
    brand: "Plavix",
    salt: "Clopidogrel",
    composition: "Clopidogrel 75 mg",
    strength: "75 mg",
    packSize: "10 tablets",
    category: "Cardiology",
    mrp: 155,
    price: 140,
    prescription: true,
    isMediHome: false,
    aliases: ["Clopitab", "Deplatt"],
  },
  {
    id: 73,
    name: "Montek 10",
    brand: "Montek",
    salt: "Montelukast",
    composition: "Montelukast 10 mg",
    strength: "10 mg",
    packSize: "10 tablets",
    category: "Respiratory",
    mrp: 138,
    price: 124,
    prescription: true,
    isMediHome: false,
    aliases: ["Montair", "Singulair"],
  },
  {
    id: 74,
    name: "Calcirol Sachet",
    brand: "Calcirol",
    salt: "Cholecalciferol",
    composition: "Cholecalciferol As applicable",
    strength: "As applicable",
    packSize: "4 sachets",
    category: "Supplements",
    mrp: 72,
    price: 64,
    prescription: false,
    isMediHome: false,
    aliases: ["Uprise D3", "Uprise-D3"],
  },
  {
    id: 75,
    name: "Pantocid-D",
    brand: "Pantocid D",
    salt: "Pantoprazole + Domperidone",
    composition: "Pantoprazole + Domperidone 40 mg + 30 mg",
    strength: "40 mg + 30 mg",
    packSize: "10 capsules",
    category: "Gastric",
    mrp: 162,
    price: 148,
    prescription: true,
    isMediHome: false,
    aliases: ["Pan-D", "Pan D", "Pantop-D"],
  },
  withHouseBrand({
    id: 76,
    name: "MediHome Metformin 250 mg",
    salt: "Metformin",
    strength: "250 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 32,
    price: 28,
    prescription: true,
    aliases: ["Glycomet 250", "Glucophage 250"],
  }),
  withHouseBrand({
    id: 77,
    name: "MediHome Metformin 850 mg",
    salt: "Metformin",
    strength: "850 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 68,
    price: 58,
    prescription: true,
    aliases: ["Glycomet 850", "Glucophage 850"],
  }),
  withHouseBrand({
    id: 78,
    name: "MediHome Metformin 1000 mg",
    salt: "Metformin",
    strength: "1000 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 78,
    price: 66,
    prescription: true,
    aliases: ["Glycomet 1g", "Glucophage 1000"],
  }),
  withHouseBrand({
    id: 79,
    name: "MediHome Metformin 500 mg + Glimepiride 2 mg",
    salt: "Metformin + Glimepiride",
    strength: "500 mg + 2 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 110,
    price: 96,
    prescription: true,
    aliases: ["Glycomet GP 2", "Gluconorm G2"],
  }),
  withHouseBrand({
    id: 80,
    name: "MediHome Glimepiride 1 mg",
    salt: "Glimepiride",
    strength: "1 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 42,
    price: 34,
    prescription: true,
    aliases: ["Amaryl 1", "Glimestar 1"],
  }),
  withHouseBrand({
    id: 81,
    name: "MediHome Glimepiride 2 mg",
    salt: "Glimepiride",
    strength: "2 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 55,
    price: 46,
    prescription: true,
    aliases: ["Amaryl 2", "Glimestar 2"],
  }),
  withHouseBrand({
    id: 82,
    name: "MediHome Telmisartan 20 mg",
    salt: "Telmisartan",
    strength: "20 mg",
    packSize: "10 tablets",
    category: "Hypertension",
    mrp: 32,
    price: 26,
    prescription: true,
    aliases: ["Telma 20", "Telvas 20"],
  }),
  withHouseBrand({
    id: 83,
    name: "MediHome Telmisartan 80 mg",
    salt: "Telmisartan",
    strength: "80 mg",
    packSize: "10 tablets",
    category: "Hypertension",
    mrp: 72,
    price: 58,
    prescription: true,
    aliases: ["Telma 80", "Telvas 80"],
  }),
  withHouseBrand({
    id: 84,
    name: "MediHome Telmisartan 40 mg + Amlodipine 5 mg",
    salt: "Telmisartan + Amlodipine",
    strength: "40 mg + 5 mg",
    packSize: "10 tablets",
    category: "Hypertension",
    mrp: 95,
    price: 78,
    prescription: true,
    aliases: ["Telma AM", "Telvas AM"],
  }),
  withHouseBrand({
    id: 85,
    name: "MediHome Telmisartan 40 mg + Hydrochlorothiazide 12.5 mg",
    salt: "Telmisartan + Hydrochlorothiazide",
    strength: "40 mg + 12.5 mg",
    packSize: "10 tablets",
    category: "Hypertension",
    mrp: 88,
    price: 72,
    prescription: true,
    aliases: ["Telma H", "Telvas H"],
  }),
  withHouseBrand({
    id: 86,
    name: "MediHome Amlodipine 2.5 mg",
    salt: "Amlodipine",
    strength: "2.5 mg",
    packSize: "10 tablets",
    category: "Hypertension",
    mrp: 32,
    price: 26,
    prescription: true,
    aliases: ["Amlong 2.5", "Stamlo 2.5"],
  }),
  withHouseBrand({
    id: 87,
    name: "MediHome Amlodipine 10 mg",
    salt: "Amlodipine",
    strength: "10 mg",
    packSize: "10 tablets",
    category: "Hypertension",
    mrp: 58,
    price: 48,
    prescription: true,
    aliases: ["Amlong 10", "Stamlo 10"],
  }),
  withHouseBrand({
    id: 88,
    name: "MediHome Losartan 25 mg",
    salt: "Losartan",
    strength: "25 mg",
    packSize: "10 tablets",
    category: "Hypertension",
    mrp: 38,
    price: 30,
    prescription: true,
    aliases: ["Losar 25", "Repace 25"],
  }),
  withHouseBrand({
    id: 89,
    name: "MediHome Losartan 50 mg",
    salt: "Losartan",
    strength: "50 mg",
    packSize: "10 tablets",
    category: "Hypertension",
    mrp: 52,
    price: 42,
    prescription: true,
    aliases: ["Losar 50", "Repace 50"],
  }),
  withHouseBrand({
    id: 90,
    name: "MediHome Metoprolol 25 mg",
    salt: "Metoprolol",
    strength: "25 mg",
    packSize: "10 tablets",
    category: "Cardiology",
    mrp: 45,
    price: 36,
    prescription: true,
    aliases: ["Metolar 25", "Starpress 25"],
  }),
  withHouseBrand({
    id: 91,
    name: "MediHome Metoprolol 50 mg",
    salt: "Metoprolol",
    strength: "50 mg",
    packSize: "10 tablets",
    category: "Cardiology",
    mrp: 62,
    price: 50,
    prescription: true,
    aliases: ["Metolar 50", "Starpress 50"],
  }),
  withHouseBrand({
    id: 92,
    name: "MediHome Atorvastatin 20 mg",
    salt: "Atorvastatin",
    strength: "20 mg",
    packSize: "10 tablets",
    category: "Cholesterol",
    mrp: 95,
    price: 78,
    prescription: true,
    aliases: ["Atorva 20", "Storvas 20"],
  }),
  withHouseBrand({
    id: 93,
    name: "MediHome Atorvastatin 40 mg",
    salt: "Atorvastatin",
    strength: "40 mg",
    packSize: "10 tablets",
    category: "Cholesterol",
    mrp: 145,
    price: 118,
    prescription: true,
    aliases: ["Atorva 40", "Storvas 40"],
  }),
  withHouseBrand({
    id: 94,
    name: "MediHome Rosuvastatin 5 mg",
    salt: "Rosuvastatin",
    strength: "5 mg",
    packSize: "10 tablets",
    category: "Cholesterol",
    mrp: 72,
    price: 58,
    prescription: true,
    aliases: ["Rozavel 5", "Crestor 5"],
  }),
  withHouseBrand({
    id: 95,
    name: "MediHome Rosuvastatin 10 mg",
    salt: "Rosuvastatin",
    strength: "10 mg",
    packSize: "10 tablets",
    category: "Cholesterol",
    mrp: 110,
    price: 88,
    prescription: true,
    aliases: ["Rozavel 10", "Crestor 10"],
  }),
  withHouseBrand({
    id: 96,
    name: "MediHome Rosuvastatin 20 mg",
    salt: "Rosuvastatin",
    strength: "20 mg",
    packSize: "10 tablets",
    category: "Cholesterol",
    mrp: 165,
    price: 132,
    prescription: true,
    aliases: ["Rozavel 20", "Crestor 20"],
  }),
  withHouseBrand({
    id: 97,
    name: "MediHome Thyroxine 25 mcg",
    salt: "Levothyroxine",
    strength: "25 mcg",
    packSize: "30 tablets",
    category: "Thyroid",
    mrp: 62,
    price: 52,
    prescription: true,
    aliases: ["Thyronorm 25", "Eltroxin 25"],
  }),
  withHouseBrand({
    id: 98,
    name: "MediHome Thyroxine 75 mcg",
    salt: "Levothyroxine",
    strength: "75 mcg",
    packSize: "30 tablets",
    category: "Thyroid",
    mrp: 88,
    price: 74,
    prescription: true,
    aliases: ["Thyronorm 75", "Eltroxin 75"],
  }),
  withHouseBrand({
    id: 99,
    name: "MediHome Thyroxine 125 mcg",
    salt: "Levothyroxine",
    strength: "125 mcg",
    packSize: "30 tablets",
    category: "Thyroid",
    mrp: 108,
    price: 90,
    prescription: true,
    aliases: ["Thyronorm 125", "Eltroxin 125"],
  }),
  withHouseBrand({
    id: 100,
    name: "MediHome Paracetamol 250 mg",
    salt: "Paracetamol",
    strength: "250 mg",
    packSize: "15 tablets",
    category: "Pain Relief",
    mrp: 18,
    price: 14,
    prescription: false,
    aliases: ["Dolo 250", "Crocin 250"],
  }),
  withHouseBrand({
    id: 101,
    name: "MediHome Pantoprazole 20 mg",
    salt: "Pantoprazole",
    strength: "20 mg",
    packSize: "10 tablets",
    category: "Gastric",
    mrp: 55,
    price: 42,
    prescription: true,
    aliases: ["Pan 20", "Pantocid 20"],
  }),
  withHouseBrand({
    id: 102,
    name: "MediHome Omeprazole 40 mg",
    salt: "Omeprazole",
    strength: "40 mg",
    packSize: "15 capsules",
    category: "Gastric",
    mrp: 72,
    price: 56,
    prescription: true,
    aliases: ["Omez 40", "Ocid 40"],
  }),
  withHouseBrand({
    id: 103,
    name: "MediHome Rabeprazole 20 mg",
    salt: "Rabeprazole",
    strength: "20 mg",
    packSize: "10 tablets",
    category: "Gastric",
    mrp: 78,
    price: 58,
    prescription: true,
    aliases: ["Razo 20", "Rabicip 20"],
  }),
  withHouseBrand({
    id: 104,
    name: "MediHome Azithromycin 250 mg",
    salt: "Azithromycin",
    strength: "250 mg",
    packSize: "6 tablets",
    category: "Infection",
    mrp: 68,
    price: 52,
    prescription: true,
    aliases: ["Azithral 250", "Azee 250"],
  }),
  withHouseBrand({
    id: 105,
    name: "MediHome Amoxicillin + Clavulanate 375",
    salt: "Amoxicillin + Clavulanic acid",
    strength: "250 mg + 125 mg",
    packSize: "6 tablets",
    category: "Infection",
    mrp: 95,
    price: 72,
    prescription: true,
    aliases: ["Augmentin 375", "Clavam 375"],
  }),
  withHouseBrand({
    id: 106,
    name: "MediHome Montelukast 5 mg",
    salt: "Montelukast",
    strength: "5 mg",
    packSize: "10 tablets",
    category: "Respiratory",
    mrp: 85,
    price: 68,
    prescription: true,
    aliases: ["Montair 5", "Montek 5"],
  }),
  withHouseBrand({
    id: 107,
    name: "MediHome Aspirin 150 mg",
    salt: "Acetylsalicylic acid",
    strength: "150 mg",
    packSize: "14 tablets",
    category: "Cardiology",
    mrp: 32,
    price: 22,
    prescription: true,
    aliases: ["Ecosprin 150", "Disprin 150"],
  }),
  withHouseBrand({
    id: 108,
    name: "MediHome Cetirizine 5 mg",
    salt: "Cetirizine",
    strength: "5 mg",
    packSize: "10 tablets",
    category: "Allergy",
    mrp: 18,
    price: 12,
    prescription: false,
    aliases: ["Cetzine 5", "Okacet 5"],
  }),
  withHouseBrand({
    id: 109,
    name: "MediHome Sevelamer 800 mg",
    salt: "Sevelamer",
    strength: "800 mg",
    packSize: "10 tablets",
    category: "Kidney Care",
    mrp: 320,
    price: 248,
    prescription: true,
    aliases: ["Renvela 800", "Sevcar 800"],
  }),
  withHouseBrand({
    id: 110,
    name: "MediHome Vitamin B Complex + Zinc",
    salt: "Vitamin B complex + Zinc",
    strength: "As on pack",
    packSize: "20 capsules",
    category: "Supplements",
    mrp: 42,
    price: 32,
    prescription: false,
    aliases: ["Becosules", "Becosules Z"],
  }),
  {
    id: 111,
    name: "Glycomet 250",
    brand: "Glycomet",
    salt: "Metformin",
    composition: "Metformin 250 mg",
    strength: "250 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 28,
    price: 25,
    prescription: true,
    isMediHome: false,
    aliases: ["Glucophage 250"],
  },
  {
    id: 112,
    name: "Glycomet 850",
    brand: "Glycomet",
    salt: "Metformin",
    composition: "Metformin 850 mg",
    strength: "850 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 62,
    price: 56,
    prescription: true,
    isMediHome: false,
    aliases: ["Glucophage 850"],
  },
  {
    id: 113,
    name: "Glycomet 1000",
    brand: "Glycomet",
    salt: "Metformin",
    composition: "Metformin 1000 mg",
    strength: "1000 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 74,
    price: 66,
    prescription: true,
    isMediHome: false,
    aliases: ["Glycomet 1g"],
  },
  {
    id: 114,
    name: "Glycomet-GP 2",
    brand: "Glycomet GP",
    salt: "Metformin + Glimepiride",
    composition: "Metformin + Glimepiride 500 mg + 2 mg",
    strength: "500 mg + 2 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 118,
    price: 106,
    prescription: true,
    isMediHome: false,
    aliases: ["Gluconorm G2"],
  },
  {
    id: 115,
    name: "Telma 20",
    brand: "Telma",
    salt: "Telmisartan",
    composition: "Telmisartan 20 mg",
    strength: "20 mg",
    packSize: "10 tablets",
    category: "Hypertension",
    mrp: 48,
    price: 42,
    prescription: true,
    isMediHome: false,
    aliases: ["Telvas 20"],
  },
  {
    id: 116,
    name: "Telma 80",
    brand: "Telma",
    salt: "Telmisartan",
    composition: "Telmisartan 80 mg",
    strength: "80 mg",
    packSize: "10 tablets",
    category: "Hypertension",
    mrp: 128,
    price: 114,
    prescription: true,
    isMediHome: false,
    aliases: ["Telvas 80"],
  },
  {
    id: 117,
    name: "Telma-AM",
    brand: "Telma AM",
    salt: "Telmisartan + Amlodipine",
    composition: "Telmisartan + Amlodipine 40 mg + 5 mg",
    strength: "40 mg + 5 mg",
    packSize: "10 tablets",
    category: "Hypertension",
    mrp: 142,
    price: 128,
    prescription: true,
    isMediHome: false,
    aliases: ["Telvas AM"],
  },
  {
    id: 118,
    name: "Telma-H",
    brand: "Telma H",
    salt: "Telmisartan + Hydrochlorothiazide",
    composition: "Telmisartan + Hydrochlorothiazide 40 mg + 12.5 mg",
    strength: "40 mg + 12.5 mg",
    packSize: "10 tablets",
    category: "Hypertension",
    mrp: 118,
    price: 106,
    prescription: true,
    isMediHome: false,
    aliases: ["Telvas H"],
  },
  {
    id: 119,
    name: "Amlong 2.5",
    brand: "Amlong",
    salt: "Amlodipine",
    composition: "Amlodipine 2.5 mg",
    strength: "2.5 mg",
    packSize: "10 tablets",
    category: "Hypertension",
    mrp: 36,
    price: 32,
    prescription: true,
    isMediHome: false,
    aliases: ["Stamlo 2.5"],
  },
  {
    id: 120,
    name: "Amlong 10",
    brand: "Amlong",
    salt: "Amlodipine",
    composition: "Amlodipine 10 mg",
    strength: "10 mg",
    packSize: "10 tablets",
    category: "Hypertension",
    mrp: 68,
    price: 60,
    prescription: true,
    isMediHome: false,
    aliases: ["Stamlo 10"],
  },
  {
    id: 121,
    name: "Atorva 20",
    brand: "Atorva",
    salt: "Atorvastatin",
    composition: "Atorvastatin 20 mg",
    strength: "20 mg",
    packSize: "10 tablets",
    category: "Cholesterol",
    mrp: 118,
    price: 106,
    prescription: true,
    isMediHome: false,
    aliases: ["Storvas 20"],
  },
  {
    id: 122,
    name: "Atorva 40",
    brand: "Atorva",
    salt: "Atorvastatin",
    composition: "Atorvastatin 40 mg",
    strength: "40 mg",
    packSize: "10 tablets",
    category: "Cholesterol",
    mrp: 168,
    price: 152,
    prescription: true,
    isMediHome: false,
    aliases: ["Storvas 40"],
  },
  {
    id: 123,
    name: "Thyronorm 25",
    brand: "Thyronorm",
    salt: "Levothyroxine",
    composition: "Levothyroxine 25 mcg",
    strength: "25 mcg",
    packSize: "30 tablets",
    category: "Thyroid",
    mrp: 92,
    price: 84,
    prescription: true,
    isMediHome: false,
    aliases: ["Eltroxin 25"],
  },
  {
    id: 124,
    name: "Thyronorm 75",
    brand: "Thyronorm",
    salt: "Levothyroxine",
    composition: "Levothyroxine 75 mcg",
    strength: "75 mcg",
    packSize: "30 tablets",
    category: "Thyroid",
    mrp: 128,
    price: 116,
    prescription: true,
    isMediHome: false,
    aliases: ["Eltroxin 75"],
  },
  {
    id: 125,
    name: "Thyronorm 125",
    brand: "Thyronorm",
    salt: "Levothyroxine",
    composition: "Levothyroxine 125 mcg",
    strength: "125 mcg",
    packSize: "30 tablets",
    category: "Thyroid",
    mrp: 148,
    price: 134,
    prescription: true,
    isMediHome: false,
    aliases: ["Eltroxin 125"],
  },
  {
    id: 126,
    name: "Pan 20",
    brand: "Pan",
    salt: "Pantoprazole",
    composition: "Pantoprazole 20 mg",
    strength: "20 mg",
    packSize: "10 tablets",
    category: "Gastric",
    mrp: 78,
    price: 70,
    prescription: true,
    isMediHome: false,
    aliases: ["Pantocid 20"],
  },
  {
    id: 127,
    name: "Azithral 250",
    brand: "Azithral",
    salt: "Azithromycin",
    composition: "Azithromycin 250 mg",
    strength: "250 mg",
    packSize: "6 tablets",
    category: "Infection",
    mrp: 82,
    price: 74,
    prescription: true,
    isMediHome: false,
    aliases: ["Azee 250"],
  },
  {
    id: 128,
    name: "Montair 5",
    brand: "Montair",
    salt: "Montelukast",
    composition: "Montelukast 5 mg",
    strength: "5 mg",
    packSize: "10 tablets",
    category: "Respiratory",
    mrp: 118,
    price: 106,
    prescription: true,
    isMediHome: false,
    aliases: ["Montek 5"],
  },
  {
    id: 129,
    name: "Ecosprin 150",
    brand: "Ecosprin",
    salt: "Acetylsalicylic acid",
    composition: "Acetylsalicylic acid 150 mg",
    strength: "150 mg",
    packSize: "14 tablets",
    category: "Cardiology",
    mrp: 28,
    price: 24,
    prescription: true,
    isMediHome: false,
    aliases: ["Disprin 150"],
  },
  {
    id: 130,
    name: "Renvela 800",
    brand: "Renvela",
    salt: "Sevelamer",
    composition: "Sevelamer 800 mg",
    strength: "800 mg",
    packSize: "10 tablets",
    category: "Kidney Care",
    mrp: 390,
    price: 352,
    prescription: true,
    isMediHome: false,
    aliases: ["Sevcar 800"],
  },
  {
    id: 131,
    name: "Rozavel 10",
    brand: "Rozavel",
    salt: "Rosuvastatin",
    composition: "Rosuvastatin 10 mg",
    strength: "10 mg",
    packSize: "10 tablets",
    category: "Cholesterol",
    mrp: 145,
    price: 130,
    prescription: true,
    isMediHome: false,
    aliases: ["Crestor 10"],
  },
  {
    id: 132,
    name: "Amaryl 1",
    brand: "Amaryl",
    salt: "Glimepiride",
    composition: "Glimepiride 1 mg",
    strength: "1 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 58,
    price: 52,
    prescription: true,
    isMediHome: false,
    aliases: ["Glimestar 1"],
  },
  {
    id: 133,
    name: "Amaryl 2",
    brand: "Amaryl",
    salt: "Glimepiride",
    composition: "Glimepiride 2 mg",
    strength: "2 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 78,
    price: 70,
    prescription: true,
    isMediHome: false,
    aliases: ["Glimestar 2"],
  },
  {
    id: 134,
    name: "Losar 50",
    brand: "Losar",
    salt: "Losartan",
    composition: "Losartan 50 mg",
    strength: "50 mg",
    packSize: "10 tablets",
    category: "Hypertension",
    mrp: 72,
    price: 64,
    prescription: true,
    isMediHome: false,
    aliases: ["Repace 50"],
  },
  {
    id: 135,
    name: "Razo 20",
    brand: "Razo",
    salt: "Rabeprazole",
    composition: "Rabeprazole 20 mg",
    strength: "20 mg",
    packSize: "10 tablets",
    category: "Gastric",
    mrp: 98,
    price: 88,
    prescription: true,
    isMediHome: false,
    aliases: ["Rabicip 20"],
  },
  {
    id: 136,
    name: "Losar 25",
    brand: "Losar",
    salt: "Losartan",
    composition: "Losartan 25 mg",
    strength: "25 mg",
    packSize: "10 tablets",
    category: "Hypertension",
    mrp: 48,
    price: 42,
    prescription: true,
    isMediHome: false,
    aliases: ["Repace 25"],
  },
  {
    id: 137,
    name: "Metolar 25",
    brand: "Metolar",
    salt: "Metoprolol",
    composition: "Metoprolol 25 mg",
    strength: "25 mg",
    packSize: "10 tablets",
    category: "Cardiology",
    mrp: 58,
    price: 52,
    prescription: true,
    isMediHome: false,
    aliases: ["Starpress 25"],
  },
  {
    id: 138,
    name: "Metolar 50",
    brand: "Metolar",
    salt: "Metoprolol",
    composition: "Metoprolol 50 mg",
    strength: "50 mg",
    packSize: "10 tablets",
    category: "Cardiology",
    mrp: 82,
    price: 74,
    prescription: true,
    isMediHome: false,
    aliases: ["Starpress 50"],
  },
  {
    id: 139,
    name: "Rozavel 5",
    brand: "Rozavel",
    salt: "Rosuvastatin",
    composition: "Rosuvastatin 5 mg",
    strength: "5 mg",
    packSize: "10 tablets",
    category: "Cholesterol",
    mrp: 92,
    price: 82,
    prescription: true,
    isMediHome: false,
    aliases: ["Crestor 5"],
  },
  {
    id: 140,
    name: "Rozavel 20",
    brand: "Rozavel",
    salt: "Rosuvastatin",
    composition: "Rosuvastatin 20 mg",
    strength: "20 mg",
    packSize: "10 tablets",
    category: "Cholesterol",
    mrp: 198,
    price: 178,
    prescription: true,
    isMediHome: false,
    aliases: ["Crestor 20"],
  },
  {
    id: 141,
    name: "Omez 40",
    brand: "Omez",
    salt: "Omeprazole",
    composition: "Omeprazole 40 mg",
    strength: "40 mg",
    packSize: "15 capsules",
    category: "Gastric",
    mrp: 88,
    price: 78,
    prescription: true,
    isMediHome: false,
    aliases: ["Ocid 40"],
  },
  {
    id: 142,
    name: "Augmentin 375",
    brand: "Augmentin",
    salt: "Amoxicillin + Clavulanic acid",
    composition: "Amoxicillin + Clavulanic acid 250 mg + 125 mg",
    strength: "250 mg + 125 mg",
    packSize: "6 tablets",
    category: "Infection",
    mrp: 118,
    price: 106,
    prescription: true,
    isMediHome: false,
    aliases: ["Clavam 375"],
  },
  {
    id: 143,
    name: "Cetzine 5",
    brand: "Cetzine",
    salt: "Cetirizine",
    composition: "Cetirizine 5 mg",
    strength: "5 mg",
    packSize: "10 tablets",
    category: "Allergy",
    mrp: 16,
    price: 14,
    prescription: false,
    isMediHome: false,
    aliases: ["Okacet 5"],
  },
  withHouseBrand({
    id: 144,
    name: "MediHome Sitagliptin 25 mg",
    salt: "Sitagliptin",
    strength: "25 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 95,
    price: 72,
    prescription: true,
    aliases: ["Januvia 25", "Zita 25", "Sitagliptin"],
  }),
  withHouseBrand({
    id: 145,
    name: "MediHome Sitagliptin 50 mg",
    salt: "Sitagliptin",
    strength: "50 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 145,
    price: 108,
    prescription: true,
    aliases: ["Januvia 50", "Zita 50", "Sitagliptin"],
  }),
  withHouseBrand({
    id: 146,
    name: "MediHome Sitagliptin 100 mg",
    salt: "Sitagliptin",
    strength: "100 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 220,
    price: 165,
    prescription: true,
    aliases: ["Januvia 100", "Zita 100", "Sitagliptin"],
  }),
  withHouseBrand({
    id: 147,
    name: "MediHome Sitagliptin 50 mg + Metformin 500 mg",
    salt: "Sitagliptin + Metformin",
    strength: "50 mg + 500 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 165,
    price: 118,
    prescription: true,
    aliases: [
      "Janumet 50/500",
      "Istamet 50/500",
      "Sitagliptin combination",
      "Sitagliptin combinations",
      "Sitagliptin metformin",
    ],
  }),
  withHouseBrand({
    id: 148,
    name: "MediHome Sitagliptin 50 mg + Metformin 1000 mg",
    salt: "Sitagliptin + Metformin",
    strength: "50 mg + 1000 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 185,
    price: 132,
    prescription: true,
    aliases: [
      "Janumet 50/1000",
      "Istamet 50/1000",
      "Sitagliptin combination",
      "Sitagliptin combinations",
      "Sitagliptin metformin",
    ],
  }),
  withHouseBrand({
    id: 149,
    name: "MediHome Sitagliptin 100 mg + Metformin 500 mg",
    salt: "Sitagliptin + Metformin",
    strength: "100 mg + 500 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 210,
    price: 152,
    prescription: true,
    aliases: [
      "Janumet 100/500",
      "Sitagliptin combination",
      "Sitagliptin combinations",
      "Sitagliptin metformin",
    ],
  }),
  withHouseBrand({
    id: 150,
    name: "MediHome Sitagliptin 100 mg + Metformin 1000 mg",
    salt: "Sitagliptin + Metformin",
    strength: "100 mg + 1000 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 245,
    price: 178,
    prescription: true,
    aliases: [
      "Janumet 100/1000",
      "Janumet XR",
      "Sitagliptin combination",
      "Sitagliptin combinations",
      "Sitagliptin metformin",
    ],
  }),
  withHouseBrand({
    id: 151,
    name: "MediHome Sitagliptin 50 mg + Metformin 500 mg + Glimepiride 1 mg",
    salt: "Sitagliptin + Metformin + Glimepiride",
    strength: "50 mg + 500 mg + 1 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 195,
    price: 142,
    prescription: true,
    aliases: [
      "Istamet G",
      "Sitagliptin combination",
      "Sitagliptin combinations",
    ],
  }),
  withHouseBrand({
    id: 152,
    name: "MediHome Sitagliptin 50 mg + Metformin 1000 mg + Glimepiride 2 mg",
    salt: "Sitagliptin + Metformin + Glimepiride",
    strength: "50 mg + 1000 mg + 2 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 220,
    price: 160,
    prescription: true,
    aliases: [
      "Istamet G 2",
      "Sitagliptin combination",
      "Sitagliptin combinations",
    ],
  }),
  withHouseBrand({
    id: 166,
    name: "MediHome Sitagliptin 25 mg + Metformin 500 mg",
    salt: "Sitagliptin + Metformin",
    strength: "25 mg + 500 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 145,
    price: 105,
    prescription: true,
    aliases: [
      "Sitagliptin combination",
      "Sitagliptin combinations",
      "Sitagliptin metformin",
    ],
  }),
  withHouseBrand({
    id: 167,
    name: "MediHome Sitagliptin 50 mg + Metformin 850 mg",
    salt: "Sitagliptin + Metformin",
    strength: "50 mg + 850 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 175,
    price: 125,
    prescription: true,
    aliases: [
      "Janumet 50/850",
      "Sitagliptin combination",
      "Sitagliptin combinations",
      "Sitagliptin metformin",
    ],
  }),
  withHouseBrand({
    id: 168,
    name: "MediHome Sitagliptin 50 mg + Metformin 500 mg XR",
    salt: "Sitagliptin + Metformin XR",
    strength: "50 mg + 500 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 170,
    price: 122,
    prescription: true,
    aliases: [
      "Janumet XR 50/500",
      "Sitagliptin combination",
      "Sitagliptin combinations",
    ],
  }),
  withHouseBrand({
    id: 169,
    name: "MediHome Sitagliptin 50 mg + Metformin 1000 mg XR",
    salt: "Sitagliptin + Metformin XR",
    strength: "50 mg + 1000 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 190,
    price: 138,
    prescription: true,
    aliases: [
      "Janumet XR 50/1000",
      "Sitagliptin combination",
      "Sitagliptin combinations",
    ],
  }),
  {
    id: 153,
    name: "Januvia 25",
    brand: "Januvia",
    salt: "Sitagliptin",
    composition: "Sitagliptin 25 mg",
    strength: "25 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 210,
    price: 198,
    prescription: true,
    isMediHome: false,
    aliases: ["Sitagliptin 25", "Zita 25"],
  },
  {
    id: 154,
    name: "Januvia 50",
    brand: "Januvia",
    salt: "Sitagliptin",
    composition: "Sitagliptin 50 mg",
    strength: "50 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 285,
    price: 268,
    prescription: true,
    isMediHome: false,
    aliases: ["Sitagliptin 50", "Zita 50"],
  },
  {
    id: 155,
    name: "Januvia 100",
    brand: "Januvia",
    salt: "Sitagliptin",
    composition: "Sitagliptin 100 mg",
    strength: "100 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 430,
    price: 398,
    prescription: true,
    isMediHome: false,
    aliases: ["Sitagliptin 100", "Zita 100"],
  },
  {
    id: 156,
    name: "Janumet 50/500",
    brand: "Janumet",
    salt: "Sitagliptin + Metformin",
    composition: "Sitagliptin + Metformin 50 mg + 500 mg",
    strength: "50 mg + 500 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 320,
    price: 298,
    prescription: true,
    isMediHome: false,
    aliases: [
      "Istamet 50/500",
      "Sitagliptin combination",
      "Sitagliptin combinations",
      "Sitagliptin metformin",
    ],
  },
  {
    id: 157,
    name: "Janumet 50/1000",
    brand: "Janumet",
    salt: "Sitagliptin + Metformin",
    composition: "Sitagliptin + Metformin 50 mg + 1000 mg",
    strength: "50 mg + 1000 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 355,
    price: 328,
    prescription: true,
    isMediHome: false,
    aliases: [
      "Istamet 50/1000",
      "Sitagliptin combination",
      "Sitagliptin combinations",
      "Sitagliptin metformin",
    ],
  },
  {
    id: 158,
    name: "Janumet 100/500",
    brand: "Janumet",
    salt: "Sitagliptin + Metformin",
    composition: "Sitagliptin + Metformin 100 mg + 500 mg",
    strength: "100 mg + 500 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 410,
    price: 378,
    prescription: true,
    isMediHome: false,
    aliases: [
      "Sitagliptin combination",
      "Sitagliptin combinations",
      "Sitagliptin metformin",
    ],
  },
  {
    id: 159,
    name: "Janumet XR 100/1000",
    brand: "Janumet XR",
    salt: "Sitagliptin + Metformin",
    composition: "Sitagliptin + Metformin 100 mg + 1000 mg",
    strength: "100 mg + 1000 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 465,
    price: 428,
    prescription: true,
    isMediHome: false,
    aliases: [
      "Janumet 100/1000",
      "Sitagliptin combination",
      "Sitagliptin combinations",
      "Sitagliptin metformin",
    ],
  },
  {
    id: 160,
    name: "Istamet 50/500",
    brand: "Istamet",
    salt: "Sitagliptin + Metformin",
    composition: "Sitagliptin + Metformin 50 mg + 500 mg",
    strength: "50 mg + 500 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 198,
    price: 182,
    prescription: true,
    isMediHome: false,
    aliases: ["Janumet 50/500", "Sitagliptin combination", "Sitagliptin combinations"],
  },
  {
    id: 161,
    name: "Istamet 50/1000",
    brand: "Istamet",
    salt: "Sitagliptin + Metformin",
    composition: "Sitagliptin + Metformin 50 mg + 1000 mg",
    strength: "50 mg + 1000 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 218,
    price: 198,
    prescription: true,
    isMediHome: false,
    aliases: ["Janumet 50/1000", "Sitagliptin combination", "Sitagliptin combinations"],
  },
  {
    id: 162,
    name: "Istamet G",
    brand: "Istamet G",
    salt: "Sitagliptin + Metformin + Glimepiride",
    composition: "Sitagliptin + Metformin + Glimepiride 50 mg + 500 mg + 1 mg",
    strength: "50 mg + 500 mg + 1 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 245,
    price: 224,
    prescription: true,
    isMediHome: false,
    aliases: ["Sitagliptin combination", "Sitagliptin combinations"],
  },
  {
    id: 163,
    name: "Istamet G 2",
    brand: "Istamet G",
    salt: "Sitagliptin + Metformin + Glimepiride",
    composition: "Sitagliptin + Metformin + Glimepiride 50 mg + 1000 mg + 2 mg",
    strength: "50 mg + 1000 mg + 2 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 268,
    price: 245,
    prescription: true,
    isMediHome: false,
    aliases: ["Sitagliptin combination", "Sitagliptin combinations"],
  },
  {
    id: 164,
    name: "Zita 50",
    brand: "Zita",
    salt: "Sitagliptin",
    composition: "Sitagliptin 50 mg",
    strength: "50 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 168,
    price: 152,
    prescription: true,
    isMediHome: false,
    aliases: ["Januvia 50", "Sitagliptin 50"],
  },
  {
    id: 165,
    name: "Zita 100",
    brand: "Zita",
    salt: "Sitagliptin",
    composition: "Sitagliptin 100 mg",
    strength: "100 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 248,
    price: 226,
    prescription: true,
    isMediHome: false,
    aliases: ["Januvia 100", "Sitagliptin 100"],
  },
  {
    id: 170,
    name: "Janumet XR 50/500",
    brand: "Janumet XR",
    salt: "Sitagliptin + Metformin XR",
    composition: "Sitagliptin + Metformin XR 50 mg + 500 mg",
    strength: "50 mg + 500 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 310,
    price: 286,
    prescription: true,
    isMediHome: false,
    aliases: ["Sitagliptin combination", "Sitagliptin combinations"],
  },
  {
    id: 171,
    name: "Janumet XR 50/1000",
    brand: "Janumet XR",
    salt: "Sitagliptin + Metformin XR",
    composition: "Sitagliptin + Metformin XR 50 mg + 1000 mg",
    strength: "50 mg + 1000 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 348,
    price: 318,
    prescription: true,
    isMediHome: false,
    aliases: ["Sitagliptin combination", "Sitagliptin combinations"],
  },
  {
    id: 172,
    name: "Janumet 50/850",
    brand: "Janumet",
    salt: "Sitagliptin + Metformin",
    composition: "Sitagliptin + Metformin 50 mg + 850 mg",
    strength: "50 mg + 850 mg",
    packSize: "10 tablets",
    category: "Diabetes",
    mrp: 335,
    price: 308,
    prescription: true,
    isMediHome: false,
    aliases: ["Sitagliptin combination", "Sitagliptin combinations"],
  },
];

function medicineSkuKey(medicine) {
  const house = medicine.isMediHome ?? String(medicine.brand || "MediHome").toLowerCase() === "medihome";
  const brand = house ? "medihome" : String(medicine.brand || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  const salt = String(medicine.salt || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  const strength = String(medicine.strength || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `${brand}:${salt}:${strength}`;
}

function mergeMedicineLists(...lists) {
  const seen = new Set();
  const merged = [];
  lists.flat().forEach((item) => {
    const key = medicineSkuKey(item);
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  });
  return merged;
}

const medicines = mergeMedicineLists(seedMedicines, buildIndiaCombos(withHouseBrand, 1000));

const FLAGSHIP_BRANDS = new Set([
  "dolo650",
  "crocin650advance",
  "pand",
  "augmentin625",
  "thyronorm50",
]);

const catalogue = medicines.map(withHouseBrand);
const houseCatalogue = catalogue.filter((medicine) => medicine.isMediHome);

function sortMedicineRows(list) {
  return [...list].sort((a, b) => {
    const cat = String(a.category || "").localeCompare(String(b.category || ""));
    if (cat) return cat;
    const salt = String(a.salt || "").localeCompare(String(b.salt || ""));
    if (salt) return salt;
    const str = String(a.strength || "").localeCompare(String(b.strength || ""), undefined, {
      numeric: true,
    });
    if (str) return str;
    if (Boolean(a.isMediHome) !== Boolean(b.isMediHome)) return a.isMediHome ? -1 : 1;
    return String(a.brand || a.name || "").localeCompare(String(b.brand || b.name || ""));
  });
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function compositionKey(medicine) {
  return normalizeSearchText(`${medicine.salt || ""} ${medicine.strength || ""}`);
}

function extractStrengthTokens(query) {
  const matches = String(query || "")
    .toLowerCase()
    .match(/\d+(?:\.\d+)?\s*(?:mg|mcg|iu|ml)?/g);
  return (matches || []).map((token) => token.replace(/\s+/g, ""));
}

function queryHasStrength(query) {
  return extractStrengthTokens(query).length > 0;
}

function strengthMatchesQuery(medicine, query) {
  const tokens = extractStrengthTokens(query);
  if (!tokens.length) return true;
  const hay = normalizeSearchText(
    `${medicine.strength || ""} ${medicine.name || ""} ${medicine.composition || ""}`
  );
  return tokens.every((token) => hay.includes(normalizeSearchText(token)));
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const rows = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j += 1) {
    let prev = j - 1;
    rows[0] = j;
    for (let i = 1; i <= a.length; i += 1) {
      const current = rows[i];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i] = Math.min(rows[i] + 1, rows[i - 1] + 1, prev + cost);
      prev = current;
    }
  }
  return rows[a.length];
}

function fuzzyScore(query, target) {
  const q = normalizeSearchText(query);
  const t = normalizeSearchText(target);
  if (!q || !t) return 0;
  if (q === t) return 1;
  if (t.startsWith(q) || q.startsWith(t)) return 0.92;
  if (t.includes(q) || (q.length >= 4 && q.includes(t))) return 0.82;
  const maxLen = Math.max(q.length, t.length);
  if (maxLen <= 1) return 0;
  const distance = levenshtein(q, t);
  const similarity = 1 - distance / maxLen;
  return similarity >= 0.62 ? similarity * 0.9 : 0;
}

function queryTokens(query) {
  return String(query || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2);
}

function medicineSearchBlob(medicine) {
  return normalizeSearchText(
    [
      medicine.brand,
      medicine.name,
      medicine.salt,
      medicine.composition,
      medicine.category,
      ...(medicine.aliases || []),
    ].join(" ")
  );
}

function tokenHitScore(query, blob) {
  const compact = normalizeSearchText(query);
  if (!compact || compact.length < 2 || !blob) return 0;
  if (blob.includes(compact)) return 1;
  const tokens = queryTokens(query);
  if (!tokens.length) return 0;
  const hits = tokens.filter((token) => blob.includes(normalizeSearchText(token)));
  if (!hits.length) return 0;
  if (hits.length === tokens.length) return 0.95;
  return 0.58 + 0.32 * (hits.length / tokens.length);
}

function bestFieldScore(query, medicine) {
  const fields = [
    medicine.brand,
    medicine.name,
    medicine.salt,
    medicine.composition,
    ...(medicine.aliases || []),
  ];
  const fieldBest = fields.reduce(
    (best, field) => Math.max(best, fuzzyScore(query, field)),
    0
  );
  return Math.max(fieldBest, tokenHitScore(query, medicineSearchBlob(medicine)));
}

function prescribedBrandNameScore(query, medicine) {
  const fields = [medicine.brand, medicine.name];
  return fields.reduce((best, field) => Math.max(best, fuzzyScore(query, field)), 0);
}

function saltKey(medicine) {
  return normalizeSearchText(medicine.salt || "");
}

function familyKeyFromName(name) {
  return normalizeSearchText(name);
}

function familyMatchesQuery(family, query) {
  const compact = normalizeSearchText(query);
  if (!compact) return true;
  if (normalizeSearchText(family.name).includes(compact)) return true;
  return family.items.some((medicine) => medicineSearchBlob(medicine).includes(compact));
}

function findMediHomeMatch(list, brandMedicine) {
  if (!brandMedicine) return null;
  return (
    list.find(
      (medicine) =>
        medicine.isMediHome &&
        compositionKey(medicine) === compositionKey(brandMedicine)
    ) ||
    list.find(
      (medicine) =>
        medicine.isMediHome && saltKey(medicine) === saltKey(brandMedicine)
    ) ||
    null
  );
}

function findMediHomeFamily(list, brandMedicine) {
  if (!brandMedicine) return [];
  const key = saltKey(brandMedicine);
  return list.filter(
    (medicine) => medicine.isMediHome && saltKey(medicine) === key
  );
}

function searchMedicines(list, query) {
  const searchText = query.trim();
  if (searchText.length < 2) {
    return {
      items: [],
      brandMatch: null,
      brandMatches: [],
      mediHomeMatch: null,
      prescribedSearch: false,
      noExactMatch: false,
      emptyHint: "",
    };
  }

  const scored = list.map((medicine) => ({
    medicine,
    score: bestFieldScore(searchText, medicine),
    brandScore: prescribedBrandNameScore(searchText, medicine),
  }));

  const brandCandidates = scored
    .filter((entry) => !entry.medicine.isMediHome && entry.brandScore >= 0.5)
    .sort((a, b) => {
      const scoreDiff = b.brandScore - a.brandScore;
      if (scoreDiff !== 0) return scoreDiff;
      const aFlag = FLAGSHIP_BRANDS.has(normalizeSearchText(a.medicine.name)) ? 0 : 1;
      const bFlag = FLAGSHIP_BRANDS.has(normalizeSearchText(b.medicine.name)) ? 0 : 1;
      return aFlag - bFlag || a.medicine.id - b.medicine.id;
    });

  const strengthSpecified = queryHasStrength(searchText);
  const strengthHits = brandCandidates.filter((entry) =>
    strengthMatchesQuery(entry.medicine, searchText)
  );

  let brandMatches = [];
  let emptyHint = "";

  if (strengthSpecified && brandCandidates.length > 0 && strengthHits.length === 0) {
    emptyHint = `No catalogue match for this brand at the searched strength. We will not substitute a different strength.`;
  } else if (strengthHits.length > 0) {
    brandMatches = strengthHits.map((entry) => entry.medicine);
  } else if (brandCandidates.length > 0 && !strengthSpecified) {
    brandMatches = brandCandidates.map((entry) => entry.medicine);
  }

  const prescribedSearch = brandCandidates.length > 0;
  const brandMatch = brandMatches[0] || null;
  const mediHomeMatch = findMediHomeMatch(list, brandMatch);
  const mediHomeFamily = findMediHomeFamily(list, brandMatch);
  const noExactMatch = Boolean(prescribedSearch && brandMatch && !mediHomeMatch);

  const itemMap = new Map();
  scored
    .filter((entry) => entry.score >= 0.5 && entry.medicine.isMediHome)
    .forEach((entry) => itemMap.set(entry.medicine.id, entry.medicine));
  if (mediHomeMatch) itemMap.set(mediHomeMatch.id, mediHomeMatch);
  mediHomeFamily.forEach((medicine) => itemMap.set(medicine.id, medicine));

  const resolvedBrand = prescribedSearch ? brandMatch : null;
  const resolvedMediHome = mediHomeMatch || findMediHomeMatch(list, resolvedBrand);

  if (!itemMap.size && !resolvedBrand && !emptyHint) {
    emptyHint = "No medicines match your search.";
  }

  return {
    items: Array.from(itemMap.values()),
    brandMatch: resolvedBrand,
    brandMatches: prescribedSearch ? brandMatches : [],
    mediHomeMatch: resolvedMediHome,
    mediHomeFamily,
    prescribedSearch,
    noExactMatch: Boolean(resolvedBrand && !resolvedMediHome),
    emptyHint,
  };
}

function rxMedicineRelated(rxName, medicine) {
  if (!medicine) return false;
  const ignore = new Set([
    "syp",
    "syrup",
    "tab",
    "tabs",
    "tablet",
    "tablets",
    "cap",
    "caps",
    "capsule",
    "capsules",
    "mg",
    "ml",
    "iu",
  ]);
  const qTokens = queryTokens(
    String(rxName || "").replace(/^(syp|syrup|tab|tablet|cap|capsule)\s+/i, "")
  )
    .map((token) => normalizeSearchText(token))
    .filter((token) => token.length > 2 && !ignore.has(token) && !/^\d+$/.test(token));
  if (!qTokens.length) return false;
  const blob = medicineSearchBlob(medicine);
  return qTokens.some((token) => blob.includes(token));
}

export function lookupPrescriptionMedicine(rxMed) {
  const query = String(rxMed?.name || "")
    .replace(/^(syp|syrup|tab|tablet|cap|capsule)\s+/i, "")
    .trim();
  const result = searchMedicines(catalogue, query || String(rxMed?.name || ""));
  const candidates = [result.brandMatch, result.mediHomeMatch, ...(result.items || [])];
  const offer =
    candidates.find((medicine) => rxMedicineRelated(query || rxMed?.name, medicine)) || null;
  const prescribed =
    result.brandMatch &&
    !result.brandMatch.isMediHome &&
    rxMedicineRelated(query || rxMed?.name, result.brandMatch)
      ? result.brandMatch
      : null;
  return { rx: rxMed, offer, prescribed, hint: result.emptyHint || "" };
}

const requiresPrescription = (medicine) =>
  Boolean(medicine.prescription || medicine.prescriptionRequired);

function MedicinePhoto({ medicine, className = "medicine-photo" }) {
  return (
    <img
      className={className}
      src={medicine.image}
      alt={`${medicine.brand} ${medicine.name}`}
      width={72}
      height={72}
    />
  );
}

function MedicineCard({ medicine, onAdd, selected = false, onSelect }) {
  return (
    <div
      className={`medicine-row${selected ? " is-selected" : ""}`}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect ? () => onSelect(medicine) : undefined}
    >
      <button
        type="button"
        className="medicine-row-add"
        onClick={(event) => {
          event.stopPropagation();
          onAdd(medicine);
        }}
      >
        Add to cart
      </button>
      <span className="medicine-row-brand">{medicine.brand || "MediHome"}</span>
      <span className="medicine-row-comp">{medicine.salt || medicine.composition}</span>
      <span className="medicine-row-str">{medicine.strength}</span>
      <span className="medicine-row-mrp">₹{medicine.mrp}</span>
      <span className="medicine-row-price">₹{medicine.price}</span>
    </div>
  );
}

function MedicineFamilyCard({ family, onOpen }) {
  const count = family.items.length;
  return (
    <button
      type="button"
      className="medicine-family-card"
      onClick={() => onOpen(family.key)}
    >
      <span className="medicine-family-name">{family.name}</span>
      <span className="medicine-family-meta">
        {count} {count === 1 ? "strength" : "strengths & combinations"}
      </span>
      {family.brands.length ? (
        <span className="medicine-family-brands">{family.brands.join(" · ")}</span>
      ) : null}
    </button>
  );
}

function BrandSearchStrip({
  brandMatch,
  brandMatches = [],
  mediHomeMatch,
  noExactMatch,
  emptyHint,
  selectedId,
  onSelectBrand,
  onAdd,
}) {
  if (!brandMatch && !emptyHint) return null;
  const list = brandMatches.length ? brandMatches : brandMatch ? [brandMatch] : [];

  return (
    <aside className="brand-search-panel">
      <p className="brand-search-kicker">
        Prescribed brand · pack rate compared with MediHome
      </p>
      {brandMatch ? (
        <>
          {list.length > 1 ? (
            <div className="brand-match-pills" role="list">
              {list.map((medicine) => (
                <button
                  key={medicine.id}
                  type="button"
                  role="listitem"
                  className={medicine.id === selectedId ? "is-on" : ""}
                  onClick={() => onSelectBrand(medicine.id)}
                >
                  {medicine.brand}
                  <em>{medicine.strength}</em>
                </button>
              ))}
            </div>
          ) : null}
          <div className="brand-search-strip">
            <article className="brand-result-card">
              <MedicinePhoto medicine={brandMatch} className="brand-search-photo" />
              <div className="brand-result-body">
                <span className="brand-match-pill">Prescribed brand</span>
                <h3>{brandMatch.name}</h3>
                <p className="brand-result-brand">{brandMatch.brand}</p>
                <p className="brand-result-comp">{brandMatch.composition}</p>
                <p className="brand-result-mrp">
                  MRP <strong>₹{brandMatch.mrp}</strong>
                  <span> · {brandMatch.packSize}</span>
                </p>
              </div>
            </article>

            {mediHomeMatch ? (
              <article className="medihome-suggest-card">
                <MedicinePhoto medicine={mediHomeMatch} className="brand-search-photo" />
                <div className="brand-result-body">
                  <span className="composition-match-pill">Exact combination match</span>
                  <h3>Buy MediHome brand</h3>
                  <p className="brand-result-brand">{mediHomeMatch.name}</p>
                  <p className="brand-result-comp">{mediHomeMatch.composition}</p>
                  <p className="brand-result-price">
                    <span className="medicine-mrp">Brand MRP ₹{brandMatch.mrp}</span>
                    <strong>₹{mediHomeMatch.price}</strong>
                    {mediHomeMatch.price < brandMatch.mrp ? (
                      <span className="brand-save">
                        Save ₹{brandMatch.mrp - mediHomeMatch.price} / pack (
                        {Math.round(
                          ((brandMatch.mrp - mediHomeMatch.price) / brandMatch.mrp) *
                            100
                        )}
                        %)
                      </span>
                    ) : null}
                  </p>
                  <button type="button" onClick={() => onAdd(mediHomeMatch)}>
                    Add MediHome to cart
                  </button>
                </div>
              </article>
            ) : noExactMatch ? (
              <article className="medihome-nomatch-card">
                <h3>No exact MediHome match</h3>
                <p>
                  No MediHome SKU has this exact combination (
                  {brandMatch.composition}). We will not substitute a different
                  salt or strength.
                </p>
              </article>
            ) : null}
          </div>
        </>
      ) : (
        <p className="brand-search-empty">{emptyHint}</p>
      )}
    </aside>
  );
}

function categoryFromHash() {
  const { service } = parseAppHash(
    typeof window !== "undefined" ? window.location.hash : ""
  );
  if (!service || service === "Search") return "";
  return service;
}

function readHomeMedicineCategory() {
  const fromHash = categoryFromHash();
  if (fromHash) return fromHash;
  try {
    return (sessionStorage.getItem("mediHomeMedicineCategory") || "").trim();
  } catch {
    return "";
  }
}

function Medicines({ initialSearch = "" }) {
  const rxMedBoot = useMemo(() => takeRxMedicineCheckout(), []);
  const [search, setSearch] = useState(
    () => (initialSearch || "").trim() || readHomeMedicineSearch()
  );
  const [category, setCategory] = useState(() => {
    const fromHome = readHomeMedicineCategory();
    if (fromHome === "Search") return "All";
    return fromHome || "All";
  });
  const searchInputRef = useRef(null);
  const [cart, setCartState] = useState(() => readMedicineCart());
  const setCart = (updater) => {
    setCartState((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      writeMedicineCart(next);
      return next;
    });
  };
  const [showCheckout, setShowCheckout] = useState(false);
  const [prescriptionFile, setPrescriptionFile] = useState(() =>
    hasPrescriptionDraft() || rxMedBoot?.attachRx
      ? fileFromPrescriptionDraft(readPrescriptionDraft())
      : null
  );
  const savedProfile = readSavedProfile();
  const [whoFor, setWhoFor] = useState(() => initialBookingFor(savedProfile || {}));
  const [fullName, setFullName] = useState(savedProfile?.name || "");
  const [mobileNumber, setMobileNumber] = useState(savedProfile?.mobile || "");
  const [delivery, setDelivery] = useState(() => ({
    ...emptyAddress(),
    ...(savedProfile ? pickAddress(savedProfile) : {}),
  }));
  const [deliveryErrors, setDeliveryErrors] = useState({});
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [payMethod, setPayMethod] = useState("cod");
  const [payQuote, setPayQuote] = useState(null);
  const [payReady, setPayReady] = useState(true);
  const busyWait = useBusyOverlay(placingOrder, "medicine");
  const [pickedBrandId, setPickedBrandId] = useState(null);
  const [photoSearch, setPhotoSearch] = useState(null);
  const [openSaltKey, setOpenSaltKey] = useState("");

  useEffect(() => {
    const sync = () => setCartState(readMedicineCart());
    const openCheckout = () => {
      goToHash("#checkout");
    };
    window.addEventListener(MEDICINE_CART_EVENT, sync);
    window.addEventListener(MEDICINE_CHECKOUT_OPEN_EVENT, openCheckout);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(MEDICINE_CART_EVENT, sync);
      window.removeEventListener(MEDICINE_CHECKOUT_OPEN_EVENT, openCheckout);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!rxMedBoot) return;
    if (readMedicineCart().length) goToHash("#checkout");
  }, [rxMedBoot]);

  useEffect(() => {
    const applyCategory = () => {
      const next = (initialSearch || "").trim();
      if (next) {
        setSearch(next);
        setCategory("All");
        try {
          sessionStorage.removeItem("mediHomeMedicineCategory");
        } catch {
          /* ignore */
        }
        return;
      }
      const fromHome = readHomeMedicineCategory();
      if (fromHome) {
        setCategory(fromHome === "Search" ? "All" : fromHome);
        if (fromHome === "Search") {
          /* keep typed search */
        } else {
          setSearch("");
        }
        try {
          sessionStorage.removeItem("mediHomeMedicineCategory");
        } catch {
          /* ignore */
        }
      }
    };
    applyCategory();
    window.addEventListener("hashchange", applyCategory);
    return () => window.removeEventListener("hashchange", applyCategory);
  }, [initialSearch]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, [category]);

  const categories = [
    "All",
    "Diabetes",
    "Hypertension",
    "Cholesterol",
    "Cardiology",
    "Thyroid",
    "Kidney Care",
    "Respiratory",
    "Bone & Joint",
    "Supplements",
    "Pain Relief",
    "Gastric",
    "Infection",
    "Allergy",
    "Neurology",
    "Urology",
    "Women's Health",
    "Dermatology",
  ];

  const categoryCatalogue = useMemo(
    () => catalogue.filter((medicine) => medicineInCategory(medicine, category)),
    [category]
  );
  const saltFamilies = useMemo(
    () =>
      groupMedicineFamilies(
        houseCatalogue.filter((medicine) => medicineInCategory(medicine, category))
      ),
    [category]
  );
  const showSaltTabs = category !== "All" && category !== "Search";
  const visibleSaltFamilies = showSaltTabs ? saltFamilies : [];
  const searchResult = searchMedicines(categoryCatalogue, search);
  const photoMatch = useMemo(
    () =>
      photoSearch
        ? matchExactMediHomeFromPhoto(categoryCatalogue, photoSearch.query || search)
        : null,
    [photoSearch, photoSearch?.query, search, categoryCatalogue]
  );
  const selectedBrand =
    photoMatch?.brandMatch ||
    searchResult.brandMatches.find((medicine) => medicine.id === pickedBrandId) ||
    searchResult.brandMatch;
  const selectedMediHome =
    photoMatch?.items?.[0] || findMediHomeMatch(categoryCatalogue, selectedBrand);

  useEffect(() => {
    if (searchResult.brandMatch) {
      setPickedBrandId(searchResult.brandMatch.id);
    }
  }, [search, searchResult.brandMatch?.id]);

  useEffect(() => {
    if (photoSearch) return;
    const compact = normalizeSearchText(search);
    if (compact.length < 3) return;
    const exact = saltFamilies.find(
      (family) => familyKeyFromName(family.name) === compact
    );
    if (exact) setOpenSaltKey(exact.key);
  }, [search, photoSearch, saltFamilies]);

  const openSaltFamily =
    saltFamilies.find((family) => family.key === openSaltKey) || null;
  const hasSearch = search.trim().length >= 2;
  const searchingBrand = Boolean(
    !photoMatch && hasSearch && searchResult.prescribedSearch && selectedBrand
  );
  const listed = photoMatch
    ? photoMatch.items
    : openSaltFamily
      ? hasSearch
        ? openSaltFamily.items.filter((medicine) =>
            familyMatchesQuery({ name: openSaltFamily.name, items: [medicine] }, search)
          )
        : openSaltFamily.items
      : hasSearch
        ? searchResult.items
        : [];
  const filteredMedicines = sortMedicineRows(
    listed.filter((medicine) => medicine.isMediHome)
  );
  const showBrandStrip = searchingBrand;
  const monthlySave = monthlySavingForCart(cart);

  const cartTotal = cart.reduce(
    (total, item) => total + item.price * (item.quantity || 1),
    0
  );

  const cartMrp = cart.reduce(
    (total, item) =>
      total + Number(item.mrp || item.price) * (item.quantity || 1),
    0
  );

  const cartNeedsPrescription = cart.some(requiresPrescription);
  const savedRxName = prescriptionFile?.name || prescriptionDraftName();
  const hasSavedRx = Boolean(prescriptionFile) || hasPrescriptionDraft();

  const addToCart = (medicine) => {
    const added = resolveCartAdd(medicine, catalogue, selectedBrand, {
      searchingBrand,
    });
    if (!added?.selling) return;
    const selling = {
      ...added.selling,
      prescribedBrand: added.compare || null,
    };
    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.id === selling.id);

      if (existingItem) {
        return currentCart.map((item) =>
          item.id === selling.id
            ? {
                ...item,
                quantity: (item.quantity || 1) + 1,
                prescribedBrand: selling.prescribedBrand || item.prescribedBrand,
              }
            : item
        );
      }

      return [...currentCart, withPickedBatch({ ...selling, quantity: 1 })];
    });
    openShopCart();
    setShowCheckout(false);
    setConfirmedOrder(null);
  };

  const resetCheckoutForm = () => {
    setFullName("");
    setMobileNumber("");
    setDelivery(emptyAddress());
    setDeliveryErrors({});
    setPrescriptionFile(null);
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      alert("Your cart is empty. Please add a medicine before checkout.");
      return;
    }

    const profile = savedProfile || {};
    const source = {
      ...whoFor,
      patientName: fullName,
      mobile: mobileNumber,
      ...delivery,
    };
    const detailsErrors = validateBookingDetails(source, profile);
    if (detailsErrors.bookedFor) {
      alert(detailsErrors.bookedFor);
      return;
    }
    if (detailsErrors.patientName) {
      alert(detailsErrors.patientName);
      return;
    }
    if (detailsErrors.gender) {
      alert(detailsErrors.gender);
      return;
    }
    if (detailsErrors.age) {
      alert(detailsErrors.age);
      return;
    }
    if (detailsErrors.mobile) {
      alert(detailsErrors.mobile);
      return;
    }
    const addressErrors = { ...detailsErrors };
    delete addressErrors.bookedFor;
    delete addressErrors.patientName;
    delete addressErrors.gender;
    delete addressErrors.age;
    delete addressErrors.mobile;
    if (Object.keys(addressErrors).length) {
      setDeliveryErrors(addressErrors);
      alert(Object.values(addressErrors)[0]);
      return;
    }
    setDeliveryErrors({});
    const booked = withBookingIdentity(source, profile);

    if (cartNeedsPrescription && !hasSavedRx) {
      alert("Please upload your prescription.");
      return;
    }

    setPlacingOrder(true);
    try {
      const availability = checkMedicineAvailability(cart, catalogue);
      if (!availability.ok) {
        alert(availability.message);
        return;
      }
      const queue = await holdForPartnerQueue("medicine");
      const gps = await resolvePinLocation(booked.pinCode);
      const addr = applyResolvedPin(booked, gps);
      const pay = paymentFromQuote(payQuote, cartTotal);
      const payment = await settleCheckoutPayment({
        method: payMethod,
        ...pay,
        kind: "medicine",
        pin: gps.pinCode,
        name: booked.patientName,
        mobile: booked.mobile,
        reference: `med-${Date.now()}`,
        description: "MediHome medicines",
      });
      const persistPay = checkoutPaymentPersistFields(payMethod, payment);

      const newOrder = {
        id: Date.now(),
        items: cart.map((item) => ({
          id: item.id,
          name: item.name,
          salt: item.salt,
          strength: item.strength,
          packSize: item.packSize,
          category: item.category,
          price: item.price,
          mrp: item.mrp,
          prescription: requiresPrescription(item),
          quantity: item.quantity || 1,
          batchId: item.batchId || "",
          batchNo: item.batchNo || "",
          batchMfgDate: item.batchMfgDate || "",
          batchExpiryDate: item.batchExpiryDate || "",
        })),
        total: pay.amountRupees,
        saleRupees: pay.saleRupees,
        couponCode: pay.couponCode,
        discountRupees: pay.discountRupees,
        highTrafficWait: queue.busy || queue.waited,
        date: new Date().toLocaleString(),
        fullName: booked.patientName,
        ...whoFor,
        ...booked,
        mobileNumber: booked.mobile,
        prescription: savedRxName,
        ...buildPartnerRxShare("medicine"),
        ...addr,
        ...medicineAwaitingPharmacyFields(availability),
        ...persistPay,
      };

      const trackedOrder = await persistAndSendOrder(withTracking(newOrder, "medicine"));

      if (persistPay.paid) {
        goHomeAfterPaidCheckout();
        return;
      }
      setCart([]);
      setShowCheckout(false);
      resetCheckoutForm();
      setConfirmedOrder(trackedOrder);
    } catch (error) {
      alert(error.message || "Payment or order could not be completed.");
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <section id="medicines" className="medicines-page">
      {busyWait ? <BusyWait kind="medicine" traffic={busyWait} /> : null}
      <div className="medicines-header">
        <div className="medicines-title-row">
          <div>
            <h1>Order Medicines</h1>
            <p>
              You are ordering genuine medicines from GMP certified Manufacturer
              at affordable price.
            </p>
          </div>
        </div>
        <div className="medicine-category-boxes">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              className={`medicine-category-box ${
                category === item ? "active" : ""
              }`}
              aria-label={item}
              onClick={() => {
                setCategory(item);
                setSearch("");
                setPhotoSearch(null);
                setOpenSaltKey("");
                setShowCheckout(false);
                setConfirmedOrder(null);
                window.requestAnimationFrame(() => searchInputRef.current?.focus());
              }}
            >
              <span className="medicine-category-name">
                {item === "All" ? "All" : item}
              </span>
            </button>
          ))}
        </div>
        {showSaltTabs ? (
          <div className="medicine-salt-row">
            <p className="medicine-salt-kicker">{category} medicines</p>
            {visibleSaltFamilies.length ? (
              <div
                className="medicine-category-boxes medicine-salt-boxes"
                role="tablist"
                aria-label={`${category} medicines`}
              >
                {visibleSaltFamilies.map((family) => (
                  <button
                    key={family.key}
                    type="button"
                    role="tab"
                    aria-selected={openSaltKey === family.key}
                    className={`medicine-category-box ${
                      openSaltKey === family.key ? "active" : ""
                    }`}
                    onClick={() => {
                      setOpenSaltKey(family.key);
                      setPhotoSearch(null);
                      setShowCheckout(false);
                      setConfirmedOrder(null);
                    }}
                  >
                    <span className="medicine-category-name">{family.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="medicines-empty-hint">No medicines in {category}.</p>
            )}
          </div>
        ) : null}
        <div className="medicine-search-box is-large">
          <input
            ref={searchInputRef}
            type="search"
            placeholder={
              category === "All" || category === "Search"
                ? "Search by brand name or salt name"
                : `Search ${category} by brand name or salt name`
            }
            value={search}
            onChange={(e) => {
              setPhotoSearch(null);
              setSearch(e.target.value);
            }}
            aria-label="Search medicines by brand or salt"
            autoFocus
          />
          {search.trim() !== "" ? (
            <button
              type="button"
              className="medicine-clear-button"
              onClick={() => {
                setSearch("");
                setPhotoSearch(null);
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
        <MedicineSearchTools
          onQuery={(value) => {
            setSearch(String(value || "").trim());
            searchInputRef.current?.focus();
          }}
          onPhoto={(payload) => setPhotoSearch(payload)}
        />
      </div>

      {showCheckout && (
        <div className="checkout-panel">
          <h2>Checkout</h2>

          <BookingFlow
            idPrefix="med"
            layout="checkout"
            profile={savedProfile || {}}
            values={{
              ...whoFor,
              patientName: fullName,
              mobile: mobileNumber,
              ...delivery,
            }}
            errors={{
              patientName: deliveryErrors.patientName,
              gender: deliveryErrors.gender,
              age: deliveryErrors.age,
              mobile: deliveryErrors.mobile,
              ...deliveryErrors,
            }}
            onSelect={(option) => {
              const patch = bookingForPatch(option, savedProfile || {});
              setWhoFor(patch);
              setFullName(patch.patientName || "");
              setMobileNumber(patch.mobile || "");
              setDelivery({
                ...emptyAddress(),
                ...pickAddress(patch),
              });
              setDeliveryErrors({});
            }}
            onChange={(event) => {
              const { name, value } = event.target;
              if (name === "patientName") {
                setFullName(value);
                return;
              }
              if (name === "mobile") {
                setMobileNumber(value);
                setDeliveryErrors((prev) => ({ ...prev, mobile: "" }));
                return;
              }
              if (name === "gender" || name === "age" || name === "dob") {
                setWhoFor((prev) => ({ ...prev, [name]: value }));
                setDeliveryErrors((prev) => ({ ...prev, [name]: "" }));
                return;
              }
              setDelivery((prev) => ({ ...prev, [name]: value }));
              setDeliveryErrors((prev) => ({ ...prev, [name]: "" }));
            }}
            pinHint="Select the Village / Sector / Mohalla attached to this PIN."
          >
          {monthlySave > 0 ? (
            <section className="checkout-monthly-save" aria-label="Monthly saving">
              <h3>Monthly saving</h3>
              <p>
                Versus the prescribed brand you searched, MediHome saves about ₹
                {monthlySave} / month at the usual pack rate.
              </p>
              <ul>
                {cart
                  .filter((item) => item.prescribedBrand)
                  .map((item) => (
                    <li key={item.id}>
                      {item.prescribedBrand.brand} MRP ₹{item.prescribedBrand.mrp} vs
                      MediHome ₹{item.price} · about ₹{monthlySavingForItem(item)} /
                      month
                    </li>
                  ))}
              </ul>
            </section>
          ) : null}
          {cartNeedsPrescription && !hasSavedRx ? (
            <div className="checkout-rx">
              <label>Prescription</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setPrescriptionFile(e.target.files[0])}
              />
            </div>
          ) : cartNeedsPrescription ? (
            <div className="checkout-rx is-ready">
              <p>Using uploaded prescription: {savedRxName}</p>
            </div>
          ) : null}

          <PaymentBlock
            kind="medicine"
            amount={cartTotal}
            saleAmount={cartMrp}
            pin={delivery.pinCode}
            method={payMethod}
            onMethodChange={setPayMethod}
            onQuoteChange={setPayQuote}
            onReadyChange={setPayReady}
            cashLabel="Cash On Delivery"
            guestDetails={{
              name: fullName,
              mobile: mobileNumber,
              gender: whoFor.gender,
              dob: whoFor.dob,
              age: whoFor.age,
              ...delivery,
            }}
          />
          <div className="cart-actions">
            <button
              type="button"
              className="cart-btn cart-btn-primary"
              onClick={placeOrder}
              disabled={placingOrder || (checkoutUsesPayCta(payMethod) && !payReady)}
            >
              {placingOrder ? "Connecting PIN to map…" : "Place order"}
            </button>
          </div>
          </BookingFlow>
          <div className="cart-actions">
            <button
              type="button"
              className="cart-btn cart-btn-secondary"
              onClick={() => {
                setShowCheckout(false);
              }}
            >
              Continue shopping
            </button>
          </div>
        </div>
      )}

      {confirmedOrder && (
        <div className="checkout-panel">
          <h2>
            {confirmedOrder.partnerConfirmed
              ? "Order Confirmed"
              : "Request sent to pharmacy"}
          </h2>
          <PatienceNote kind="medicine" shown={confirmedOrder.highTrafficWait} />
          <p>
            Thank you, {confirmedOrder.fullName}.{" "}
            {confirmedOrder.partnerConfirmed
              ? "Your medicine order is confirmed."
              : "Your prescription was sent to the pharmacy for this PIN. The order is confirmed after they review the handwritten and digital Rx."}
          </p>
          <p>
            <strong>Order ID:</strong> #{confirmedOrder.id}
          </p>
          <p>
            <strong>Total:</strong> ₹{confirmedOrder.total}
          </p>
          <p>
            <strong>Payment:</strong>{" "}
            {paymentMethodSummary(confirmedOrder.paymentMethod, "Cash on delivery")}
          </p>
          <p>
            <strong>Delivery Address:</strong> {confirmedOrder.deliveryAddress}
          </p>
          <p>
            <strong>PIN Code:</strong> {confirmedOrder.pinCode}
          </p>
          {confirmedOrder.outletName ? (
            <p>
              <strong>Delivery outlet:</strong> {confirmedOrder.outletName}
              {confirmedOrder.outletArea ? ` · ${confirmedOrder.outletArea}` : ""}
            </p>
          ) : null}
          {confirmedOrder.outletGstin ? (
            <p>
              <strong>Outlet GSTIN:</strong> {confirmedOrder.outletGstin}
            </p>
          ) : null}
          {confirmedOrder.outletDlNo ? (
            <p>
              <strong>Outlet DL No.:</strong> {confirmedOrder.outletDlNo}
            </p>
          ) : null}
          <PinGpsBlock record={confirmedOrder} />
          <AssignedAgent record={confirmedOrder} />
          <div className="cart-actions">
            <BillButton order={confirmedOrder} className="cart-btn cart-btn-primary" />
            {peekRxLabCheckout()?.tests?.length ? (
              <button
                type="button"
                className="cart-btn cart-btn-primary"
                onClick={() => {
                  const pending = peekRxLabCheckout();
                  const kind = pending?.serviceType || "lab";
                  const lab = pending?.partnerId || "";
                  window.location.hash = lab
                    ? `#labs?service=${encodeURIComponent(kind)}&lab=${encodeURIComponent(lab)}`
                    : "#labs";
                }}
              >
                Continue to book tests
              </button>
            ) : null}
            <button
              type="button"
              className="cart-btn cart-btn-secondary"
              onClick={() => setConfirmedOrder(null)}
            >
              Continue shopping
            </button>
            <button
              type="button"
              className="cart-btn cart-btn-primary"
              onClick={() => {
                window.location.hash = trackHref(confirmedOrder.id);
              }}
            >
              Track live
            </button>
            <button
              type="button"
              className="cart-btn cart-btn-secondary"
              onClick={() => {
                setConfirmedOrder(null);
                window.location.hash = "#myorders";
              }}
            >
              View my orders
            </button>
          </div>
        </div>
      )}

      {!showCheckout && !confirmedOrder && (
        <>
          {photoSearch ? (
            <aside className="photo-match-panel">
              {photoSearch.previewUrl ? (
                <img
                  className="photo-match-preview"
                  src={photoSearch.previewUrl}
                  alt={photoSearch.fileName || "Uploaded medicine photo"}
                />
              ) : null}
              <div>
                <p className="brand-search-kicker">Suggested MediHome medicine</p>
                {selectedMediHome ? (
                  <p>
                    Exact match: {selectedMediHome.name} · {selectedMediHome.strength}
                  </p>
                ) : (
                  <p>
                    {photoMatch?.emptyHint ||
                      "No exact MediHome medicine matches this photo."}
                  </p>
                )}
              </div>
            </aside>
          ) : null}
          {showBrandStrip && (
            <BrandSearchStrip
              brandMatch={selectedBrand}
              brandMatches={searchResult.brandMatches}
              mediHomeMatch={selectedMediHome}
              noExactMatch={Boolean(selectedBrand && !selectedMediHome)}
              emptyHint={searchResult.emptyHint}
              selectedId={selectedBrand?.id}
              onSelectBrand={(id) => setPickedBrandId(id)}
              onAdd={addToCart}
            />
          )}
          <div className="medicine-grid">
            {filteredMedicines.length === 0 ? (
              showBrandStrip && searchResult.brandMatch ? null : (
                <p className="medicines-empty-hint">
                  {photoMatch?.emptyHint ||
                    (hasSearch
                      ? searchResult.emptyHint || "No medicines match your search in this category."
                      : category === "All"
                        ? "Choose a category to see its medicine tabs."
                        : `Choose a ${category} salt tab to see all strengths and combinations.`)}
                </p>
              )
            ) : (
              <>
                <div className="medicine-row medicine-row-head">
                  <span className="medicine-row-add-label">Cart</span>
                  <span>Brand</span>
                  <span>Composition</span>
                  <span>Strength</span>
                  <span>MRP</span>
                  <span>Selling Price</span>
                </div>
                {filteredMedicines.map((medicine) => (
                  <MedicineCard
                    key={medicine.id}
                    medicine={medicine}
                    onAdd={addToCart}
                  />
                ))}
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default Medicines;
