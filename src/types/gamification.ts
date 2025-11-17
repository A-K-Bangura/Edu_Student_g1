// XP Stats
export interface XPStats {
  total_xp: number;
  xp_by_action?: Record<string, string>;
  recent_xp?: number;
  // Legacy fields for backward compatibility
  total?: number;
  level?: number;
  xp_to_next_level?: number;
  this_week?: number;
  this_month?: number;
}

// Streak Stats
export interface StreakStats {
  current_streak: number;
  longest_streak: number;
  active_days?: number;
  average_activity?: number;
  streak_history?: Array<{
    date: string;
    active: boolean;
  }>;
  // Legacy fields for backward compatibility
  next_milestone?: number;
}

// Badge
export interface Badge {
  id: number;
  name: string;
  description: string;
  icon_url: string;
  earned_at?: string;
}

// Badge with details
export interface BadgeDetail {
  id: number;
  badge_id: number;
  badge: {
    id: number;
    name: string;
    description: string;
    icon_url: string;
    category: string;
    rarity: string;
  };
  earned_at: string;
  progress: number;
}

// Leaderboard Position
export interface LeaderboardPosition {
  rank: number;
  position: number;
  total_students: number;
  percentile: number;
  top_students?: Array<{
    id: number;
    name: string;
    xp_total: number;
    avatar_url?: string;
  }>;
  // Legacy fields for backward compatibility
  overall?: number;
  university?: number;
  faculty?: number;
  department?: number;
}

// Leaderboard Entry
export interface LeaderboardEntry {
  rank: number;
  student_id: number;
  student_name: string;
  xp_total: number;
  badges_count: number;
}

// Leaderboard Positions
export interface LeaderboardPositions {
  overall: LeaderboardEntry[];
  university: LeaderboardEntry[];
  faculty: LeaderboardEntry[];
  department: LeaderboardEntry[];
  user_position: LeaderboardPosition;
}

// Leaderboard Position Detail
export interface LeaderboardPositionDetail {
  overall: {
    position: number;
    total_users: number;
    percentile: number;
  };
  university?: {
    position: number;
    total_users: number;
  };
  faculty?: {
    position: number;
    total_users: number;
  };
  department?: {
    position: number;
    total_users: number;
  };
}

// Recent Achievement
export interface RecentAchievement {
  badge_name: string;
  earned_at: string;
}

// Gamification Dashboard
export interface GamificationDashboard {
  xp_stats: XPStats;
  streak_stats: StreakStats;
  badges: Badge[];
  leaderboard_position: LeaderboardPosition;
  recent_achievements: RecentAchievement[];
}

// Badge List
export interface BadgeList {
  badges: BadgeDetail[];
  total_earned: number;
  total_available: number;
}

// Streak Milestone
export interface StreakMilestone {
  days: number;
  achieved: boolean;
  achieved_at?: string;
}

// Streak Activity
export interface StreakActivity {
  date: string;
  active: boolean;
}

// Streak Data
export interface StreakData {
  current_streak: number;
  longest_streak: number;
  streak_start_date: string;
  next_milestone: number;
  milestones: StreakMilestone[];
  recent_activity: StreakActivity[];
}

// XP History Entry
export interface XPHistoryEntry {
  id: number;
  xp_amount: number;
  xp_type: "awarded" | "deducted";
  source: string;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// XP History
export interface XPHistory {
  history: XPHistoryEntry[];
  total: number;
  total_awarded: number;
  total_deducted: number;
}

// Achievement Requirement
export interface AchievementRequirement {
  [key: string]: number;
  current?: number;
}

// Achievement
export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon_url: string;
  category: string;
  rarity: string;
  earned: boolean;
  earned_at?: string;
  progress: number;
  requirement?: AchievementRequirement;
}

// Achievement List
export interface AchievementList {
  achievements: Achievement[];
  earned_count: number;
  total_count: number;
}

// Check Badges Response
export interface CheckBadgesResponse {
  new_badges: Array<{
    id: number;
    name: string;
    description: string;
  }>;
  checked: boolean;
}

// Gamification Stats
export interface GamificationStats {
  xp: {
    total: number;
    level: number;
    xp_to_next_level: number;
  };
  badges: {
    earned: number;
    total: number;
    percentage: number;
  };
  streaks: {
    current: number;
    longest: number;
  };
  leaderboard: {
    overall_position: number;
    percentile: number;
  };
}

