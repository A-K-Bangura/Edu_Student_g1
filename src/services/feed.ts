import api from "./api";
import type { ApiResponse, PaginatedResponse } from "../types";
import type { FeedPost, FeedAccess, FeedFilters } from "../types/feed";

// Get feed posts
export const getFeedPosts = async (
  filters: FeedFilters = {}
): Promise<PaginatedResponse<FeedPost>> => {
  const params = new URLSearchParams();
  if (filters.type) params.append("type", filters.type);
  if (filters.page) params.append("page", filters.page.toString());
  if (filters.per_page) params.append("per_page", filters.per_page.toString());

  const response = await api.get<PaginatedResponse<FeedPost>>(
    `/student/feed?${params.toString()}`
  );
  return response.data;
};

// Check feed access
export const getFeedAccess = async (): Promise<FeedAccess> => {
  const response = await api.get<ApiResponse<FeedAccess>>(
    "/student/feed/access"
  );
  return (
    response.data.data || {
      can_access: false,
      reason: "Unknown",
      requirements: { min_xp_today: 10, min_lessons_today: 1 },
    }
  );
};

// Like/unlike a post
export const toggleLikePost = async (
  postId: number
): Promise<{
  post_id: number;
  is_liked: boolean;
  likes_count: number;
}> => {
  const response = await api.post<
    ApiResponse<{
      post_id: number;
      is_liked: boolean;
      likes_count: number;
    }>
  >(`/student/feed/${postId}/like`);

  if (!response.data.data) {
    throw new Error("Failed to toggle like");
  }

  return response.data.data;
};
