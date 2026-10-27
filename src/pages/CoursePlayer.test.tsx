import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { LessonDetail } from "../types/lesson";
import type { CourseDetail, CourseProgress } from "../types/course";
import type { UserProfile } from "../types/profile";

vi.mock("../services/lessons", async () => {
  const actual = await vi.importActual<typeof import("../services/lessons")>(
    "../services/lessons"
  );
  return {
    ...actual,
    getLessonDetail: vi.fn(),
  };
});
vi.mock("../services/courses", () => ({
  getCourseDetail: vi.fn(),
  getCourseProgress: vi.fn(),
  updateCourseProgress: vi.fn(),
}));
vi.mock("../services/profile", () => ({
  getUserProfile: vi.fn(),
}));

import { getLessonDetail } from "../services/lessons";
import {
  getCourseDetail,
  getCourseProgress,
  updateCourseProgress,
} from "../services/courses";
import { getUserProfile } from "../services/profile";
import { CoursePlayer } from "./CoursePlayer";

const lessonDetail: LessonDetail = {
  id: 501,
  title: "Fractions Basics",
  order_index: 1,
  module_id: 10,
  mini_lessons: [
    {
      id: 1,
      lesson_id: 501,
      order_index: 0,
      blocks: [
        {
          id: 1,
          mini_lesson_id: 1,
          content_type: "text",
          text_type: "plain",
          content: "A fraction represents part of a whole.",
          order_index: 0,
        },
      ],
    },
    {
      id: 2,
      lesson_id: 501,
      order_index: 1,
      blocks: [
        {
          id: 2,
          mini_lesson_id: 2,
          content_type: "text",
          text_type: "simply_put",
          content: "Fractions are just divided pieces.",
          order_index: 0,
        },
        {
          id: 3,
          mini_lesson_id: 2,
          content_type: "text",
          text_type: "important",
          content: "The denominator can never be zero.",
          order_index: 1,
        },
        {
          id: 4,
          mini_lesson_id: 2,
          content_type: "text",
          text_type: "remember",
          content: "Simplify fractions whenever possible.",
          order_index: 2,
        },
      ],
    },
  ],
  quizzes: [
    {
      id: 900,
      quiz_type: "multiple_choice",
      question: "What is 1/2 + 1/2?",
      order_index: 0,
      options: ["1", "2", "1/2"],
      correct_answer: ["0"],
    },
  ],
};

const courseDetail: CourseDetail = {
  id: 7,
  uuid: "course-uuid-7",
  title: "Intro to Maths",
  description: "Basics of maths.",
  level: "100",
  modules: [
    {
      id: 10,
      title: "Module 1",
      order_index: 1,
      lessons: [
        {
          id: 501,
          title: "Fractions Basics",
          description: "",
          order_index: 1,
        },
      ],
    },
  ],
};

const courseProgress: CourseProgress = {
  id: 1,
  lessons_completed: 0,
  quizzes_completed: 0,
  is_completed: false,
};

const userProfile: UserProfile = {
  id: 1,
  email: "student@example.com",
  full_name: "Test Student",
};

const renderPlayer = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter
        initialEntries={["/course/7/module/10/lesson/501"]}
      >
        <Routes>
          <Route
            path="/course/:courseId/module/:moduleId/lesson/:lessonId"
            element={<CoursePlayer />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  vi.mocked(getLessonDetail).mockResolvedValue(lessonDetail);
  vi.mocked(getCourseDetail).mockResolvedValue(courseDetail);
  vi.mocked(getCourseProgress).mockResolvedValue(courseProgress);
  vi.mocked(getUserProfile).mockResolvedValue(userProfile);
  vi.mocked(updateCourseProgress).mockResolvedValue({
    progress: courseProgress,
    course_completed: false,
  });
});

describe("CoursePlayer — screen-position progress", () => {
  it("shows an accessible progress bar instead of a numeric counter, and it tracks navigation", async () => {
    renderPlayer();

    await screen.findByRole("heading", { name: "Fractions Basics" });

    // No numeric "x / y" counter anywhere in the header or toolbar.
    expect(screen.queryByText(/\d+\s*\/\s*\d+/)).not.toBeInTheDocument();

    const bar = screen.getByRole("progressbar", { name: /lesson progress/i });
    expect(bar).toHaveAttribute("aria-valuenow", "1");
    expect(bar).toHaveAttribute("aria-valuemax", "3");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Next screen" }));

    await waitFor(() =>
      expect(bar).toHaveAttribute("aria-valuenow", "2")
    );

    await user.click(screen.getByRole("button", { name: "Previous screen" }));
    await waitFor(() =>
      expect(bar).toHaveAttribute("aria-valuenow", "1")
    );
  });

  it("hides the main bottom/top navigation while a lesson is open", async () => {
    renderPlayer();
    await screen.findByRole("heading", { name: "Fractions Basics" });

    expect(screen.queryAllByRole("navigation")).toHaveLength(0);
  });

  it("disables Previous on the first screen and shows a distinguishable, initially-disabled Complete action on the last screen", async () => {
    renderPlayer();
    await screen.findByRole("heading", { name: "Fractions Basics" });

    expect(screen.getByRole("button", { name: "Previous screen" })).toBeDisabled();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Next screen" }));
    await user.click(screen.getByRole("button", { name: "Next screen" }));

    // Now on the quiz (last) screen.
    await screen.findByText("What is 1/2 + 1/2?");
    const completeButton = await screen.findByRole("button", {
      name: "Complete Lesson",
    });
    expect(completeButton).toBeDisabled();
  });
});

describe("CoursePlayer — quiz gating", () => {
  it("blocks Complete until the quiz is answered correctly, and never auto-submits lesson completion just by reaching the last screen", async () => {
    renderPlayer();
    await screen.findByRole("heading", { name: "Fractions Basics" });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Next screen" }));
    await user.click(screen.getByRole("button", { name: "Next screen" }));
    await screen.findByText("What is 1/2 + 1/2?");

    // Reaching the final screen must not itself call lesson completion.
    expect(updateCourseProgress).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lesson_id: expect.anything() })
    );

    await user.click(screen.getByRole("radio", { name: "1" }));
    await user.click(screen.getByRole("button", { name: /submit quiz/i }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Complete Lesson" })
      ).not.toBeDisabled()
    );

    expect(updateCourseProgress).toHaveBeenCalledWith(
      "7",
      expect.objectContaining({ quiz_id: 900, completed: true })
    );
    // Still not auto-completed — only an explicit click submits lesson completion.
    expect(updateCourseProgress).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lesson_id: expect.anything() })
    );
  });
});

describe("CoursePlayer — text block rendering", () => {
  it("renders highlighted variant labels for simply put / important / remember blocks", async () => {
    renderPlayer();
    await screen.findByRole("heading", { name: "Fractions Basics" });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Next screen" }));

    expect(await screen.findByText("Simply Put")).toBeInTheDocument();
    expect(screen.getByText("Important")).toBeInTheDocument();
    expect(screen.getByText("Remember")).toBeInTheDocument();
  });
});
