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

function HomePage() {
  return (
    <div className="home-content">
      <section className="home-welcome">
        <h1>Welcome to MediHome</h1>
        <p className="home-intro">
          Affordable medicines, diagnostic bookings, and doorstep care for
          Delhi NCR — in one trusted place.
        </p>
        <div className="home-quick-links">
          <a className="home-quick-link" href="#medicine-search">
            Order Medicines
          </a>
          <a className="home-quick-link secondary" href="#labs">
            Book Lab Tests
          </a>
        </div>
      </section>

      <section className="home-info-grid">
        <div className="home-info-card">
          <div className="home-info-icon">👁️</div>
          <h2>Our Vision</h2>
          <div className="home-info-content">
            <p>
              To become India&apos;s most trusted digital chronic disease
              management platform by combining affordable medicines, the latest
              technology and personalized patient care.
            </p>
          </div>
        </div>

        <div className="home-info-card">
          <div className="home-info-icon">🎯</div>
          <h2>Our Mission</h2>
          <div className="home-info-content">
            <p>
              Our mission is to make healthcare more affordable, accessible and
              convenient by reducing treatment costs, improving medicine
              compliance, providing reliable doorstep delivery across Delhi NCR,
              building long-term patient relationships, and enabling access to
              ambulance services with GPS tracking and medical insurance through
              trusted partners.
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
