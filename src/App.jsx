import { useState, useEffect } from "react";
import "./App.css";
import Medicines from "./Medicines";
import LabTests from "./LabTests";
import Profile from "./Profile";
import MyOrders from "./MyOrders";
import HomeCare from "./HomeCare";
import Ambulance from "./Ambulance";
import Reports from "./Reports";

const NAV_LINKS = [
  { href: "#home", label: "Home", icon: "🏠" },
  { href: "#medicine-search", label: "Search Medicine", icon: "🔍" },
  { href: "#labs", label: "Lab Tests", icon: "🧪" },
  { href: "#homecare", label: "Home Care", icon: "🩺" },
  { href: "#ambulance", label: "Ambulance", icon: "🚑" },
  { href: "#reports", label: "Reports", icon: "📄" },
  { href: "#education", label: "Health Education", icon: "📚" },
  { href: "#myorders", label: "My Orders", icon: "📦" },
  { href: "#profile", label: "Profile", icon: "👤" },
];

const BOTTOM_LINKS = [
  { href: "#about", label: "About Us", icon: "ℹ️" },
  { href: "#contact", label: "Contact Us", icon: "📞" },
];

function PlaceholderPage({ eyebrow, title, body }) {
  return (
    <section className="placeholder-page">
      <span className="placeholder-label">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{body}</p>
      <a className="placeholder-home-link" href="#home">
        Back to Home
      </a>
    </section>
  );
}

const HOME_WHATSAPP = "919654222988";
const HOME_WHATSAPP_URL = `https://api.whatsapp.com/send?phone=${HOME_WHATSAPP}&text=${encodeURIComponent(
  "Hi MediHome, I would like to order medicines."
)}`;
const CARE_WHATSAPP_URL = `https://api.whatsapp.com/send?phone=${HOME_WHATSAPP}&text=${encodeURIComponent(
  "Hi MediHome, I need help from customer care."
)}`;
const CARE_PHONE_DISPLAY = "+91 96542 22988";
const CARE_PHONE_TEL = "+919654222988";
const CARE_EMAIL = "care@medihome.in";
const PROFILE_KEY = "mediHomeUser";

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
  try {
    q = (new URLSearchParams(query).get("q") || "").trim();
  } catch {
    q = "";
  }
  const route = !path || path === "home" ? "#home" : `#${path}`;
  return { route, q };
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
    event.preventDefault();
    window.open(CARE_WHATSAPP_URL, "_blank", "noopener,noreferrer");
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
          Help with orders, lab bookings, home care, and ambulance requests.
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
      </div>
    </div>
  );
}

function HomePage() {
  const [query, setQuery] = useState("");

  const goToMedicines = (event) => {
    event.preventDefault();
    const value = query.trim();
    try {
      if (value) {
        sessionStorage.setItem("mediHomeMedicineSearch", value);
      } else {
        sessionStorage.removeItem("mediHomeMedicineSearch");
      }
    } catch {
      /* ignore private-mode storage errors */
    }
    goToHash(
      value
        ? `#medicine-search?q=${encodeURIComponent(value)}`
        : "#medicine-search"
    );
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

            <form className="home-search-form" onSubmit={goToMedicines}>
              <input
                type="search"
                placeholder="Search medicines by name or salt"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search medicines"
              />
              <button type="submit">Search</button>
            </form>

            <p className="home-whatsapp-line">
              Prefer to talk?{" "}
              <a
                href={HOME_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => {
                  event.preventDefault();
                  window.open(HOME_WHATSAPP_URL, "_blank", "noopener,noreferrer");
                }}
              >
                Order on WhatsApp
              </a>
            </p>
          </div>

          <HomeAuthCard />
        </div>

        <section className="home-services" aria-label="Services">
          <a className="home-service-card" href="#medicine-search">
            <h2>Medicines</h2>
            <p>Doorstep delivery, cash on delivery.</p>
            <span>View medicines</span>
          </a>
          <a className="home-service-card" href="#labs">
            <h2>Lab tests</h2>
            <p>Home sample collection.</p>
            <span>Book a test</span>
          </a>
          <a className="home-service-card" href="#labs">
            <h2>Radiology</h2>
            <p>Scans at partner centres.</p>
            <span>Book a scan</span>
          </a>
          <a className="home-service-card" href="#homecare">
            <h2>Home care</h2>
            <p>Nurse, caregiver, physiotherapy.</p>
            <span>Book a visit</span>
          </a>
          <a className="home-service-card" href="#ambulance">
            <h2>Ambulance</h2>
            <p>Emergency or planned pickup.</p>
            <span>Request now</span>
          </a>
          <a className="home-service-card" href="#reports">
            <h2>Reports</h2>
            <p>Save lab PDFs on this device.</p>
            <span>Save a report</span>
          </a>
        </section>

        <p className="home-trust">
          Cash on delivery · Home collection · Delhi NCR
        </p>
      </div>
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

  const { route, q: medicineQuery } = parseAppHash(hash);

  const renderPage = () => {
    switch (route) {
      case "#medicine-search":
        return <Medicines initialSearch={medicineQuery} />;
      case "#labs":
        return <LabTests />;
      case "#homecare":
        return <HomeCare />;
      case "#ambulance":
        return <Ambulance />;
      case "#reports":
        return <Reports />;
      case "#profile":
        return <Profile />;
      case "#myorders":
        return <MyOrders />;
      case "#education":
        return (
          <PlaceholderPage
            eyebrow="Coming soon"
            title="Health Education"
            body="Guides and articles on chronic care will appear here. Meanwhile, you can order medicines or book diagnostics from the sidebar."
          />
        );
      case "#about":
        return (
          <PlaceholderPage
            eyebrow="MediHome"
            title="About Us"
            body="MediHome helps patients across Delhi NCR with affordable medicines, laboratory tests, and radiology bookings at their doorstep. Our vision is to be a trusted chronic care platform. Our mission is reliable delivery, better medicine compliance, and trusted diagnostics."
          />
        );
      case "#contact":
        return (
          <PlaceholderPage
            eyebrow="Support"
            title="Contact Us"
            body="Need help with an order or booking? Use Profile to keep your details up to date, and check My Orders for medicine and diagnostics status."
          />
        );
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="app">
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

        <nav className="sidebar-nav" aria-label="Main">
          {NAV_LINKS.map((link) => (
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
      </aside>

      <main>
        {renderPage()}

        <footer>
          <div className="logo">
            <LogoMark />
            <span className="logo-wordmark">MediHome</span>
          </div>
          <p>© 2026 MediHome. All rights reserved.</p>
        </footer>
      </main>

      {careOpen ? (
        <CustomerCarePanel onClose={() => setCareOpen(false)} />
      ) : null}
    </div>
  );
}

export default App;
