import { useState } from "react";
import { customerGreeting, needsCustomerWelcome, useLoginSession } from "./authSession";
import CustomerWelcome from "./CustomerWelcome";
import HomeServiceCatalog from "./HomeServiceCatalog";
import LabsHub from "./LabsHub";
import { homeCatalogSectionKeys } from "./hashRoute";

export default function CustomerHome({ sectionKey = "" } = {}) {
  const user = useLoginSession();
  const hello = customerGreeting(user);
  const [welcomeTick, setWelcomeTick] = useState(0);

  if (needsCustomerWelcome(user)) {
    return (
      <CustomerWelcome
        key={welcomeTick}
        onDone={() => setWelcomeTick((n) => n + 1)}
      />
    );
  }

  if (sectionKey === "labs") {
    return <LabsHub />;
  }

  if (sectionKey) {
    return (
      <div className="app-home is-fill is-account">
        <section className="account-more" aria-label="Services">
          <HomeServiceCatalog sectionKeys={homeCatalogSectionKeys(sectionKey)} />
        </section>
      </div>
    );
  }

  return (
    <div className="app-home is-fill is-account">
      {hello ? <p className="app-home-hello">{hello}</p> : null}

      <section className="account-more" aria-label="Services">
        <HomeServiceCatalog />
      </section>
    </div>
  );
}
