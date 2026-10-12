import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { TeaserRoutes } from "./TeaserApp";

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <TeaserRoutes />
    </MemoryRouter>,
  );

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("Teaser routes", () => {
  it("serves the landing page at /", () => {
    renderAt("/");

    expect(
      screen.getByRole("heading", { level: 1, name: /a new vibe for learning and student life/i }),
    ).toBeInTheDocument();
  });

  it.each([
    "/auth/login",
    "/auth/signup",
    "/courses",
    "/course/some-course/play",
    "/roadmaps/some-roadmap",
    "/resources",
    "/feed",
    "/feed/gigs/12",
    "/wallet",
    "/dashboard",
    "/profile",
    "/no/such/page",
  ])("shows 'coming soon' instead of %s", async (path) => {
    renderAt(path);

    expect(await screen.findByText(/coming soon/i, { selector: "p" })).toBeInTheDocument();
    // …and never the landing page or a redirect to it.
    expect(
      screen.queryByRole("heading", { name: /a new vibe for learning and student life/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps showing the landing page to a visitor with a stale session", () => {
    // The full app would bounce a signed-in student from / to /dashboard.
    localStorage.setItem("auth_token", "stale-token");
    renderAt("/");

    expect(
      screen.getByRole("heading", { level: 1, name: /a new vibe for learning and student life/i }),
    ).toBeInTheDocument();
  });

  it("scrolls to the top when a landing-page link opens 'coming soon'", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const user = userEvent.setup();
    renderAt("/");
    expect(scrollTo).not.toHaveBeenCalled(); // first render: nothing to reset

    await user.click(screen.getAllByRole("link", { name: "Get started" })[0]);

    expect(
      await screen.findByRole("heading", { level: 1, name: /cutting the keys/i }),
    ).toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("does not redirect a stale session away from 'coming soon' either", async () => {
    localStorage.setItem("auth_token", "stale-token");
    renderAt("/dashboard");

    expect(
      await screen.findByRole("heading", { level: 1, name: /dashboard is getting a glow-up/i }),
    ).toBeInTheDocument();
  });
});
