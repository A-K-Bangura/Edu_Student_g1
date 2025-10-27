import api from "./api";
import type { ApiResponse } from "../types";
import type { LessonContent, CourseOutline } from "../types/lesson";

// Get lesson content with mini-lessons
export const getLessonContent = async (
  lessonId: number
): Promise<LessonContent> => {
  const response = await api.get<ApiResponse<LessonContent>>(
    `/lesson/${lessonId}`
  );
  if (!response.data.data) {
    throw new Error("Lesson not found");
  }
  return response.data.data;
};

// Get course outline/structure
export const getCourseOutline = async (
  courseUuid: string
): Promise<CourseOutline> => {
  const response = await api.get<ApiResponse<CourseOutline>>(
    `/course/${courseUuid}/outline`
  );
  return response.data.data || { modules: [] };
};
