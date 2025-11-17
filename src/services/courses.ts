import api from "./api";
import type { ApiResponse, PaginatedResponse } from "../types";
import type { Course, Enrollment } from "../types/dashboard";
import type {
  CourseDetail,
  CourseFilters,
  CourseProgress,
} from "../types/course";

// Get all courses with filters
export const getCourses = async (
  filters: CourseFilters = {}
): Promise<PaginatedResponse<Course>> => {
  const params = new URLSearchParams();
  if (filters.university_id)
    params.append("university_id", filters.university_id.toString());
  if (filters.faculty_id)
    params.append("faculty_id", filters.faculty_id.toString());
  if (filters.department_id)
    params.append("department_id", filters.department_id.toString());
  if (filters.level) params.append("level", filters.level);
  if (filters.search) params.append("search", filters.search);
  if (filters.sort_by) params.append("sort_by", filters.sort_by);
  if (filters.sort_order) params.append("sort_order", filters.sort_order);
  if (filters.page) params.append("page", filters.page.toString());
  if (filters.per_page) params.append("per_page", filters.per_page.toString());

  const response = await api.get<ApiResponse<PaginatedResponse<Course>>>(
    `/student/courses?${params.toString()}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch courses");
  }

  return response.data.data;
};

// Get enrolled courses - returns enrollment objects with nested course
export const getEnrolledCourses = async (): Promise<Enrollment[]> => {
  const response = await api.get<ApiResponse<PaginatedResponse<Enrollment>>>(
    "/student/courses/enrolled"
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch enrolled courses"
    );
  }

  // Convert progress_percent from string to number if needed
  const enrollments = (response.data.data.data || []).map((enrollment) => ({
    ...enrollment,
    progress_percent:
      typeof enrollment.progress_percent === "string"
        ? parseFloat(enrollment.progress_percent)
        : enrollment.progress_percent,
  }));

  return enrollments;
};

// Get course details by UUID/ID
export const getCourseDetail = async (
  courseId: string | number
): Promise<CourseDetail> => {
  const response = await api.get<ApiResponse<{ course: CourseDetail }>>(
    `/student/courses/${courseId}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Course not found");
  }

  return response.data.data.course;
};

// Get course progress
export const getCourseProgress = async (
  courseId: string | number
): Promise<CourseProgress> => {
  const response = await api.get<ApiResponse<{ progress: CourseProgress }>>(
    `/student/courses/${courseId}/progress`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch course progress");
  }

  return response.data.data.progress;
};

// Enroll in a course
export const enrollInCourse = async (
  courseId: string | number
): Promise<{ progress: CourseProgress; xp_awarded: number }> => {
  const response = await api.post<
    ApiResponse<{ progress: CourseProgress; xp_awarded: number }>
  >(`/student/courses/${courseId}/enroll`, {});

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to enroll in course");
  }

  return response.data.data;
};

// Unenroll from a course
export const unenrollFromCourse = async (
  courseId: string | number
): Promise<void> => {
  const response = await api.post<ApiResponse<void>>(
    `/student/courses/${courseId}/unenroll`,
    {}
  );

  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to unenroll from course");
  }
};

// Update course progress
export const updateCourseProgress = async (
  courseId: string | number,
  data: { lesson_id?: number; quiz_id?: number; completed: boolean }
): Promise<{ progress: CourseProgress; course_completed: boolean }> => {
  const response = await api.post<
    ApiResponse<{ progress: CourseProgress; course_completed: boolean }>
  >(`/student/courses/${courseId}/progress`, data);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to update progress");
  }

  return response.data.data;
};

// Get course modules
export const getCourseModules = async (
  courseId: string | number
): Promise<
  Array<{ id: number; uuid: string; title: string; order_index: number }>
> => {
  const response = await api.get<
    ApiResponse<{
      modules: Array<{
        id: number;
        uuid: string;
        title: string;
        order_index: number;
      }>;
    }>
  >(`/student/courses/${courseId}/modules`);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch modules");
  }

  return response.data.data.modules;
};

// Get recommended courses
export const getRecommendedCourses = async (filters?: {
  department_id?: number;
  faculty_id?: number;
  university_id?: number;
  level?: string;
}): Promise<Course[]> => {
  const params = new URLSearchParams();
  params.append("recommended", "true");

  if (filters?.department_id) {
    params.append("department_id", filters.department_id.toString());
  }
  if (filters?.faculty_id) {
    params.append("faculty_id", filters.faculty_id.toString());
  }
  if (filters?.university_id) {
    params.append("university_id", filters.university_id.toString());
  }
  if (filters?.level) {
    params.append("level", filters.level);
  }

  const response = await api.get<ApiResponse<Course[]>>(
    `/student/courses?${params.toString()}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch recommended courses"
    );
  }

  return response.data.data || [];
};
