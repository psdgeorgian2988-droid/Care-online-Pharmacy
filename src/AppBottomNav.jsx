import { useEffect, useRef } from "react";
import { hasAccountSession, useLoginSession } from "./authSession";
import {
  DOCTOR_HOME_HASH,
  HOMECARE_HOME_HASH,
  isAmbulanceNavActive,
  isDoctorNavActive,
  isEducationNavActive,
  isHomecareNavActive,
  isLabsNavActive,
  isMedicalRecordNavActive,
  isMedicineNavActive,
  isPsychologistNavActive,
  isRadiologyNavActive,
  isStepdownNavActive,
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
  { href: "#home?service=radiology", label: "Radiology", icon: "radiology" },
  { href: HOMECARE_HOME_HASH, label: "Home Care", icon: "homecare" },
  { href: VACCINATION_HOME_HASH, label: "Vaccination", icon: "vaccination" },
  { href: DOCTOR_HOME_HASH, label: "Doctor", icon: "doctor" },
  { href: "#home?service=psychologist", label: "Psychologist", icon: "psychologist" },
  { href: "#home?service=stepdown", label: "Step-Down", icon: "stepdown" },
  { href: "#home?service=ambulance", label: "Ambulance", icon: "ambulance" },
  { href: MEDICAL_RECORD_HOME_HASH, label: "Medical Record", icon: "record" },
  { href: "#home?service=education", label: "Education", icon: "education" },
];

export function orderServiceTabs() {
  return TABS.filter(
    (tab) =>
      tab.href !== "#profile" &&
      tab.href !== MEDICAL_RECORD_HOME_HASH &&
      tab.href !== "#home?service=education"
  );
}

const AUTH_ROUTES = new Set(["#login", "#register", "#forgot"]);
const AUTH_HIDDEN_TABS = new Set([LABS_HOME_HASH, MEDICAL_RECORD_HOME_HASH]);

export function footerTabs(route, loggedIn) {
  return TABS.filter((tab) => {
    if (AUTH_ROUTES.has(route) && AUTH_HIDDEN_TABS.has(tab.href)) return false;
    if (tab.href === "#profile" && !loggedIn) return false;
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
  if (href === "#home?service=radiology") return isRadiologyNavActive(route, service);
  if (href === DOCTOR_HOME_HASH) return isDoctorNavActive(route, service);
  if (href === "#home?service=psychologist") return isPsychologistNavActive(route, service);
  if (href === "#home?service=stepdown") return isStepdownNavActive(route, service);
  if (href === "#home?service=ambulance") return isAmbulanceNavActive(route, service);
  if (href === MEDICAL_RECORD_HOME_HASH) return isMedicalRecordNavActive(route, service);
  if (href === HOMECARE_HOME_HASH) return isHomecareNavActive(route, service);
  if (href === VACCINATION_HOME_HASH) return isVaccinationNavActive(route, service);
  if (href === "#home?service=education") return isEducationNavActive(route, service);
  return route === href;
}

export default function AppBottomNav({ route, service = "", guestSearchOpen = false, onGuestSearch }) {
  const user = useLoginSession();
  const loggedIn = hasAccountSession(user);
  const listed = footerTabs(route, false);
  const tabs = listed.flatMap((tab) =>
    tab.href === LABS_HOME_HASH
      ? [tab, { href: "#guest-search", label: "Search report", icon: "search", kind: "search" }]
      : [tab],
  );
  const navRef = useRef(null);
  const pinnedHrefs = new Set(["#profile", MEDICINE_HOME_HASH]);
  const pinned = tabs.filter((tab) => pinnedHrefs.has(tab.href));
  const scrolling = tabs.filter((tab) => !pinnedHrefs.has(tab.href));

  useEffect(() => {
    const scroller = navRef.current;
    if (!scroller || typeof window === "undefined") return;
    if (window.matchMedia?.("(min-width: 768px)")?.matches) return;
    const active = scroller.querySelector("[aria-current='page']");
    if (active) active.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [route, service, loggedIn, guestSearchOpen]);

  if (loggedIn) return null;

  const renderTab = (tab) => {
    const tone = serviceIconTone(tab.icon);
    if (tab.kind === "search") {
      return (
        <button
          key={tab.href}
          type="button"
          className={guestSearchOpen ? "active" : undefined}
          aria-pressed={guestSearchOpen}
          aria-label="Search report"
          data-icon={tab.icon}
          style={{ "--icon-color": tone.color, "--icon-bg": tone.bg }}
          onClick={onGuestSearch}
        >
          <span>
            <ServiceGlyph type={tab.icon} color={tone.color} />
          </span>
          <em>{tab.label}</em>
        </button>
      );
    }
    const active = tabActive(tab.href, route, service);
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
  };

  return (
    <nav className="app-bottom-nav" aria-label="App">
      <div className="app-bottom-pin">{pinned.map(renderTab)}</div>
      <div className="app-bottom-scroll" ref={navRef}>
        {scrolling.map(renderTab)}
      </div>
    </nav>
  );
}
