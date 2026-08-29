import { APP_ROLES, writeAppRole } from "./appRuntime";
import { goToHash } from "./hashRoute";

export default function AppPicker() {
  const openRole = (role) => {
    writeAppRole(role.id);
    goToHash(role.hash);
  };

  return (
    <div className="home-content home-landing app-picker">
      <div className="home-shell">
        <section className="home-intro">
          <p className="home-kicker">MediHome Apps</p>
          <h1>Choose The Working App</h1>
          <p className="home-lead">
            One MediHome product, three desks. Pick the app you use on this
            phone.
          </p>
        </section>
        <section className="home-services" aria-label="MediHome Apps">
          {Object.values(APP_ROLES).map((role) => (
            <button
              key={role.id}
              type="button"
              className="home-service-card app-picker-card"
              onClick={() => openRole(role)}
            >
              <h2>{role.title}</h2>
              <p>{role.summary}</p>
              <span>Open {role.title}</span>
            </button>
          ))}
        </section>
      </div>
    </div>
  );
}
