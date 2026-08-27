import { useEffect, useState } from "react";
import { DEFAULT_FEATURES, mergeFeatures } from "./salesReport";

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

export { cacheFeatures };
