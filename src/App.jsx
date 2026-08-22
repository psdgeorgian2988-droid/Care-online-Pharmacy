import { useState, useEffect } from "react";
import "./App.css";
import Medicines from "./Medicines";
import LabTests from "./LabTests";
import Profile from "./Profile";
import MyOrders from "./MyOrders";

const NAV_LINKS = [
  { href: "#home", label: "Home", icon: "🏠" },
  { href: "#medicine-search", label: "Search Medicine", icon: "🔍" },
  { href: "#labs", label: "Lab Tests", icon: "🧪" },
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

const HOME_WHATSAPP = "919876543210";
const HOME_PHONE = "+911800123456";

function HomePage() {
  const [query, setQuery] = useState("");

  const goToMedicines = (event) => {
    event.preventDefault();
    const value = query.trim();
    if (value) {
      sessionStorage.setItem("mediHomeMedicineSearch", value);
    }
    window.location.hash = "#medicine-search";
  };

  return (
    <div className="home-content home-landing">
      <section className="home-hero">
        <p className="home-hero-kicker">MediHome · Delhi NCR</p>
        <h1>Get medicines delivered fast to your doorstep</h1>
        <p className="home-hero-sub">
          Affordable medicines, diagnostics, and doorstep care — in one trusted
          place.
        </p>

        <div className="home-feature-row">
          <div className="home-feature-box">
            <div>
              <strong>Cash on Delivery</strong>
              <span>On all your orders</span>
            </div>
            <span className="home-feature-icon" aria-hidden="true">
              💵
            </span>
          </div>
          <div className="home-feature-box">
            <div>
              <strong>Express Delivery</strong>
              <span>Free* and fast in your city</span>
            </div>
            <span className="home-feature-icon" aria-hidden="true">
              🚚
            </span>
          </div>
          <div className="home-feature-box">
            <div>
              <strong>Easy Returns</strong>
              <span>No questions asked</span>
            </div>
            <span className="home-feature-icon" aria-hidden="true">
              ↩️
            </span>
          </div>
        </div>
      </section>

      <section className="home-order-card">
        <form className="home-search-form" onSubmit={goToMedicines}>
          <span className="home-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="search"
            placeholder="Search for Medicines..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search for medicines"
          />
          <button type="submit">Search</button>
        </form>

        <div className="home-contact-row">
          <a
            className="home-wa-btn"
            href={`https://wa.me/${HOME_WHATSAPP}?text=${encodeURIComponent(
              "Hi MediHome, I would like to order medicines."
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            <span aria-hidden="true">🟢</span>
            Order with WhatsApp
          </a>
          <a className="home-call-btn" href={`tel:${HOME_PHONE}`}>
            <span aria-hidden="true">📞</span>
            Call us to Order
          </a>
        </div>

        <div className="home-offer-row">
          <a className="home-offer home-offer-blue" href="#medicine-search">
            <small>APP ONLY OFFER</small>
            <strong>Get 25% OFF on orders above ₹1000</strong>
          </a>
          <a className="home-offer home-offer-pink" href="#labs">
            <small>WEBSITE OFFER</small>
            <strong>Get 26% OFF on lab bookings above ₹799</strong>
          </a>
        </div>
      </section>

      <section className="home-info-grid home-info-compact">
        <div className="home-info-card">
          <div className="home-info-icon">👁️</div>
          <div>
            <h2>Our Vision</h2>
            <p>
              To become India&apos;s most trusted digital chronic disease
              management platform by combining affordable medicines, the latest
              technology and personalized patient care.
            </p>
          </div>
        </div>

        <div className="home-info-card">
          <div className="home-info-icon">🎯</div>
          <div>
            <h2>Our Mission</h2>
            <p>
              Make healthcare affordable and convenient with doorstep delivery
              across Delhi NCR, better medicine compliance, and trusted partner
              support for diagnostics and care.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function App() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash);
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  const route = !hash || hash === "#" ? "#home" : hash;

  const renderPage = () => {
    switch (route) {
      case "#medicine-search":
        return <Medicines />;
      case "#labs":
        return <LabTests />;
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
            body="MediHome is your complete health partner at your doorstep — medicines, laboratory tests, and radiology bookings for patients across Delhi NCR."
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
        <a className="sidebar-logo" href="#home">
          <span className="logo-icon">+</span>
          <span>MediHome</span>
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
        </div>
      </aside>

      <main>
        {renderPage()}

        <footer>
          <div className="logo">
            <span className="logo-icon">+</span>
            <span>
              Medi<span>Home</span>
            </span>
          </div>
          <p>© 2026 MediHome. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}

export default App;
