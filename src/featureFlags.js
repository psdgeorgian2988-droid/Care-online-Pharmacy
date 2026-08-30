import { useEffect, useState } from "react";
import { DEFAULT_FEATURES, mergeFeatures } from "./salesReport";
import { cacheWebinars, readCachedWebinars, WEBINAR_EVENT } from "./webinars";

const EVENT = "medihome-features";

export function readCachedFeatures() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem("mediHomeFeatures") || "null");
    return mergeFeatures(parsed);
  } catch {
    return { ...DEFAULT_FEATURES };
  }
}

function cacheFeatures(features) {
  try {
    sessionStorage.setItem("mediHomeFeatures", JSON.stringify(features));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: features }));
}

export async function fetchPublicFeatures() {
  const data = await fetch("/api/features").then((res) => res.json());
  const features = mergeFeatures(data.features);
  cacheFeatures(features);
  cacheWebinars(data.webinars);
  return features;
}

export function useFeatures() {
  const [features, setFeatures] = useState(readCachedFeatures);
  useEffect(() => {
    fetchPublicFeatures().catch(() => {});
    const onUpdate = (event) => setFeatures(mergeFeatures(event.detail));
    window.addEventListener(EVENT, onUpdate);
    return () => window.removeEventListener(EVENT, onUpdate);
  }, []);
  return features;
}

export function useScheduledWebinars() {
  const [webinars, setWebinars] = useState(readCachedWebinars);
  useEffect(() => {
    fetchPublicFeatures().catch(() => {});
    const onUpdate = (event) => setWebinars(Array.isArray(event.detail) ? event.detail : []);
    window.addEventListener(WEBINAR_EVENT, onUpdate);
    return () => window.removeEventListener(WEBINAR_EVENT, onUpdate);
  }, []);
  return webinars;
}

export { cacheFeatures };
