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

const HOME_WHATSAPP = "919654222988";

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
        <h1>Get lab tests, radiology, and medicines ordered at your doorstep</h1>
        <p className="home-hero-sub">
          Book laboratory tests and radiology at home, and order medicines for
          doorstep delivery across Delhi NCR.
        </p>

        <form className="home-search-form" onSubmit={goToMedicines}>
          <input
            type="search"
            placeholder="Search medicines by name or salt"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search for medicines"
          />
          <button type="submit">Search</button>
        </form>

        <div className="home-service-links">
          <a href="#medicine-search">Order medicines</a>
          <a href="#labs">Get lab tests / radiology</a>
        </div>

        <p className="home-hero-actions">
          <a
            href={`https://wa.me/${HOME_WHATSAPP}?text=${encodeURIComponent(
              "Hi MediHome, I would like to order medicines."
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            Order on WhatsApp
          </a>
        </p>
      </section>

      <section className="home-benefits" aria-label="Services at your doorstep">
        <div>
          <strong>Medicines</strong>
          <p>Order at your doorstep, with cash on delivery.</p>
        </div>
        <div>
          <strong>Lab tests</strong>
          <p>Home sample collection across Delhi NCR.</p>
        </div>
        <div>
          <strong>Radiology</strong>
          <p>Book imaging at trusted partner centres.</p>
        </div>
      </section>

      <section className="home-about">
        <article>
          <h2>Vision</h2>
          <p>
            To be a trusted chronic care platform that combines affordable
            medicines, technology, and personalised patient support.
          </p>
        </article>
        <article>
          <h2>Mission</h2>
          <p>
            Make healthcare easier across Delhi NCR with reliable doorstep
            delivery, better medicine compliance, and trusted diagnostics.
          </p>
        </article>
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
