import { useNavigate } from "react-router-dom";
import { BookOpen, Clock, ChevronRight } from "lucide-react";
import type { Course } from "../../types/dashboard";

interface CourseCardProps {
  course: Course;
}

export const CourseCard = ({ course }: CourseCardProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (course.is_enrolled) {
      navigate(`/course/${course.uuid}/play`);
    } else {
      navigate(`/course/${course.uuid}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer overflow-hidden border border-gray-200 dark:border-gray-700"
    >
      {/* Thumbnail */}
      <div className="relative h-40 bg-gradient-to-br from-azure-500 to-blue-violet-500">
        <img
          src={course.thumbnail_url || "/placeholder-course.jpg"}
          alt={course.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        {course.progress && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-azure-500 transition-all duration-500"
              style={{ width: `${course.progress.progress_percent}%` }}
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
          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {course.description}
        </p>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            <span>{course.meta.lessons_count} lessons</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{course.meta.estimated_hours}h</span>
          </div>
        </div>

        {/* Status Badge */}
        {course.is_enrolled && course.progress && (
          <div className="mt-3 inline-block px-3 py-1 bg-azure-100 dark:bg-azure-900/20 text-azure-700 dark:text-azure-300 rounded-full text-xs font-medium">
            In Progress - {Math.round(course.progress.progress_percent)}%
          </div>
        )}
        {course.is_enrolled && !course.progress && (
          <div className="mt-3 inline-block px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium">
            Not Started
          </div>
        )}
      </div>
    </div>
  );
};
