import { useEffect, useMemo, useState } from "react";
import Reports from "./Reports";
import Vaccination from "./Vaccination";
import { goToHash } from "./hashRoute";
import { useFeatures } from "./featureFlags";

const TABS = [
  {
    id: "lab",
    label: "Lab Reports",
    hash: "#reports?tab=lab",
    feature: "reports",
    docType: "lab",
  },
  {
    id: "imaging",
    label: "Imaging Reports",
    hash: "#reports?tab=imaging",
    feature: "reports",
    docType: "imaging",
  },
  {
    id: "prescription",
    label: "Prescriptions",
    hash: "#reports?tab=prescription",
    feature: "reports",
    docType: "prescription",
  },
  {
    id: "vaccination",
    label: "Vaccination Record",
    hash: "#reports?tab=vaccination",
    feature: "vaccination",
    docType: "",
  },
];

function resolveTab(initialTab, available) {
  const wanted = String(initialTab || "").toLowerCase();
  if (wanted === "reports" || wanted === "health" || wanted === "") {
    return available.find((tab) => tab.id === "lab")?.id || available[0]?.id || "lab";
  }
  if (available.some((tab) => tab.id === wanted)) return wanted;
  return available[0]?.id || "lab";
}

export default function MedicalRecords({ initialTab = "lab" }) {
  const features = useFeatures();
  const available = useMemo(
    () =>
      TABS.filter((tab) => {
        if (tab.feature === "reports") return features.reports !== false;
        if (tab.feature === "vaccination") return features.vaccination !== false;
        return true;
      }),
    [features]
  );
  const [tab, setTab] = useState(() => resolveTab(initialTab, available));

  useEffect(() => {
    setTab(resolveTab(initialTab, available));
  }, [initialTab, available]);

  const selectTab = (nextId) => {
    const next = available.find((row) => row.id === nextId) || available[0];
    if (!next) return;
    setTab(next.id);
    goToHash(next.hash);
  };

  const active = available.find((row) => row.id === tab) || available[0];

  if (!available.length) {
    return (
      <div className="service-page medical-records-page">
        <section className="service-hero">
          <div>
            <span className="service-kicker">MediHome Medical Records</span>
            <h1>Medical Records</h1>
            <p>This section is paused right now.</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="service-page medical-records-page">
      <style>{styles}</style>
      <section className="service-hero">
        <div>
          <span className="service-kicker">MediHome Medical Records</span>
          <h1>Medical Records</h1>
          <p>
            This is where lab test reports, imaging centre reports, prescriptions,
            and vaccination records are saved on this device — nothing is uploaded
            to a server.
          </p>
        </div>
      </section>

      <div className="medrec-tabs" role="tablist" aria-label="Medical record sections">
        {available.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? "medrec-tab is-active" : "medrec-tab"}
            onClick={() => selectTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="medrec-panel" role="tabpanel">
        {active?.id === "vaccination" ? (
          <Vaccination embedded />
        ) : active?.docType ? (
          <Reports embedded docType={active.docType} />
        ) : null}
      </div>
    </div>
  );
}

const styles = `
.medical-records-page{padding:16px 20px 24px 14px;box-sizing:border-box;color:#143246}
.medical-records-page .service-hero{max-width:760px;margin:0 auto 12px;padding:14px 16px;border-radius:12px;background:linear-gradient(135deg,#eaf7ff,#f4fbf8)}
.medical-records-page .service-kicker{display:block;margin-bottom:4px;font-size:11px;font-weight:800;letter-spacing:.6px;color:#1a6b7a}
.medical-records-page .service-hero h1{margin:0 0 4px;font-size:22px}
.medical-records-page .service-hero p{margin:0;color:#5d7180;font-size:13px;line-height:1.4}
.medrec-tabs{display:flex;flex-wrap:wrap;gap:8px;width:100%;max-width:760px;margin:0 auto 14px;padding:4px;border-radius:12px;background:#e8f0f4;box-sizing:border-box}
.medrec-tab{flex:1 1 140px;min-height:42px;border:0;border-radius:9px;background:transparent;color:#34546b;font:inherit;font-size:13px;font-weight:800;cursor:pointer;padding:8px 10px}
.medrec-tab.is-active{background:#1a6b7a;color:#fff;box-shadow:0 3px 8px rgba(26,107,122,.22)}
.medrec-panel{width:100%;max-width:760px;margin:0 auto}
.medrec-panel .service-page{padding:0}
.medrec-panel .service-hero{margin-bottom:10px;padding:12px 14px}
.medrec-panel .service-hero h1{font-size:18px}
@media (max-width:800px){.medical-records-page{padding:14px}}
`;
