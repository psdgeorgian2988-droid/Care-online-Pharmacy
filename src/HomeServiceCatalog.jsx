import { useMemo } from "react";
import { useFeatures } from "./featureFlags";
import { featureEnabled } from "./salesReport";
import { HOME_SERVICE_TREE } from "./homeServiceTree";
import ServiceCartoon from "./ServiceCartoon";

export default function HomeServiceCatalog({ className = "", sectionKeys } = {}) {
  const features = useFeatures();
  const sections = useMemo(() => {
    const allowed =
      Array.isArray(sectionKeys) && sectionKeys.length
        ? new Set(sectionKeys.map(String))
        : null;
    return HOME_SERVICE_TREE.filter((section) =>
      allowed ? allowed.has(section.key) : true
    ).map((section) => ({
      ...section,
      on: featureEnabled(features, section.key),
    }));
  }, [features, sectionKeys]);

  return (
    <section
      className={`app-home-catalog${className ? ` ${className}` : ""}`}
      aria-label={
        sectionKeys?.length === 1 && sectionKeys[0] === "lab"
          ? "Lab Tests"
          : "Services"
      }
    >
      {sections.map((section, sectionIndex) => (
        <div
          key={section.key}
          className={`app-home-section${section.on ? "" : " is-off"}`}
          style={{ "--section-index": sectionIndex }}
        >
          <h2 className="app-home-heading">{section.label}</h2>
          <div className="app-home-subgrid">
            {section.items.map((item, itemIndex) => (
              <a
                key={item.id}
                className="app-home-subitem"
                href={section.on ? item.href : undefined}
                aria-disabled={section.on ? undefined : "true"}
                style={{ "--item-index": itemIndex }}
                onClick={
                  section.on
                    ? undefined
                    : (event) => {
                        event.preventDefault();
                      }
                }
              >
                {item.logo ? (
                  <span className="service-logo" aria-hidden="true">
                    <img src={item.logo} alt="" loading="lazy" decoding="async" />
                  </span>
                ) : (
                  <ServiceCartoon type={item.cartoon} title={item.label} />
                )}
                <span className="app-home-sublabel">{item.label}</span>
              </a>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
