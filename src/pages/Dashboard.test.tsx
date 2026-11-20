import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Roadmap, RoadmapList } from "../types/roadmap";
import type { DashboardData, Enrollment } from "../types/dashboard";

// The page's network and auth dependencies are replaced; the section/ordering
// logic under test runs for real.

vi.mock("../components/layout/PageShell", () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("../components/course/CourseCard", () => ({
  CourseCard: ({ course }: { course: { title: string } }) => (
    <div data-testid="course-card">{course.title}</div>
  ),
}));
vi.mock("../services/auth", () => ({ isAuthenticated: vi.fn() }));
vi.mock("../services/roadmaps", () => ({ getRoadmaps: vi.fn() }));
vi.mock("../services/dashboard", () => ({
  getDashboard: vi.fn(),
  getEnrolledCourses: vi.fn(),
}));
vi.mock("../services/courses", () => ({ getRecommendedCourses: vi.fn() }));

import { Dashboard } from "./Dashboard";
import { isAuthenticated } from "../services/auth";
import { getRoadmaps } from "../services/roadmaps";
import { getDashboard, getEnrolledCourses } from "../services/dashboard";
import { getRecommendedCourses } from "../services/courses";

const roadmap = (overrides: Partial<Roadmap> = {}): Roadmap => ({
  id: 1,
  uuid: "uuid-1",
  slug: "se-path",
  title: "Software Engineering Path",
  description: null,
  thumbnail_url: null,
  published_at: null,
  level: null,
  semester: null,
  university: null,
  faculty: null,
  department: null,
  organization: null,
  total_courses: 8,
  is_participant: true,
  is_completed: false,
  progress: { completed_courses: 3, total_courses: 8, percent: 37.5 },
  current_course: null,
  badge: null,
  ...overrides,
});

const list = (data: Roadmap[]): RoadmapList => ({
  data,
  meta: {
    current_page: 1,
    last_page: 1,
    per_page: 50,
    total: data.length,
    from: data.length ? 1 : null,
    to: data.length || null,
  },
});

// Only the fields the dashboard reads; the cast keeps the fixture honest about
// being partial rather than inventing every unused field.
const enrollment = {
  id: 7,
  uuid: "enr-7",
  progress_percent: 40,
  course: { id: 3, title: "Intro to Algorithms" },
} as unknown as Enrollment;

const renderDashboard = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>
  );

/** True when `a` comes before `b` in the document. */
const isBefore = (a: Element, b: Element) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  vi.mocked(isAuthenticated).mockReturnValue(true);
  vi.mocked(getDashboard).mockResolvedValue({
    student: { name: "Amara Kamara", total_xp: 10 },
    stats: {},
  } as unknown as DashboardData);
  vi.mocked(getEnrolledCourses).mockResolvedValue([enrollment]);
  vi.mocked(getRecommendedCourses).mockResolvedValue([]);
});

describe("Dashboard — My Roadmaps", () => {
  it("shows in-progress roadmaps above Continue Learning, which is above My Courses", async () => {
    vi.mocked(getRoadmaps).mockResolvedValue(list([roadmap()]));

    renderDashboard();

    const roadmaps = await screen.findByRole("heading", { name: "My Learning Journeys" });
    const continueLearning = await screen.findByRole("heading", {
      name: "Continue Learning",
    });
    const myCourses = screen.getByRole("heading", { name: "My Courses" });

    expect(isBefore(roadmaps, continueLearning)).toBe(true);
    expect(isBefore(continueLearning, myCourses)).toBe(true);
    expect(screen.getByRole("link", { name: /Software Engineering Path/ })).toHaveAttribute(
      "href",
      "/roadmaps/se-path"
    );
  });

  it("leaves the section out when the student has no in-progress roadmap", async () => {
    vi.mocked(getRoadmaps).mockResolvedValue(
      list([roadmap({ is_participant: false, progress: null })])
    );

    renderDashboard();

    // The rest of the page still renders as before.
    expect(
      await screen.findByRole("heading", { name: "Continue Learning" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "My Courses" })).toBeInTheDocument();
    await waitFor(() => expect(getRoadmaps).toHaveBeenCalled());
    expect(screen.queryByRole("heading", { name: "My Learning Journeys" })).toBeNull();
  });

  it("still renders the dashboard when the roadmaps request fails", async () => {
    vi.mocked(getRoadmaps).mockRejectedValue(new Error("Network Error"));

    renderDashboard();

    expect(
      await screen.findByRole("heading", { name: "My Courses" })
    ).toBeInTheDocument();
    await waitFor(() => expect(getRoadmaps).toHaveBeenCalled());
    expect(screen.queryByRole("heading", { name: "My Learning Journeys" })).toBeNull();
  });
});
