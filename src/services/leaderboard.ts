import api from "./api";
import type { ApiResponse } from "../types";
import type { LeaderboardData, LeaderboardFilters } from "../types/leaderboard";

// Get leaderboard data
export const getLeaderboard = async (
  filters: LeaderboardFilters = {}
): Promise<LeaderboardData> => {
  const params = new URLSearchParams();
  if (filters.type) params.append("type", filters.type);
  if (filters.search) params.append("search", filters.search);
  if (filters.page) params.append("page", filters.page.toString());
  if (filters.per_page) params.append("per_page", filters.per_page.toString());

  const response = await api.get<ApiResponse<LeaderboardData>>(
    `/student/leaderboard?${params.toString()}`
  );

  if (!response.data.data) {
    throw new Error("Failed to fetch leaderboard");
  }

  return response.data.data;
};
