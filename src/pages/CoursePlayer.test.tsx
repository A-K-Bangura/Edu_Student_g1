import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
      // The real backend's correct_answer is the option TEXT, not an index
      // (docs/STUDENT_API_PAYLOADS.md §25/26) — see QuizRenderer.tsx.
      correct_answer: ["1"],
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
          quizzes: [{ id: 900, order_index: 0 }],
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

describe("CoursePlayer — scroll position between screens", () => {
  // The lesson body is one persistent scroll container that every screen is
  // rendered into, so its scroll offset used to carry over to the next screen.
  const scrollAreaOf = (text: string) =>
    screen.getByText(text).closest(".overflow-y-auto") as HTMLElement;

  it("starts each new screen at the top, going forward, back, and into the quiz", async () => {
    renderPlayer();
    await screen.findByRole("heading", { name: "Fractions Basics" });

    const area = scrollAreaOf("A fraction represents part of a whole.");
    const user = userEvent.setup();

    area.scrollTop = 480; // the student has read down the first screen
    await user.click(screen.getByRole("button", { name: "Next screen" }));
    await screen.findByText("Fractions are just divided pieces.");
    // Same element as before — that persistence is what carried the offset over.
    expect(scrollAreaOf("Fractions are just divided pieces.")).toBe(area);
    expect(area.scrollTop).toBe(0);

    area.scrollTop = 300;
    await user.click(screen.getByRole("button", { name: "Previous screen" }));
    await screen.findByText("A fraction represents part of a whole.");
    expect(area.scrollTop).toBe(0);

    await user.click(screen.getByRole("button", { name: "Next screen" }));
    await screen.findByText("Fractions are just divided pieces.");
    area.scrollTop = 250;
    await user.click(screen.getByRole("button", { name: "Next screen" }));
    await screen.findByText("What is 1/2 + 1/2?");
    expect(area.scrollTop).toBe(0);
  });

  it("doesn't touch the scroll position while the student stays on a screen", async () => {
    renderPlayer();
    await screen.findByRole("heading", { name: "Fractions Basics" });

    const area = scrollAreaOf("A fraction represents part of a whole.");
    area.scrollTop = 120;

    // Re-renders that aren't a screen change (opening/closing the notes panel).
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Toggle notes" }));
    await user.click(screen.getByRole("button", { name: "Toggle notes" }));

    expect(area.scrollTop).toBe(120);
  });
});

describe("CoursePlayer — swiping between screens", () => {
  const scrollAreaOf = (text: string) =>
    screen.getByText(text).closest(".overflow-y-auto") as HTMLElement;

  const touch = (
    el: Element,
    type: "pointerdown" | "pointermove" | "pointerup",
    x: number,
    y = 200
  ) =>
    fireEvent(
      el,
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: "touch",
        isPrimary: true,
        clientX: x,
        clientY: y,
      })
    );

  // A decisive horizontal drag (450px of a 1024px-wide jsdom window).
  const swipeLeft = (el: Element) => {
    touch(el, "pointerdown", 700);
    touch(el, "pointermove", 500);
    touch(el, "pointermove", 250);
    touch(el, "pointerup", 250);
  };
  const swipeRight = (el: Element) => {
    touch(el, "pointerdown", 250);
    touch(el, "pointermove", 450);
    touch(el, "pointermove", 700);
    touch(el, "pointerup", 700);
  };

  // Lets the 220ms settle animation finish, for asserting that nothing moved.
  const settle = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });

  const progressBar = () =>
    screen.getByRole("progressbar", { name: /lesson progress/i });

  const secondQuiz = {
    id: 901,
    quiz_type: "multiple_choice" as const,
    question: "What is 1/4 + 1/4?",
    order_index: 1,
    options: ["1/2", "1", "2"],
    correct_answer: ["1/2"],
  };

  it("swipes left to the next screen and right to go back", async () => {
    renderPlayer();
    await screen.findByRole("heading", { name: "Fractions Basics" });
    const area = scrollAreaOf("A fraction represents part of a whole.");

    swipeLeft(area);
    await waitFor(() => expect(progressBar()).toHaveAttribute("aria-valuenow", "2"));
    expect(screen.getByText("Fractions are just divided pieces.")).toBeInTheDocument();

    swipeRight(area);
    await waitFor(() => expect(progressBar()).toHaveAttribute("aria-valuenow", "1"));
    expect(screen.getByText("A fraction represents part of a whole.")).toBeInTheDocument();
  });

  it("opens the screen it swipes to at the top, not where the last one was scrolled", async () => {
    renderPlayer();
    await screen.findByRole("heading", { name: "Fractions Basics" });
    const area = scrollAreaOf("A fraction represents part of a whole.");

    area.scrollTop = 400;
    swipeLeft(area);
    await screen.findByText("Fractions are just divided pieces.");
    expect(area.scrollTop).toBe(0);
  });

  it("does nothing when swiping back on the first screen", async () => {
    renderPlayer();
    await screen.findByRole("heading", { name: "Fractions Basics" });

    swipeRight(scrollAreaOf("A fraction represents part of a whole."));
    await settle();
    expect(progressBar()).toHaveAttribute("aria-valuenow", "1");
  });

  it("can't be swiped past an unanswered quiz, but can be swiped back, and moves on once it's answered", async () => {
    vi.mocked(getLessonDetail).mockResolvedValue({
      ...lessonDetail,
      quizzes: [...(lessonDetail.quizzes ?? []), secondQuiz],
    });
    renderPlayer();
    await screen.findByRole("heading", { name: "Fractions Basics" });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Next screen" }));
    await user.click(screen.getByRole("button", { name: "Next screen" }));
    await screen.findByText("What is 1/2 + 1/2?");
    const area = scrollAreaOf("What is 1/2 + 1/2?");
    expect(progressBar()).toHaveAttribute("aria-valuenow", "3");

    swipeLeft(area); // quiz 1 is unanswered: same lock as the disabled Next button
    await settle();
    expect(progressBar()).toHaveAttribute("aria-valuenow", "3");
    expect(screen.getByText("What is 1/2 + 1/2?")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "1" }));
    await user.click(screen.getByRole("button", { name: /submit quiz/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Next screen" })).not.toBeDisabled()
    );

    swipeLeft(area);
    await screen.findByText("What is 1/4 + 1/4?");
    expect(progressBar()).toHaveAttribute("aria-valuenow", "4");

    // ...and going back is never locked.
    swipeRight(area);
    await screen.findByText("What is 1/2 + 1/2?");
  });

  it("can always swipe back from a quiz that hasn't been answered", async () => {
    renderPlayer();
    await screen.findByRole("heading", { name: "Fractions Basics" });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Next screen" }));
    await user.click(screen.getByRole("button", { name: "Next screen" }));
    await screen.findByText("What is 1/2 + 1/2?");

    swipeRight(scrollAreaOf("What is 1/2 + 1/2?"));
    await waitFor(() => expect(progressBar()).toHaveAttribute("aria-valuenow", "2"));
  });

  it("never completes the lesson by swiping left on the last screen", async () => {
    renderPlayer();
    await screen.findByRole("heading", { name: "Fractions Basics" });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Next screen" }));
    await user.click(screen.getByRole("button", { name: "Next screen" }));
    await screen.findByText("What is 1/2 + 1/2?");
    await user.click(screen.getByRole("radio", { name: "1" }));
    await user.click(screen.getByRole("button", { name: /submit quiz/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Complete Lesson" })).not.toBeDisabled()
    );

    swipeLeft(scrollAreaOf("What is 1/2 + 1/2?"));
    await settle();

    expect(updateCourseProgress).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lesson_id: expect.anything() })
    );
    expect(screen.queryByText("Lesson Complete!")).not.toBeInTheDocument();
    expect(screen.getByText("What is 1/2 + 1/2?")).toBeInTheDocument();
  });

  it("doesn't page the lesson from behind the open outline drawer", async () => {
    renderPlayer();
    await screen.findByRole("heading", { name: "Fractions Basics" });
    const area = scrollAreaOf("A fraction represents part of a whole.");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Open course outline" }));
    swipeLeft(area);
    await settle();
    expect(progressBar()).toHaveAttribute("aria-valuenow", "1");

    // Both the header toggle and the drawer's own X close it.
    await user.click(screen.getAllByRole("button", { name: "Close course outline" })[0]);
    swipeLeft(area);
    await waitFor(() => expect(progressBar()).toHaveAttribute("aria-valuenow", "2"));
  });

  it("keeps pinch-zoom available on the lesson body", async () => {
    renderPlayer();
    await screen.findByRole("heading", { name: "Fractions Basics" });

    const { touchAction } = scrollAreaOf("A fraction represents part of a whole.").style;
    expect(touchAction).toContain("pan-y");
    expect(touchAction).toContain("pinch-zoom");
  });

  it("keeps the Next and Previous buttons working", async () => {
    renderPlayer();
    await screen.findByRole("heading", { name: "Fractions Basics" });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Next screen" }));
    await waitFor(() => expect(progressBar()).toHaveAttribute("aria-valuenow", "2"));
    await user.click(screen.getByRole("button", { name: "Previous screen" }));
    await waitFor(() => expect(progressBar()).toHaveAttribute("aria-valuenow", "1"));
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

describe("CoursePlayer — already-completed lesson", () => {
  it("skips re-submitting lesson completion to the backend and shows an 'already completed' modal instead", async () => {
    // This lesson is the only one in the course, so lessons_completed: 1
    // means the server already has it marked done.
    vi.mocked(getCourseProgress).mockResolvedValue({
      ...courseProgress,
      lessons_completed: 1,
    });

    renderPlayer();
    await screen.findByRole("heading", { name: "Fractions Basics" });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Next screen" }));
    await user.click(screen.getByRole("button", { name: "Next screen" }));
    await screen.findByText("What is 1/2 + 1/2?");

    // Quiz gating is unchanged — still has to be answered to unlock Complete.
    await user.click(screen.getByRole("radio", { name: "1" }));
    await user.click(screen.getByRole("button", { name: /submit quiz/i }));

    const completeButton = await waitFor(() => {
      const button = screen.getByRole("button", { name: "Complete Lesson" });
      expect(button).not.toBeDisabled();
      return button;
    });

    await user.click(completeButton);

    expect(
      await screen.findByText("Lesson Already Completed")
    ).toBeInTheDocument();

    // Quiz-progress sync is unaffected (still a real network call)...
    expect(updateCourseProgress).toHaveBeenCalledWith(
      "7",
      expect.objectContaining({ quiz_id: 900, completed: true })
    );
    // ...but lesson completion must never be re-submitted for an
    // already-completed lesson.
    expect(updateCourseProgress).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lesson_id: expect.anything() })
    );
  });
});

describe("CoursePlayer — already-completed quiz", () => {
  it("skips re-submitting quiz progress for an already-completed quiz, still unlocks Complete, and leaves lesson completion (a separate, not-yet-completed thing in this fixture) unaffected", async () => {
    // quizzes_completed: 1 means the server already has this course's one
    // quiz marked done; lessons_completed stays 0 so the lesson-completion
    // skip path (tested separately above) does NOT also kick in here.
    vi.mocked(getCourseProgress).mockResolvedValue({
      ...courseProgress,
      quizzes_completed: 1,
    });

    renderPlayer();
    await screen.findByRole("heading", { name: "Fractions Basics" });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Next screen" }));
    await user.click(screen.getByRole("button", { name: "Next screen" }));
    await screen.findByText("What is 1/2 + 1/2?");

    await user.click(screen.getByRole("radio", { name: "1" }));
    await user.click(screen.getByRole("button", { name: /submit quiz/i }));

    expect(
      await screen.findByText(
        "This quiz is already completed — your earlier result still counts."
      )
    ).toBeInTheDocument();

    // Complete still unlocks from the already-completed state, without a
    // network round trip.
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Complete Lesson" })
      ).not.toBeDisabled()
    );

    expect(updateCourseProgress).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ quiz_id: 900 })
    );

    // Lesson completion itself is a separate, independent skip path — since
    // this fixture's lesson is NOT already completed, clicking Complete must
    // still submit it normally.
    await user.click(screen.getByRole("button", { name: "Complete Lesson" }));
    await waitFor(() =>
      expect(updateCourseProgress).toHaveBeenCalledWith(
        "7",
        expect.objectContaining({ lesson_id: 501, completed: true })
      )
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
