import { useEffect, useState } from "react";
import SlideshowReviews from "./SlideshowReviews";

const SLIDES = [
  "/app/welcome-medicines-wide.png",
  "/app/welcome-nurse-wide.png",
  "/app/welcome-caretaker-wide.png",
  "/app/welcome-physio-wide.png",
  "/app/welcome-ambulance-wide.png",
  "/app/welcome-lab-wide.png",
];

const HOLD_MS = 4000;
const FADE_MS = 900;

export default function WelcomeSlideshow() {
  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState(null);

  useEffect(() => {
    SLIDES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPrev(index);
      setIndex((current) => (current + 1) % SLIDES.length);
    }, HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [index]);

  useEffect(() => {
    if (prev === null) return undefined;
    const timer = window.setTimeout(() => setPrev(null), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [prev]);

  return (
    <div className="app-first-slideshow" style={{ "--slide-fade-ms": `${FADE_MS}ms` }}>
      {prev !== null ? (
        <img
          key={`prev-${prev}`}
          className="app-first-hero app-first-slide is-exit"
          src={SLIDES[prev]}
          alt=""
          decoding="async"
        />
      ) : null}
      <img
        key={`curr-${index}`}
        className={`app-first-hero app-first-slide${prev !== null ? " is-enter" : " is-show"}`}
        src={SLIDES[index]}
        alt=""
        decoding="async"
      />
      <SlideshowReviews />
    </div>
  );
}
