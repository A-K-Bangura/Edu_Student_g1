export interface LeaderboardEntry {
  rank: number;
  user: {
    id: number;
    name: string;
    avatar_url?: string;
    university?: string;
  };
  total_xp: number;
  current_streak: number;
  completed_courses: number;
  badges: {
    id: number;
    name: string;
    icon_url: string;
  }[];
}

export interface LeaderboardFilters {
  type?: "overall" | "weekly" | "monthly" | "university";
  search?: string;
  page?: number;
  per_page?: number;
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  current_user?: LeaderboardEntry;
  filters: {
    type: string;
    university?: string;
  };
  meta: {
    total: number;
    current_page: number;
    last_page: number;
    per_page: number;
  };
}
