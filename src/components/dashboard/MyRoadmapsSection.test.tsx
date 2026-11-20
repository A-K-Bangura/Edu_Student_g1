import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Roadmap, RoadmapList } from "../../types/roadmap";

vi.mock("../../services/auth", () => ({ isAuthenticated: vi.fn() }));
vi.mock("../../services/roadmaps", () => ({ getRoadmaps: vi.fn() }));

import { MyRoadmapsSection } from "./MyRoadmapsSection";
import { isAuthenticated } from "../../services/auth";
import { getRoadmaps } from "../../services/roadmaps";

const roadmap = (id: number, overrides: Partial<Roadmap> = {}): Roadmap => ({
  id,
  uuid: `uuid-${id}`,
  slug: `path-${id}`,
  title: `Roadmap ${id}`,
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

const renderSection = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <MyRoadmapsSection />
      </MemoryRouter>
    </QueryClientProvider>
  );

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(isAuthenticated).mockReturnValue(true);
});

describe("MyRoadmapsSection", () => {
  it("shows the student's in-progress roadmaps with their progress", async () => {
    vi.mocked(getRoadmaps).mockResolvedValue(
      list([roadmap(1), roadmap(2, { progress: { completed_courses: 1, total_courses: 8, percent: 12.5 } })])
    );

    renderSection();

    expect(
      await screen.findByRole("heading", { name: "My Learning Journeys" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Roadmap 1/ })).toHaveAttribute(
      "href",
      "/roadmaps/path-1"
    );
    expect(screen.getByText("3 of 8 courses · 38% complete")).toBeInTheDocument();
    expect(screen.getByText("1 of 8 courses · 13% complete")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /See all/ })).toHaveAttribute(
      "href",
      "/roadmaps"
    );
  });

  it("asks only for the student's own roadmaps", async () => {
    vi.mocked(getRoadmaps).mockResolvedValue(list([roadmap(1)]));

    renderSection();
    await screen.findByRole("heading", { name: "My Learning Journeys" });

    expect(getRoadmaps).toHaveBeenCalledWith({ participating: true, per_page: 50 });
  });

  it("renders nothing when the student has no roadmaps", async () => {
    vi.mocked(getRoadmaps).mockResolvedValue(list([]));

    const { container } = renderSection();

    await waitFor(() => expect(getRoadmaps).toHaveBeenCalled());
    expect(screen.queryByRole("heading", { name: "My Learning Journeys" })).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when every roadmap is already completed", async () => {
    vi.mocked(getRoadmaps).mockResolvedValue(
      list([roadmap(1, { is_completed: true }), roadmap(2, { is_completed: true })])
    );

    const { container } = renderSection();

    await waitFor(() => expect(getRoadmaps).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("leaves out roadmaps the student hasn't started, even if the API sent them", async () => {
    vi.mocked(getRoadmaps).mockResolvedValue(
      list([
        roadmap(1, { is_participant: false, progress: null }),
        roadmap(2),
      ])
    );

    renderSection();

    await screen.findByRole("heading", { name: "My Learning Journeys" });
    expect(screen.queryByRole("link", { name: /Roadmap 1/ })).toBeNull();
    expect(screen.getByRole("link", { name: /Roadmap 2/ })).toBeInTheDocument();
  });

  it("renders nothing, without crashing, when the request fails", async () => {
    vi.mocked(getRoadmaps).mockRejectedValue(new Error("Network Error"));

    const { container } = renderSection();

    await waitFor(() => expect(getRoadmaps).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("doesn't call the API for a signed-out visitor (it would 401)", () => {
    vi.mocked(isAuthenticated).mockReturnValue(false);

    const { container } = renderSection();

    expect(getRoadmaps).not.toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });

  it("caps the home-screen strip at four roadmaps", async () => {
    vi.mocked(getRoadmaps).mockResolvedValue(
      list([1, 2, 3, 4, 5, 6].map((id) => roadmap(id)))
    );

    renderSection();

    await screen.findByRole("heading", { name: "My Learning Journeys" });
    expect(screen.getByRole("link", { name: /Roadmap 4/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Roadmap 5/ })).toBeNull();
  });
});
