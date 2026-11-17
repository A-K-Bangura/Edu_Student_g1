import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { InstallPrompt } from "./InstallPrompt";
import { initInstallPrompt } from "../../utils/pwaInstall";

const IOS_SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

const fireBeforeInstallPrompt = (outcome: "accepted" | "dismissed" = "accepted") => {
  const prompt = vi.fn().mockResolvedValue(undefined);
  const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt,
    userChoice: Promise.resolve({ outcome, platform: "web" }),
  });
  act(() => {
    window.dispatchEvent(event);
  });
  return { event, prompt };
};

const renderAt = (path = "/") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <InstallPrompt />
    </MemoryRouter>
  );

const getBanner = () => screen.queryByRole("region", { name: "Install UniVybe" });

const pretendInstalledAsApp = () =>
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("display-mode: standalone"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList
  );

let teardown: () => void;

beforeEach(() => {
  teardown = initInstallPrompt(); // main.tsx does this once at startup
});

afterEach(() => {
  teardown(); // removes listeners and forgets any captured event
  vi.restoreAllMocks();
  delete (navigator as { standalone?: boolean }).standalone;
});

describe("InstallPrompt", () => {
  it("shows nothing when the browser hasn't offered installation", () => {
    renderAt();

    expect(getBanner()).toBeNull();
  });

  it("offers Install when the browser says the app is installable, and silences the browser's own prompt", () => {
    renderAt();
    const { event } = fireBeforeInstallPrompt();

    expect(getBanner()).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Install app" })).toBeInTheDocument();
    expect(event.defaultPrevented).toBe(true);
  });

  it("still offers Install when the browser's event fired before the banner mounted", () => {
    // The event is one-shot and fires during startup, possibly while a lazy
    // route is loading. This is the case that made the prompt unreliable.
    fireBeforeInstallPrompt();

    renderAt();

    expect(getBanner()).toBeInTheDocument();
  });

  it("opens the browser's install dialog on Install, then goes away", async () => {
    const user = userEvent.setup();
    renderAt();
    const { prompt } = fireBeforeInstallPrompt("accepted");

    await user.click(screen.getByRole("button", { name: "Install app" }));

    expect(prompt).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(getBanner()).toBeNull());
  });

  it("stays away for the rest of the visit after the user cancels the browser dialog", async () => {
    const user = userEvent.setup();
    renderAt();
    fireBeforeInstallPrompt("dismissed");

    await user.click(screen.getByRole("button", { name: "Install app" }));
    await waitFor(() => expect(getBanner()).toBeNull());

    // Chrome may hand over a fresh event later; don't nag straight away.
    fireBeforeInstallPrompt();
    expect(getBanner()).toBeNull();
  });

  it("closes for this visit but comes back on the next one", async () => {
    const user = userEvent.setup();
    const first = renderAt();
    fireBeforeInstallPrompt();

    await user.click(screen.getByRole("button", { name: "Close install prompt" }));
    expect(getBanner()).toBeNull();

    // Same visit (navigating between pages remounts the banner): still closed.
    first.unmount();
    const sameVisit = renderAt("/courses");
    expect(getBanner()).toBeNull();

    // The next visit is a fresh page load: module state starts empty and the
    // browser sends a new install event, so the prompt is shown again. It must
    // not be remembered anywhere that survives a reload (e.g. a tab that stays
    // open for days on a phone).
    sameVisit.unmount();
    teardown();
    teardown = initInstallPrompt();
    renderAt();
    fireBeforeInstallPrompt();
    expect(getBanner()).toBeInTheDocument();
  });

  it("never shows when the app is already running installed", () => {
    pretendInstalledAsApp();
    renderAt();

    fireBeforeInstallPrompt();

    expect(getBanner()).toBeNull();
  });

  it("goes away once the app has been installed", () => {
    renderAt();
    fireBeforeInstallPrompt();
    expect(getBanner()).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });

    expect(getBanner()).toBeNull();
  });

  it("stays out of the lesson player but shows on other pages", () => {
    fireBeforeInstallPrompt();

    const player = renderAt("/course/12/play");
    expect(getBanner()).toBeNull();
    player.unmount();

    const lesson = renderAt("/course/12/module/3/lesson/4");
    expect(getBanner()).toBeNull();
    lesson.unmount();

    renderAt("/course/12");
    expect(getBanner()).toBeInTheDocument();
  });

  describe("on iOS, where the browser can't be prompted", () => {
    beforeEach(() => {
      vi.spyOn(navigator, "userAgent", "get").mockReturnValue(IOS_SAFARI_UA);
    });

    it("explains Share → Add to Home Screen instead of offering a button", () => {
      renderAt();

      expect(getBanner()).toBeInTheDocument();
      expect(screen.getByText("Add to Home Screen")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Install app" })).toBeNull();
    });

    it("hides once launched from the home screen", () => {
      Object.defineProperty(navigator, "standalone", {
        value: true,
        configurable: true,
      });

      renderAt();

      expect(getBanner()).toBeNull();
    });

    it("can be closed for the visit", async () => {
      const user = userEvent.setup();
      renderAt();

      await user.click(screen.getByRole("button", { name: "Close install prompt" }));

      expect(getBanner()).toBeNull();
    });
  });
});
