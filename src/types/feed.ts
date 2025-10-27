export interface FeedPost {
  id: number;
  type: "tip" | "meme" | "announcement" | "all";
  content_html: string;
  media_url?: string;
  author: {
    id: number;
    name: string;
    university?: string;
    avatar_url?: string;
  };
  likes_count: number;
  is_liked: boolean;
  created_at: string;
}

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

export interface FeedFilters {
  type?: "all" | "tip" | "meme" | "announcement";
  page?: number;
  per_page?: number;
}
