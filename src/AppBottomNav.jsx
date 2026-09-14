function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4.5 11.2 12 5.2l7.5 6V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.2h-3.6v5.2H6A1.5 1.5 0 0 1 4.5 19z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MedicinesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="7"
        y="3.5"
        width="10"
        height="17"
        rx="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M12 8v8M8.5 12h7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LabsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 3.5h6M10 3.5v5.2L6.2 16.8A3.2 3.2 0 0 0 9 21.5h6a3.2 3.2 0 0 0 2.8-4.7L14 8.7V3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 7.5h10l1.4 11H5.6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 7.5V6.2A3 3 0 0 1 12 3.2 3 3 0 0 1 15 6.2v1.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 19.2c1.4-3 3.7-4.5 6.5-4.5s5.1 1.5 6.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

const TABS = [
  { href: "#home", label: "Home", Icon: HomeIcon },
  { href: "#medicine-search", label: "Medicines", Icon: MedicinesIcon },
  { href: "#labs", label: "Labs", Icon: LabsIcon },
  { href: "#myorders", label: "Orders", Icon: OrdersIcon },
  { href: "#profile", label: "Account", Icon: AccountIcon },
];

function tabActive(href, route) {
  if (href === "#home") return route === "#home";
  if (href === "#medicine-search") return route === "#medicine-search";
  if (href === "#labs") return route === "#labs";
  if (href === "#myorders") return route === "#myorders" || route === "#track";
  if (href === "#profile") {
    return route === "#profile" || route === "#login" || route === "#register";
  }
  return route === href;
}

export default function AppBottomNav({ route }) {
  return (
    <nav className="app-bottom-nav" aria-label="App">
      {TABS.map((tab) => {
        const active = tabActive(tab.href, route);
        return (
          <a
            key={tab.href}
            href={tab.href}
            className={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            <span>
              <tab.Icon />
            </span>
            <em>{tab.label}</em>
          </a>
        );
      })}
    </nav>
  );
}
