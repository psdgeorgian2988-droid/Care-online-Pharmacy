import { Suspense, useState, useEffect } from "react";
import "./App.css";
import {
  About,
  Admin,
  Ambulance,
  Contact,
  Feedback,
  HealthEducation,
  HomeCare,
  LabTests,
  Medicines,
  MyOrders,
  Partner,
  Profile,
  DoctorAppointment,
  Psychologist,
  Reports,
  Reviews,
  PrescriptionReview,
  CartCheckout,
  ScanPage,
  StepDownCare,
  TrackPage,
  Vaccination,
} from "./routePages";
import Seo from "./Seo";
import SocialLinks from "./SocialLinks";
import { reviewStats } from "./reviewStore";
import CareChat from "./CareChat.jsx";
import NeedHelp from "./NeedHelp.jsx";
import HeaderCart from "./HeaderCart.jsx";
import { CARE_WHATSAPP } from "./careChat.js";
import ComingSoon from "./ComingSoon";
import ErrorBoundary from "./ErrorBoundary";
import AuthPage from "./AuthPage";
import {
  hasAccountSession,
  logoutSession,
  rememberReturnHash,
  useLoginSession,
} from "./authSession";
import { useFeatures } from "./featureFlags";
import { featureEnabled, pausedServiceTitle, routeEnabled } from "./salesReport";
import { goToHash, parseAppHash } from "./hashRoute";
import { peekRxLabCheckout } from "./medicineCartStore";
import PortalsChooser, { CustomerPortal, PartnerPortal, StaffPortal } from "./RolePortals";
import CustomerHome from "./CustomerHome";
import HomeServiceCatalog from "./HomeServiceCatalog";
import LabsHub from "./LabsHub";
import HomePrescriptionUpload from "./HomePrescriptionUpload";
import { useIsPhoneLayout } from "./useLayoutMode";
import AppBottomNav from "./AppBottomNav";
import BackToHome from "./BackToHome";
import WebinarNotice from "./WebinarNotice";
import SlotOfferBanner from "./SlotOfferBanner";
import CustomerWelcome, { needsCustomerWelcome } from "./CustomerWelcome";
import {
  isAppShell,
  isInstalledApp,
  launchHashForRole,
  readAppRole,
  shouldShowAppPicker,
} from "./appRuntime";
import LogoMark from "./LogoMark";
import MediHomeLogoLink from "./MediHomeLogoLink";
import AppHeader from "./AppHeader";

const AUTH_ROUTES = new Set(["#login", "#register", "#forgot"]);
const AUTH_HIDDEN_NAV = new Set(["#labs", "#reports"]);

const NAV_LINKS = [
  { href: "#home", label: "Home" },
  { href: "#medicine-search", label: "Medicines" },
  { href: "#labs", label: "Lab Tests" },
  { href: "#homecare", label: "Home Care" },
  { href: "#vaccination", label: "Vaccination Record" },
  { href: "#doctor", label: "Doctor Appointment" },
  { href: "#psychologist", label: "Psychologist" },
  { href: "#stepdown", label: "Step-Down" },
  { href: "#ambulance", label: "Ambulance" },
  { href: "#reports", label: "Reports" },
  { href: "#education", label: "Education" },
];

const ACCOUNT_LINKS = [
  { href: "#myorders", label: "My Orders" },
  { href: "#reports", label: "Reports" },
  { href: "#scan?step=deliver", label: "Scan Delivery" },
  { href: "#profile", label: "Profile" },
];

const BOTTOM_LINKS = [
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
  { href: "#customer", label: "Customer" },
  { href: "#partner", label: "Partner" },
  { href: "#staff", label: "Staff" },
];

const OPS_LINKS = [
  { href: "#admin", label: "Staff Orders" },
  { href: "#partner-desk", label: "Partner Desk" },
];

const HOME_WHATSAPP_URL = `https://wa.me/${CARE_WHATSAPP}?text=${encodeURIComponent(
  "Hi MediHome, I would like to order medicines."
)}`;

const TICKER_TEXT = "YOUR COMPLETE HEALTHCARE ECOSYSTEM AT YOUR DOORSTEP";

function SiteTicker() {
  return (
    <div className="top-ticker">
      <div className="ticker-track">
        <span className="ticker-item">{TICKER_TEXT}</span>
        <span className="ticker-item">{TICKER_TEXT}</span>
        <span className="ticker-item">{TICKER_TEXT}</span>
        <span className="ticker-item">{TICKER_TEXT}</span>
      </div>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="app-footer">
      <p>© 2026 MediHome. All rights reserved.</p>
      <SocialLinks className="footer-social" />
    </footer>
  );
}

function SiteFloatingHelp({ needHelpOpen, setNeedHelpOpen }) {
  return (
    <div className="site-floating-help" aria-label="Help">
      <CareChat />
      <NeedHelp
        open={needHelpOpen}
        onOpen={() => setNeedHelpOpen(true)}
        onClose={() => setNeedHelpOpen(false)}
      />
    </div>
  );
}

function openWhatsAppUrl(url, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const opened = window.open(url, "_blank");
  if (opened) {
    opened.opener = null;
    return;
  }
  window.location.assign(url);
}

function PageFallback() {
  return (
    <div className="page-loading" role="status">
      <p className="home-kicker">MediHome</p>
      <h1>Opening page…</h1>
      <p>Please wait a moment.</p>
    </div>
  );
}

function hashLinkActive(linkHref, route, scanStep) {
  if (route === linkHref) return true;
  if (linkHref === "#myorders" && route === "#track") return true;
  if (linkHref.startsWith("#scan") && route === "#scan") {
    if (linkHref.includes("step=pack")) return scanStep === "pack";
    if (linkHref.includes("step=pickup")) return scanStep === "pickup";
    if (linkHref.includes("step=deliver")) return scanStep === "deliver" || !scanStep;
    return true;
  }
  return false;
}

function HomeReviewsTeaser() {
  const stats = reviewStats();
  return (
    <section className="home-reviews-teaser" aria-label="Customer reviews">
      <p>
        {stats.count
          ? `Patients rate MediHome ${stats.average} / 5 from ${stats.count} reviews.`
          : "Be the first to rate MediHome."}
      </p>
      <div>
        <a href="#reviews">Read reviews</a>
      </div>
    </section>
  );
}

function WebsiteHomePage() {
  const features = useFeatures();
  const user = useLoginSession();
  const isPhone = useIsPhoneLayout();

  const guestStartHref = featureEnabled(features, "lab") || featureEnabled(features, "radiology")
    ? "#labs"
    : featureEnabled(features, "medicine")
      ? "#medicine-search"
      : featureEnabled(features, "homecare")
        ? "#homecare"
        : "#home-services";

  const startGuestOrder = () => {
    if (guestStartHref.startsWith("#") && guestStartHref !== "#home-services") {
      goToHash(guestStartHref);
      return;
    }
    document
      .getElementById("home-services")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openMedicineSearch = () => {
    try {
      sessionStorage.setItem("mediHomeMedicineCategory", "Search");
      sessionStorage.removeItem("mediHomeMedicineSearch");
    } catch {
      /* ignore */
    }
    goToHash("#medicine-search");
  };

  return (
    <div className="home-content home-landing">
      <div className="home-shell">
        <div className="home-hero-row">
          <div className="home-hero-main">
            <section className="home-intro">
              <p className="home-kicker">MediHome · Delhi NCR</p>
              <h1>
                Lab Tests, Radiology And Medicines Delivered To Your Doorstep
              </h1>
              <p className="home-lead">
                Affordable care for patients across Delhi NCR, from one trusted
                place.
              </p>
            </section>

            {featureEnabled(features, "medicine") ? (
              <button
                type="button"
                className="home-search-open"
                onClick={openMedicineSearch}
              >
                Search medicines
              </button>
            ) : null}

            <p className="home-whatsapp-line">
              Prefer to talk?{" "}
              <a
                href={HOME_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => openWhatsAppUrl(HOME_WHATSAPP_URL, event)}
              >
                Order on WhatsApp
              </a>
            </p>
          </div>

          <aside className="home-account-card" aria-label="Account">
            {user ? (
              <>
                <a className="home-account-btn is-primary" href="#profile">
                  Profile
                </a>
                <a className="home-account-btn" href="#register">
                  Edit Account
                </a>
              </>
            ) : (
              <>
                <a className="home-account-btn is-primary" href="#login">
                  Login / Register
                </a>
                <button
                  type="button"
                  className="home-account-btn is-guest"
                  onClick={startGuestOrder}
                >
                  Order As Guest
                </button>
              </>
            )}
          </aside>
        </div>

        <HomePrescriptionUpload />

        <div className="home-services-catalog" id="home-services">
          <HomeServiceCatalog className={isPhone ? "is-mobile-web" : "is-desktop-web"} />
        </div>

        <HomeReviewsTeaser />
      </div>
    </div>
  );
}

function HomePage() {
  if (isAppShell()) {
    return <CustomerHome />;
  }
  return <WebsiteHomePage />;
}

function PausedService({ route, features }) {
  const name = pausedServiceTitle(route, features);
  return (
    <div className="service-page">
      <ComingSoon name={name} />
    </div>
  );
}

function App() {
  const [hash, setHash] = useState(window.location.hash);
  const [needHelpOpen, setNeedHelpOpen] = useState(false);
  const [sessionTick, setSessionTick] = useState(0);
  const user = useLoginSession();

  useEffect(() => {
    const bump = () => setSessionTick((n) => n + 1);
    window.addEventListener("mediHomeSession", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("mediHomeSession", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash);
    };

    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
    };
  }, []);

  const {
    route,
    q: medicineQuery,
    id: trackId,
    step: scanStep,
    lab: selectedLab,
  } = parseAppHash(hash);
  const isAuthRoute = AUTH_ROUTES.has(route);
  const loggedIn = hasAccountSession(user);
  const menuNavLinks = NAV_LINKS.filter((link) => {
    if (isAuthRoute && AUTH_HIDDEN_NAV.has(link.href)) return false;
    if (link.href === "#reports" && !loggedIn) return false;
    return true;
  });
  const isOps = route === "#admin" || route === "#partner-desk";
  const features = useFeatures();
  const appRole = readAppRole();
  const customerShell =
    isAppShell() && !isOps && appRole !== "staff" && appRole !== "partner";

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.toggle("is-customer-app", customerShell);
    root.classList.toggle("is-installed-app", isInstalledApp());
    body.classList.toggle("is-customer-app", customerShell);
    return () => {
      root.classList.remove("is-customer-app");
      root.classList.remove("is-installed-app");
      body.classList.remove("is-customer-app");
    };
  }, [customerShell]);

  useEffect(() => {
    if (!customerShell) return undefined;
    window.scrollTo(0, 0);
    return undefined;
  }, [customerShell, route]);

  useEffect(() => {
    if (route === "#social") goToHash("#contact");
  }, [route]);

  useEffect(() => {
    if (!isInstalledApp()) return;
    const next = launchHashForRole(readAppRole(), route);
    if (next) goToHash(next);
  }, [route]);

  useEffect(() => {
    if (isOps || appRole === "staff" || appRole === "partner") return undefined;
    if (AUTH_ROUTES.has(route)) return undefined;
    if (needsCustomerWelcome(user) && route !== "#home") {
      goToHash("#home");
    }
    return undefined;
  }, [appRole, isOps, route, sessionTick, user]);

  useEffect(() => {
    if (route !== "#reports") return undefined;
    if (hasAccountSession(user)) return undefined;
    rememberReturnHash("#reports");
    goToHash("#login");
    return undefined;
  }, [route, user]);

  const renderPage = () => {
    if (shouldShowAppPicker(route)) {
      return <PortalsChooser />;
    }
    if (!routeEnabled(route, features)) {
      return <PausedService route={route} features={features} />;
    }
    switch (route) {
      case "#medicine-search":
        return <Medicines initialSearch={medicineQuery} />;
      case "#labs":
        return selectedLab || peekRxLabCheckout()?.tests?.length ? (
          <LabTests />
        ) : (
          <LabsHub />
        );
      case "#homecare":
        return <HomeCare />;
      case "#vaccination":
        return <Vaccination />;
      case "#doctor":
        return <DoctorAppointment />;
      case "#psychologist":
        return <Psychologist />;
      case "#stepdown":
        return <StepDownCare />;
      case "#ambulance":
        return <Ambulance />;
      case "#reports":
        return <Reports />;
      case "#prescription":
        return <PrescriptionReview />;
      case "#checkout":
        return <CartCheckout />;
      case "#profile":
        return <Profile />;
      case "#myorders":
        return <MyOrders />;
      case "#scan":
        return <ScanPage scanId={trackId} scanStep={scanStep} />;
      case "#track":
        return <TrackPage trackId={trackId} />;
      case "#education":
        return <HealthEducation />;
      case "#about":
        return <About />;
      case "#contact":
      case "#social":
        return <Contact />;
      case "#feedback":
        return <Feedback />;
      case "#reviews":
        return <Reviews />;
      case "#admin":
        return <Admin />;
      case "#partner":
        return <PartnerPortal />;
      case "#partner-desk":
        return <Partner />;
      case "#customer":
        return <CustomerPortal />;
      case "#staff":
        return <StaffPortal />;
      case "#portals":
      case "#apps":
        return <PortalsChooser />;
      case "#login":
        return <AuthPage mode="login" />;
      case "#register":
        return <AuthPage mode="register" />;
      case "#forgot":
        return <AuthPage mode="forgot" />;
      case "#home":
      default:
        return <HomePage />;
    }
  };

  if (isOps) {
    return (
      <div className="app app-ops">
        <Seo route={route} />
        <SiteTicker />
        <header className="ops-bar">
          <a className="ops-brand" href="#admin" aria-label="MediHome operations">
            <LogoMark size="sm" />
            <span>Operations</span>
          </a>
          <nav className="ops-nav" aria-label="Operations">
            {OPS_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={hashLinkActive(link.href, route, scanStep) ? "active" : undefined}
              >
                {link.label}
              </a>
            ))}
            <a href="#home">Website</a>
          </nav>
        </header>
        <main>
          <ErrorBoundary key={route}>
            <Suspense fallback={<PageFallback />}>{renderPage()}</Suspense>
          </ErrorBoundary>
        </main>
        <SiteFooter />
        <SiteFloatingHelp needHelpOpen={needHelpOpen} setNeedHelpOpen={setNeedHelpOpen} />
      </div>
    );
  }

  const showBackHome =
    route !== "#home" &&
    route !== "#portals" &&
    route !== "#apps" &&
    route !== "#customer" &&
    route !== "#partner" &&
    route !== "#staff";

  const welcomeGate =
    !isOps &&
    appRole !== "staff" &&
    appRole !== "partner" &&
    !isAuthRoute &&
    needsCustomerWelcome(user) &&
    sessionTick >= 0;

  if (customerShell) {
    return (
      <div className={`app app-customer${welcomeGate ? " is-welcome-gate" : ""}`}>
        <Seo route={route} />
        <SiteTicker />
        <div className="app-frame">
          {welcomeGate ? null : <AppHeader route={route} />}
          <main id="app-scroll">
            {welcomeGate || isAuthRoute ? null : <WebinarNotice />}
            {welcomeGate || isAuthRoute ? null : <SlotOfferBanner />}
            <ErrorBoundary key={welcomeGate ? "welcome" : route}>
              <Suspense fallback={<PageFallback />}>
                {welcomeGate ? (
                  <CustomerWelcome
                    onDone={() => setSessionTick((n) => n + 1)}
                  />
                ) : (
                  renderPage()
                )}
              </Suspense>
            </ErrorBoundary>
          </main>
          {welcomeGate || isAuthRoute ? null : <AppBottomNav route={route} />}
        </div>
        <SiteFooter />
        <SiteFloatingHelp needHelpOpen={needHelpOpen} setNeedHelpOpen={setNeedHelpOpen} />
      </div>
    );
  }

  return (
    <div className="app">
      <Seo route={route} />
      <SiteTicker />

      <header className="site-topbar">
        <div className="site-topbar-inner">
          <div className="site-topbar-slot is-start" aria-hidden="true" />
          <MediHomeLogoLink
            className="site-topbar-brand"
            size="lg"
            aria-label="MediHome welcome"
          />
          <HeaderCart className="site-topbar-header-cart" />
        </div>
      </header>

      <aside className="sidebar site-topbar-desktop-only" aria-label="Site navigation">
        <div className="sidebar-links">
          {welcomeGate || isAuthRoute ? null : (
            <nav className="sidebar-nav" aria-label="Main">
              {menuNavLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={
                    hashLinkActive(link.href, route, scanStep) ? "active" : undefined
                  }
                >
                  {link.label}
                </a>
              ))}
            </nav>
          )}
          <nav className="sidebar-account" aria-label="Account">
            {user ? (
              <>
                {ACCOUNT_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className={
                      hashLinkActive(link.href, route, scanStep) ? "active" : undefined
                    }
                  >
                    {link.label}
                  </a>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    logoutSession();
                    goToHash("#home");
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <a
                href="#login"
                className={
                  route === "#login" || route === "#register" || route === "#forgot"
                    ? "active"
                    : undefined
                }
              >
                Login / Register
              </a>
            )}
          </nav>
          {welcomeGate || isAuthRoute ? null : (
            <nav className="sidebar-bottom" aria-label="More">
              {BOTTOM_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={route === link.href ? "active" : undefined}
                >
                  {link.label}
                </a>
              ))}
              <button
                type="button"
                className={needHelpOpen ? "active" : undefined}
                onClick={() => setNeedHelpOpen(true)}
              >
                Need help
              </button>
            </nav>
          )}
        </div>
      </aside>

      <main>
        {welcomeGate || isAuthRoute ? null : <BackToHome show={showBackHome} />}
        {welcomeGate || isAuthRoute ? null : <WebinarNotice />}
        {welcomeGate || isAuthRoute ? null : <SlotOfferBanner />}
        <ErrorBoundary key={welcomeGate ? "welcome" : route}>
          <Suspense fallback={<PageFallback />}>
            {welcomeGate ? (
              <CustomerWelcome onDone={() => setSessionTick((n) => n + 1)} />
            ) : (
              renderPage()
            )}
          </Suspense>
        </ErrorBoundary>
      </main>

      <SiteFooter />
      <SiteFloatingHelp needHelpOpen={needHelpOpen} setNeedHelpOpen={setNeedHelpOpen} />
    </div>
  );
}

export default App;
