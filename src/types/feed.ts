export type PostType = "question" | "announcement" | "resource" | "discussion";

export interface PostAuthor {
  id: number;
  name: string;
  avatar_url?: string;
  // Optional extended fields from API
  firstname?: string;
  lastname?: string;
  display_name?: string;
  bio?: string | null;
  social_links?: Record<string, string> | null;
  preferences?: Record<string, unknown> | null;
  university?: { id: number; name: string } | null;
  role?: { id: number; name: string };
}

export interface FeedPost {
  id: number;
  uuid?: string;
  title?: string;
  content_text?: string;
  content_html?: string;
  type: PostType;
  tags?: string[];
  media_url?: string;
  media_metadata?: {
    width?: number;
    height?: number;
    size?: string;
    format?: string;
  };
  author?: PostAuthor;
  likes_count: number;
  comments_count: number;
  shares_count?: number;
  views_count?: number;
  has_liked: boolean;
  // optional arrays when provided in list responses
  likes?: Array<{
    id: number;
    user_id: number;
    user_type?: string;
    feed_post_id?: number;
    created_at?: string;
    updated_at?: string;
  }>;
  comments?: PostComment[];
  created_at: string;
}

export interface TrendingPost {
  id: number;
  title: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  trending_score: number;
}

export interface PostDetail extends FeedPost {
  likes?: Array<{
    id: number;
    user: PostAuthor;
    created_at: string;
  }>;
  comments?: PostComment[];
}

export interface PostComment {
  id: number;
  content: string;
  user: PostAuthor;
  parent_id?: number | null;
  is_approved: boolean;
  created_at: string;
}

export interface PostLikeResponse {
  liked: boolean;
}

export interface PostCommentResponse {
  comment: PostComment;
}

export interface PostShareResponse {
  shared: boolean;
}

export interface FeedFilters {
  search?: string;
  type?: PostType;
  tags?: string;
  with_media?: boolean;
  sort_by?: "created_at" | "popularity";
  sort_order?: "asc" | "desc";
  per_page?: number;
}

// Feed time related types
export interface FeedTimeResponse {
  seconds: number | null;
  unlimited: boolean;
}

export interface FeedExchangeResponse {
  seconds: number;
}

// Legacy types for backward compatibility
export interface FeedAccess {
  can_access: boolean;
  reason?: string;
  requirements: {
    min_xp_today: number;
    min_lessons_today: number;
  };
  current?: {
    xp_today: number;
    lessons_today: number;
  };
  unlocked_until?: string;
}
