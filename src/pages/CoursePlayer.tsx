import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { getCourseOutline, getLessonContent } from "../services/lessons";
import { useUIStore } from "../store/uiStore";

export const CoursePlayer = () => {
  const { courseId, lessonId } = useParams<{
    courseId: string;
    moduleId?: string;
    lessonId?: string;
  }>();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [currentMiniLessonIndex, setCurrentMiniLessonIndex] = useState(0);

  // This will be set from the API or passed from navigation
  const activeLessonId = lessonId ? Number(lessonId) : null;

  // Fetch course outline
  const { data: outline } = useQuery({
    queryKey: ["course-outline", courseId],
    queryFn: () => getCourseOutline(courseId!),
    enabled: !!courseId,
  });

  // Fetch lesson content when lesson ID is available
  const { data: lessonContent, isLoading } = useQuery({
    queryKey: ["lesson-content", activeLessonId],
    queryFn: () => getLessonContent(activeLessonId!),
    enabled: !!activeLessonId,
  });

  // Find current module from outline
  const currentModule = outline?.modules.find((m) =>
    m.lessons.some((l) => l.id === activeLessonId)
  );

  // Toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
    useUIStore.getState().toggleMobilePanel();
  };

  // Navigate to different lesson
  const handleLessonNavigate = (moduleId: number, lessonId: number) => {
    setIsSidebarOpen(false);
    setCurrentMiniLessonIndex(0);
    navigate(`/course/${courseId}/module/${moduleId}/lesson/${lessonId}`);
  };

  // Navigate previous/next mini-lesson
  const currentMiniLesson = lessonContent?.mini_lessons[currentMiniLessonIndex];
  const canGoPrev = currentMiniLessonIndex > 0;
  const canGoNext =
    currentMiniLessonIndex < (lessonContent?.mini_lessons.length || 1) - 1;

  const handlePrevMiniLesson = () => {
    if (canGoPrev) {
      setCurrentMiniLessonIndex(currentMiniLessonIndex - 1);
    }
  };

  const handleNextMiniLesson = () => {
    if (canGoNext) {
      setCurrentMiniLessonIndex(currentMiniLessonIndex + 1);
    }
  };

  // If no lesson selected, redirect to first lesson
  useEffect(() => {
    if (
      !activeLessonId &&
      outline &&
      outline.modules.length > 0 &&
      outline.modules[0].lessons.length > 0
    ) {
      const firstModule = outline.modules[0];
      const firstLesson = firstModule.lessons[0];
      navigate(
        `/course/${courseId}/module/${firstModule.id}/lesson/${firstLesson.id}`
      );
    }
  }, [activeLessonId, outline, courseId, navigate]);

  // Loading state
  if (isLoading || !lessonContent) {
    return (
      <PageShell showTopNav={false}>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-pulse text-gray-600 dark:text-gray-400">
            Loading lesson...
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
                {currentMiniLessonIndex + 1} /{" "}
                {lessonContent.mini_lessons.length}
              </span>
            </div>
          </div>

          {/* Mini-Lesson Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
              {currentMiniLesson && (
                <MiniLessonRenderer miniLesson={currentMiniLesson} />
              )}
            </div>
          </div>

          {/* Navigation Controls */}
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
              <button
                onClick={() => navigate(`/course/${courseId}`)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Course outline"
              >
                <BookOpen className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsNotesOpen(!isNotesOpen)}
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
              onClick={handleNextMiniLesson}
              disabled={!canGoNext}
              className="flex items-center gap-2 px-6 py-2 bg-azure-500 hover:bg-azure-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notes Panel - Desktop */}
        {isNotesOpen && (
          <>
            {/* Backdrop for mobile */}
            <div
              className="md:hidden fixed inset-0 bg-black/50 z-30"
              onClick={() => setIsNotesOpen(false)}
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
                    onClick={() => setIsNotesOpen(false)}
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
    </PageShell>
  );
};
