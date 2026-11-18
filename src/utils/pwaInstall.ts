/**
 * Install-as-app support.
 *
 * Chromium browsers (Chrome/Edge/Samsung Internet, Android and desktop) fire a
 * one-shot `beforeinstallprompt` event once the app is installable and not yet
 * installed. If nothing listens, the browser falls back to its own heuristics
 * (a small omnibox icon, an occasional mini-infobar that is withheld after a
 * dismissal), which is why the prompt felt inconsistent. Listening lets the app
 * hold the event and offer its own "Install" button on every visit.
 *
 * The listener must be attached before React renders (see `main.tsx`), because
 * the event can fire while a lazy route is still loading and is never re-sent
 * to late listeners. iOS Safari never fires it, so iOS gets instructions
 * instead (see `useInstallPrompt`).
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface InstallPromptState {
  /** Held until the user taps Install; `prompt()` works once per event. */
  deferredPrompt: BeforeInstallPromptEvent | null;
  /** Set by `appinstalled` (accepted, or installed from the browser menu). */
  installed: boolean;
  /**
   * The visitor closed the prompt. Deliberately in memory only (not storage):
   * it resets on every page load, so the prompt returns on each visit, and it
   * survives route changes and remounts within one.
   */
  dismissed: boolean;
}

const INITIAL_STATE: InstallPromptState = {
  deferredPrompt: null,
  installed: false,
  dismissed: false,
};

let state: InstallPromptState = INITIAL_STATE;
const listeners = new Set<() => void>();
let teardown: (() => void) | null = null;

const setState = (next: InstallPromptState) => {
  state = next;
  listeners.forEach((listener) => listener());
};

export const subscribeInstallPrompt = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getInstallPromptState = (): InstallPromptState => state;

/**
 * Starts listening for the browser's install events. Idempotent: calling it
 * again returns the same teardown. The app never tears it down; tests do, which
 * also resets the captured state.
 */
export const initInstallPrompt = (): (() => void) => {
  if (teardown) return teardown;

  const onBeforeInstallPrompt = (event: Event) => {
    // Stop the browser showing its own (inconsistent) prompt; we show ours.
    event.preventDefault();
    setState({ ...state, deferredPrompt: event as BeforeInstallPromptEvent });
  };
  const onAppInstalled = () => {
    setState({ ...state, deferredPrompt: null, installed: true });
  };

  window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  window.addEventListener("appinstalled", onAppInstalled);

  teardown = () => {
    window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.removeEventListener("appinstalled", onAppInstalled);
    teardown = null;
    setState(INITIAL_STATE);
  };
  return teardown;
};

/** Hides the prompt until the next page load. */
export const dismissInstallPrompt = () => {
  if (!state.dismissed) setState({ ...state, dismissed: true });
};

export type InstallOutcome = "accepted" | "dismissed" | "unavailable";

/** Shows the browser's install dialog. Must be called from a user gesture. */
export const promptInstall = async (): Promise<InstallOutcome> => {
  const event = state.deferredPrompt;
  if (!event) return "unavailable";

  // An event can only be prompted once; drop it so the UI can't offer it again.
  setState({ ...state, deferredPrompt: null });
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    return outcome;
  } catch {
    return "dismissed";
  }
};

/** True when running as an installed app rather than in a browser tab. */
export const isRunningInstalled = (): boolean =>
  window.matchMedia("(display-mode: standalone)").matches ||
  // iOS Safari's own flag for a home-screen launch.
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** iPhone/iPad, including iPadOS, which reports itself as a Mac. */
export const isIosDevice = (): boolean =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
