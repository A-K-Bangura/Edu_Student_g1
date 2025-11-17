import { useState, useEffect, useMemo, type ReactNode } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "../components/layout/PageShell";
import { OutlineSidebar } from "../components/course/OutlineSidebar";
import { MiniLessonRenderer } from "../components/course/MiniLessonRenderer";
import { JottingPad } from "../components/course/JottingPad";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  BookOpen,
  FileText,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { getLessonDetail } from "../services/lessons";
import {
  getCourseDetail,
  getCourseProgress,
  updateCourseProgress,
} from "../services/courses";
import { submitQuiz } from "../services/quiz";
import { useUIStore } from "../store/uiStore";
import { debugLog } from "../utils/debug";
import { QuizRenderer } from "../components/course/QuizRenderer";
import type { QuizAttemptMeta } from "../components/course/QuizRenderer";
import type { MiniLesson } from "../types/lesson";
import type { CourseProgress } from "../types/course";
import type { Quiz, QuizSubmission, QuizResult } from "../types/quiz";

export const CoursePlayer = () => {
  const { courseId, lessonId } = useParams<{
    courseId: string;
    moduleId?: string;
    lessonId?: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [currentScreenIndex, setCurrentScreenIndex] = useState(0);
  const [quizStates, setQuizStates] = useState<
    Record<
      number,
      {
        status: "idle" | "submitting" | "success" | "error";
        result?: QuizResult;
        error?: string;
        attempt?: QuizAttemptMeta;
        progressStatus: "idle" | "updating" | "success" | "error";
        progressError?: string;
      }
    >
  >({});
  const [lessonCompletionStatus, setLessonCompletionStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [lessonCompletionError, setLessonCompletionError] = useState<
    string | null
  >(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [lessonCompletion, setLessonCompletion] = useState<{
    progress: CourseProgress;
    courseCompleted: boolean;
  } | null>(null);

  const navigationState = useMemo(() => {
    return (
      (location.state as {
        from?: string;
        courseId?: number;
        courseUuid?: string;
        timestamp?: string;
        initialModuleId?: number;
        initialLessonId?: number;
      } | null) ?? null
    );
  }, [location.state]);

  // This will be set from the API or passed from navigation
  const activeLessonId = lessonId ? Number(lessonId) : null;

  // Fetch course detail for outline
  const { data: courseDetail } = useQuery({
    queryKey: ["course-detail", courseId],
    queryFn: () => getCourseDetail(courseId!),
    enabled: !!courseId,
  });

  // Fetch course progress for outline/progress data
  const { data: courseProgress } = useQuery({
    queryKey: ["course-progress", courseId],
    queryFn: () => getCourseProgress(courseId!),
    enabled: !!courseId,
  });

  // Fetch lesson detail when lesson ID is available
  const { data: lessonDetail, isLoading } = useQuery({
    queryKey: ["lesson-detail", activeLessonId],
    queryFn: () => getLessonDetail(activeLessonId!),
    enabled: !!activeLessonId,
  });

  const detailModules = courseDetail?.modules || [];
  const detailHasLessons = detailModules.some(
    (module) => (module.lessons?.length || 0) > 0
  );
  const modulesSource = detailHasLessons
    ? detailModules
    : courseProgress?.course?.modules || detailModules;

  const outline = useMemo(() => {
    if (!modulesSource.length) {
      return undefined;
    }

    return {
      modules: modulesSource.map((module) => ({
        id: module.id,
        title: module.title,
        order_index: module.order_index,
        lessons: (module.lessons || []).map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          order_index: lesson.order_index,
          is_completed:
            (lesson as { is_completed?: boolean }).is_completed || false,
        })),
      })),
    };
  }, [modulesSource]);

  const currentModule = useMemo(() => {
    if (!modulesSource.length || !activeLessonId) {
      return undefined;
    }

    return modulesSource.find((module) =>
      module.lessons?.some((lesson) => lesson.id === activeLessonId)
    );
  }, [modulesSource, activeLessonId]);

  // Use lesson detail for lesson content
  const lessonContent = useMemo(() => {
    if (!lessonDetail) {
      return undefined;
    }

    const miniLessons = [...(lessonDetail.mini_lessons || [])].sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
    );

    const quizzes = [...(lessonDetail.quizzes || [])].sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
    );

    return {
      id: lessonDetail.id,
      module_id: lessonDetail.module_id,
      title: lessonDetail.title,
      mini_lessons: miniLessons,
      quizzes,
    };
  }, [lessonDetail]);

  const lessonScreens = useMemo(() => {
    if (!lessonContent) {
      return [] as Array<
        { kind: "mini"; data: MiniLesson } | { kind: "quiz"; data: Quiz }
      >;
    }

    const miniScreens = (lessonContent.mini_lessons || []).map((mini) => ({
      kind: "mini" as const,
      data: mini,
    }));

    const quizScreens = (lessonContent.quizzes || []).map((quiz) => ({
      kind: "quiz" as const,
      data: quiz,
    }));

    return [...miniScreens, ...quizScreens];
  }, [lessonContent]);

  const totalScreens = lessonScreens.length;
  const hasScreens = totalScreens > 0;
  const isLastScreen = hasScreens && currentScreenIndex === totalScreens - 1;
  const currentScreen = lessonScreens[currentScreenIndex] || null;
  const currentMiniLesson =
    currentScreen?.kind === "mini" ? currentScreen.data : undefined;
  const currentQuiz =
    currentScreen?.kind === "quiz" ? currentScreen.data : undefined;
  const isQuizScreen = Boolean(currentQuiz);
  const currentQuizState = currentQuiz ? quizStates[currentQuiz.id] : undefined;
  const isQuizNextLocked =
    isQuizScreen &&
    (!currentQuizState ||
      currentQuizState.status !== "success" ||
      currentQuizState.progressStatus !== "success");
  const canGoPrev = currentScreenIndex > 0;
  const canGoNext = currentScreenIndex < totalScreens - 1;
  const nextButtonDisabled = isLastScreen
    ? lessonCompletionStatus === "submitting" ||
      lessonCompletionStatus === "success" ||
      isQuizNextLocked
    : !canGoNext || isQuizNextLocked;
  const nextButtonLabel = isLastScreen
    ? lessonCompletionStatus === "submitting"
      ? "Completing..."
      : lessonCompletionStatus === "success"
      ? "Lesson Completed"
      : "Complete Lesson"
    : "Next";

  const nextLessonLink = useMemo(() => {
    if (!modulesSource.length || !activeLessonId) {
      return null;
    }

    const modules = modulesSource;

    let nextLessonRoute: string | null = null;

    outer: for (
      let moduleIndex = 0;
      moduleIndex < modules.length;
      moduleIndex++
    ) {
      const module = modules[moduleIndex];
      const lessons = module.lessons || [];

      for (let lessonIndex = 0; lessonIndex < lessons.length; lessonIndex++) {
        const lesson = lessons[lessonIndex];
        if (lesson.id === activeLessonId) {
          const nextLesson = lessons[lessonIndex + 1];
          if (nextLesson) {
            nextLessonRoute = `/course/${courseId}/module/${module.id}/lesson/${nextLesson.id}`;
            break outer;
          }

          const nextModule = modules[moduleIndex + 1];
          if (
            nextModule &&
            nextModule.lessons &&
            nextModule.lessons.length > 0
          ) {
            const firstLesson = nextModule.lessons[0];
            nextLessonRoute = `/course/${courseId}/module/${nextModule.id}/lesson/${firstLesson.id}`;
            break outer;
          }

          nextLessonRoute = `/course/${courseId}/completed`;
          break outer;
        }
      }
    }

    return nextLessonRoute;
  }, [modulesSource, activeLessonId, courseId]);

  // Toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      debugLog("CoursePlayer", "Sidebar toggled", { open: next });
      return next;
    });
    useUIStore.getState().toggleMobilePanel();
  };

  // Navigate to different lesson
  const handleLessonNavigate = (moduleId: number, lessonId: number) => {
    setIsSidebarOpen(false);
    setCurrentScreenIndex(0);
    debugLog("CoursePlayer", "Navigating to lesson", {
      courseId,
      moduleId,
      lessonId,
    });
    navigate(`/course/${courseId}/module/${moduleId}/lesson/${lessonId}`);
  };

  // Navigate previous/next mini-lesson
  const handlePrevMiniLesson = () => {
    if (!canGoPrev) {
      debugLog(
        "CoursePlayer",
        "Attempted to go to previous screen but at start",
        {
          currentScreenIndex,
        }
      );
      return;
    }

    setCurrentScreenIndex((prev) => {
      const next = prev - 1;
      debugLog("CoursePlayer", "Screen changed", {
        direction: "previous",
        from: prev,
        to: next,
      });
      return next;
    });
  };

  const handleNextMiniLesson = () => {
    if (!canGoNext) {
      debugLog("CoursePlayer", "Attempted to go to next screen but at end", {
        currentScreenIndex,
        total: lessonScreens.length,
      });
      return;
    }

    setCurrentScreenIndex((prev) => {
      const next = prev + 1;
      debugLog("CoursePlayer", "Screen changed", {
        direction: "next",
        from: prev,
        to: next,
      });
      return next;
    });
  };

  const handleQuizSubmit = async (
    quizId: number,
    submission: QuizSubmission,
    meta: QuizAttemptMeta
  ) => {
    if (!courseId) {
      return;
    }

    setQuizStates((prev) => ({
      ...prev,
      [quizId]: {
        status: "submitting",
        attempt: meta,
        progressStatus: prev[quizId]?.progressStatus ?? "idle",
      },
    }));

    try {
      // Local quiz result – backend submit endpoint doesn't exist
      const result = {
        quiz_id: quizId,
        score: meta.isCorrect ? 1 : 0,
        percentage: meta.isCorrect ? 100 : 0,
        passed: meta.isCorrect,
        pass_threshold: 100,
        correct_answers: meta.isCorrect ? 1 : 0,
        total_questions: 1,
        xp_awarded: 0,
        time_taken_seconds: submission.time_spent_seconds,
        results: [],
        progress: {
          total_xp: 0,
          streak_days: 0,
        },
      } as QuizResult;
      debugLog("CoursePlayer", "Quiz evaluated locally", { quizId, result, meta });

      setQuizStates((prev) => ({
        ...prev,
        [quizId]: {
          status: "success",
          result,
          attempt: meta,
          progressStatus: "updating",
        },
      }));

      try {
        await updateCourseProgress(courseId, {
          quiz_id: quizId,
          completed: true,
        });

        setQuizStates((prev) => ({
          ...prev,
          [quizId]: {
            ...prev[quizId],
            progressStatus: "success",
            progressError: undefined,
          },
        }));
      } catch (progressError) {
        const message =
          progressError instanceof Error
            ? progressError.message
            : "Failed to sync quiz progress. Please retry.";
        debugLog("CoursePlayer", "Quiz progress sync failed", {
          quizId,
          message,
        });
        setQuizStates((prev) => ({
          ...prev,
          [quizId]: {
            ...prev[quizId],
            progressStatus: "error",
            progressError: message,
          },
        }));
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to submit quiz. Please try again.";
      debugLog("CoursePlayer", "Quiz submission failed", {
        quizId,
        message,
        meta,
      });
      setQuizStates((prev) => ({
        ...prev,
        [quizId]: {
          status: "error",
          error: message,
          attempt: meta,
          progressStatus: prev[quizId]?.progressStatus ?? "idle",
          progressError: prev[quizId]?.progressError,
        },
      }));
    }
  };

  function renderQuizFeedback(quizId: number): ReactNode {
    const quizState = quizStates[quizId];
    if (!quizState) {
      return null;
    }

    const blocks: ReactNode[] = [];

    if (quizState.status === "submitting") {
      blocks.push(
        <div
          key="submitting"
          className="mt-4 p-4 bg-azure-50 dark:bg-azure-900/30 border border-azure-200 dark:border-azure-800 rounded-lg text-sm text-azure-700 dark:text-azure-200"
        >
          Submitting your answers...
        </div>
      );
    }

    if (quizState.status === "error" && quizState.error) {
      blocks.push(
        <div
          key="submit-error"
          className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-sm text-red-700 dark:text-red-300"
        >
          <AlertCircle className="w-5 h-5" />
          <span>{quizState.error}</span>
        </div>
      );
    }

    if (quizState.status === "success" && quizState.result) {
      const { result } = quizState;
      blocks.push(
        <div
          key="result"
          className={`mt-4 border-2 rounded-lg p-4 space-y-3 ${
            result.passed
              ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20"
              : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20"
          }`}
        >
          <div className="flex items-start gap-3">
            {result.passed ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {result.passed ? "Quiz Passed" : "Quiz Attempt Recorded"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Score: {result.percentage}% • XP Awarded: {result.xp_awarded}
              </p>
            </div>
          </div>

          {result.results && result.results.length > 0 && (
            <details className="mt-2 text-sm text-gray-700 dark:text-gray-300 space-y-2">
              <summary className="cursor-pointer font-medium">
                Review answers
              </summary>
              <div className="mt-3 space-y-3">
                {result.results.map((entry, index) => (
                  <div
                    key={entry.question_id}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 p-3"
                  >
                    <p className="font-medium text-gray-900 dark:text-white mb-1">
                      Question {index + 1}: {entry.question}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Your answer:</span>{" "}
                      {Array.isArray(entry.your_answer)
                        ? entry.your_answer.join(", ")
                        : entry.your_answer}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Correct answer:</span>{" "}
                      {Array.isArray(entry.correct_answer)
                        ? entry.correct_answer.join(", ")
                        : entry.correct_answer}
                    </p>
                    {entry.explanation && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {entry.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      );
    }

    const progressStatus = quizState.progressStatus;

    if (progressStatus === "updating") {
      blocks.push(
        <div
          key="progress-updating"
          className="mt-4 p-4 bg-azure-50 dark:bg-azure-900/30 border border-azure-200 dark:border-azure-800 rounded-lg text-sm text-azure-700 dark:text-azure-200"
        >
          Syncing your course progress...
        </div>
      );
    }

    if (progressStatus === "error" && quizState.progressError) {
      blocks.push(
        <div
          key="progress-error"
          className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300 space-y-3"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span>{quizState.progressError}</span>
          </div>
          <button
            type="button"
            onClick={() => retryQuizProgress(quizId)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium"
          >
            Retry syncing progress
          </button>
        </div>
      );
    }

    if (!blocks.length) {
      return null;
    }

    return <div className="space-y-4">{blocks}</div>;
  }

  const retryQuizProgress = async (quizId: number) => {
    if (!courseId) {
      return;
    }

    const current = quizStates[quizId];
    if (!current || current.progressStatus === "updating") {
      return;
    }

    setQuizStates((prev) => ({
      ...prev,
      [quizId]: {
        ...prev[quizId],
        progressStatus: "updating",
        progressError: undefined,
      },
    }));

    try {
      await updateCourseProgress(courseId, {
        quiz_id: quizId,
        completed: true,
      });

      setQuizStates((prev) => ({
        ...prev,
        [quizId]: {
          ...prev[quizId],
          progressStatus: "success",
          progressError: undefined,
        },
      }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to sync quiz progress. Please retry.";
      debugLog("CoursePlayer", "Quiz progress retry failed", {
        quizId,
        message,
      });
      setQuizStates((prev) => ({
        ...prev,
        [quizId]: {
          ...prev[quizId],
          progressStatus: "error",
          progressError: message,
        },
      }));
    }
  };

  const handleCompleteLesson = async () => {
    if (!lessonContent || !courseId) {
      return;
    }

    if (isQuizNextLocked) {
      return;
    }

    if (lessonCompletionStatus === "submitting") {
      return;
    }

    if (lessonCompletionStatus === "success") {
      setShowCompletionModal(true);
      return;
    }

    setLessonCompletionStatus("submitting");
    setLessonCompletionError(null);

    try {
      const { progress, course_completed } = await updateCourseProgress(
        courseId,
        {
          lesson_id: lessonContent.id,
          completed: true,
        }
      );

      setLessonCompletion({
        progress,
        courseCompleted: course_completed,
      });
      setLessonCompletionStatus("success");
      setShowCompletionModal(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to mark lesson complete. Please try again.";
      setLessonCompletionStatus("error");
      setLessonCompletionError(message);
    }
  };

  const handleCompletionContinue = () => {
    setShowCompletionModal(false);
    setLessonCompletionStatus("idle");
    setLessonCompletionError(null);

    if (lessonCompletion?.courseCompleted) {
      navigate(`/course/${courseId}/completed`, { replace: true });
    } else if (nextLessonLink) {
      navigate(nextLessonLink, { replace: true });
    } else {
      navigate(`/course/${courseId}/completed`, { replace: true });
    }

    setLessonCompletion(null);
  };

  // If no lesson selected, redirect to first lesson
  useEffect(() => {
    debugLog("CoursePlayer", "Course player mounted", {
      courseId,
      lessonId,
      navigationState,
    });
  }, [courseId, lessonId, navigationState]);

  useEffect(() => {
    if (!courseId || lessonId) {
      return;
    }

    if (navigationState?.initialModuleId && navigationState?.initialLessonId) {
      debugLog("CoursePlayer", "Restoring saved lesson from navigation state", {
        courseId,
        moduleId: navigationState.initialModuleId,
        lessonId: navigationState.initialLessonId,
      });
      navigate(
        `/course/${courseId}/module/${navigationState.initialModuleId}/lesson/${navigationState.initialLessonId}`,
        { replace: true }
      );
    }
  }, [courseId, lessonId, navigationState, navigate]);

  useEffect(() => {
    if (navigationState?.initialLessonId || !outline) {
      return;
    }

    if (
      !activeLessonId &&
      outline.modules.length > 0 &&
      outline.modules[0].lessons.length > 0
    ) {
      const firstModule = outline.modules[0];
      const firstLesson = firstModule.lessons[0];
      debugLog(
        "CoursePlayer",
        "No active lesson detected. Redirecting to first lesson",
        {
          moduleId: firstModule.id,
          lessonId: firstLesson.id,
        }
      );
      navigate(
        `/course/${courseId}/module/${firstModule.id}/lesson/${firstLesson.id}`
      );
    }
  }, [activeLessonId, outline, courseId, navigate, navigationState]);

  useEffect(() => {
    if (courseDetail) {
      const moduleCount = courseDetail.modules?.length || 0;
      const lessonCount = courseDetail.modules?.reduce(
        (total, module) => total + (module.lessons?.length || 0),
        0
      );
      debugLog("CoursePlayer", "Course detail loaded", {
        courseId,
        modules: moduleCount,
        lessons: lessonCount,
      });
    }
  }, [courseDetail, courseId]);

  useEffect(() => {
    if (lessonDetail) {
      debugLog("CoursePlayer", "Lesson detail loaded", {
        lessonId: lessonDetail.id,
        moduleId: lessonDetail.module_id,
        miniLessons: lessonDetail.mini_lessons?.length || 0,
      });
    }
  }, [lessonDetail]);

  useEffect(() => {
    if (activeLessonId) {
      debugLog("CoursePlayer", "Active lesson updated", { activeLessonId });
    }
  }, [activeLessonId]);

  useEffect(() => {
    if (!currentMiniLesson) {
      return;
    }

    const lessonType =
      "type" in currentMiniLesson
        ? (currentMiniLesson as { type?: string }).type
        : currentMiniLesson.content_type;

    debugLog("CoursePlayer", "Mini-lesson focus updated", {
      index: currentScreenIndex,
      miniLessonId: currentMiniLesson.id,
      type: lessonType,
    });
  }, [currentMiniLesson, currentScreenIndex]);

  useEffect(() => {
    if (lessonContent?.id) {
      setCurrentScreenIndex(0);
      setQuizStates({});
      setLessonCompletionStatus("idle");
      setLessonCompletionError(null);
      setLessonCompletion(null);
      setShowCompletionModal(false);
    }
  }, [lessonContent?.id]);

  const handleToggleNotes = () => {
    setIsNotesOpen((prev) => {
      const next = !prev;
      debugLog("CoursePlayer", "Notes panel toggled", { open: next });
      return next;
    });
  };

  const closeNotes = (context: string) => {
    setIsNotesOpen(false);
    debugLog("CoursePlayer", "Notes panel closed", { context });
  };

  const currentQuizFeedback = currentQuiz
    ? renderQuizFeedback(currentQuiz.id)
    : null;

  // Loading state
  if (isLoading || !lessonContent) {
    return (
      <PageShell showTopNav={false}>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-pulse text-gray-600 dark:text-gray-400">
            Loading lesson blah blah blah...
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell showTopNav={false}>
      <div className="flex h-screen overflow-hidden">
        {/* Outline Sidebar */}
        <OutlineSidebar
          outline={outline || { modules: [] }}
          currentLessonId={activeLessonId}
          currentModuleId={currentModule?.id || null}
          onNavigate={handleLessonNavigate}
          isOpen={isSidebarOpen}
          onToggle={toggleSidebar}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSidebar}
                className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <Menu className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {lessonContent.title}
                </h1>
                {currentModule && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {currentModule.title}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {currentScreenIndex + 1} / {lessonScreens.length}
              </span>
            </div>
          </div>

          {/* Mini-Lesson and Quiz Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
            <div className="max-w-3xl mx-auto space-y-6">
              {currentScreen ? (
                currentScreen.kind === "mini" ? (
                  <MiniLessonRenderer miniLesson={currentScreen.data} />
                ) : currentQuiz ? (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Lesson Quiz
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Complete this quiz to solidify what you just learned.
                      </p>
                    </div>
                    <QuizRenderer
                      className="p-6"
                      quiz={currentQuiz}
                      onSubmit={(submission, meta) =>
                        handleQuizSubmit(currentQuiz.id, submission, meta)
                      }
                      isSubmitting={
                        quizStates[currentQuiz.id]?.status === "submitting"
                      }
                    />
                    {currentQuizFeedback && (
                      <div className="px-6 pb-6">{currentQuizFeedback}</div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center text-sm text-gray-600 dark:text-gray-400">
                    Select a lesson from the outline to begin.
                  </div>
                )
              ) : (
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center text-sm text-gray-600 dark:text-gray-400">
                  Select a lesson from the outline to begin.
                </div>
              )}
            </div>
          </div>

          {/* Navigation Controls */}
          {hasScreens && (
            <>
              <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                <button
                  onClick={handlePrevMiniLesson}
                  disabled={!canGoPrev}
                  className="flex items-center gap-2 px-6 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Previous
                </button>

                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {currentScreenIndex + 1} / {lessonScreens.length}
                  </span>
                  <button
                    onClick={() => navigate(`/course/${courseId}`)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Course outline"
                  >
                    <BookOpen className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleToggleNotes}
                    className={`p-2 rounded-lg transition-colors ${
                      isNotesOpen
                        ? "bg-azure-500 text-white"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                    title="Toggle notes"
                  >
                    <FileText className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onClick={
                    isLastScreen ? handleCompleteLesson : handleNextMiniLesson
                  }
                  disabled={nextButtonDisabled}
                  className="flex items-center gap-2 px-6 py-2 bg-azure-500 hover:bg-azure-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {nextButtonLabel}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              {isLastScreen &&
                lessonCompletionStatus === "error" &&
                lessonCompletionError && (
                  <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                    {lessonCompletionError}
                  </p>
                )}
            </>
          )}
        </div>

        {/* Notes Panel - Desktop */}
        {isNotesOpen && (
          <>
            {/* Backdrop for mobile */}
            <div
              className="md:hidden fixed inset-0 bg-black/50 z-30"
              onClick={() => closeNotes("backdrop")}
            />

            {/* Notes Sidebar */}
            <div
              className={`
                ${isNotesOpen ? "translate-x-0" : "translate-x-full"}
                fixed md:sticky top-0 right-0 h-full w-full md:w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg z-40 md:shadow-none transition-transform duration-300
              `}
            >
              <div className="flex flex-col h-full">
                {/* Notes Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Your Notes
                  </h2>
                  <button
                    onClick={() => closeNotes("header-close")}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>

                {/* Notes Content */}
                <div className="flex-1 overflow-hidden">
                  {activeLessonId && <JottingPad lessonId={activeLessonId} />}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      {showCompletionModal && lessonCompletion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="absolute inset-0 pointer-events-none select-none">
            <div className="absolute -top-10 left-1/4 w-24 h-24 bg-amber-400/40 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-azure-500/30 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-1/3 right-1/4 w-20 h-20 bg-rose-500/30 rounded-full blur-3xl animate-pulse" />
          </div>
          <div className="relative w-full max-w-xl px-6 py-8 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-white/40 dark:border-gray-700">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-linear-to-br from-azure-500 via-rose-500 to-amber-500 flex items-center justify-center animate-bounce shadow-lg">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-3">
              Lesson Complete!
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
              {lessonCompletion?.courseCompleted
                ? "You’ve completed every lesson in this course. Outstanding work!"
                : "Fantastic job! You’re building momentum—keep the streak going."}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 text-center">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  XP Earned
                </p>
                <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
                  {lessonCompletion?.progress?.xp_earned ??
                    lessonCompletion?.progress?.xp_awarded ??
                    0}
                </p>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 text-center">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Course Progress
                </p>
                <p className="text-2xl font-semibold text-azure-600 dark:text-azure-400">
                  {(() => {
                    const raw =
                      lessonCompletion?.progress?.progress_percentage ??
                      lessonCompletion?.progress?.progress_percent ??
                      0;
                    const percent =
                      typeof raw === "string"
                        ? parseFloat(raw)
                        : typeof raw === "number"
                        ? raw
                        : 0;
                    return `${Math.round(percent)}%`;
                  })()}
                </p>
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 text-center">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Current Streak
                </p>
                <p className="text-2xl font-semibold text-rose-600 dark:text-rose-400">
                  {lessonCompletion?.progress?.streak_count ?? 0}
                </p>
              </div>
            </div>
            <blockquote className="text-center italic text-gray-700 dark:text-gray-300 mb-6">
              “Success is the sum of small efforts, repeated day in and day
              out.”
            </blockquote>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleCompletionContinue}
                className="flex-1 px-6 py-3 bg-linear-to-r from-azure-500 via-rose-500 to-amber-500 hover:from-azure-600 hover:via-rose-600 hover:to-amber-600 text-white rounded-xl font-semibold shadow-lg transition-transform transform hover:-translate-y-0.5"
              >
                {lessonCompletion?.courseCompleted
                  ? "View Course Summary"
                  : "Continue Learning"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
};
