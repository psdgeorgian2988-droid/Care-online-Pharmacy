import { useLayoutMode } from "./useLayoutMode";

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

function rotatingSlides(start) {
  const rotated = [
    ...ABOUT_SLIDES.slice(start),
    ...ABOUT_SLIDES.slice(0, start),
  ];
  return [...rotated, ...rotated];
}

export default function HomeAboutSlides({ side = "left" } = {}) {
  const layout = useLayoutMode();
  if (layout === "laptop") return null;
  const start = side === "right" ? 3 : 0;
  const slides = rotatingSlides(start);

  return (
    <aside
      className={`home-side-slides is-${side}`}
      aria-label={`MediHome ${side} highlights`}
    >
      <div className="home-side-slides-track" aria-hidden="true">
        {slides.map((slide, index) => (
          <article className="home-side-slide" key={`${side}-${slide.title}-${index}`}>
            <img src={slide.image} alt="" decoding="async" />
            <div className="home-side-slide-copy">
              <p className="home-side-slide-kicker">MediHome</p>
              <h3>{slide.title}</h3>
              <p>{slide.text}</p>
            </div>
          </article>
        ))}
      </div>
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
