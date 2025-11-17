import api from "./api";
import type { ApiResponse } from "../types";
import type {
  GamificationDashboard,
  BadgeList,
  StreakData,
  LeaderboardPositions,
  LeaderboardPositionDetail,
  XPHistory,
  AchievementList,
  CheckBadgesResponse,
  GamificationStats,
} from "../types/gamification";

// Get gamification dashboard
export const getGamificationDashboard =
  async (): Promise<GamificationDashboard> => {
    const response = await api.get<ApiResponse<GamificationDashboard>>(
      "/student/gamification/dashboard"
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(
        response.data.message || "Failed to fetch gamification dashboard"
      );
    }

    return response.data.data;
  };

// Get badges
export const getBadges = async (): Promise<BadgeList> => {
  const response = await api.get<ApiResponse<{ badges: BadgeList }>>(
    "/student/gamification/badges"
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch badges");
  }

  return response.data.data.badges;
};

// Get streaks
export const getStreaks = async (): Promise<StreakData> => {
  const response = await api.get<ApiResponse<{ streaks: StreakData }>>(
    "/student/gamification/streaks"
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch streaks");
  }

  return response.data.data.streaks;
};

// Get leaderboards
export const getGamificationLeaderboards = async (
  scope?: "overall" | "university" | "faculty" | "department",
  limit?: number
): Promise<LeaderboardPositions> => {
  const params = new URLSearchParams();
  if (scope) params.append("scope", scope);
  if (limit) params.append("limit", limit.toString());

  const response = await api.get<
    ApiResponse<{ leaderboards: LeaderboardPositions }>
  >(`/student/gamification/leaderboards?${params.toString()}`);

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch leaderboards"
    );
  }

  return response.data.data.leaderboards;
};

// Get leaderboard position
export const getLeaderboardPosition = async (): Promise<LeaderboardPositionDetail> => {
  const response = await api.get<
    ApiResponse<{ position: LeaderboardPositionDetail }>
  >("/student/gamification/position");

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch leaderboard position"
    );
  }

  return response.data.data.position;
};

// Get XP history
export const getXPHistory = async (
  limit?: number,
  offset?: number,
  type?: "awarded" | "deducted"
): Promise<XPHistory> => {
  const params = new URLSearchParams();
  if (limit) params.append("limit", limit.toString());
  if (offset) params.append("offset", offset.toString());
  if (type) params.append("type", type);

  const response = await api.get<ApiResponse<{ history: XPHistory }>>(
    `/student/gamification/xp-history?${params.toString()}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch XP history");
  }

  return response.data.data.history;
};

// Get achievements
export const getAchievements = async (
  limit?: number
): Promise<AchievementList> => {
  const params = new URLSearchParams();
  if (limit) params.append("limit", limit.toString());

  const response = await api.get<ApiResponse<AchievementList>>(
    `/student/gamification/achievements?${params.toString()}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch achievements"
    );
  }

  return response.data.data;
};

// Check badges
export const checkBadges = async (): Promise<CheckBadgesResponse> => {
  const response = await api.post<ApiResponse<{ badges: CheckBadgesResponse }>>(
    "/student/gamification/check-badges",
    {}
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to check badges");
  }

  return response.data.data.badges;
};

// Get gamification stats
export const getGamificationStats = async (): Promise<GamificationStats> => {
  const response = await api.get<
    ApiResponse<{ stats: GamificationStats }>
  >("/student/gamification/stats");

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch gamification stats"
    );
  }

  return response.data.data.stats;
};

