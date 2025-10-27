export type MiniLessonType = "text" | "image" | "video" | "download";

export interface MiniLesson {
  id: number;
  lesson_id: number;
  type: MiniLessonType;
  content_html?: string;
  media_url?: string;
  duration_seconds?: number;
  position: number;
}

export interface LessonContent {
  id: number;
  module_id: number;
  title: string;
  mini_lessons: MiniLesson[];
}

export interface CourseOutline {
  modules: Array<{
    id: number;
    title: string;
    order_index: number;
    lessons: Array<{
      id: number;
      title: string;
      order_index: number;
      is_completed: boolean;
    }>;
  }>;
}

export interface ProgressData {
  currentLessonId: number;
  completedLessons: number[];
  currentModuleProgress: number;
  overallProgress: number;
}
