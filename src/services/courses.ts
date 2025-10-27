import api from "./api";
import type { ApiResponse, PaginatedResponse } from "../types";
import type { Course } from "../types/dashboard";
import type { CourseDetail, CourseFilters } from "../types/course";

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
  if (filters.page) params.append("page", filters.page.toString());
  if (filters.per_page) params.append("per_page", filters.per_page.toString());

  const response = await api.get<PaginatedResponse<Course>>(
    `/student/courses?${params.toString()}`
  );
  return response.data;
};

// Get course details by UUID
export const getCourseDetail = async (uuid: string): Promise<CourseDetail> => {
  const response = await api.get<ApiResponse<CourseDetail>>(
    `/student/courses/${uuid}`
  );
  if (!response.data.data) {
    throw new Error("Course not found");
  }
  return response.data.data;
};

// Enroll in a course
export const enrollInCourse = async (courseId: number): Promise<void> => {
  await api.post(`/student/courses/${courseId}/enroll`, {});
};

// Get recommended courses
export const getRecommendedCourses = async (): Promise<Course[]> => {
  const response = await api.get<ApiResponse<Course[]>>(
    "/student/courses?recommended=true"
  );
  return response.data.data || [];
};
