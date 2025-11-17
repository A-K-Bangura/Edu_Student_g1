import api from "./api";
import type { ApiResponse } from "../types";
import type {
  LessonDetail,
  ModuleDetail,
  LessonList,
  MiniLessonList,
  MiniLessonDetail,
} from "../types/lesson";

// Get lesson details
export const getLessonDetail = async (
  lessonId: string | number
): Promise<LessonDetail> => {
  const response = await api.get<ApiResponse<{ lesson: LessonDetail }>>(
    `/student/lessons/${lessonId}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Lesson not found");
  }

  return response.data.data.lesson;
};

// Get module details
export const getModuleDetail = async (
  moduleId: string | number
): Promise<ModuleDetail> => {
  const response = await api.get<ApiResponse<{ module: ModuleDetail }>>(
    `/student/modules/${moduleId}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Module not found");
  }

  return response.data.data.module;
};

// Get module lessons
export const getModuleLessons = async (
  moduleId: string | number
): Promise<LessonList> => {
  const response = await api.get<ApiResponse<{ lessons: LessonList }>>(
    `/student/modules/${moduleId}/lessons`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch lessons");
  }

  return response.data.data.lessons;
};

// Get lesson mini-lessons
export const getLessonMiniLessons = async (
  lessonId: string | number
): Promise<MiniLessonList> => {
  const response = await api.get<
    ApiResponse<{ mini_lessons: MiniLessonList }>
  >(`/student/lessons/${lessonId}/mini-lessons`);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch mini-lessons");
  }

  return response.data.data.mini_lessons;
};

// Get mini-lesson details
export const getMiniLessonDetail = async (
  miniLessonId: string | number
): Promise<MiniLessonDetail> => {
  const response = await api.get<
    ApiResponse<{ mini_lesson: MiniLessonDetail }>
  >(`/student/mini-lessons/${miniLessonId}`);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Mini-lesson not found");
  }

  return response.data.data.mini_lesson;
};

// Complete a lesson
export interface LessonCompletionData {
  time_spent_seconds: number;
  mini_lesson_progress: Array<{
    mini_lesson_id: number;
    completed: boolean;
  }>;
  client_event_id?: string;
}

export interface LessonCompletionResponse {
  lesson_id: number;
  completed: boolean;
  xp_awarded: number;
  badge_earned: boolean;
  new_badge?: {
    id: number;
    name: string;
    description: string;
    icon_url: string;
  };
  progress: {
    total_xp: number;
    streak_days: number;
    course_progress_percent: number;
  };
}

export const completeLesson = async (
  lessonId: string | number,
  data: LessonCompletionData
): Promise<LessonCompletionResponse> => {
  const response = await api.post<ApiResponse<LessonCompletionResponse>>(
    `/student/lessons/${lessonId}/complete`,
    data
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Lesson completion failed"
    );
  }

  return response.data.data;
};
