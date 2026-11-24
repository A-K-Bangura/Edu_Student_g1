import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { User } from "../types";
import type { LeaderboardEntry } from "../types/leaderboard";

// The nav shell and the network are replaced; the scope/scroll logic under test
// runs for real.
vi.mock("../components/layout/PageShell", () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("../services/auth", () => ({ getCurrentUser: vi.fn() }));
vi.mock("../services/profile", () => ({ getStudentProfile: vi.fn() }));
vi.mock("../services/leaderboard", () => ({
  getLeaderboard: vi.fn(),
  getUniversityLeaderboard: vi.fn(),
  getFacultyLeaderboard: vi.fn(),
  getDepartmentLeaderboard: vi.fn(),
  getOrganizationLeaderboard: vi.fn(),
}));

import { Leaderboard } from "./Leaderboard";
import { getCurrentUser } from "../services/auth";
import {
  getLeaderboard,
  getUniversityLeaderboard,
  getFacultyLeaderboard,
  getDepartmentLeaderboard,
  getOrganizationLeaderboard,
} from "../services/leaderboard";

const entries = (label: string): LeaderboardEntry[] =>
  [1, 2, 3].map((n) => ({
    rank: n,
    student_id: n,
    student_name: `${label} Learner ${n}`,
    xp_total: 1000 - n,
    badges_count: 0,
  }));

const page = (label: string) => ({ leaderboard: entries(label), total_users: 3 });

const group = (id: number) => ({ id, name: `Group ${id}` });

const user = (overrides: Partial<User> = {}): User => ({
  id: 42,
  email: "student@example.com",
  ...overrides,
});

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Leaderboard />
    </QueryClientProvider>
  );

const tab = (name: string) => screen.getByRole("button", { name });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getCurrentUser).mockReturnValue(
    user({ university: group(1), faculty: group(3), department: group(7) })
  );
  vi.mocked(getLeaderboard).mockResolvedValue(page("Overall"));
  vi.mocked(getUniversityLeaderboard).mockResolvedValue({
    ...page("University"),
    university: group(1),
  });
  vi.mocked(getFacultyLeaderboard).mockResolvedValue({
    ...page("Faculty"),
    faculty: group(3),
  });
  vi.mocked(getDepartmentLeaderboard).mockResolvedValue({
    ...page("Department"),
    department: group(7),
  });
  vi.mocked(getOrganizationLeaderboard).mockResolvedValue({
    ...page("Organization"),
    organization: group(9),
  });
  vi.spyOn(window, "scrollTo");
});

// Put back the real prototype methods spied on in the layout tests below.
afterEach(() => {
  vi.restoreAllMocks();
});

describe("Leaderboard — which board it opens on", () => {
  it("opens on the student's own department, not on overall", async () => {
    renderPage();

    expect(await screen.findByText("Department Learner 1")).toBeInTheDocument();
    expect(getDepartmentLeaderboard).toHaveBeenCalledWith(7, 50);
    // Overall is never even requested on the way in.
    expect(getLeaderboard).not.toHaveBeenCalled();

    expect(tab("Department")).toHaveAttribute("aria-pressed", "true");
    expect(tab("Overall")).toHaveAttribute("aria-pressed", "false");
  });

  it.each([
    [
      "faculty",
      { university: group(1), faculty: group(3) },
      getFacultyLeaderboard,
      3,
      "Faculty",
    ],
    [
      "university",
      { university: group(1) },
      getUniversityLeaderboard,
      1,
      "University",
    ],
    [
      "organization",
      { organization: group(9) },
      getOrganizationLeaderboard,
      9,
      "Organization",
    ],
  ] as const)(
    "falls back to the student's %s when their profile has no department",
    async (_scope, profile, service, id, label) => {
      vi.mocked(getCurrentUser).mockReturnValue(user({ ...profile }));

      renderPage();

      expect(await screen.findByText(`${label} Learner 1`)).toBeInTheDocument();
      expect(service).toHaveBeenCalledWith(id, 50);
      expect(getLeaderboard).not.toHaveBeenCalled();
      expect(tab(label)).toHaveAttribute("aria-pressed", "true");
    }
  );

  it("stays on overall when the student belongs to no group", async () => {
    vi.mocked(getCurrentUser).mockReturnValue(user());

    renderPage();

    expect(await screen.findByText("Overall Learner 1")).toBeInTheDocument();
    expect(getLeaderboard).toHaveBeenCalledWith(50);
    expect(getDepartmentLeaderboard).not.toHaveBeenCalled();
    expect(tab("Overall")).toHaveAttribute("aria-pressed", "true");
  });

  it("stays on overall when there's no stored user", async () => {
    vi.mocked(getCurrentUser).mockReturnValue(null);

    renderPage();

    expect(await screen.findByText("Overall Learner 1")).toBeInTheDocument();
  });

  it("still lets the student switch to the overall board, and back", async () => {
    renderPage();
    await screen.findByText("Department Learner 1");

    fireEvent.click(tab("Overall"));
    expect(await screen.findByText("Overall Learner 1")).toBeInTheDocument();
    expect(tab("Overall")).toHaveAttribute("aria-pressed", "true");
    expect(tab("Department")).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(tab("Department"));
    expect(await screen.findByText("Department Learner 1")).toBeInTheDocument();
  });

  it("only offers the Organization tab to a student who has an organization", async () => {
    const withoutOrg = renderPage();
    await screen.findByText("Department Learner 1");
    expect(screen.queryByRole("button", { name: "Organization" })).toBeNull();
    withoutOrg.unmount();

    vi.mocked(getCurrentUser).mockReturnValue(
      user({ department: group(7), organization: group(9) })
    );
    renderPage();
    await screen.findByText("Department Learner 1");
    expect(tab("Organization")).toBeInTheDocument();
  });
});

describe("Leaderboard — Your Position card", () => {
  // `GET /student/leaderboard*` returns no `user_position` today, so this card
  // never appears in production; it is covered here so that it is right the day
  // the API sends one. Its translucent fills used the removed
  // `bg-opacity-*` / `text-opacity-*` utilities (solid white in Tailwind v4).
  const position = { rank: 12, xp_total: 3400, percentile: 97.6 };

  const showCardFor = async () => {
    vi.mocked(getDepartmentLeaderboard).mockResolvedValue({
      ...page("Department"),
      department: group(7),
      user_position: position,
    });
    renderPage();
    const heading = await screen.findByRole("heading", { name: "Your Position" });
    return heading.parentElement as HTMLElement;
  };

  it("shows the student's rank, XP and percentile", async () => {
    const card = await showCardFor();

    expect(within(card).getByText("Rank #12")).toBeInTheDocument();
    expect(within(card).getByText("3,400 XP")).toBeInTheDocument();
    expect(within(card).getByText("97.6%")).toBeInTheDocument();
    expect(within(card).getByText(/Top\s+2\.4\s*%/)).toBeInTheDocument();
  });

  it("is left out when the API sends no position", async () => {
    renderPage();
    await screen.findByText("Department Learner 1");

    expect(screen.queryByRole("heading", { name: "Your Position" })).not.toBeInTheDocument();
  });

  it("uses colours that work in Tailwind v4: no removed opacity utilities, and fills dark enough to read", async () => {
    const card = await showCardFor();

    expect(card.outerHTML).not.toMatch(/-opacity-\d/);
    // Rank badge is a darkened translucent disc; secondary labels are 95% white.
    expect(within(card).getByText("#12").className).toContain("bg-black/20");
    expect(within(card).getByText("Percentile").className).toContain("text-white/95");
    // White text needs the darker gradient start to reach AA contrast.
    expect(card.className).toContain("from-azure-400");
    expect(card.className).not.toContain("from-azure-500");
  });
});

describe("Leaderboard — scope tabs on a narrow screen", () => {
  // jsdom has no layout, so give the strip and the selected tab boxes by hand.
  const box = (left: number, right: number) =>
    ({ left, right, top: 0, bottom: 0, width: right - left, height: 0, x: left, y: 0 }) as DOMRect;

  const stubLayout = (
    strip: [number, number],
    selectedTab: () => [number, number]
  ) =>
    vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        if (this.getAttribute("role") === "group") return box(...strip);
        if (this.getAttribute("aria-pressed") === "true") return box(...selectedTab());
        return box(0, 0);
      });

  const strip = () => screen.getByRole("group", { name: "Leaderboard scope" });

  it("scrolls the strip sideways until the landing tab is fully in view", async () => {
    // The Department tab ends 39px past the strip's right edge (a 375px phone).
    stubLayout([32, 343], () => [281, 382]);

    renderPage();
    await screen.findByText("Department Learner 1");

    expect(strip().scrollLeft).toBe(39);
  });

  it("leaves the strip alone when the selected tab is already in view", async () => {
    stubLayout([32, 343], () => [100, 200]);

    renderPage();
    await screen.findByText("Department Learner 1");

    expect(strip().scrollLeft).toBe(0);
  });

  it("brings a tab back into view when selecting it from the left edge", async () => {
    let selected: [number, number] = [100, 200];
    stubLayout([32, 343], () => selected);
    renderPage();
    await screen.findByText("Department Learner 1");

    // Strip has been scrolled right; Overall now sits 50px past the left edge.
    strip().scrollLeft = 120;
    selected = [-18, 60];
    fireEvent.click(tab("Overall"));
    await screen.findByText("Overall Learner 1");

    expect(strip().scrollLeft).toBe(70);
  });

  it("never scrolls the page itself to do it", async () => {
    stubLayout([32, 343], () => [281, 382]);
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");

    renderPage();
    await screen.findByText("Department Learner 1");

    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});

describe("Leaderboard — scroll position", () => {
  // The router never resets the window's scroll, so a link near the bottom of
  // the Dashboard used to open this page part-way down the list.
  it("puts the window back at the top when the page opens", async () => {
    renderPage();
    await screen.findByText("Department Learner 1");

    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  });

  it("does that before showing any list, not after the data arrives", () => {
    // Nothing has loaded yet at this point, so the reset can't be waiting on it.
    vi.mocked(getDepartmentLeaderboard).mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.queryByText("Department Learner 1")).toBeNull();
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
  });

  // Back/Forward: the browser re-applies the offset a history entry had when it
  // was left, after the page has rendered — so the reset alone isn't enough.
  it("stops the browser restoring an old offset while the page is open, and hands that back on leave", async () => {
    window.history.scrollRestoration = "auto";

    const { unmount } = renderPage();
    await screen.findByText("Department Learner 1");
    expect(window.history.scrollRestoration).toBe("manual");

    unmount();
    expect(window.history.scrollRestoration).toBe("auto");
  });

  it("doesn't leak 'manual' onto the next page when it was reopened via Back on an entry that was already manual", async () => {
    // Coming back to this history entry finds it already "manual" (set during
    // the first visit). Restoring "whatever it was on mount" would then leave
    // every page visited after it un-restorable.
    window.history.scrollRestoration = "manual";

    const { unmount } = renderPage();
    await screen.findByText("Department Learner 1");
    unmount();

    expect(window.history.scrollRestoration).toBe("auto");
  });

  it("doesn't yank the page back up when the student switches boards", async () => {
    renderPage();
    await screen.findByText("Department Learner 1");
    vi.mocked(window.scrollTo).mockClear();

    fireEvent.click(tab("Overall"));
    await screen.findByText("Overall Learner 1");
    await waitFor(() => expect(getLeaderboard).toHaveBeenCalled());

    expect(window.scrollTo).not.toHaveBeenCalled();
  });
});
