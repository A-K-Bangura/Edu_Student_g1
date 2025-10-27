import api from "./api";
import type { ApiResponse } from "../types";
import type { UserProfile } from "../types/profile";

// Get user profile
export const getUserProfile = async (): Promise<UserProfile> => {
  const response = await api.get<ApiResponse<UserProfile>>("/student/profile");

  if (!response.data.data) {
    throw new Error("Failed to fetch profile");
  }

  return response.data.data;
};

// Update user settings
export const updateSettings = async (settings: {
  dark_mode?: boolean;
  low_bandwidth_mode?: boolean;
  notifications_enabled?: boolean;
}): Promise<void> => {
  await api.put<ApiResponse<void>>("/student/settings", settings);
};
