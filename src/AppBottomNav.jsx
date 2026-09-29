import { hasAccountSession, useLoginSession } from "./authSession";
import {
  DOCTOR_HOME_HASH,
  HOMECARE_HOME_HASH,
  isDoctorNavActive,
  isHomecareNavActive,
  isLabsNavActive,
  isMedicalRecordNavActive,
  isMedicineNavActive,
  isVaccinationNavActive,
  LABS_HOME_HASH,
  MEDICAL_RECORD_HOME_HASH,
  MEDICINE_HOME_HASH,
  VACCINATION_HOME_HASH,
} from "./hashRoute";
import { ServiceGlyph, serviceIconTone } from "./serviceIcons";

export const TABS = [
  { href: "#profile", label: "Account", icon: "account" },
  { href: MEDICINE_HOME_HASH, label: "Medicines", icon: "medicine" },
  { href: LABS_HOME_HASH, label: "Labs", icon: "lab" },
  { href: "#myorders", label: "Orders", icon: "orders" },
  { href: DOCTOR_HOME_HASH, label: "Doctor", icon: "doctor" },
  { href: MEDICAL_RECORD_HOME_HASH, label: "Medical Record", icon: "record" },
  { href: HOMECARE_HOME_HASH, label: "Home Care", icon: "homecare" },
  { href: VACCINATION_HOME_HASH, label: "Vaccination", icon: "vaccination" },
];

const AUTH_ROUTES = new Set(["#login", "#register", "#forgot"]);
const AUTH_HIDDEN_TABS = new Set([LABS_HOME_HASH, MEDICAL_RECORD_HOME_HASH]);

export function footerTabs(route, loggedIn) {
  return TABS.filter((tab) => {
    if (AUTH_ROUTES.has(route) && AUTH_HIDDEN_TABS.has(tab.href)) return false;
    if (tab.href === MEDICAL_RECORD_HOME_HASH && !loggedIn) return false;
    return true;
  });
}

export function tabActive(href, route, service = "") {
  if (href === "#profile") {
    return route === "#profile" || route === "#login" || route === "#register";
  }
  if (href === MEDICINE_HOME_HASH) return isMedicineNavActive(route, service);
  if (href === LABS_HOME_HASH) return isLabsNavActive(route, service);
  if (href === "#myorders") return route === "#myorders" || route === "#track";
  if (href === DOCTOR_HOME_HASH) return isDoctorNavActive(route, service);
  if (href === MEDICAL_RECORD_HOME_HASH) return isMedicalRecordNavActive(route, service);
  if (href === HOMECARE_HOME_HASH) return isHomecareNavActive(route, service);
  if (href === VACCINATION_HOME_HASH) return isVaccinationNavActive(route, service);
  return route === href;
}

export default function AppBottomNav({ route, service = "" }) {
  const user = useLoginSession();
  const loggedIn = hasAccountSession(user);
  const tabs = footerTabs(route, loggedIn);

  return (
    <nav className="app-bottom-nav" aria-label="App" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
      {tabs.map((tab) => {
        const active = tabActive(tab.href, route, service);
        const tone = serviceIconTone(tab.icon);
        return (
          <a
            key={tab.href}
            href={tab.href}
            className={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
            data-icon={tab.icon}
            style={{ "--icon-color": tone.color, "--icon-bg": tone.bg }}
          >
            <span>
              <ServiceGlyph type={tab.icon} color={tone.color} />
            </span>
            <em>{tab.label}</em>
          </a>
        );
      })}
    </nav>
  );
}
