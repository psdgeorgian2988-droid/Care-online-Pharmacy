import { useMemo, useState } from "react";
import ReferFamily from "./ReferFamily";
import { awardOnce, POINT_VALUES, useWallet } from "./pointsStore";

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

const WEBINARS = [
  {
    id: "wb-diabetes",
    title: "Diabetes At Home: Medicines, Meals, And HbA1c",
    date: "Saturday, 5 Sep 2026",
    time: "11:00 AM – 12:00 PM",
    host: "MediHome clinical educators",
    format: "Live online (link by WhatsApp)",
    summary:
      "How to take diabetes medicines on time, what to eat around doses, and which tests to book.",
  },
  {
    id: "wb-bp",
    title: "Blood Pressure: Home Readings That Doctors Trust",
    date: "Wednesday, 16 Sep 2026",
    time: "6:30 PM – 7:15 PM",
    host: "MediHome nursing team",
    format: "Live online (link by WhatsApp)",
    summary:
      "Correct cuff use, when a high reading is an emergency, and why BP tablets continue even on good days.",
  },
  {
    id: "wb-meds",
    title: "Medicine Safety For Caregivers",
    date: "Sunday, 27 Sep 2026",
    time: "10:00 AM – 10:45 AM",
    host: "MediHome pharmacy desk",
    format: "Live online (link by WhatsApp)",
    summary:
      "Storage, missed doses, look-alike packs, and when to call before giving an extra tablet.",
  },
];

const QUIZZES = [
  {
    id: "quiz-diabetes",
    title: "Diabetes basics",
    minutes: 3,
    questions: [
      {
        prompt: "You feel well today. Should you skip your prescribed diabetes tablet?",
        options: [
          "Yes — skip it until you feel unwell again",
          "No — take it at the usual time unless a doctor changes the plan",
          "Only take it after a heavy meal",
        ],
        answer: 1,
        why: "Feeling well does not mean blood sugar is in range. Stopping suddenly can be unsafe.",
      },
      {
        prompt: "HbA1c is usually repeated about every:",
        options: ["3 days", "3 months", "3 years"],
        answer: 1,
        why: "HbA1c reflects average sugar over about 3 months. Your doctor may ask sooner after a dose change.",
      },
      {
        prompt: "Sweating, shaking, and confusion can be signs of:",
        options: ["High blood pressure only", "Low blood sugar", "A skipped walk"],
        answer: 1,
        why: "Low sugar needs fast-acting sugar and help. Do not wait it out if you feel confused.",
      },
      {
        prompt: "A useful habit after meals for many people with diabetes is:",
        options: [
          "A short walk when the doctor allows it",
          "Lying down immediately",
          "An extra dessert to ‘balance’ medicine",
        ],
        answer: 0,
        why: "A short walk after meals can help sugar control. Desserts are not a substitute for medicines.",
      },
    ],
  },
  {
    id: "quiz-bp",
    title: "Blood pressure at home",
    minutes: 3,
    questions: [
      {
        prompt: "Before a home BP reading you should:",
        options: [
          "Sit quietly for about 5 minutes with the arm at heart level",
          "Take the reading while walking",
          "Talk on the phone to stay relaxed",
        ],
        answer: 0,
        why: "Rest and arm position make readings closer to what a clinic would trust.",
      },
      {
        prompt: "BP tablets should be stopped when you feel fine.",
        options: ["True", "False — continue unless your doctor changes them"],
        answer: 1,
        why: "High BP often has no symptoms. Stopping suddenly can raise risk.",
      },
      {
        prompt: "Which is an urgent warning sign with very high readings?",
        options: [
          "Mild thirst after tea",
          "Severe headache, chest pain, or sudden weakness",
          "Wanting a second cup of coffee",
        ],
        answer: 1,
        why: "Those symptoms need urgent care, not another home reading an hour later.",
      },
      {
        prompt: "A kidney-friendly habit for BP care is:",
        options: [
          "Extra packaged snacks for energy",
          "Less extra salt and fewer late heavy meals",
          "Doubling the tablet if one reading is high",
        ],
        answer: 1,
        why: "Salt and heavy late meals push BP up. Never double a dose without medical advice.",
      },
    ],
  },
  {
    id: "quiz-meds",
    title: "Medicine safety",
    minutes: 3,
    questions: [
      {
        prompt: "The pack looks different this month. What should you check first?",
        options: [
          "Colour of the box only",
          "Salt (generic name) and strength on the pack",
          "Whether the courier was on time",
        ],
        answer: 1,
        why: "Brands change. The salt and strength must match what was prescribed.",
      },
      {
        prompt: "You missed a dose. The safest default is:",
        options: [
          "Take two together to catch up",
          "Ask your clinician or pharmacist — do not double up on your own",
          "Stop the medicine for a week",
        ],
        answer: 1,
        why: "Doubling can cause harm. Missed-dose advice depends on the medicine.",
      },
      {
        prompt: "Thyroxine is usually taken:",
        options: [
          "On an empty stomach, then wait 30–60 minutes before food",
          "With a calcium tablet at the same time",
          "Only at bedtime with dinner",
        ],
        answer: 0,
        why: "Food, calcium, and iron can reduce absorption if taken together.",
      },
      {
        prompt: "When should you reorder chronic medicines?",
        options: [
          "The day the last tablet is taken",
          "A few days before the strip ends",
          "Once a year with a health check",
        ],
        answer: 1,
        why: "A small buffer avoids missed doses while the order is packed and delivered.",
      },
    ],
  },
];

const WEBINAR_KEY = "mediHomeWebinarSignups";
const TABS = [
  { id: "guides", label: "Guides" },
  { id: "webinars", label: "Webinars" },
  { id: "quiz", label: "Quiz" },
  { id: "refer", label: "Refer" },
];

function readProfile() {
  try {
    const parsed = JSON.parse(localStorage.getItem("mediHomeUser") || "null");
    if (!parsed || typeof parsed !== "object") {
      return { name: "", mobile: "" };
    }
    return {
      name: String(parsed.name || parsed.fullName || "").trim(),
      mobile: String(parsed.mobile || parsed.mobileNumber || "").trim(),
    };
  } catch {
    return { name: "", mobile: "" };
  }
}

function loadSignups() {
  try {
    const parsed = JSON.parse(localStorage.getItem(WEBINAR_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSignup(entry) {
  const next = [...loadSignups(), entry];
  localStorage.setItem(WEBINAR_KEY, JSON.stringify(next));
  return next;
}

function PointsEarnedBanner({ result, label }) {
  if (!result) return null;
  const total = Number(result.wallet?.balance) || 0;
  if (result.already) {
    return (
      <p className="edu-points-earned" role="status">
        Already collected for this {label}. Your total is {total} points.
      </p>
    );
  }
  return (
    <p className="edu-points-earned" role="status">
      +{result.awarded} points for this {label}. Your total is {total} points.
    </p>
  );
}

function GuidesPanel() {
  const [openId, setOpenId] = useState(GUIDES[0].id);
  return (
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
    </div>
  );
}

function WebinarsPanel() {
  const wallet = useWallet();
  const profile = useMemo(() => readProfile(), []);
  const [signups, setSignups] = useState(loadSignups);
  const [activeId, setActiveId] = useState("");
  const [form, setForm] = useState({
    name: profile.name,
    mobile: profile.mobile,
  });
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(null);
  const [attendAward, setAttendAward] = useState(null);

  const registeredIds = new Set(signups.map((row) => row.webinarId));

  const claimAttend = (webinar) => {
    setAttendAward(
      awardOnce(
        `webinar:${webinar.id}`,
        POINT_VALUES.webinar,
        `Attended webinar: ${webinar.title}`
      )
    );
  };

  const handleRegister = (event, webinar) => {
    event.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Name is required.";
    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      nextErrors.mobile = "Enter a valid 10-digit mobile number.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const entry = {
      id: "MH-WB-" + Math.floor(100000 + Math.random() * 900000),
      webinarId: webinar.id,
      title: webinar.title,
      name: form.name.trim(),
      mobile: form.mobile,
      createdAt: new Date().toLocaleString(),
    };
    const award = awardOnce(
      `webinar:${webinar.id}`,
      POINT_VALUES.webinar,
      `Attended webinar: ${webinar.title}`
    );
    setSignups(saveSignup(entry));
    setActiveId("");
    setDone({ ...entry, award });
  };

  if (done) {
    return (
      <article className="edu-panel-card">
        <p className="edu-badge">Seat reserved</p>
        <h2>{done.title}</h2>
        <PointsEarnedBanner result={done.award} label="webinar" />
        <p>
          Thank you, {done.name}. We will send the live link to WhatsApp on{" "}
          <strong>{done.mobile}</strong> before the session. Reference{" "}
          <strong>{done.id}</strong>.
        </p>
        <button type="button" className="edu-btn edu-btn-primary" onClick={() => setDone(null)}>
          Browse more webinars
        </button>
      </article>
    );
  }

  return (
    <div className="edu-grid">
      {attendAward ? <PointsEarnedBanner result={attendAward} label="webinar" /> : null}
      {WEBINARS.map((webinar) => {
        const registered = registeredIds.has(webinar.id);
        const open = activeId === webinar.id;
        const attended = Boolean(wallet.earned[`webinar:${webinar.id}`]);
        return (
          <article key={webinar.id} className="edu-panel-card">
            <p className="edu-badge">Live webinar</p>
            <h2>{webinar.title}</h2>
            <p>{webinar.summary}</p>
            <ul className="edu-meta">
              <li>
                <strong>Date</strong> {webinar.date}
              </li>
              <li>
                <strong>Time</strong> {webinar.time}
              </li>
              <li>
                <strong>Host</strong> {webinar.host}
              </li>
              <li>
                <strong>Format</strong> {webinar.format}
              </li>
            </ul>
            {registered ? (
              <>
                <p className="edu-note">You are registered. The link will arrive on WhatsApp.</p>
                {attended ? (
                  <p className="edu-points-earned">
                    +{POINT_VALUES.webinar} webinar points collected. Total{" "}
                    {wallet.balance} points.
                  </p>
                ) : (
                  <button
                    type="button"
                    className="edu-btn edu-btn-primary"
                    onClick={() => claimAttend(webinar)}
                  >
                    I attended — collect {POINT_VALUES.webinar} points
                  </button>
                )}
              </>
            ) : open ? (
              <form
                className="edu-form"
                onSubmit={(event) => handleRegister(event, webinar)}
              >
                <label>
                  Full name
                  <input
                    name="name"
                    value={form.name}
                    onChange={(event) => {
                      setForm((prev) => ({ ...prev, name: event.target.value }));
                      setErrors((prev) => ({ ...prev, name: "" }));
                    }}
                  />
                  {errors.name ? <span>{errors.name}</span> : null}
                </label>
                <label>
                  Mobile (WhatsApp)
                  <input
                    name="mobile"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.mobile}
                    onChange={(event) => {
                      setForm((prev) => ({
                        ...prev,
                        mobile: event.target.value.replace(/\D/g, ""),
                      }));
                      setErrors((prev) => ({ ...prev, mobile: "" }));
                    }}
                  />
                  {errors.mobile ? <span>{errors.mobile}</span> : null}
                </label>
                <div className="edu-form-actions">
                  <button type="submit" className="edu-btn edu-btn-primary">
                    Confirm seat
                  </button>
                  <button
                    type="button"
                    className="edu-btn edu-btn-ghost"
                    onClick={() => setActiveId("")}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                className="edu-btn edu-btn-primary"
                onClick={() => setActiveId(webinar.id)}
              >
                Register free
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}

function QuizRunner({ quiz, onExit }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [award, setAward] = useState(null);
  const question = quiz.questions[index];
  const selected = picked[index];
  const score = quiz.questions.reduce(
    (sum, item, i) => sum + (picked[i] === item.answer ? 1 : 0),
    0
  );
  const total = quiz.questions.length;

  const finishQuiz = () => {
    const result = awardOnce(
      `quiz:${quiz.id}`,
      POINT_VALUES.quiz,
      `Quiz attempt: ${quiz.title}`
    );
    setAward(result);
    setShowResult(true);
  };

  if (showResult) {
    return (
      <article className="edu-panel-card">
        <p className="edu-badge">Quiz complete</p>
        <h2>
          You scored {score} / {total}
        </h2>
        <PointsEarnedBanner result={award} label="quiz" />
        <p>
          {score === total
            ? "Excellent — keep these habits going at home."
            : "Review the notes below, then try again whenever you like."}
        </p>
        <ol className="edu-review">
          {quiz.questions.map((item, i) => {
            const ok = picked[i] === item.answer;
            return (
              <li key={item.prompt} className={ok ? "is-ok" : "is-miss"}>
                <strong>{item.prompt}</strong>
                <em>
                  Your answer: {item.options[picked[i]] || "Not answered"}
                </em>
                {ok ? null : (
                  <em>Correct: {item.options[item.answer]}</em>
                )}
                <span>{item.why}</span>
              </li>
            );
          })}
        </ol>
        <div className="edu-form-actions">
          <button
            type="button"
            className="edu-btn edu-btn-primary"
            onClick={() => {
              setIndex(0);
              setPicked({});
              setShowResult(false);
            }}
          >
            Try again
          </button>
          <button type="button" className="edu-btn edu-btn-ghost" onClick={onExit}>
            All quizzes
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="edu-panel-card">
      <p className="edu-badge">
        Question {index + 1} of {total}
      </p>
      <h2>{quiz.title}</h2>
      <p className="edu-prompt">{question.prompt}</p>
      <div className="edu-options">
        {question.options.map((option, optionIndex) => (
          <button
            key={option}
            type="button"
            className={
              selected === optionIndex
                ? "edu-option is-selected"
                : "edu-option"
            }
            onClick={() =>
              setPicked((prev) => ({ ...prev, [index]: optionIndex }))
            }
          >
            {option}
          </button>
        ))}
      </div>
      <div className="edu-form-actions">
        {index > 0 ? (
          <button
            type="button"
            className="edu-btn edu-btn-ghost"
            onClick={() => setIndex((value) => value - 1)}
          >
            Previous
          </button>
        ) : (
          <button type="button" className="edu-btn edu-btn-ghost" onClick={onExit}>
            Back
          </button>
        )}
        {index < total - 1 ? (
          <button
            type="button"
            className="edu-btn edu-btn-primary"
            disabled={selected == null}
            onClick={() => setIndex((value) => value + 1)}
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            className="edu-btn edu-btn-primary"
            disabled={selected == null}
            onClick={finishQuiz}
          >
            See score
          </button>
        )}
      </div>
    </article>
  );
}

function QuizPanel() {
  const [quizId, setQuizId] = useState("");
  const quiz = QUIZZES.find((item) => item.id === quizId);

  if (quiz) {
    return <QuizRunner quiz={quiz} onExit={() => setQuizId("")} />;
  }

  return (
    <div className="edu-grid">
      {QUIZZES.map((item) => (
        <article key={item.id} className="edu-panel-card">
          <p className="edu-badge">Self-check</p>
          <h2>{item.title}</h2>
          <p>
            {item.questions.length} questions · about {item.minutes} minutes.
            Instant score and short explanations.
          </p>
          <button
            type="button"
            className="edu-btn edu-btn-primary"
            onClick={() => setQuizId(item.id)}
          >
            Start quiz · +{POINT_VALUES.quiz} pts
          </button>
        </article>
      ))}
    </div>
  );
}

function HealthEducation() {
  const [tab, setTab] = useState("guides");

  return (
    <>
      <style>{styles}</style>
      <div className="service-page info-page">
        <section className="service-hero">
          <div>
            <span className="service-kicker">MediHome Health Education</span>
            <h1>Guides, Live Webinars, And Quick Quizzes</h1>
            <p>
              Short, Plain-Language notes for Patients. This is
              education, not a personal prescription — Follow your Clinician.
            </p>
          </div>
        </section>

        <div className="edu-tabs" role="tablist" aria-label="Health education sections">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={tab === item.id ? "edu-tab is-active" : "edu-tab"}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "guides" ? <GuidesPanel /> : null}
        {tab === "webinars" ? <WebinarsPanel /> : null}
        {tab === "quiz" ? <QuizPanel /> : null}
        {tab === "refer" ? <ReferFamily /> : null}

        <p className="info-footnote">
          Need a test or refill?{" "}
          <a href="#labs">Book diagnostics</a> or{" "}
          <a href="#medicine-search">search medicines</a>.
        </p>
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
.info-stack,.edu-grid,.edu-tabs,.info-footnote,.points-refer-card{max-width:760px;margin-left:auto;margin-right:auto}
.info-card{background:#fff;border:1px solid #e4ecef;border-radius:12px;margin-bottom:10px;overflow:hidden}
.info-card-toggle{width:100%;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 16px;border:0;background:#fff;text-align:left;cursor:pointer;font-family:inherit;color:#143246}
.info-card-toggle strong{display:block;font-size:15px}
.info-card-toggle em{display:block;margin-top:4px;font-style:normal;color:#5d7180;font-size:13px;line-height:1.4;font-weight:400}
.info-card-chevron{flex:0 0 24px;height:24px;border-radius:6px;background:#e8f4f6;color:#1a6b7a;display:flex;align-items:center;justify-content:center;font-weight:800}
.info-card ul{margin:0;padding:0 16px 14px 34px;color:#34546b;font-size:14px;line-height:1.5}
.info-card li{margin-bottom:8px}
.info-card li:last-child{margin-bottom:0}
.info-footnote{margin:16px 2px 0;color:#5d7180;font-size:13px}
.info-footnote a{color:#1a6b7a;font-weight:700;text-decoration:none}
.edu-tabs{display:flex;gap:8px;margin:0 auto 14px;padding:4px;border-radius:12px;background:#e8f0f4}
.edu-tab{flex:1;min-height:42px;border:0;border-radius:9px;background:transparent;color:#34546b;font:inherit;font-size:14px;font-weight:800;cursor:pointer}
.edu-tab.is-active{background:#0639b8;color:#fff;box-shadow:0 3px 8px rgba(6,57,184,.22)}
.edu-grid{display:grid;gap:12px}
.edu-panel-card{padding:16px;border:1px solid #e4ecef;border-radius:14px;background:#fff;box-shadow:0 2px 8px rgba(20,50,70,.06)}
.edu-panel-card h2{margin:0 0 8px;font-size:18px;line-height:1.3}
.edu-panel-card p{margin:0 0 12px;color:#5d7180;font-size:14px;line-height:1.45}
.edu-badge{display:inline-block;margin:0 0 8px;padding:3px 8px;border-radius:999px;background:#e8f4f6;color:#1a6b7a;font-size:11px;font-weight:800;letter-spacing:.4px;text-transform:uppercase}
.edu-meta{margin:0 0 14px;padding:0;list-style:none;color:#34546b;font-size:13px;line-height:1.5}
.edu-meta li{margin-bottom:4px}
.edu-meta strong{display:inline-block;min-width:64px;color:#1a6b7a}
.edu-note{margin:0;padding:10px 12px;border-radius:8px;background:#eaf7ff;color:#143246;font-weight:700}
.edu-points-earned{margin:0 0 12px;padding:12px 14px;border-radius:10px;background:#0639b8;color:#fff;font-size:15px;font-weight:800;line-height:1.35}
.edu-form{display:grid;gap:10px}
.edu-form label{display:grid;gap:4px;font-size:12px;font-weight:700;color:#1a6b7a}
.edu-form input{min-height:40px;padding:8px 10px;border:1px solid #d7e2e9;border-radius:8px;font:inherit;font-size:14px;font-weight:500;color:#143246}
.edu-form span{color:#b42318;font-weight:700}
.edu-form-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
.edu-btn{appearance:none;min-height:40px;padding:8px 16px;border-radius:10px;font:inherit;font-size:14px;font-weight:800;cursor:pointer}
.edu-btn:disabled{opacity:.45;cursor:not-allowed}
.edu-btn-primary{border:2px solid #0639b8;background:#0639b8;color:#fff}
.edu-btn-ghost{border:2px solid #1a6b7a;background:#fff;color:#1a6b7a}
.edu-prompt{font-size:16px;font-weight:700;color:#143246}
.edu-options{display:grid;gap:8px;margin-bottom:14px}
.edu-option{width:100%;padding:12px 14px;border:2px solid #d7e2e9;border-radius:10px;background:#f7fbfc;color:#143246;font:inherit;font-size:14px;font-weight:600;text-align:left;cursor:pointer}
.edu-option.is-selected{border-color:#0639b8;background:#eaf0ff;color:#0639b8}
.edu-review{margin:0 0 14px;padding:0 0 0 18px;color:#34546b;font-size:13px;line-height:1.45}
.edu-review li{margin-bottom:12px}
.edu-review strong{display:block;margin-bottom:4px;color:#143246}
.edu-review em{display:block;font-style:normal;margin-bottom:2px}
.edu-review span{display:block;margin-top:4px;color:#5d7180}
.edu-review .is-ok em{color:#1a6b7a;font-weight:700}
.edu-review .is-miss em{color:#b42318}
@media (max-width:800px){.service-page{padding:14px}}
`;

export default HealthEducation;
