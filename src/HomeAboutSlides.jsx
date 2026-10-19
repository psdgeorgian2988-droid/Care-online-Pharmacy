import { useEffect, useState } from "react";

const ABOUT_SLIDES = [
  {
    title: "MediHome",
    text: "Your complete healthcare ecosystem at your doorstep.",
    image: "/app/welcome-medicines-wide.png",
  },
  {
    title: "Medicines",
    text: "Genuine generics and branded medicines, cash on delivery.",
    image: "/app/welcome-medicines-wide.png",
  },
  {
    title: "Home Care",
    text: "Nurse, caregiver, and physiotherapy visits at home.",
    image: "/app/welcome-nurse-wide.png",
  },
  {
    title: "Diagnostics",
    text: "Lab collection and radiology booking across Delhi NCR.",
    image: "/app/welcome-lab-wide.png",
  },
  {
    title: "Emergency",
    text: "Ambulance and step-down recovery when you need them.",
    image: "/app/welcome-ambulance-wide.png",
  },
  {
    title: "Trusted Care",
    text: "Patients rate MediHome for timing, packaging, and support.",
    image: "/app/welcome-physio-wide.png",
  },
];

const HOLD_MS = 4200;
const FADE_MS = 700;

export default function HomeAboutSlides({ side = "left" } = {}) {
  const start = side === "right" ? 2 : 0;
  const [index, setIndex] = useState(start);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIndex((current) => (current + 1) % ABOUT_SLIDES.length);
    }, HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [index]);

  const slide = ABOUT_SLIDES[index] || ABOUT_SLIDES[0];

  return (
    <aside
      className={`home-side-slides is-${side}`}
      aria-label={`MediHome ${side} highlights`}
    >
      <article
        className="home-side-slide"
        style={{ "--slide-fade-ms": `${FADE_MS}ms` }}
      >
        <img src={slide.image} alt="" decoding="async" />
        <div className="home-side-slide-copy">
          <p className="home-side-slide-kicker">MediHome</p>
          <h3>{slide.title}</h3>
          <p>{slide.text}</p>
        </div>
      </article>
    </aside>
  );
}

export function HomeWithAboutSlides({ children }) {
  return (
    <div className="home-with-side-slides">
      <HomeAboutSlides side="left" />
      <div className="home-with-side-slides-main">{children}</div>
      <HomeAboutSlides side="right" />
    </div>
  );
}
