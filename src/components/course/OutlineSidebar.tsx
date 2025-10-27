import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle, Circle } from "lucide-react";
import type { CourseOutline } from "../../types/lesson";

interface OutlineSidebarProps {
  outline: CourseOutline;
  currentLessonId: number | null;
  currentModuleId: number | null;
  onNavigate: (moduleId: number, lessonId: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const OutlineSidebar = ({
  outline,
  currentLessonId,
  currentModuleId,
  onNavigate,
  isOpen,
  onToggle,
}: OutlineSidebarProps) => {
  const [expandedModules, setExpandedModules] = useState<number[]>([
    currentModuleId || outline.modules[0]?.id || 0,
  ]);

  const toggleModule = (moduleId: number) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={onToggle}
        className="md:hidden fixed top-20 left-4 z-40 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-md p-2 hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        {isOpen ? "Close" : "Outline"}
      </button>

      {/* Sidebar */}
      <div
        className={`
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          fixed md:sticky top-20 left-0 h-[calc(100vh-5rem)] w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg md:shadow-none z-30 transition-transform duration-300 overflow-y-auto
        `}
      >
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Course Outline
          </h3>

          {outline.modules.map((module) => {
            const isExpanded = expandedModules.includes(module.id);

            return (
              <div key={module.id} className="mb-2">
                <button
                  onClick={() => toggleModule(module.id)}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="font-medium text-gray-900 dark:text-white text-sm">
                    Module {module.order_index}: {module.title}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                </button>

                {isExpanded && (
                  <div className="ml-4 space-y-1">
                    {module.lessons.map((lesson) => {
                      const isCurrent = lesson.id === currentLessonId;
                      const isCompleted = lesson.is_completed;

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => onNavigate(module.id, lesson.id)}
                          className={`
                            w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors
                            ${
                              isCurrent
                                ? "bg-azure-100 dark:bg-azure-900/20 text-azure-700 dark:text-azure-300"
                                : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                            }
                          `}
                        >
                          {isCompleted ? (
                            <CheckCircle className="w-4 h-4 text-azure-500 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 flex-shrink-0" />
                          )}
                          <span className="text-sm truncate">
                            {lesson.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
