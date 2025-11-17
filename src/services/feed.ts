import api from "./api";
import type { ApiResponse, PaginatedResponse } from "../types";
import type {
  FeedPost,
  FeedFilters,
  TrendingPost,
  PostDetail,
  PostLikeResponse,
  PostComment,
  PostCommentResponse,
  PostShareResponse,
} from "../types/feed";

// Get feed posts
export const getFeedPosts = async (
  filters: FeedFilters = {}
): Promise<PaginatedResponse<FeedPost>> => {
  const params = new URLSearchParams();
  if (filters.search) params.append("search", filters.search);
  if (filters.type) params.append("type", filters.type);
  if (filters.tags) params.append("tags", filters.tags);
  if (filters.with_media !== undefined)
    params.append("with_media", filters.with_media.toString());
  if (filters.sort_by) params.append("sort_by", filters.sort_by);
  if (filters.sort_order) params.append("sort_order", filters.sort_order);
  if (filters.per_page) params.append("per_page", filters.per_page.toString());

  const response = await api.get<
    ApiResponse<PaginatedResponse<FeedPost>>
  >(`/student/feed?${params.toString()}`);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch feed posts");
  }

  return response.data.data;
};

// Get trending posts
export const getTrendingPosts = async (
  days?: number,
  limit?: number
): Promise<TrendingPost[]> => {
  const params = new URLSearchParams();
  if (days) params.append("days", days.toString());
  if (limit) params.append("limit", limit.toString());

  const response = await api.get<ApiResponse<{ posts: TrendingPost[] }>>(
    `/student/feed/trending?${params.toString()}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch trending posts");
  }

  return response.data.data.posts || [];
};

// Get posts by tags
export const getPostsByTags = async (
  tags: string[],
  per_page?: number
): Promise<PaginatedResponse<FeedPost>> => {
  const response = await api.post<
    ApiResponse<PaginatedResponse<FeedPost>>
  >("/student/feed/tags", {
    tags,
    per_page,
  });

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch posts by tags");
  }

  return response.data.data;
};

// Get post details
export const getPostDetail = async (
  postId: string | number
): Promise<PostDetail> => {
  const response = await api.get<ApiResponse<{ post: PostDetail }>>(
    `/student/feed/${postId}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch post details");
  }

  return response.data.data.post;
};

// Like/unlike a post
export const toggleLikePost = async (
  postId: string | number
): Promise<PostLikeResponse> => {
  const response = await api.post<ApiResponse<PostLikeResponse>>(
    `/student/feed/${postId}/like`,
    {}
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to toggle like");
  }

  return response.data.data;
};

// Comment on a post
export const commentOnPost = async (
  postId: string | number,
  content: string,
  parentId?: number
): Promise<PostCommentResponse> => {
  const response = await api.post<ApiResponse<{ comment: PostComment }>>(
    `/student/feed/${postId}/comment`,
    {
      content,
      parent_id: parentId,
    }
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to add comment");
  }

  return response.data.data;
};

// Share a post
export const sharePost = async (
  postId: string | number,
  platform?: string
): Promise<PostShareResponse> => {
  const response = await api.post<ApiResponse<PostShareResponse>>(
    `/student/feed/${postId}/share`,
    {
      platform,
    }
  );

  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to share post");
  }

  return response.data.data || [];
};
