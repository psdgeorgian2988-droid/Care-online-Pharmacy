import { APP_PREVIEW_KEY, APP_ROLES, writeAppRole } from "./appRuntime";
import { goToHash } from "./hashRoute";
import MediHomeLogoLink from "./MediHomeLogoLink";
import WelcomeSlideshow from "./WelcomeSlideshow";

function openRoleDesk(roleId) {
  const role = APP_ROLES[roleId];
  if (!role) return;
  writeAppRole(role.id);
  if (roleId === "customer") {
    try {
      globalThis.localStorage?.setItem?.(APP_PREVIEW_KEY, "1");
    } catch {
      /* ignore */
    }
  }
  goToHash(role.hash);
}

function PortalShell({ kicker, title, lead, bullets, actions, showBrand = true, showDeskLinks = true }) {
  return (
    <div className="home-content home-landing role-portal">
      <div className="home-shell">
        <section className="home-intro role-portal-intro">
          {showBrand ? (
            <MediHomeLogoLink
              className="role-portal-brand"
              size="lg"
              aria-label="MediHome welcome"
            />
          ) : null}
          {kicker ? <p className="home-kicker">{kicker}</p> : null}
          {title ? <h1>{title}</h1> : null}
          {lead ? <p className="home-lead">{lead}</p> : null}
          {bullets?.length ? (
            <ul className="role-portal-bullets">
              {bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          <div className="role-portal-actions">{actions}</div>
        </section>
        {showDeskLinks ? (
          <section className="role-portal-links" aria-label="Other desks">
            <a href="#customer">Customer</a>
            <a href="#partner">Partner</a>
            <a href="#staff">Staff</a>
            <a href="#home">Website</a>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export function CustomerPortal() {
  return (
    <div className="home-content home-landing role-portal role-portal-customer">
      <div className="home-shell role-portal-customer-shell">
        <section className="role-portal-intro role-portal-customer-actions">
          <div className="role-portal-actions">
            <button type="button" className="app-first-btn" onClick={() => openRoleDesk("customer")}>
              Continue as Guest
            </button>
            <a className="app-first-btn is-quiet" href="#register">
              Register
            </a>
          </div>
        </section>
        <section className="role-portal-stage" aria-label="MediHome services">
          <WelcomeSlideshow />
        </section>
      </div>
    </div>
  );
}

export function PartnerPortal() {
  return (
    <PortalShell
      kicker="Partner"
      title="MediHome For Partners"
      lead="Accept assigned jobs for delivery, lab collection, radiology, and home visits."
      bullets={[
        "Confirm lab, radiology, and Home Care requests",
        "Collect, deliver, and complete assigned visits",
        "Sign in with your 10-digit mobile and 6-digit password",
      ]}
      actions={
        <>
          <button type="button" className="app-first-btn" onClick={() => openRoleDesk("partner")}>
            Open Partner Desk
          </button>
        </>
      }
    />
  );
}

export function StaffPortal() {
  return (
    <PortalShell
      kicker="Staff"
      title="MediHome For Staff"
      lead="Run the operations desk for orders, partners, webinars, and day-to-day coordination."
      bullets={[
        "Monitor incoming orders and partner confirmation",
        "Manage partner logins and service coverage",
        "Track status across medicines, labs, and visits",
      ]}
      actions={
        <>
          <button type="button" className="app-first-btn" onClick={() => openRoleDesk("staff")}>
            Open Staff Desk
          </button>
        </>
      }
    />
  );
}

/** First-launch chooser for installed apps when no role is saved yet. */
export default function PortalsChooser() {
  return (
    <div className="home-content home-landing role-portal">
      <div className="home-shell">
        <section className="home-intro">
          <p className="home-kicker">MediHome</p>
          <h1>Choose Your Desk</h1>
          <p className="home-lead">Open the page that matches how you work with MediHome.</p>
        </section>
        <section className="home-services" aria-label="MediHome desks">
          <a className="home-service-card" href="#customer">
            <h2>Customer</h2>
            <p>Medicines, bookings, orders, and account.</p>
            <span>Open customer page</span>
          </a>
          <a className="home-service-card" href="#partner">
            <h2>Partner</h2>
            <p>Assigned jobs for delivery, lab, and visits.</p>
            <span>Open partner page</span>
          </a>
          <a className="home-service-card" href="#staff">
            <h2>Staff</h2>
            <p>Orders, partners, and operations desk.</p>
            <span>Open staff page</span>
          </a>
        </section>
      </div>
    </div>
  );
}
