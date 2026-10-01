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
} from "./routePages";
import Seo from "./Seo";
import SocialLinks from "./SocialLinks";
import { reviewStats } from "./reviewStore";
import CareChat from "./CareChat.jsx";
import NeedHelp from "./NeedHelp.jsx";
import HeaderCart from "./HeaderCart.jsx";
import ComingSoon from "./ComingSoon";
import ErrorBoundary from "./ErrorBoundary";
import AuthPage from "./AuthPage";
import {
  hasAccountSession,
  rememberReturnHash,
  useLoginSession,
} from "./authSession";
import { useFeatures } from "./featureFlags";
import { featureEnabled, pausedServiceTitle, routeEnabled } from "./salesReport";
import {
  goToHash,
  homeCatalogSectionKeys,
  isAdminBackHash,
  isHomeSectionKey,
  MEDICAL_RECORD_HOME_HASH,
  orderBackActor,
  parseAppHash,
  readOrderBackContext,
} from "./hashRoute";
import { peekRxLabCheckout } from "./medicineCartStore";
import PortalsChooser, { CustomerPortal, PartnerPortal, StaffPortal } from "./RolePortals";
import { isPartnerDeskRoute, partnerDeskKindFromRoute } from "./partnerApp";
import CustomerHome from "./CustomerHome";
import HomeServiceCatalog from "./HomeServiceCatalog";
import LabsHub from "./LabsHub";
import HomePrescriptionUpload from "./HomePrescriptionUpload";
import { useIsPhoneLayout } from "./useLayoutMode";
import AppBottomNav from "./AppBottomNav";
import BackToHome from "./BackToHome";
import WebinarNotice from "./WebinarNotice";
import SlotOfferBanner from "./SlotOfferBanner";
import RefundBanner from "./RefundBanner";
import StepdownDecisionBanner from "./StepdownDecisionBanner";
import ReportReadyBanner from "./ReportReadyBanner";
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
import CustomerLogOut from "./CustomerLogOut.jsx";

const AUTH_ROUTES = new Set(["#login", "#register", "#forgot"]);

const OPS_LINKS = [
  { href: "#partner", label: "Partner" },
  { href: "#admin", label: "Admin Panel" },
];

const TICKER_TEXT = "YOUR COMPLETE HEALTHCARE ECOSYSTEM AT YOUR DOORSTEP";

function SiteOpsLinks({ className = "" }) {
  return (
    <nav className={`site-ops-links${className ? ` ${className}` : ""}`} aria-label="Partner and admin">
      {OPS_LINKS.map((link) => (
        <a key={link.href} href={link.href}>
          {link.label}
        </a>
      ))}
    </nav>
  );
}

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

function SiteFooter({ showOpsLinks = false }) {
  return (
    <footer className="app-footer">
      <p>© 2026 MediHome. All rights reserved.</p>
      {showOpsLinks ? <SiteOpsLinks className="footer-ops" /> : null}
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

function WebsiteHomePage({ sectionKey = "" } = {}) {
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

  if (sectionKey) {
    const keys = homeCatalogSectionKeys(sectionKey);
    return (
      <div className="home-content home-landing">
        <div className="home-shell">
          <div className="home-services-catalog" id="home-services">
            <HomeServiceCatalog
              className={isPhone ? "is-mobile-web" : "is-desktop-web"}
              sectionKeys={keys}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-content home-landing">
      <div className="home-shell">
        <div className="home-hero-row">
          <aside className="home-account-card" aria-label="Account">
            {hasAccountSession(user) ? (
              <>
                <a className="home-account-btn is-primary" href="#profile">
                  Profile
                </a>
                <a className="home-account-btn" href="#register">
                  Edit Account
                </a>
                <CustomerLogOut className="home-account-btn" />
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
          <SiteOpsLinks className="home-ops-entry" />
        </div>

        <HomePrescriptionUpload />

        <div className="home-services-catalog" id="home-services">
          <HomeServiceCatalog
            className={isPhone ? "is-mobile-web" : "is-desktop-web"}
            sectionKeys={sectionKey ? [sectionKey] : undefined}
          />
        </div>

        <HomeReviewsTeaser />
      </div>
    </div>
  );
}

function HomePage({ sectionKey = "" } = {}) {
  if (isAppShell()) {
    return <CustomerHome sectionKey={sectionKey} />;
  }
  return <WebsiteHomePage sectionKey={sectionKey} />;
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
    service: hashService,
    from: hashFrom,
  } = parseAppHash(hash);
  const isAuthRoute = AUTH_ROUTES.has(route);
  const backActor = orderBackActor({ ...readOrderBackContext(), fromHash: hash });
  const isOps =
    route === "#admin" ||
    isPartnerDeskRoute(route) ||
    (route === "#track" && (isAdminBackHash(hash) || backActor === "admin"));
  const opsDeskKind = partnerDeskKindFromRoute(route);
  const barePartnerDesk = opsDeskKind === "stepdown" || opsDeskKind === "lab";
  const features = useFeatures();
  const appRole = readAppRole();
  const customerShell =
    !isOps && appRole !== "staff" && appRole !== "partner";

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
    if (isOps || appRole === "staff" || appRole === "partner" || backActor !== "customer") {
      return undefined;
    }
    if (AUTH_ROUTES.has(route)) return undefined;
    if (needsCustomerWelcome(user) && route !== "#home" && route !== "#checkout") {
      goToHash("#home");
    }
    return undefined;
  }, [appRole, backActor, isOps, route, sessionTick, user]);

  useEffect(() => {
    const recordsHome = route === "#home" && hashService === "reports";
    if (route !== "#reports" && !recordsHome) return undefined;
    if (hasAccountSession(user)) return undefined;
    rememberReturnHash(MEDICAL_RECORD_HOME_HASH);
    goToHash("#login");
    return undefined;
  }, [hashService, route, user]);

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
        return <HomePage sectionKey="vaccination" />;
      case "#doctor":
        return <DoctorAppointment />;
      case "#psychologist":
        return <Psychologist />;
      case "#stepdown":
        return <StepDownCare />;
      case "#ambulance":
        return <Ambulance />;
      case "#reports":
        return <Reports initialTab={hashService} />;
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
        return <TrackPage trackId={trackId} from={hashFrom} />;
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
      case "#pharmacy-desk":
      case "#delivery-desk":
      case "#lab-desk":
      case "#radiology-desk":
      case "#homecare-desk":
      case "#vaccination-desk":
      case "#psychologist-desk":
      case "#doctor-desk":
      case "#ambulance-desk":
      case "#stepdown-desk":
        return <Partner deskKind={partnerDeskKindFromRoute(route)} />;
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
        return (
          <HomePage
            sectionKey={
              route === "#home" && isHomeSectionKey(hashService) ? hashService : ""
            }
          />
        );
    }
  };

  if (isOps) {
    return (
      <div className={`app app-ops${barePartnerDesk ? " app-ops-bare" : ""}`}>
        <Seo route={route} />
        {barePartnerDesk ? null : <SiteTicker />}
        {barePartnerDesk ? null : (
          <header className="ops-bar">
            <a className="ops-brand" href="#admin" aria-label="MediHome operations">
              <LogoMark size="sm" />
              <span>Operations</span>
            </a>
            <nav className="ops-nav" aria-label="Operations">
              {isPartnerDeskRoute(route) ? (
                <span className="ops-nav-stay">{opsDeskKind === "medicine" ? "Pharmacy Partner" : "Partner Desk"}</span>
              ) : (
                <>
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
                </>
              )}
            </nav>
          </header>
        )}
        <main>
          <ErrorBoundary key={route}>
            <Suspense fallback={<PageFallback />}>{renderPage()}</Suspense>
          </ErrorBoundary>
        </main>
        {barePartnerDesk ? null : <SiteFooter showOpsLinks />}
        {barePartnerDesk ? null : (
          <SiteFloatingHelp needHelpOpen={needHelpOpen} setNeedHelpOpen={setNeedHelpOpen} />
        )}
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
    route !== "#checkout" &&
    needsCustomerWelcome(user) &&
    sessionTick >= 0;

  if (customerShell) {
    return (
      <div className={`app app-customer${welcomeGate ? " is-welcome-gate" : ""}`}>
        <Seo route={route} />
        <SiteTicker />
        <div className="app-frame">
          <AppHeader />
          <main id="app-scroll">
            {welcomeGate || isAuthRoute ? null : <WebinarNotice />}
            {welcomeGate || isAuthRoute ? null : <SlotOfferBanner />}
            {welcomeGate || isAuthRoute ? null : <RefundBanner />}
            {welcomeGate || isAuthRoute ? null : <StepdownDecisionBanner />}
            {welcomeGate || isAuthRoute ? null : <ReportReadyBanner />}
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
          {welcomeGate || isAuthRoute ? null : <AppBottomNav route={route} service={hashService} />}
        </div>
        <SiteFooter />
        <SiteFloatingHelp needHelpOpen={needHelpOpen} setNeedHelpOpen={setNeedHelpOpen} />
      </div>
    );
  }

  return (
    <div className={`app is-wide-main${welcomeGate ? " is-welcome-gate" : ""}`}>
      <Seo route={route} />
      <SiteTicker />

      <header className="site-topbar">
        <div className="site-topbar-inner">
          <div className="site-topbar-slot is-start">
            <SiteOpsLinks className="site-topbar-ops" />
          </div>
          <MediHomeLogoLink
            className="site-topbar-brand"
            size="lg"
            aria-label="MediHome welcome"
          />
          <div className="site-topbar-end">
            <CustomerLogOut className="site-logout-btn" />
            <HeaderCart className="site-topbar-header-cart" />
          </div>
        </div>
      </header>

      <main>
        {welcomeGate || isAuthRoute ? null : <BackToHome show={showBackHome} />}
        {welcomeGate || isAuthRoute ? null : <WebinarNotice />}
        {welcomeGate || isAuthRoute ? null : <SlotOfferBanner />}
        {welcomeGate || isAuthRoute ? null : <RefundBanner />}
        {welcomeGate || isAuthRoute ? null : <StepdownDecisionBanner />}
        {welcomeGate || isAuthRoute ? null : <ReportReadyBanner />}
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

      <SiteFooter showOpsLinks />
      <SiteFloatingHelp needHelpOpen={needHelpOpen} setNeedHelpOpen={setNeedHelpOpen} />
    </div>
  );
}

export default App;
