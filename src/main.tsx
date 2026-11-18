import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./App.css";
import "./index.css";
import "katex/dist/katex.min.css";
import App from "./App.tsx";
import { initInstallPrompt } from "./utils/pwaInstall";

// Before the first render: the browser's install event fires once, possibly
// while a lazy route is still loading, and isn't re-sent to late listeners.
initInstallPrompt();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
