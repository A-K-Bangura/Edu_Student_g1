import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "../components/layout/PageShell";
import {
  Clock,
  BookOpen,
  GraduationCap,
  CheckCircle,
  PlayCircle,
  ArrowLeft,
} from "lucide-react";
import { getCourseDetail, enrollInCourse } from "../services/courses";
import { formatXP } from "../utils/format";

export const CourseDetailPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: course, isLoading } = useQuery({
    queryKey: ["course-detail", courseId],
    queryFn: () => getCourseDetail(courseId!),
    enabled: !!courseId,
  });

  const enrollMutation = useMutation({
    mutationFn: () => enrollInCourse(course!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-detail", courseId] });
      queryClient.invalidateQueries({ queryKey: ["enrolled-courses"] });
      navigate(`/course/${courseId}/play`);
    },
  });

  const handleEnroll = () => {
    enrollMutation.mutate();
  };

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
            <img
              src={course.thumbnail_url}
              alt={course.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
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
                <span>{course.meta.lessons_count} Lessons</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>{course.meta.estimated_hours}h Estimated</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>{course.meta.modules_count} Modules</span>
              </div>
            </div>
          </div>

          {/* Enroll Button */}
          {!course.your_progress?.enrolled && (
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
          {course.your_progress?.enrolled && (
            <div className="bg-gradient-to-br from-azure-50 to-blue-violet-50 dark:from-azure-900/20 dark:to-blue-violet-900/20 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Your Progress
                </span>
                <span className="text-sm font-semibold text-azure-600 dark:text-azure-400">
                  {Math.round(course.your_progress.progress_percent)}%
                </span>
              </div>
              <div className="h-2 bg-white dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-azure-500 to-blue-violet-500 transition-all duration-500"
                  style={{ width: `${course.your_progress.progress_percent}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                {course.your_progress.completed_lessons} of{" "}
                {course.meta.lessons_count} lessons completed ·{" "}
                {formatXP(course.your_progress.xp_earned)}
              </div>
            </div>
          )}
        </div>

        {/* Course Structure */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-700 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Course Structure
          </h2>

          {course.modules.map((module, moduleIndex) => (
            <div key={module.id} className="mb-6 last:mb-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-azure-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {moduleIndex + 1}
                </span>
                {module.title}
              </h3>
              <div className="ml-12 space-y-2">
                {module.lessons.map((lesson, lessonIndex) => (
                  <div
                    key={lesson.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {moduleIndex + 1}.{lessonIndex + 1}
                    </span>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
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
                    {lesson.is_completed && (
                      <CheckCircle className="w-5 h-5 text-azure-500 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
};
