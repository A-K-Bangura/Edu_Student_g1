import { useNavigate } from "react-router-dom";
import { BookOpen, Clock, ChevronRight, Coins } from "lucide-react";
import type { Course, Enrollment } from "../../types/dashboard";
import { debugLog } from "../../utils/debug";

interface CourseCardProps {
  course: Course;
  enrollment?: Enrollment;
  source?: string;
}

export const CourseCard = ({ course, enrollment, source }: CourseCardProps) => {
  const navigate = useNavigate();

  // Determine if course is enrolled (from enrollment prop or course.is_enrolled)
  const isEnrolled = !!enrollment || course.is_enrolled;

  // Get progress percentage from enrollment or course.progress
  const getProgressPercent = (): number => {
    if (enrollment) {
      const progress =
        typeof enrollment.progress_percent === "string"
          ? parseFloat(enrollment.progress_percent)
          : enrollment.progress_percent;
      return progress || 0;
    }
    if (course.progress) {
      return course.progress.progress_percent || 0;
    }
    return 0;
  };

  const progressPercent = getProgressPercent();

  // Get lesson count from course metadata or estimated_lessons_count
  const getLessonCount = (): number => {
    if (course.meta?.lessons_count) {
      return course.meta.lessons_count;
    }
    if (course.estimated_lessons_count) {
      return course.estimated_lessons_count;
    }
    return 0;
  };

  // Get estimated hours from course metadata or estimated_duration_hours
  const getEstimatedHours = (): number => {
    if (course.meta?.estimated_hours) {
      return course.meta.estimated_hours;
    }
    if (course.estimated_duration_hours) {
      return course.estimated_duration_hours;
    }
    return 0;
  };

  const handleClick = () => {
    const hasSavedSpot = Boolean(
      enrollment?.last_module_id && enrollment?.last_lesson_id
    );

    const fallbackDestination = isEnrolled
      ? `/course/${course.uuid}/play`
      : `/course/${course.uuid}`;

    const resolvedDestination = hasSavedSpot
      ? `/course/${course.uuid}/module/${enrollment?.last_module_id}/lesson/${enrollment?.last_lesson_id}`
      : fallbackDestination;

    debugLog("CourseCard", "Course card clicked", {
      source: source || "unknown",
      courseId: course.id,
      courseUuid: course.uuid,
      title: course.title,
      isEnrolled,
      progressPercent,
      destination: resolvedDestination,
      hasSavedSpot,
      lastModuleId: enrollment?.last_module_id,
      lastLessonId: enrollment?.last_lesson_id,
    });

    navigate(resolvedDestination, {
      state: {
        from: source || "unknown",
        courseId: course.id,
        courseUuid: course.uuid,
        timestamp: new Date().toISOString(),
        initialModuleId: hasSavedSpot ? enrollment?.last_module_id : undefined,
        initialLessonId: hasSavedSpot ? enrollment?.last_lesson_id : undefined,
      },
    });
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden border border-gray-200 dark:border-gray-700"
    >
      {/* Thumbnail */}
      <div className="relative h-40 bg-linear-to-br from-azure-500 to-blue-violet-500">
        <img
          src={course.thumbnail_url || "/placeholder-course.jpg"}
          alt={course.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        {isEnrolled && progressPercent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-azure-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
            {course.title}
          </h3>
          <ChevronRight className="w-5 h-5 text-gray-400 shrink-0 ml-2" />
        </div>

        {course.is_paid !== undefined && (
          <div className="mb-2 flex flex-wrap gap-2">
            {course.is_paid ? (
              <span className="inline-block px-3 py-1 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium">
                {course.currency || "SLE"} {(course.price ?? 0).toFixed(2)}
              </span>
            ) : (
              <span className="inline-block px-3 py-1 bg-azure-100 dark:bg-azure-900/20 text-azure-700 dark:text-azure-300 rounded-full text-xs font-medium">
                Free
              </span>
            )}
            {!!course.coin_reward && course.coin_reward > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-medium">
                <Coins className="w-3 h-3" />
                Earn {course.coin_reward}
              </span>
            )}
          </div>
        )}

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {course.short_description || course.description}
        </p>

        {/* Meta Info */}
        {(course.meta ||
          course.estimated_lessons_count ||
          course.estimated_duration_hours) && (
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              <span>{getLessonCount()} lessons</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{getEstimatedHours()}h</span>
            </div>
          </div>
        )}

        {/* Status Badge */}
        {isEnrolled && progressPercent > 0 && progressPercent < 100 && (
          <div className="mt-3 inline-block px-3 py-1 bg-azure-100 dark:bg-azure-900/20 text-azure-700 dark:text-azure-300 rounded-full text-xs font-medium">
            In Progress - {Math.round(progressPercent)}%
          </div>
        )}
        {isEnrolled && progressPercent >= 100 && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
            Completed
          </div>
        )}
        {isEnrolled && progressPercent === 0 && (
          <div className="mt-3 inline-block px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
            Not Started
          </div>
        )}
      </div>
    </div>
  );
};
