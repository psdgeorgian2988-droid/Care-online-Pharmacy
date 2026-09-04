const TABS = [
  { href: "#home", label: "Home", mark: "Home" },
  { href: "#medicine-search", label: "Search", mark: "Find" },
  { href: "#medicine-search", label: "Medicines", mark: "Rx" },
  { href: "#myorders", label: "Orders", mark: "Bag" },
  { href: "#profile", label: "Profile", mark: "You" },
];

export default function AppBottomNav({ route }) {
  return (
    <nav className="app-bottom-nav" aria-label="App">
      {TABS.map((tab) => {
        const active =
          (tab.href === "#home" && route === "#home") ||
          (tab.href === "#medicine-search" && route === "#medicine-search") ||
          (tab.href === "#myorders" && route === "#myorders") ||
          (tab.href === "#profile" && route === "#profile");
        return (
          <a
            key={tab.label}
            href={tab.href}
            className={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            <span aria-hidden="true">{tab.mark}</span>
            <em>{tab.label}</em>
          </a>
        );
      })}
    </nav>
  );
}
