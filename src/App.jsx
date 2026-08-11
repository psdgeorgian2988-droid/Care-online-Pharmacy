import MyOrders from "./MyOrders"
import { useState, useEffect } from "react";
import "./App.css";
import Medicines from "./Medicines"
function App() {
  const [hash, setHash] = useState(window.location.hash);
  const [currentMonthly, setCurrentMonthly] = useState("");
const [medihomeMonthly, setMedihomeMonthly] = useState("");

const monthlySaving = Math.max(0, Number(currentMonthly || 0) - Number(medihomeMonthly || 0));
const annualSaving = monthlySaving * 12;

  useEffect(() => {
    const handleHashChange = () => {
      setHash(window.location.hash);
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  if (hash === "#medicines") {
    return <Medicines />;
  }
  if (hash === "#myorders") {
  return <MyOrders />;
}
  return (
    <div className="app">

      <header className="header">
        <div className="logo">
          <span className="logo-icon">+</span>
          <span>Medi<span>Home</span></span>
        </div>

        <nav>
          <a href="#home">Home</a>
          <a href="#medicines">Medicines</a>
          <a href="#labs">Lab Tests</a>
          <a href="#education">Health Education</a>
          <a href="#myorders">My Orders</a>
        </nav>

        <button className="login-btn">Login</button>
      </header>

      <main>

        <section id="home" className="hero">
          <p className="subtitle">YOUR HEALTH PARTNER</p>

          <h1>
            Complete healthcare
            <br />
            at your doorstep.
          </h1>

          <p className="hero-text">
            Medicines, lab tests, health education and healthcare services —
            all in one place.
          </p>

          <div className="search-box">
            <input
              type="text"
              placeholder="Search medicines, lab tests or health services"
            />
            <button>Search</button>
          </div>

          <div className="quick-actions">
            <button onClick={() => document.getElementById("medicines")?.scrollIntoView({ behavior: "smooth" })}>
  💊 Order Medicines
</button>
            <button>📄 Upload Prescription</button>
            <button>🧪 Book Lab Test</button>
          </div>
        </section>

        <section className="trust">
          <h2>Your health. Our priority.</h2>
          <p>Reliable healthcare support from home.</p>
        </section>

<section className="savings-calculator">
  <div className="savings-content">
    <p className="savings-label">💰 MEDIHOME SAVINGS</p>

    <h2>Compare Your Medicine Savings</h2>

    <p className="savings-description">
      Enter your current monthly medicine expense and compare it with
      your estimated MediHome expense.
    </p>

    <div className="savings-inputs">
      <div className="savings-input-box">
        <label>Current Monthly Expense</label>
        <div className="rupee-input">
          <span>₹</span>
          <input
            type="number"
            min="0"
            placeholder="4000"
            value={currentMonthly}
            onChange={(e) => setCurrentMonthly(e.target.value)}
          />
        </div>
      </div>

      <div className="savings-input-box">
        <label>MediHome Monthly Expense</label>
        <div className="rupee-input">
          <span>₹</span>
          <input
            type="number"
            min="0"
            placeholder="3200"
            value={medihomeMonthly}
            onChange={(e) => setMedihomeMonthly(e.target.value)}
          />
        </div>
      </div>
    </div>

    <div className="savings-result">
      <h3>Your Estimated Savings</h3>

      <div className="saving-amount">
        ₹{monthlySaving.toLocaleString("en-IN")}
        <span>/month</span>
      </div>

      <p>
        Estimated annual saving:{" "}
        <strong>₹{annualSaving.toLocaleString("en-IN")}</strong>
      </p>
    </div>

    <p className="savings-note">
      *Savings are estimates and depend on the medicines, quantities and
      prices compared.
    </p>
  </div>
</section>
        <section id="medicines" className="services">
          <h2>Everything you need for your health</h2>

          <div className="cards">

            <div className="card">
              <div className="card-icon">💊</div>
              <h3>Order Medicines</h3>
              <p>
                Order your medicines conveniently from home.
              </p>
              <button onClick={() => window.location.hash = "medicines"}>Explore →</button>
            </div>

            <div className="card">
              <div className="card-icon">🧪</div>
              <h3>Lab Tests</h3>
              <p>
                Book reliable diagnostic tests from home.
              </p>
              <button>Book Test →</button>
            </div>

            <div className="card">
              <div className="card-icon">📚</div>
              <h3>Health Education</h3>
              <p>
                Learn about diabetes, hypertension and chronic care.
              </p>
              <button>Learn More →</button>
            </div>

          </div>
        </section>

        <section id="education" className="chronic">
          <h2>Chronic Care Support</h2>
          <p>
            Helping you manage your long-term health with better access,
            education and support.
          </p>

          <div className="chronic-cards">
            <div>🩸 Diabetes Care</div>
            <div>❤️ Hypertension Care</div>
            <div>📖 Weekly Health Webinars</div>
          </div>
        </section>

        <section className="trust-section">
          <h2>Why choose MediHome?</h2>

          <div className="trust-grid">
            <div>✓ Trusted healthcare information</div>
            <div>✓ Prescription upload</div>
            <div>✓ Convenient doorstep service</div>
            <div>✓ Product & manufacturing information</div>
          </div>
        </section>

      </main>

      <footer>
        <div className="logo">
          <span className="logo-icon">+</span>
          <span>Medi<span>Home</span></span>
        </div>

        <p>Your health partner at your doorstep.</p>
        <p>© 2026 MediHome. All rights reserved.</p>
      </footer>

    </div>
  );
}

export default App;