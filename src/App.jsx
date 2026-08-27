import { useState, useEffect } from "react";
import "./App.css";
import Medicines from "./Medicines";
import LabTests from "./LabTests";
import Profile from "./Profile";
import MyOrders from "./MyOrders";
import HomeCare from "./HomeCare";
import StepDownCare from "./StepDownCare";
import Ambulance from "./Ambulance";
import Reports from "./Reports";
import TrackPage from "./LiveTracking";
import HealthEducation from "./HealthEducation";
import About from "./About";
import Contact from "./Contact";
import Feedback from "./Feedback";
import Reviews from "./Reviews";
import Admin from "./Admin";
import Partner from "./Partner";
import Seo from "./Seo";
import SocialLinks from "./SocialLinks";
import Social from "./Social";
import MedicineSearchTools from "./MedicineSearchTools";
import { reviewStats } from "./reviewStore";
import { useFeatures } from "./featureFlags";
import { routeEnabled } from "./salesReport";

const NAV_LINKS = [
  { href: "#home", label: "Home", icon: "🏠" },
  { href: "#medicine-search", label: "Search Medicine", icon: "🔍" },
  { href: "#labs", label: "Lab Tests", icon: "🧪" },
  { href: "#homecare", label: "Home Care", icon: "🩺" },
  { href: "#stepdown", label: "Step-Down Care", icon: "🏥" },
  { href: "#ambulance", label: "Ambulance", icon: "🚑" },
  { href: "#reports", label: "Reports", icon: "📄" },
  { href: "#education", label: "Health Education", icon: "📚" },
  { href: "#myorders", label: "My Orders", icon: "📦" },
  { href: "#profile", label: "Profile", icon: "👤" },
];

const BOTTOM_LINKS = [
  { href: "#reviews", label: "Reviews", icon: "⭐" },
  { href: "#feedback", label: "Feedback", icon: "📝" },
  { href: "#about", label: "About Us", icon: "ℹ️" },
  { href: "#contact", label: "Contact Us", icon: "📞" },
  { href: "#social", label: "Social Media", icon: "📣" },
];

const OPS_LINKS = [
  { href: "#admin", label: "Staff orders" },
  { href: "#partner", label: "Partner desk" },
];

const HOME_WHATSAPP = "919654222988";
const HOME_WHATSAPP_URL = `https://wa.me/${HOME_WHATSAPP}?text=${encodeURIComponent(
  "Hi MediHome, I would like to order medicines."
)}`;
const CARE_WHATSAPP_URL = `https://wa.me/${HOME_WHATSAPP}?text=${encodeURIComponent(
  "Hi MediHome, I need help from customer care."
)}`;
const CARE_PHONE_DISPLAY = "+91 96542 22988";
const CARE_PHONE_TEL = "+919654222988";
const CARE_EMAIL = "care@medihome.in";
const PROFILE_KEY = "mediHomeUser";

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

function parseAppHash(rawHash) {
  let value = rawHash || "";
  if (value.startsWith("#")) {
    value = value.slice(1);
  }
  try {
    value = decodeURIComponent(value);
  } catch {
    value = value.replace(/%3F/gi, "?").replace(/%3D/gi, "=");
  }
  const queryIndex = value.indexOf("?");
  const path = (queryIndex === -1 ? value : value.slice(0, queryIndex)).trim();
  const query = queryIndex === -1 ? "" : value.slice(queryIndex + 1);
  let q = "";
  let id = "";
  try {
    const params = new URLSearchParams(query);
    q = (params.get("q") || "").trim();
    id = (params.get("id") || "").trim();
  } catch {
    q = "";
    id = "";
  }
  const route = !path || path === "home" ? "#home" : `#${path}`;
  return { route, q, id };
}

function goToHash(nextHash) {
  const hash = nextHash.startsWith("#") ? nextHash : `#${nextHash}`;
  const url = `${window.location.pathname}${window.location.search}${hash}`;
  window.history.pushState(null, "", url);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

function readStoredUser() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") {
      return { name: "", mobile: "", address: "", pinCode: "" };
    }
    return {
      name: String(parsed.name || parsed.fullName || "").trim(),
      mobile: String(parsed.mobile || parsed.mobileNumber || "").trim(),
      address: String(parsed.address || parsed.deliveryAddress || "").trim(),
      pinCode: String(parsed.pinCode || parsed.pincode || "").trim(),
    };
  } catch {
    return { name: "", mobile: "", address: "", pinCode: "" };
  }
}

function HomeAuthCard() {
  const [tab, setTab] = useState("login");
  const [login, setLogin] = useState({ mobile: "", pinCode: "" });
  const [register, setRegister] = useState({
    name: "",
    mobile: "",
    address: "",
    pinCode: "",
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: "", text: "" });

  const digitsOnly = (value) => value.replace(/\D/g, "");

  const handleLoginChange = (event) => {
    const { name, value } = event.target;
    setLogin((prev) => ({ ...prev, [name]: digitsOnly(value) }));
    setStatus({ type: "", text: "" });
  };

  const handleRegisterChange = (event) => {
    const { name, value } = event.target;
    const nextValue =
      name === "mobile" || name === "pinCode" ? digitsOnly(value) : value;
    setRegister((prev) => ({ ...prev, [name]: nextValue }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setStatus({ type: "", text: "" });
  };

  const switchTab = (nextTab) => {
    setTab(nextTab);
    setErrors({});
    setStatus({ type: "", text: "" });
  };

  const handleLogin = (event) => {
    event.preventDefault();
    const saved = readStoredUser();
    if (!/^[6-9]\d{9}$/.test(login.mobile)) {
      setStatus({
        type: "error",
        text: "Enter a valid 10-digit mobile number.",
      });
      return;
    }
    if (!/^\d{6}$/.test(login.pinCode)) {
      setStatus({ type: "error", text: "Enter your 6-digit PIN." });
      return;
    }
    if (!saved.mobile) {
      setStatus({
        type: "error",
        text: "No account found. Please register first.",
      });
      return;
    }
    if (saved.mobile !== login.mobile || saved.pinCode !== login.pinCode) {
      setStatus({
        type: "error",
        text: "Mobile or PIN does not match your saved profile.",
      });
      return;
    }
    setStatus({
      type: "success",
      text: saved.name
        ? `Welcome back, ${saved.name}.`
        : "Logged in successfully.",
    });
  };

  const handleRegister = (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!register.name.trim()) nextErrors.name = "Full name is required.";
    if (!/^[6-9]\d{9}$/.test(register.mobile)) {
      nextErrors.mobile = "Enter a valid 10-digit mobile number.";
    }
    if (!register.address.trim()) nextErrors.address = "Address is required.";
    if (!/^\d{6}$/.test(register.pinCode)) {
      nextErrors.pinCode = "Enter a valid 6-digit PIN Code.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const profile = {
      name: register.name.trim(),
      mobile: register.mobile.trim(),
      address: register.address.trim(),
      pinCode: register.pinCode.trim(),
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    setStatus({
      type: "success",
      text: "Account saved. Profile can now use these details.",
    });
  };

  return (
    <aside className="home-auth-card" aria-label="Login or register">
      <div className="home-auth-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "login"}
          className={tab === "login" ? "active" : undefined}
          onClick={() => switchTab("login")}
        >
          Login
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "register"}
          className={tab === "register" ? "active" : undefined}
          onClick={() => switchTab("register")}
        >
          Register
        </button>
      </div>

      {tab === "login" ? (
        <form className="home-auth-form" onSubmit={handleLogin}>
          <label htmlFor="home-login-mobile">Mobile number</label>
          <input
            id="home-login-mobile"
            name="mobile"
            type="tel"
            inputMode="numeric"
            maxLength="10"
            placeholder="10-digit mobile"
            value={login.mobile}
            onChange={handleLoginChange}
          />
          <label htmlFor="home-login-pin">PIN</label>
          <input
            id="home-login-pin"
            name="pinCode"
            type="password"
            inputMode="numeric"
            maxLength="6"
            placeholder="6-digit PIN"
            value={login.pinCode}
            onChange={handleLoginChange}
          />
          <button type="submit">Login</button>
        </form>
      ) : (
        <form className="home-auth-form" onSubmit={handleRegister}>
          <label htmlFor="home-register-name">Full name</label>
          <input
            id="home-register-name"
            name="name"
            placeholder="Your full name"
            value={register.name}
            onChange={handleRegisterChange}
          />
          {errors.name && <small className="home-auth-error">{errors.name}</small>}
          <label htmlFor="home-register-mobile">Mobile number</label>
          <input
            id="home-register-mobile"
            name="mobile"
            type="tel"
            inputMode="numeric"
            maxLength="10"
            placeholder="10-digit mobile"
            value={register.mobile}
            onChange={handleRegisterChange}
          />
          {errors.mobile && (
            <small className="home-auth-error">{errors.mobile}</small>
          )}
          <label htmlFor="home-register-address">Address</label>
          <textarea
            id="home-register-address"
            name="address"
            rows="2"
            placeholder="Delivery address"
            value={register.address}
            onChange={handleRegisterChange}
          />
          {errors.address && (
            <small className="home-auth-error">{errors.address}</small>
          )}
          <label htmlFor="home-register-pin">PIN code</label>
          <input
            id="home-register-pin"
            name="pinCode"
            inputMode="numeric"
            maxLength="6"
            placeholder="6-digit PIN"
            value={register.pinCode}
            onChange={handleRegisterChange}
          />
          {errors.pinCode && (
            <small className="home-auth-error">{errors.pinCode}</small>
          )}
          <button type="submit">Create account</button>
        </form>
      )}

      {status.text && (
        <p className={`home-auth-status ${status.type}`}>{status.text}</p>
      )}
    </aside>
  );
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

function CustomerCarePanel({ onClose }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const openWhatsApp = (event) => {
    openWhatsAppUrl(CARE_WHATSAPP_URL, event);
  };

  return (
    <div
      className="care-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="care-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="care-panel-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="care-panel-head">
          <div>
            <p className="care-panel-kicker">MediHome</p>
            <h2 id="care-panel-title">Customer Care</h2>
          </div>
          <button
            type="button"
            className="care-panel-close"
            onClick={onClose}
            aria-label="Close customer care"
          >
            ×
          </button>
        </div>
        <p className="care-panel-lead">
          Help with orders, lab bookings, Home Care, step-down centres, and
          ambulance requests.
        </p>
        <dl className="care-panel-details">
          <div>
            <dt>Phone</dt>
            <dd>
              <a href={`tel:${CARE_PHONE_TEL}`}>{CARE_PHONE_DISPLAY}</a>
            </dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>
              <a href={`mailto:${CARE_EMAIL}`}>{CARE_EMAIL}</a>
            </dd>
          </div>
          <div>
            <dt>Hours</dt>
            <dd>8:00 AM – 10:00 PM IST, all days</dd>
          </div>
        </dl>
        <a
          className="care-panel-whatsapp"
          href={CARE_WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={openWhatsApp}
        >
          Chat on WhatsApp
        </a>
        <div className="care-panel-extra">
          <a href="#feedback" onClick={onClose}>
            Share feedback
          </a>
          <a href="#reviews" onClick={onClose}>
            Read reviews
          </a>
        </div>
      </div>
    </div>
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
        <a href="#feedback">Share feedback</a>
      </div>
    </section>
  );
}

function HomePage() {
  const features = useFeatures();
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

          <HomeAuthCard />
        </div>

        <section className="home-services" aria-label="Services">
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

function PausedService() {
  return (
    <div className="service-page">
      <section className="service-hero">
        <span className="service-kicker">Unavailable</span>
        <h1>This service is paused</h1>
        <p>
          MediHome has turned this booking off for now. Please choose another
          service or WhatsApp customer care.
        </p>
        <p>
          <a href="#home">Back to home</a>
        </p>
      </section>
    </div>
  );
}

function App() {
  const [hash, setHash] = useState(window.location.hash);
  const [careOpen, setCareOpen] = useState(false);

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

  const { route, q: medicineQuery, id: trackId } = parseAppHash(hash);
  const isOps = route === "#admin" || route === "#partner";
  const features = useFeatures();

  const renderPage = () => {
    if (!routeEnabled(route, features)) return <PausedService />;
    switch (route) {
      case "#medicine-search":
        return <Medicines initialSearch={medicineQuery} />;
      case "#labs":
        return <LabTests />;
      case "#homecare":
        return <HomeCare />;
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
                className={route === link.href ? "active" : undefined}
              >
                {link.label}
              </a>
            ))}
            <a href="#home">Website</a>
          </nav>
        </header>
        <main>{renderPage()}</main>
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
          {NAV_LINKS.filter((link) => routeEnabled(link.href, features)).map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={
                route === link.href || (link.href === "#myorders" && route === "#track")
                  ? "active"
                  : undefined
              }
            >
              <span className="nav-icon" aria-hidden="true">
                {link.icon}
              </span>
              <span className="nav-label">{link.label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-bottom">
          {BOTTOM_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={route === link.href ? "active" : undefined}
            >
              <span className="nav-icon" aria-hidden="true">
                {link.icon}
              </span>
              <span className="nav-label">{link.label}</span>
            </a>
          ))}
          <button
            type="button"
            className={careOpen ? "active" : undefined}
            aria-haspopup="dialog"
            aria-expanded={careOpen}
            onClick={() => setCareOpen(true)}
          >
            <span className="nav-icon" aria-hidden="true">
              💬
            </span>
            <span className="nav-label">Customer Care</span>
          </button>
        </div>
        </div>
      </aside>

      <main>
        {renderPage()}
      </main>

      <footer className="app-footer">
        <LogoMark />
        <p>© 2026 MediHome. All rights reserved.</p>
        <SocialLinks className="footer-social" />
      </footer>

      {careOpen ? (
        <CustomerCarePanel onClose={() => setCareOpen(false)} />
      ) : null}
    </div>
  );
}

export default App;
