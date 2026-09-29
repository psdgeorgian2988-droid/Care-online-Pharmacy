import { useEffect, useMemo } from "react";
import { useFeatures } from "./featureFlags";
import { featureEnabled } from "./salesReport";
import { HOME_SERVICE_TREE } from "./homeServiceTree";
import ServiceCartoon from "./ServiceCartoon";
import ServiceIcon from "./serviceIcons";
import { hasAccountSession, useLoginSession } from "./authSession";
import { catalogParentHash, goToChildHash, goToHash } from "./hashRoute";

export default function HomeServiceCatalog({ className = "", sectionKeys } = {}) {
  const features = useFeatures();
  const user = useLoginSession();
  const showReports = hasAccountSession(user);
  const sections = useMemo(() => {
    const allowed =
      Array.isArray(sectionKeys) && sectionKeys.length
        ? new Set(sectionKeys.map(String))
        : null;
    return HOME_SERVICE_TREE.filter((section) => {
      if (allowed && !allowed.has(section.key)) return false;
      if (section.key === "reports" && !showReports) return false;
      return true;
    }).map((section) => ({
      ...section,
      on: featureEnabled(features, section.key),
    }));
  }, [features, sectionKeys, showReports]);
  const sectionPage = sectionKeys?.length === 1;

  useEffect(() => {
    if (!sectionPage || sectionKeys?.[0] !== "reports") return undefined;
    const node = document.getElementById("home-records");
    if (!node) return undefined;
    node.focus({ preventScroll: true });
    node.scrollIntoView({ block: "start" });
    return undefined;
  }, [sectionPage, sectionKeys]);

  const openSection = (event, section) => {
    event.preventDefault();
    if (!section.on) return;
    goToHash(`#home?service=${section.key}`);
  };

  const openChild = (event, section, item) => {
    event.preventDefault();
    if (!section.on) return;
    if (item.id === "med-search") {
      try {
        sessionStorage.setItem("mediHomeMedicineCategory", "Search");
        sessionStorage.removeItem("mediHomeMedicineSearch");
      } catch {
        /* ignore */
      }
    } else if (item.category) {
      try {
        sessionStorage.setItem("mediHomeMedicineCategory", item.category);
      } catch {
        /* ignore */
      }
    }
    const currentHash =
      typeof window !== "undefined" ? window.location.hash || "#home" : "#home";
    goToChildHash(item.href, catalogParentHash(section.key, currentHash));
  };

  return (
    <section
      className={`app-home-catalog${className ? ` ${className}` : ""}`}
      aria-label={
        sectionKeys?.length === 2 &&
        sectionKeys.includes("lab") &&
        sectionKeys.includes("radiology")
          ? "Labs"
          : sectionKeys?.length === 1 && sectionKeys[0] === "lab"
          ? "Lab Tests"
          : sectionPage && sectionKeys[0]
            ? HOME_SERVICE_TREE.find((row) => row.key === sectionKeys[0])?.label || "Services"
            : "Services"
      }
    >
      {sections.map((section, sectionIndex) => (
        <div
          key={section.key}
          id={section.key === "reports" ? "home-records" : undefined}
          className={`app-home-section${section.on ? "" : " is-off"}`}
          style={{ "--section-index": sectionIndex }}
          tabIndex={section.key === "reports" ? -1 : undefined}
        >
          <h2 className="app-home-heading">
            {section.on && !sectionPage ? (
              <a
                href={`#home?service=${section.key}`}
                onClick={(event) => openSection(event, section)}
              >
                {section.label}
              </a>
            ) : (
              section.label
            )}
          </h2>
          <div className="app-home-subgrid">
            {section.items.map((item, itemIndex) => (
              <a
                key={item.id}
                className="app-home-subitem"
                href={section.on ? item.href : undefined}
                aria-disabled={section.on ? undefined : "true"}
                style={{ "--item-index": itemIndex }}
                onClick={(event) => openChild(event, section, item)}
              >
                {item.logo ? (
                  <span className="service-logo" aria-hidden="true">
                    <img src={item.logo} alt="" loading="lazy" decoding="async" />
                  </span>
                ) : item.icon ? (
                  <ServiceIcon type={item.icon} title={item.label} />
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
