import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import ErrorBoundary from "./ErrorBoundary";
import { bootstrapNativeShell } from "./nativeShell.js";
import { bootAppPreview } from "./appRuntime.js";
import { registerPwa } from "./registerPwa";
import { bootLayoutMode } from "./layoutMode.js";
import { startDoseAlarms } from "./doseAlarm.js";
import DoseAlarmScreen from "./DoseAlarmScreen.jsx";

if (typeof document !== "undefined") {
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.colorScheme = "light";
}

if (typeof globalThis.resetCustomerDataThroughToday !== "function") {
  globalThis.resetCustomerDataThroughToday = function resetCustomerDataThroughToday() {};
}

bootLayoutMode();
startDoseAlarms();
bootAppPreview();
registerPwa();
bootstrapNativeShell();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
    <App />
    <DoseAlarmScreen />
    </ErrorBoundary>
  </StrictMode>
);
