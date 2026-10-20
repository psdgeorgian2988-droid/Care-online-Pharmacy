import { ACTOR_SESSION_KEY, ENTRY_CHOSEN_KEY, LOGIN_SESSION_KEY, PROFILE_KEY } from "./authSession.js";
import { GUEST_CHECKOUT_KEY } from "./guestCheckout.js";
import { MEDICAL_RECORD_KEY } from "./medicalRecord.js";
import {
  MEDICINE_CART_KEY,
  RX_LAB_CHECKOUT_KEY,
  RX_MED_CHECKOUT_KEY,
  TEST_CART_KEY,
} from "./medicineCartStore.js";
import { PRESCRIPTION_PARSE_KEY } from "./prescriptionAi.js";
import { PRESCRIPTION_DRAFT_KEY } from "./prescriptionDraft.js";
import { RECORD_STORAGE_KEY as VACCINATION_RECORD_KEY } from "./vaccinationRecord.js";
import { BOOKING_STORAGE_KEY as VACCINATION_BOOKING_KEY, HOMECARE_DRAFT_KEY } from "./vaccinationBooking.js";

export const CUSTOMER_DATA_RESET_KEY = "mediHomeCustomerDataReset";
export const CUSTOMER_DATA_RESET_TOKEN = "2026-10-20";

const CUSTOMER_KEYS = [
  "mediHomeOrders",
  "mediHomeDiagnosticsBookings",
  "mediHomeHomeCareBookings",
  "mediHomeVaccinationBookings",
  "mediHomePsychologistBookings",
  "mediHomeDoctorBookings",
  "mediHomeStepDownBookings",
  "mediHomeAmbulanceRequests",
  PROFILE_KEY,
  LOGIN_SESSION_KEY,
  ACTOR_SESSION_KEY,
  GUEST_CHECKOUT_KEY,
  MEDICAL_RECORD_KEY,
  VACCINATION_RECORD_KEY,
  VACCINATION_BOOKING_KEY,
  HOMECARE_DRAFT_KEY,
  PRESCRIPTION_DRAFT_KEY,
  PRESCRIPTION_PARSE_KEY,
  MEDICINE_CART_KEY,
  TEST_CART_KEY,
  RX_LAB_CHECKOUT_KEY,
  RX_MED_CHECKOUT_KEY,
  "mediHomeLabBooking",
  "mediHomeLastBooking",
  "mediHomePointsWallet",
  "mediHomeSavedPayments",
  "mediHomeAccountOtp",
  "mediHomeAccountEditUnlock",
  "mediHomeCareThread",
  "mediHomeCareSession",
  "mediHomeRxLabCheckout",
  "mediHomeWebinarSignups",
  "mediHomeCustomReportTests",
];

function storageOrNull(which) {
  try {
    return which === "session" ? globalThis.sessionStorage : globalThis.localStorage;
  } catch {
    return null;
  }
}

/** Wipe customer orders and registrations stored in this browser through 20 Oct 2026. */
export function resetCustomerDataThroughToday() {
  const local = storageOrNull("local");
  const session = storageOrNull("session");
  if (!local) return false;
  try {
    if (local.getItem(CUSTOMER_DATA_RESET_KEY) === CUSTOMER_DATA_RESET_TOKEN) {
      return false;
    }
  } catch {
    return false;
  }

  for (const key of CUSTOMER_KEYS) {
    try {
      local.removeItem(key);
    } catch {
      /* ignore */
    }
  }
  try {
    session?.removeItem?.(ENTRY_CHOSEN_KEY);
    session?.removeItem?.(LOGIN_SESSION_KEY);
    session?.removeItem?.(ACTOR_SESSION_KEY);
    session?.removeItem?.("mediHomeReturnHash");
    session?.removeItem?.("mediHomeForgotMobile");
  } catch {
    /* ignore */
  }

  try {
    local.setItem(CUSTOMER_DATA_RESET_KEY, CUSTOMER_DATA_RESET_TOKEN);
  } catch {
    /* ignore */
  }
  try {
    globalThis.dispatchEvent?.(new Event("mediHomeSession"));
  } catch {
    /* ignore */
  }
  return true;
}
