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
const HOME_WHATSAPP_URL = `https://api.whatsapp.com/send?phone=${HOME_WHATSAPP}&text=${encodeURIComponent(
  "Hi MediHome, I would like to order medicines."
)}`;

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
      <p className="home-hero-kicker">Welcome to MediHome · Delhi NCR</p>
      <h1>GET LAB TEST, RADIOLOGY AND MEDICINES ORDERED AT YOUR DOORSTEP</h1>

      <div className="home-split">
        <section className="home-hero">
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
          </div>
        </section>

        <section className="home-panels" aria-label="Services and about MediHome">
          <article>
            <h2>Medicines</h2>
            <p>Order at your doorstep, with cash on delivery.</p>
          </article>
          <article>
            <h2>Lab tests</h2>
            <p>Home sample collection across Delhi NCR.</p>
          </article>
          <article>
            <h2>Radiology</h2>
            <p>Book imaging at trusted partner centres.</p>
          </article>
          <article>
            <h2>Vision</h2>
            <p>
              A trusted chronic care platform with affordable medicines,
              technology, and personalised support.
            </p>
          </article>
          <article>
            <h2>Mission</h2>
            <p>
              Doorstep delivery across Delhi NCR, better medicine compliance,
              and trusted diagnostics.
            </p>
          </article>
        </section>
      </div>
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
