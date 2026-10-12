import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./App.css";
import "./index.css";
import "katex/dist/katex.min.css";

// `__TEASER_MODE__` is a build-time constant (vite.config.ts). In a teaser
// build the bundler drops the `./App` branch, so none of the app's pages are
// emitted, precached by the service worker, or served.
const loadRoot = () =>
  __TEASER_MODE__ ? import("./TeaserApp") : import("./App");

const rootElement = document.getElementById("root")!;

loadRoot()
  .then(({ default: Root }) => {
    createRoot(rootElement).render(
      <StrictMode>
        <Root />
      </StrictMode>
    );
  })
  .catch((error: unknown) => {
    console.error("Failed to load UniVybe", error);
    rootElement.textContent =
      "UniVybe couldn't load. Check your connection and refresh the page.";
  });
