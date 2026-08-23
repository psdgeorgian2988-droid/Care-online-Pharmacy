import { useState } from "react";

const GUIDES = [
  {
    id: "diabetes",
    title: "Living with diabetes",
    summary: "Daily habits, medicines, and the lab tests that matter.",
    points: [
      "Take prescribed medicines at the same time each day. Do not skip doses because you feel well.",
      "Book HbA1c about every 3 months, and fasting sugar when your doctor asks.",
      "Keep a simple meal pattern: regular timings, less sugar, and a walk after meals when possible.",
      "If you have low-sugar symptoms (sweating, shaking, confusion), take a fast-acting sugar source and seek help.",
    ],
  },
  {
    id: "bp",
    title: "Blood pressure at home",
    summary: "How to measure, when to worry, and why tablets must continue.",
    points: [
      "Sit quietly for 5 minutes before a reading. Rest the arm at heart level.",
      "Take medicines even when you feel fine. Stopping suddenly can raise risk.",
      "Limit extra salt, packaged snacks, and late-night heavy meals.",
      "Seek urgent care for severe headache, chest pain, sudden weakness, or very high readings with symptoms.",
    ],
  },
  {
    id: "thyroid",
    title: "Thyroid medicine and tests",
    summary: "Thyroxine timing and why blood tests still matter.",
    points: [
      "Take thyroxine on an empty stomach, with water, and wait 30–60 minutes before food or other tablets.",
      "Calcium, iron, and some stomach medicines can reduce absorption if taken together.",
      "Thyroid profile is usually repeated as your doctor advises, often after a dose change.",
      "Tell MediHome or your clinician about missed doses instead of doubling up.",
    ],
  },
  {
    id: "kidney",
    title: "Kidney-friendly care",
    summary: "For people on long-term kidney medicines or dialysis planning.",
    points: [
      "Do not start painkillers, herbal pills, or extra vitamins without asking your doctor.",
      "Keep KFT and related tests on schedule so dose changes are based on labs, not guesswork.",
      "Watch swelling, sudden weight gain, breathlessness, or very little urine — contact care promptly.",
      "Use MediHome Reports to keep PDFs on this device for clinic visits.",
    ],
  },
  {
    id: "meds",
    title: "Medicine compliance",
    summary: "Simple rules so home delivery actually improves health.",
    points: [
      "Reorder a few days before a strip ends so you never run out.",
      "Store tablets as labelled: dry place, away from heat. Inhalers and insulin need extra care.",
      "If a brand looks different, check the salt and strength on the pack before taking it.",
      "Use Search Medicine to match a web brand with a MediHome alternative of the same combination.",
    ],
  },
];

function HealthEducation() {
  const [openId, setOpenId] = useState(GUIDES[0].id);

  return (
    <>
      <style>{styles}</style>
      <div className="service-page info-page">
        <section className="service-hero">
          <div>
            <span className="service-kicker">MediHome Health Education</span>
            <h1>Practical Guides For Chronic Care At Home</h1>
            <p>
              Short, plain-language notes for Delhi NCR patients. This is
              education, not a personal prescription — follow your clinician.
            </p>
          </div>
        </section>

        <div className="info-stack">
          {GUIDES.map((guide) => {
            const open = openId === guide.id;
            return (
              <article
                key={guide.id}
                className={open ? "info-card is-open" : "info-card"}
              >
                <button
                  type="button"
                  className="info-card-toggle"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? "" : guide.id)}
                >
                  <span>
                    <strong>{guide.title}</strong>
                    <em>{guide.summary}</em>
                  </span>
                  <span className="info-card-chevron" aria-hidden="true">
                    {open ? "−" : "+"}
                  </span>
                </button>
                {open ? (
                  <ul>
                    {guide.points.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                ) : null}
              </article>
            );
          })}

          <p className="info-footnote">
            Need a test or refill?{" "}
            <a href="#labs">Book diagnostics</a> or{" "}
            <a href="#medicine-search">search medicines</a>.
          </p>
        </div>
      </div>
    </>
  );
}

const styles = `
.service-page{padding:16px 20px 24px 14px;box-sizing:border-box;color:#143246}
.service-hero{max-width:760px;margin:0 auto 12px;padding:14px 16px;border-radius:12px;background:linear-gradient(135deg,#eaf7ff,#f4fbf8)}
.service-kicker{display:block;margin-bottom:4px;font-size:11px;font-weight:800;letter-spacing:.6px;color:#1a6b7a}
.service-hero h1{margin:0 0 4px;font-size:22px}
.service-hero p{margin:0;color:#5d7180;font-size:13px;line-height:1.4}
.info-stack{max-width:760px;margin:0 auto}
.info-card{background:#fff;border:1px solid #e4ecef;border-radius:12px;margin-bottom:10px;overflow:hidden}
.info-card-toggle{width:100%;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 16px;border:0;background:#fff;text-align:left;cursor:pointer;font-family:inherit;color:#143246}
.info-card-toggle strong{display:block;font-size:15px}
.info-card-toggle em{display:block;margin-top:4px;font-style:normal;color:#5d7180;font-size:13px;line-height:1.4;font-weight:400}
.info-card-chevron{flex:0 0 24px;height:24px;border-radius:6px;background:#e8f4f6;color:#1a6b7a;display:flex;align-items:center;justify-content:center;font-weight:800}
.info-card ul{margin:0;padding:0 16px 14px 34px;color:#34546b;font-size:14px;line-height:1.5}
.info-card li{margin-bottom:8px}
.info-card li:last-child{margin-bottom:0}
.info-footnote{margin:4px 2px 0;color:#5d7180;font-size:13px}
.info-footnote a{color:#1a6b7a;font-weight:700;text-decoration:none}
@media (max-width:800px){.service-page{padding:14px}}
`;

export default HealthEducation;
