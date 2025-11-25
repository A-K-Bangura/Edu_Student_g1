import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { PageShell } from "../components/layout/PageShell";
import {
  Clock,
  BookOpen,
  GraduationCap,
  CheckCircle,
  PlayCircle,
  ArrowLeft,
  Circle,
} from "lucide-react";
import {
  getCourseDetail,
  enrollInCourse,
  getCourseProgress,
} from "../services/courses";

export const CourseDetailPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: course, isLoading } = useQuery({
    queryKey: ["course-detail", courseId],
    queryFn: () => getCourseDetail(courseId!),
    enabled: !!courseId,
  });

  // Fetch course progress if enrolled to get completion data
  const { data: courseProgress } = useQuery({
    queryKey: ["course-progress", courseId],
    queryFn: () => getCourseProgress(courseId!),
    enabled: !!courseId && (!!course?.is_enrolled || !!course?.progress),
  });

  const enrollMutation = useMutation({
    mutationFn: () => enrollInCourse(courseId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-detail", courseId] });
      queryClient.invalidateQueries({
        queryKey: ["course-progress", courseId],
      });
      queryClient.invalidateQueries({ queryKey: ["enrolled-courses"] });
      navigate(`/course/${courseId}/play`);
    },
  });

  const handleEnroll = () => {
    enrollMutation.mutate();
  };

  // Extract completed lesson and quiz IDs from progress
  const completedLessonIds = useMemo(() => {
    if (!courseProgress?.completed_lessons) return new Set<number>();

    // completed_lessons is an array of lesson IDs: number[]
    const lessons = courseProgress.completed_lessons;
    if (Array.isArray(lessons)) {
      return new Set(
        lessons.filter((id): id is number => typeof id === "number")
      );
    }
    return new Set<number>();
  }, [courseProgress?.completed_lessons]);

  // Get progress percentage from courseProgress endpoint (primary source)
  const progressPercentage = useMemo(() => {
    // Priority: courseProgress.progress_percent > courseProgress.progress_percentage > course.progress.progress_percentage
    if (courseProgress?.progress_percent !== undefined) {
      return typeof courseProgress.progress_percent === "string"
        ? parseFloat(courseProgress.progress_percent)
        : courseProgress.progress_percent;
    }
    if (courseProgress?.progress_percentage !== undefined) {
      return courseProgress.progress_percentage;
    }
    if (course?.progress?.progress_percentage !== undefined) {
      return course.progress.progress_percentage;
    }
    return 0;
  }, [courseProgress, course?.progress]);

  // Calculate accurate counts from modules/lessons data
  const courseStats = useMemo(() => {
    if (!course?.modules) {
      return {
        modulesCount: course?.meta?.modules_count || 0,
        lessonsCount: course?.meta?.lessons_count || 0,
        quizzesCount: 0,
        estimatedHours: course?.meta?.estimated_hours || 0,
      };
    }

    const modulesCount = course.modules.length;
    let lessonsCount = 0;
    let quizzesCount = 0;
    let totalMinutes = 0;

    course.modules.forEach((module) => {
      if (module.lessons) {
        lessonsCount += module.lessons.length;
        module.lessons.forEach((lesson) => {
          quizzesCount += lesson.quizzes_count || 0;
          totalMinutes += lesson.estimated_minutes || 0;
        });
      }
    });

    const estimatedHours = Math.round((totalMinutes / 60) * 10) / 10; // Round to 1 decimal

    return {
      modulesCount,
      lessonsCount,
      quizzesCount,
      estimatedHours: estimatedHours || course?.meta?.estimated_hours || 0,
    };
  }, [course]);

  if (isLoading || !course) {
    return (
      <PageShell>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-3/4" />
            <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded mb-6" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate("/courses")}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-azure-500 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Courses
        </button>

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-8 border border-gray-200 dark:border-gray-700">
          {/* Thumbnail */}
          <div className="h-64 bg-gradient-to-br from-azure-500 to-blue-violet-500 rounded-lg mb-6 overflow-hidden">
            {course.thumbnail_url && (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </div>

          {/* Title and Meta */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {course.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {course.description}
            </p>

            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                <span>{course.level} Level</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                <span>{courseStats.lessonsCount} Lessons</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>{courseStats.estimatedHours}h Estimated</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>{courseStats.modulesCount} Modules</span>
              </div>
              {courseStats.quizzesCount > 0 && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>{courseStats.quizzesCount} Quizzes</span>
                </div>
              )}
            </div>
          </div>

          {/* Enroll/Continue Button */}
          {!course.is_enrolled && !course.progress && (
            <button
              onClick={handleEnroll}
              disabled={enrollMutation.isPending}
              className="w-full md:w-auto px-8 py-3 bg-azure-500 hover:bg-azure-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <PlayCircle className="w-5 h-5" />
              {enrollMutation.isPending ? "Enrolling..." : "Enroll Now"}
            </button>
          )}

          {/* Progress */}
          {(course.is_enrolled || courseProgress) &&
            (course.progress || courseProgress) && (
              <div className="bg-gradient-to-br from-azure-50 to-blue-violet-50 dark:from-azure-900/20 dark:to-blue-violet-900/20 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Your Progress
                  </span>
                  <span className="text-sm font-semibold text-green-500 dark:text-green-500">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
                <div className="h-2 bg-white dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-green-700 to-green-500 transition-all duration-500"
                    style={{
                      width: `${progressPercentage}%`,
                    }}
                  />
                </div>
                {/* <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  {course.progress?.completed_lessons ||
                    courseProgress?.completed_lessons ||
                    0}{" "}
                  of {courseStats.lessonsCount} lessons completed
                </div> */}
              </div>
            )}

          {/* Continue Learning Button */}
          {(course.is_enrolled || courseProgress) && (
            <button
              onClick={() => navigate(`/course/${courseId}/play`)}
              className="w-full md:w-auto px-8 py-3 bg-azure-500 hover:bg-azure-600 text-white rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <PlayCircle className="w-5 h-5" />
              Continue Learning
            </button>
          )}
        </div>

        {/* Course Structure */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-700 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Course Structure
          </h2>

          {course.modules && course.modules.length > 0 ? (
            course.modules.map((module, moduleIndex) => {
              // Check if module is completed (all lessons completed)
              const moduleLessons = module.lessons || [];
              const isModuleCompleted =
                moduleLessons.length > 0 &&
                moduleLessons.every(
                  (lesson) =>
                    lesson.is_completed || completedLessonIds.has(lesson.id)
                );

              return (
                <div key={module.id} className="mb-6 last:mb-0">
                  <h3
                    className={`text-lg font-semibold mb-3 flex items-center gap-2 ${
                      isModuleCompleted
                        ? "text-green-700 dark:text-green-300"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        isModuleCompleted
                          ? "bg-green-500 text-white"
                          : "bg-azure-500 text-white"
                      }`}
                    >
                      {moduleIndex + 1}
                    </span>
                    {module.title}
                    {isModuleCompleted && (
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 fill-current" />
                    )}
                  </h3>
                  <div className="ml-12 space-y-2">
                    {moduleLessons.map((lesson, lessonIndex) => {
                      const isLessonCompleted =
                        lesson.is_completed ||
                        completedLessonIds.has(lesson.id);
                      const isEnrolled = course.is_enrolled || courseProgress;
                      const canClick = isEnrolled;

                      const handleLessonClick = () => {
                        if (canClick) {
                          navigate(
                            `/course/${courseId}/module/${module.id}/lesson/${lesson.id}`
                          );
                        }
                      };

                      return (
                        <button
                          key={lesson.id}
                          onClick={handleLessonClick}
                          disabled={!canClick}
                          className={`w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left ${
                            canClick ? "cursor-pointer" : "cursor-default"
                          } ${
                            isLessonCompleted
                              ? "bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
                              : "hover:bg-gray-50 dark:hover:bg-gray-700"
                          } ${!canClick ? "opacity-60" : ""}`}
                        >
                          <span
                            className={`text-sm mt-1 ${
                              isLessonCompleted
                                ? "text-green-600 dark:text-green-400"
                                : "text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {moduleIndex + 1}.{lessonIndex + 1}
                          </span>
                          <div className="flex-1">
                            <h4
                              className={`text-sm font-medium ${
                                isLessonCompleted
                                  ? "text-green-700 dark:text-green-300"
                                  : "text-gray-900 dark:text-white"
                              }`}
                            >
                              {lesson.title}
                            </h4>
                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                              <span>{lesson.estimated_minutes} min</span>
                              {lesson.quizzes_count > 0 && (
                                <span>
                                  {lesson.quizzes_count} quiz
                                  {lesson.quizzes_count > 1 ? "zes" : ""}
                                </span>
                              )}
                            </div>
                          </div>
                          {isLessonCompleted ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 fill-current" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-gray-600 dark:text-gray-400">
              Course structure not available
            </p>
          )}
        </div>
      </div>
    </PageShell>
  );
};
