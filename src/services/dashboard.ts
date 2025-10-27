import api from "./api";
import type { ApiResponse } from "../types";
import type {
  DashboardStats,
  Course,
  RecentActivity,
  Badge,
} from "../types/dashboard";

// Get dashboard stats
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await api.get<ApiResponse<DashboardStats>>(
    "/student/progress"
  );
  return (
    response.data.data || {
      xp_total: 0,
      streak_days: 0,
      current_level: 1,
      xp_to_next_level: 0,
      courses_enrolled: 0,
      courses_completed: 0,
      lessons_completed: 0,
      badges_count: 0,
    }
  );
};

// Get enrolled courses
export const getEnrolledCourses = async (): Promise<Course[]> => {
  const response = await api.get<ApiResponse<Course[]>>(
    "/student/courses?enrolled=true"
  );
  return response.data.data || [];
};

// Get recommended courses
export const getRecommendedCourses = async (): Promise<Course[]> => {
  const response = await api.get<ApiResponse<Course[]>>(
    "/student/courses?recommended=true"
  );
  return response.data.data || [];
};

// Get recent activity
export const getRecentActivity = async (): Promise<RecentActivity[]> => {
  const response = await api.get<
    ApiResponse<{ recent_activity: RecentActivity[] }>
  >("/student/progress");
  return response.data.data?.recent_activity || [];
};

// Get earned badges
export const getBadges = async (): Promise<Badge[]> => {
  const response = await api.get<ApiResponse<{ badges: Badge[] }>>(
    "/student/progress"
  );
  return response.data.data?.badges || [];
};
