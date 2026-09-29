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
import { pausedServiceTitle, routeEnabled } from "./salesReport";
import {
  goToHash,
  isHomeSectionKey,
  MEDICAL_RECORD_HOME_HASH,
  parseAppHash,
} from "./hashRoute";
import { peekRxLabCheckout } from "./medicineCartStore";
import PortalsChooser, { CustomerPortal, PartnerPortal, StaffPortal } from "./RolePortals";
import { isPartnerDeskRoute, partnerDeskKindFromRoute } from "./partnerApp";
import CustomerHome from "./CustomerHome";
import LabsHub from "./LabsHub";
import AppBottomNav from "./AppBottomNav";
import BackToHome from "./BackToHome";
import WebinarNotice from "./WebinarNotice";
import SlotOfferBanner from "./SlotOfferBanner";
import RefundBanner from "./RefundBanner";
import StepdownDecisionBanner from "./StepdownDecisionBanner";
import ReportReadyBanner from "./ReportReadyBanner";
import CustomerWelcome, { needsCustomerWelcome } from "./CustomerWelcome";
import {
  isInstalledApp,
  launchHashForRole,
  readAppRole,
  shouldShowAppPicker,
} from "./appRuntime";
import LogoMark from "./LogoMark";
import MediHomeLogoLink from "./MediHomeLogoLink";
import AppHeader from "./AppHeader";

const AUTH_ROUTES = new Set(["#login", "#register", "#forgot"]);

const OPS_LINKS = [
  { href: "#admin", label: "Admin Panel" },
  { href: "#partner-desk", label: "Partner Desk" },
];

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

function HomePage({ sectionKey = "" } = {}) {
  return <CustomerHome sectionKey={sectionKey} />;
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
  } = parseAppHash(hash);
  const isAuthRoute = AUTH_ROUTES.has(route);
  const isOps = route === "#admin" || isPartnerDeskRoute(route);
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
    if (isOps || appRole === "staff" || appRole === "partner") return undefined;
    if (AUTH_ROUTES.has(route)) return undefined;
    if (needsCustomerWelcome(user) && route !== "#home" && route !== "#checkout") {
      goToHash("#home");
    }
    return undefined;
  }, [appRole, isOps, route, sessionTick, user]);

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
        {barePartnerDesk ? null : <SiteFooter />}
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
          <div className="site-topbar-slot is-start" aria-hidden="true" />
          <MediHomeLogoLink
            className="site-topbar-brand"
            size="lg"
            aria-label="MediHome welcome"
          />
          <HeaderCart className="site-topbar-header-cart" />
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

      <SiteFooter />
      <SiteFloatingHelp needHelpOpen={needHelpOpen} setNeedHelpOpen={setNeedHelpOpen} />
    </div>
  );
}

export default App;
