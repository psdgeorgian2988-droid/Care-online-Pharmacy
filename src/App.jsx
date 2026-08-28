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
  Social,
  StepDownCare,
  TrackPage,
  Vaccination,
} from "./routePages";
import Seo from "./Seo";
import SocialLinks from "./SocialLinks";
import MedicineSearchTools from "./MedicineSearchTools";
import { reviewStats } from "./reviewStore";
import CareChat from "./CareChat";
import { CARE_WHATSAPP } from "./careChat";
import ComingSoon from "./ComingSoon";
import ErrorBoundary from "./ErrorBoundary";
import AuthPage from "./AuthPage";
import { logoutSession, useLoginSession } from "./authSession";
import { useFeatures } from "./featureFlags";
import { pausedServiceTitle, routeEnabled } from "./salesReport";
import { goToHash, parseAppHash } from "./hashRoute";

const NAV_LINKS = [
  { href: "#home", label: "Home" },
  { href: "#medicine-search", label: "Medicines" },
  { href: "#labs", label: "Lab Tests" },
  { href: "#homecare", label: "Home Care" },
  { href: "#vaccination", label: "Vaccination" },
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
  { href: "#social", label: "Social" },
];

const OPS_LINKS = [
  { href: "#admin", label: "Staff Orders" },
  { href: "#partner", label: "Partner Desk" },
  { href: "#scan?step=pack", label: "Scan Packing" },
  { href: "#scan?step=pickup", label: "Scan Pickup" },
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

function LogoMark() {
  return (
    <span className="logo-mark" aria-hidden="true">
      <svg className="logo-house-svg" viewBox="0 0 40 40">
        <rect width="40" height="40" rx="9" fill="#1a6b7a" />
        <path
          d="M20 8.2 32.4 19.2h-3V31.2H10.6V19.2h-3L20 8.2z"
          fill="#ffffff"
        />
        <path
          d="M19 17.5h2v3.3h3.3v2H21v3.3h-2v-3.3h-3.3v-2H19v-3.3z"
          fill="#1a6b7a"
        />
      </svg>
    </span>
  );
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

function HomePage() {
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

            {features.medicine !== false ? (
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
                <a className="home-account-btn" href="#profile">
                  Add Family Members
                </a>
              </>
            ) : (
              <>
                <a className="home-account-btn" href="#login">
                  Login
                </a>
                <a className="home-account-btn is-primary" href="#register">
                  Register
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
          {features.medicine !== false ? (
            <a className="home-service-card" href="#medicine-search">
              <h2>Medicines</h2>
              <p>Doorstep delivery, cash on delivery.</p>
              <span>View medicines</span>
            </a>
          ) : null}
          {features.lab !== false ? (
            <a className="home-service-card" href="#labs">
              <h2>Lab Tests</h2>
              <p>Home sample collection.</p>
              <span>Book a test</span>
            </a>
          ) : null}
          {features.radiology !== false ? (
            <a className="home-service-card" href="#labs">
              <h2>Radiology</h2>
              <p>Scans at partner centres.</p>
              <span>Book a scan</span>
            </a>
          ) : null}
          {features.homecare !== false ? (
            <a className="home-service-card" href="#homecare">
              <h2>Home Care</h2>
              <p>Nurse, Caregiver or Physiotherapy at Home.</p>
              <span>Book a visit</span>
            </a>
          ) : null}
          {features.vaccination !== false ? (
            <a className="home-service-card" href="#vaccination">
              <h2>Vaccination</h2>
              <p>Government of India schedule, record and due-date reminders.</p>
              <span>View schedule</span>
            </a>
          ) : null}
          {features.psychologist !== false ? (
            <a className="home-service-card" href="#psychologist">
              <h2>Psychologist Consultation</h2>
              <p>Video or home visit sessions.</p>
              <span>Book a session</span>
            </a>
          ) : null}
          {features.stepdown !== false ? (
            <a className="home-service-card" href="#stepdown">
              <h2>Step-Down Care</h2>
              <p>Find a recovery centre near you.</p>
              <span>Find a centre</span>
            </a>
          ) : null}
          {features.ambulance !== false ? (
            <a className="home-service-card" href="#ambulance">
              <h2>Ambulance</h2>
              <p>Emergency or planned pickup.</p>
              <span>Request now</span>
            </a>
          ) : null}
          <a className="home-service-card" href="#scan?step=deliver">
            <h2>Scan Delivery</h2>
            <p>Scan the order QR when medicines or a visit arrive.</p>
            <span>Open scanner</span>
          </a>
          {features.reports !== false ? (
            <a className="home-service-card" href="#reports">
              <h2>Reports</h2>
              <p>Save lab PDFs on this device.</p>
              <span>Save a report</span>
            </a>
          ) : null}
        </section>

        <p className="home-trust">
          Cash on delivery · Home collection · Delhi NCR
        </p>
        <HomeReviewsTeaser />
      </div>
    </div>
  );
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
  const user = useLoginSession();

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

  const { route, q: medicineQuery, id: trackId, step: scanStep } = parseAppHash(hash);
  const isOps = route === "#admin" || route === "#partner";
  const features = useFeatures();

  const renderPage = () => {
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
        return <Contact />;
      case "#social":
        return <Social />;
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

  return (
    <div className="app">
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

      <aside className="sidebar">
        <a className="sidebar-logo" href="#home" aria-label="MediHome home">
          <LogoMark />
          <span className="logo-wordmark">MediHome</span>
        </a>

        <div className="sidebar-links">
          <nav className="sidebar-nav" aria-label="Main">
            {NAV_LINKS.map((link) => (
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
              <>
                <a
                  href="#login"
                  className={route === "#login" ? "active" : undefined}
                >
                  Login
                </a>
                <a
                  href="#register"
                  className={route === "#register" ? "active" : undefined}
                >
                  Register
                </a>
              </>
            )}
          </nav>

          <div className="sidebar-bottom">
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
              className={careOpen ? "active" : undefined}
              aria-haspopup="dialog"
              aria-expanded={careOpen}
              onClick={() => setCareOpen(true)}
            >
              Customer Care
            </button>
          </div>
        </div>
      </aside>

      <main>
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
