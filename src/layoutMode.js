const LAYOUT_EVENT = "medihome-layout";

function measure() {
  const width = window.innerWidth || document.documentElement.clientWidth || 0;
  const height = window.innerHeight || document.documentElement.clientHeight || 0;
  const aspect = height > 0 ? width / height : 1;
  return { width, height, aspect };
}

/**
 * Website layout follows orientation:
 * - horizontal / landscape (width >= height) → desktop (laptop)
 * - vertical / portrait (height > width) → mobile (phone)
 */
export function resolveLayoutMode({ width, height, aspect } = measure()) {
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  if (h > w) return "phone";
  if (aspect > 0 && aspect < 1) return "phone";
  return "laptop";
}

export function applyLayoutMode(env = globalThis) {
  const { width, height, aspect } = measure();
  const mode = resolveLayoutMode({ width, height, aspect });
  const orientation = height > width ? "portrait" : "landscape";
  const root = env.document?.documentElement;
  if (!root) return mode;

  root.setAttribute("data-layout", mode);
  root.setAttribute("data-orientation", orientation);
  root.style.setProperty("--layout-w", `${width}px`);
  root.style.setProperty("--layout-h", `${height}px`);
  root.style.setProperty("--layout-aspect", aspect.toFixed(4));
  root.style.setProperty("--vh", `${height * 0.01}px`);
  root.style.setProperty("--vw", `${width * 0.01}px`);

  try {
    env.dispatchEvent?.(
      new CustomEvent(LAYOUT_EVENT, {
        detail: { mode, orientation, width, height, aspect },
      })
    );
  } catch {
    /* ignore */
  }
  return mode;
}

export function bootLayoutMode(env = globalThis) {
  applyLayoutMode(env);
  const onChange = () => applyLayoutMode(env);
  env.addEventListener?.("resize", onChange);
  env.addEventListener?.("orientationchange", onChange);
  env.visualViewport?.addEventListener?.("resize", onChange);
  return () => {
    env.removeEventListener?.("resize", onChange);
    env.removeEventListener?.("orientationchange", onChange);
    env.visualViewport?.removeEventListener?.("resize", onChange);
  };
}
