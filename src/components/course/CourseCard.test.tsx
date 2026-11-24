import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { CourseCard } from "./CourseCard";
import type { Course, Enrollment } from "../../types/dashboard";

const course = (overrides: Partial<Course> = {}): Course => ({
  id: 7,
  uuid: "course-uuid-7",
  title: "Intro to Circuits",
  description: "Basics of circuits.",
  level: "100",
  thumbnail_url: null,
  is_paid: true,
  price: 150,
  currency: "SLE",
  ...overrides,
});

const enrollment = (overrides: Partial<Enrollment> = {}): Enrollment => ({
  id: 1,
  uuid: "enrollment-uuid-1",
  progress_percent: 40,
  xp_earned: 10,
  lessons_completed: 2,
  quizzes_completed: 1,
  quizzes_passed: 1,
  streak_count: null,
  created_at: "",
  updated_at: "",
  course: course(),
  ...overrides,
});

const LocationProbe = () => {
  const location = useLocation();
  return <p>Landed at {location.pathname + location.search}</p>;
};

const renderCard = (props: Partial<Parameters<typeof CourseCard>[0]> = {}) =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route
          path="/"
          element={<CourseCard course={course()} {...props} />}
        />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );

describe("CourseCard — access ended (Round 16)", () => {
  it("badges an expired-access course instead of its progress state", () => {
    renderCard({
      enrollment: enrollment({
        progress_percent: 40,
        course: course({ access: { has_access: false, source: "purchase", expired: true, academic_period: null } }),
      }),
    });

    expect(screen.getByText("Access ended — Renew")).toBeInTheDocument();
    expect(screen.queryByText(/In Progress/)).not.toBeInTheDocument();
  });

  it("still shows Completed for a finished course even if access later ended", () => {
    renderCard({
      enrollment: enrollment({
        progress_percent: 100,
        course: course({ access: { has_access: false, source: "purchase", expired: true, academic_period: null } }),
      }),
    });

    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.queryByText("Access ended — Renew")).not.toBeInTheDocument();
  });

  it("sends an expired-access click straight to the renewal flow, not into locked content", async () => {
    const user = userEvent.setup();
    renderCard({
      enrollment: enrollment({
        last_module_id: 10,
        last_lesson_id: 501,
        course: course({ access: { has_access: false, source: "purchase", expired: true, academic_period: null } }),
      }),
    });

    await user.click(screen.getByRole("link", { name: "Intro to Circuits" }));

    expect(
      await screen.findByText("Landed at /course/course-uuid-7?renew=1")
    ).toBeInTheDocument();
  });

  it("still uses the saved lesson spot when access has not expired", async () => {
    const user = userEvent.setup();
    renderCard({
      enrollment: enrollment({ last_module_id: 10, last_lesson_id: 501 }),
    });

    await user.click(screen.getByRole("link", { name: "Intro to Circuits" }));

    expect(
      await screen.findByText("Landed at /course/course-uuid-7/module/10/lesson/501")
    ).toBeInTheDocument();
  });
});
