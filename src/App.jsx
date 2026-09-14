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
  Psychologist,
  Reports,
  Reviews,
  ScanPage,
  StepDownCare,
  TrackPage,
  Vaccination,
} from "./routePages";
import Seo from "./Seo";
import SocialLinks from "./SocialLinks";
import MedicineSearchTools from "./MedicineSearchTools";
import { reviewStats } from "./reviewStore";
import CareChat from "./CareChat.jsx";
import { CARE_WHATSAPP } from "./careChat.js";
import ComingSoon from "./ComingSoon";
import ErrorBoundary from "./ErrorBoundary";
import AuthPage from "./AuthPage";
import { logoutSession, useLoginSession } from "./authSession";
import { useFeatures } from "./featureFlags";
import { featureEnabled, pausedServiceTitle, routeEnabled } from "./salesReport";
import { goToHash, parseAppHash } from "./hashRoute";
import AppPicker from "./AppPicker";
import CustomerHome from "./CustomerHome";
import AppBottomNav from "./AppBottomNav";
import BackToHome from "./BackToHome";
import WebinarNotice from "./WebinarNotice";
import { needsCustomerWelcome } from "./CustomerWelcome";
import {
  isAppShell,
  isInstalledApp,
  launchHashForRole,
  readAppRole,
  shouldShowAppPicker,
} from "./appRuntime";
import LogoMark from "./LogoMark";
import AppHeader from "./AppHeader";

const NAV_LINKS = [
  { href: "#home", label: "Home" },
  { href: "#medicine-search", label: "Medicines" },
  { href: "#labs", label: "Lab Tests" },
  { href: "#homecare", label: "Home Care" },
  { href: "#vaccination", label: "Vaccination Record" },
  { href: "#psychologist", label: "Psychologist" },
  { href: "#stepdown", label: "Step-Down" },
  { href: "#ambulance", label: "Ambulance" },
  { href: "#reports", label: "Reports" },
  { href: "#education", label: "Education" },
];

const ACCOUNT_LINKS = [
  { href: "#myorders", label: "My Orders" },
  { href: "#scan?step=deliver", label: "Scan Delivery" },
  { href: "#profile", label: "Profile" },
];

const BOTTOM_LINKS = [
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
  { href: "#apps", label: "Apps" },
];

const OPS_LINKS = [
  { href: "#admin", label: "Staff Orders" },
  { href: "#partner", label: "Partner Desk" },
];

const HOME_WHATSAPP_URL = `https://wa.me/${CARE_WHATSAPP}?text=${encodeURIComponent(
  "Hi MediHome, I would like to order medicines."
)}`;

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
  const [query, setQuery] = useState("");

  const applyMedicineQuery = (value) => {
    const next = String(value || "").trim();
    setQuery(next);
    try {
      if (next) sessionStorage.setItem("mediHomeMedicineSearch", next);
      else sessionStorage.removeItem("mediHomeMedicineSearch");
    } catch {
      /* ignore */
    }
    goToHash(
      next
        ? `#medicine-search?q=${encodeURIComponent(next)}`
        : "#medicine-search"
    );
  };

  const goToMedicines = (event) => {
    event.preventDefault();
    applyMedicineQuery(query);
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
              <>
                <form className="home-search-form" onSubmit={goToMedicines}>
                  <input
                    type="search"
                    placeholder="Search by brand, name or salt (e.g. Dolo, Crocin)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Search medicines"
                  />
                  <button type="submit">Search</button>
                </form>
                <MedicineSearchTools onQuery={applyMedicineQuery} />
              </>
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
                  onClick={() => {
                    document
                      .getElementById("home-services")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  Order As Guest
                </button>
              </>
            )}
          </aside>
        </div>

        <section className="home-services" id="home-services" aria-label="Services">
          {featureEnabled(features, "medicine") ? (
            <a className="home-service-card" href="#medicine-search">
              <h2>Medicines</h2>
              <p>Doorstep delivery, cash on delivery.</p>
              <span>View medicines</span>
            </a>
          ) : null}
          {featureEnabled(features, "lab") ? (
            <a className="home-service-card" href="#labs">
              <h2>Lab Tests</h2>
              <p>Home sample collection.</p>
              <span>Book a test</span>
            </a>
          ) : null}
          {featureEnabled(features, "radiology") ? (
            <a className="home-service-card" href="#labs">
              <h2>Radiology</h2>
              <p>Scans at partner centres.</p>
              <span>Book a scan</span>
            </a>
          ) : null}
          {featureEnabled(features, "homecare") ? (
            <a className="home-service-card" href="#homecare">
              <h2>Home Care</h2>
              <p>Nurse, Caregiver or Physiotherapy at Home.</p>
              <span>Book a visit</span>
            </a>
          ) : null}
          {featureEnabled(features, "vaccination") ? (
            <a className="home-service-card" href="#vaccination">
              <h2>Vaccination Record</h2>
              <p>Record, schedule and due-date reminders.</p>
              <span>View record</span>
            </a>
          ) : null}
          {featureEnabled(features, "psychologist") ? (
            <a className="home-service-card" href="#psychologist">
              <h2>Psychologist Consultation</h2>
              <p>Video or home visit sessions.</p>
              <span>Book a session</span>
            </a>
          ) : null}
          {featureEnabled(features, "stepdown") ? (
            <a className="home-service-card" href="#stepdown">
              <h2>Step-Down Care</h2>
              <p>Find a recovery centre near you.</p>
              <span>Find a centre</span>
            </a>
          ) : null}
          {featureEnabled(features, "ambulance") ? (
            <a className="home-service-card" href="#ambulance">
              <h2>Ambulance</h2>
              <p>Emergency or planned pickup.</p>
              <span>Request now</span>
            </a>
          ) : null}
          {featureEnabled(features, "scanDelivery") ? (
            <a className="home-service-card" href="#scan?step=deliver">
              <h2>Scan Delivery</h2>
              <p>Scan the order QR when medicines arrive.</p>
              <span>Open scanner</span>
            </a>
          ) : null}
          {featureEnabled(features, "reports") ? (
            <a className="home-service-card" href="#reports">
              <h2>Reports</h2>
              <p>Save lab PDFs on this device.</p>
              <span>Save a report</span>
            </a>
          ) : null}
          {featureEnabled(features, "education") ? (
            <a className="home-service-card" href="#education">
              <h2>Health Education</h2>
              <p>Guides, live webinars, and quick quizzes.</p>
              <span>Open education</span>
            </a>
          ) : null}
        </section>

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
  const [careOpen, setCareOpen] = useState(false);
  const [appMenuOpen, setAppMenuOpen] = useState(false);
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
      setAppMenuOpen(false);
    };

    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
    };
  }, []);

  const { route, q: medicineQuery, id: trackId, step: scanStep } = parseAppHash(hash);
  const isOps = route === "#admin" || route === "#partner";
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

  const renderPage = () => {
    if (shouldShowAppPicker(route)) {
      return <AppPicker />;
    }
    if (!routeEnabled(route, features)) {
      return <PausedService route={route} features={features} />;
    }
    switch (route) {
      case "#medicine-search":
        return <Medicines initialSearch={medicineQuery} />;
      case "#labs":
        return <LabTests />;
      case "#homecare":
        return <HomeCare />;
      case "#vaccination":
        return <Vaccination />;
      case "#psychologist":
        return <Psychologist />;
      case "#stepdown":
        return <StepDownCare />;
      case "#ambulance":
        return <Ambulance />;
      case "#reports":
        return <Reports />;
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
        return <Partner />;
      case "#login":
        return <AuthPage mode="login" />;
      case "#register":
        return <AuthPage mode="register" />;
      case "#forgot":
        return <AuthPage mode="forgot" />;
      case "#apps":
        return <AppPicker />;
      case "#home":
      default:
        return <HomePage />;
    }
  };

  if (isOps) {
    return (
      <div className="app app-ops">
        <Seo route={route} />
        <header className="ops-bar">
          <a className="ops-brand" href="#admin" aria-label="MediHome operations">
            <LogoMark />
            <span>MediHome Operations</span>
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
      </div>
    );
  }

  const showBackHome = route !== "#home" && route !== "#apps";

  if (customerShell) {
    const welcomeGate =
      route === "#home" && needsCustomerWelcome(user) && sessionTick >= 0;
    return (
      <div className={`app app-customer${welcomeGate ? " is-welcome-gate" : ""}`}>
        <Seo route={route} />
        <div className="app-frame">
          {welcomeGate ? null : (
            <AppHeader user={user} route={route} />
          )}
          <main id="app-scroll">
            {welcomeGate ? null : <WebinarNotice />}
            <ErrorBoundary key={route}>
              <Suspense fallback={<PageFallback />}>{renderPage()}</Suspense>
            </ErrorBoundary>
          </main>
          {welcomeGate ? null : <AppBottomNav route={route} />}
          {welcomeGate ? null : (
            <CareChat
              open={careOpen}
              onOpen={() => setCareOpen(true)}
              onClose={() => setCareOpen(false)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`app${appMenuOpen ? " is-menu-open" : ""}`}>
      <Seo route={route} />
      <div className="top-ticker">
        <div className="ticker-track">
          <span className="ticker-item">
            YOUR COMPLETE HEALTH PARTNER AT YOUR DOORSTEP
          </span>
          <span className="ticker-item">
            YOUR COMPLETE HEALTH PARTNER AT YOUR DOORSTEP
          </span>
          <span className="ticker-item">
            YOUR COMPLETE HEALTH PARTNER AT YOUR DOORSTEP
          </span>
          <span className="ticker-item">
            YOUR COMPLETE HEALTH PARTNER AT YOUR DOORSTEP
          </span>
        </div>
      </div>

      <header className="site-topbar">
        <div className="site-topbar-inner">
          <div className="site-menu-wrap">
            <button
              type="button"
              className="site-menu-btn"
              aria-expanded={appMenuOpen}
              aria-haspopup="menu"
              onClick={() => setAppMenuOpen((open) => !open)}
            >
              Menu
            </button>
            {appMenuOpen ? (
              <div className="site-menu-dropdown" role="menu" aria-label="Site menu">
                <nav className="site-menu-nav" aria-label="Main">
                  {NAV_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      role="menuitem"
                      className={
                        hashLinkActive(link.href, route, scanStep) ? "active" : undefined
                      }
                      onClick={() => setAppMenuOpen(false)}
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>
                <nav className="site-menu-nav" aria-label="Account">
                  {user ? (
                    <>
                      {ACCOUNT_LINKS.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                          role="menuitem"
                          className={
                            hashLinkActive(link.href, route, scanStep) ? "active" : undefined
                          }
                          onClick={() => setAppMenuOpen(false)}
                        >
                          {link.label}
                        </a>
                      ))}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          logoutSession();
                          setAppMenuOpen(false);
                          goToHash("#home");
                        }}
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <a
                      href="#login"
                      role="menuitem"
                      className={
                        route === "#login" || route === "#register" || route === "#forgot"
                          ? "active"
                          : undefined
                      }
                      onClick={() => setAppMenuOpen(false)}
                    >
                      Login / Register
                    </a>
                  )}
                </nav>
                <nav className="site-menu-nav" aria-label="More">
                  {BOTTOM_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      role="menuitem"
                      className={route === link.href ? "active" : undefined}
                      onClick={() => setAppMenuOpen(false)}
                    >
                      {link.label}
                    </a>
                  ))}
                  <button
                    type="button"
                    role="menuitem"
                    className={careOpen ? "active" : undefined}
                    onClick={() => {
                      setAppMenuOpen(false);
                      setCareOpen(true);
                    }}
                  >
                    Customer Care
                  </button>
                </nav>
              </div>
            ) : null}
          </div>

          <a className="site-topbar-brand" href="#home" aria-label="MediHome home">
            <LogoMark />
            <span>MediHome</span>
          </a>

          <a
            className="site-topbar-account"
            href={user ? "#profile" : "#login"}
          >
            {user ? "Profile" : "Login"}
          </a>
        </div>
        {appMenuOpen ? (
          <button
            type="button"
            className="site-menu-scrim"
            aria-label="Close menu"
            onClick={() => setAppMenuOpen(false)}
          />
        ) : null}
      </header>

      <main>
        <BackToHome show={showBackHome} />
        <WebinarNotice />
        <ErrorBoundary key={route}>
          <Suspense fallback={<PageFallback />}>{renderPage()}</Suspense>
        </ErrorBoundary>
      </main>

      <footer className="app-footer">
        <LogoMark />
        <p>© 2026 MediHome. All rights reserved.</p>
        <SocialLinks className="footer-social" />
      </footer>

      <CareChat
        open={careOpen}
        onOpen={() => setCareOpen(true)}
        onClose={() => setCareOpen(false)}
      />
    </div>
  );
}

export default App;
