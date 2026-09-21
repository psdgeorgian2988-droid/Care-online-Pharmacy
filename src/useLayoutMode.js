import { useEffect, useState } from "react";

const LAYOUT_EVENT = "medihome-layout";

function readLayout() {
  if (typeof document === "undefined") return "laptop";
  const value = document.documentElement.getAttribute("data-layout");
  if (value === "phone" || value === "tablet" || value === "laptop") return value;
  return "laptop";
}

export function useLayoutMode() {
  const [layout, setLayout] = useState(readLayout);

  useEffect(() => {
    setLayout(readLayout());
    const onLayout = (event) => {
      const next = event?.detail?.mode;
      if (next === "phone" || next === "tablet" || next === "laptop") {
        setLayout(next);
        return;
      }
      setLayout(readLayout());
    };
    window.addEventListener(LAYOUT_EVENT, onLayout);
    return () => window.removeEventListener(LAYOUT_EVENT, onLayout);
  }, []);

  return layout;
}

export function useIsPhoneLayout() {
  return useLayoutMode() === "phone";
}
