// Extends Vitest's `expect` with jest-dom matchers (toBeInTheDocument, etc.)
// Runs before every test file (see vitest.config.ts's `setupFiles`).
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom doesn't implement matchMedia, and GSAP/ScrollTrigger call it at import
// time. Report "no match" for every query, so media-query-driven animation
// never activates under test and components render in their final state.
if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// jsdom's window.scrollTo only logs "not implemented"; a no-op keeps test
// output clean and lets tests spy on it (see useScrollToTopOnMount).
window.scrollTo = (() => {}) as typeof window.scrollTo;

// jsdom doesn't implement scrollIntoView (used by the roadmap journey to jump
// to a stage / the current course).
if (typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom has no PointerEvent. Swipe handling reads pointerId / pointerType /
// isPrimary off it, so without this those are undefined on every test event.
if (typeof window.PointerEvent !== "function") {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    isPrimary: boolean;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? "mouse";
      this.isPrimary = init.isPrimary ?? true;
    }
  }
  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}

// `globals` is off in vitest.config.ts, so React Testing Library can't
// register its own auto-cleanup — unmount rendered trees between tests.
afterEach(() => {
  cleanup();
});
