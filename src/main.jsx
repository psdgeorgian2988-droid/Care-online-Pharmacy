import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import ErrorBoundary from "./ErrorBoundary";
import { bootstrapNativeShell } from "./nativeShell.js";
import { bootAppPreview } from "./appRuntime.js";
import { registerPwa } from "./registerPwa";
import { bootLayoutMode } from "./layoutMode.js";

if (typeof document !== "undefined") {
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.colorScheme = "light";
}

bootLayoutMode();
bootAppPreview();
registerPwa();
bootstrapNativeShell();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
    <App />
    </ErrorBoundary>
  </StrictMode>
);
