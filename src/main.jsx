import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import ErrorBoundary from "./ErrorBoundary";
import { bootstrapNativeShell } from "./nativeShell.js";
import { registerPwa } from "./registerPwa";

registerPwa();
bootstrapNativeShell();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
    <App />
    </ErrorBoundary>
  </StrictMode>
);
