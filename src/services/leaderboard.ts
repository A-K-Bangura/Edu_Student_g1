import api from "./api";
import type { ApiResponse } from "../types";
import type {
  LeaderboardData,
  UniversityLeaderboard,
  FacultyLeaderboard,
  DepartmentLeaderboard,
  AchievementLeaderboard,
} from "../types/leaderboard";

// Get overall leaderboard
export const getLeaderboard = async (
  limit: number = 50,
  offset?: number
): Promise<LeaderboardData> => {
  const params = new URLSearchParams();
  if (limit) params.append("limit", limit.toString());
  if (offset) params.append("offset", offset.toString());

  const response = await api.get<
    ApiResponse<{
      leaderboard: Array<{
        rank: number;
        student: {
          id: number;
          name: string;
          avatar_url?: string;
          university?: string;
        };
        xp_total: number;
        period: string;
      }>;
      stats?: {
        total_students: number;
        total_xp: string;
        average_xp: number;
        top_student: {
          name: string;
          xp: number;
        };
      };
      period?: string;
    }>
  >(`/student/leaderboard?${params.toString()}`);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch leaderboard");
  }

  // Transform API response to match component expectations
  const transformedEntries = response.data.data.leaderboard.map((entry) => ({
    rank: entry.rank,
    student_id: entry.student.id,
    student_name: entry.student.name,
    student_avatar: entry.student.avatar_url,
    xp_total: entry.xp_total,
    badges_count: 0, // Not provided in API response
    streak_days: 0, // Not provided in API response
    university: entry.student.university,
  }));

  return {
    leaderboard: transformedEntries,
    total_users:
      response.data.data.stats?.total_students || transformedEntries.length,
    stats: response.data.data.stats,
    period: response.data.data.period,
  };
};

// Get university leaderboard
export const getUniversityLeaderboard = async (
  universityId: number,
  limit: number = 50,
  offset?: number
): Promise<UniversityLeaderboard> => {
  const params = new URLSearchParams();
  params.append("university_id", universityId.toString());
  if (limit) params.append("limit", limit.toString());
  if (offset) params.append("offset", offset.toString());

  const response = await api.get<
    ApiResponse<{
      leaderboard: Array<{
        rank: number;
        student: {
          id: number;
          name: string;
          avatar_url?: string;
          faculty?: string;
        };
        xp_total: number;
        period: string;
      }>;
      stats?: {
        total_students: number;
        total_xp: string;
        average_xp: number;
        top_student: {
          name: string;
          xp: number;
        };
      };
      period?: string;
    }>
  >(`/student/leaderboard/university?${params.toString()}`);

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch university leaderboard"
    );
  }

  // Transform API response to match component expectations
  // University leaderboard returns student.faculty
  const transformedEntries = response.data.data.leaderboard.map((entry) => ({
    rank: entry.rank,
    student_id: entry.student.id,
    student_name: entry.student.name,
    student_avatar: entry.student.avatar_url,
    xp_total: entry.xp_total,
    badges_count: 0,
    streak_days: 0,
    faculty: entry.student.faculty,
  }));

  return {
    leaderboard: transformedEntries,
    total_users:
      response.data.data.stats?.total_students || transformedEntries.length,
    stats: response.data.data.stats,
    period: response.data.data.period,
    university: {
      id: universityId,
      name: "",
    },
  };
};

// Get faculty leaderboard
export const getFacultyLeaderboard = async (
  facultyId: number,
  limit: number = 50,
  offset?: number
): Promise<FacultyLeaderboard> => {
  const params = new URLSearchParams();
  params.append("faculty_id", facultyId.toString());
  if (limit) params.append("limit", limit.toString());
  if (offset) params.append("offset", offset.toString());

  const response = await api.get<
    ApiResponse<{
      leaderboard: Array<{
        rank: number;
        student: {
          id: number;
          name: string;
          avatar_url?: string;
          department?: string;
        };
        xp_total: number;
        period: string;
      }>;
      stats?: {
        total_students: number;
        total_xp: string;
        average_xp: number;
        top_student: {
          name: string;
          xp: number;
        };
      };
      period?: string;
    }>
  >(`/student/leaderboard/faculty?${params.toString()}`);

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch faculty leaderboard"
    );
  }

  // Transform API response to match component expectations
  // Faculty leaderboard returns student.department
  const transformedEntries = response.data.data.leaderboard.map((entry) => ({
    rank: entry.rank,
    student_id: entry.student.id,
    student_name: entry.student.name,
    student_avatar: entry.student.avatar_url,
    xp_total: entry.xp_total,
    badges_count: 0,
    streak_days: 0,
    department: entry.student.department,
  }));

  return {
    leaderboard: transformedEntries,
    total_users:
      response.data.data.stats?.total_students || transformedEntries.length,
    stats: response.data.data.stats,
    period: response.data.data.period,
    faculty: {
      id: facultyId,
      name: "",
    },
  };
};

// Get department leaderboard
export const getDepartmentLeaderboard = async (
  departmentId: number,
  limit: number = 50,
  offset?: number
): Promise<DepartmentLeaderboard> => {
  const params = new URLSearchParams();
  params.append("department_id", departmentId.toString());
  if (limit) params.append("limit", limit.toString());
  if (offset) params.append("offset", offset.toString());

  const response = await api.get<
    ApiResponse<{
      leaderboard: Array<{
        rank: number;
        student: {
          id: number;
          name: string;
          avatar_url?: string;
        };
        xp_total: number;
        period: string;
      }>;
      stats?: {
        total_students: number;
        total_xp: string;
        average_xp: number;
        top_student: {
          name: string;
          xp: number;
        };
      };
      period?: string;
    }>
  >(`/student/leaderboard/department?${params.toString()}`);

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch department leaderboard"
    );
  }

  // Transform API response to match component expectations
  // Department leaderboard doesn't return any sub-organization field
  const transformedEntries = response.data.data.leaderboard.map((entry) => ({
    rank: entry.rank,
    student_id: entry.student.id,
    student_name: entry.student.name,
    student_avatar: entry.student.avatar_url,
    xp_total: entry.xp_total,
    badges_count: 0,
    streak_days: 0,
  }));

  return {
    leaderboard: transformedEntries,
    total_users:
      response.data.data.stats?.total_students || transformedEntries.length,
    stats: response.data.data.stats,
    period: response.data.data.period,
    department: {
      id: departmentId,
      name: "",
    },
  };
};

// Get achievement leaderboard
export const getAchievementLeaderboard = async (
  limit: number = 50,
  offset?: number
): Promise<AchievementLeaderboard> => {
  const params = new URLSearchParams();
  if (limit) params.append("limit", limit.toString());
  if (offset) params.append("offset", offset.toString());

  const response = await api.get<
    ApiResponse<{
      leaderboard: Array<{
        rank: number;
        student: {
          id: number;
          name: string;
          avatar_url?: string;
          university?: string;
        };
        xp_total: number;
        period: string;
      }>;
      stats?: {
        total_students: number;
        total_xp: string;
        average_xp: number;
        top_student: {
          name: string;
          xp: number;
        };
      };
      period?: string;
    }>
  >(`/student/leaderboard/achievements?${params.toString()}`);

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch achievement leaderboard"
    );
  }

  // Transform API response to match component expectations
  const transformedEntries = response.data.data.leaderboard.map((entry) => ({
    rank: entry.rank,
    student_id: entry.student.id,
    student_name: entry.student.name,
    student_avatar: entry.student.avatar_url,
    xp_total: entry.xp_total,
    badges_count: 0,
    streak_days: 0,
    university: entry.student.university,
  }));

  return {
    leaderboard: transformedEntries,
    total_users:
      response.data.data.stats?.total_students || transformedEntries.length,
    stats: response.data.data.stats,
    period: response.data.data.period,
  };
};
