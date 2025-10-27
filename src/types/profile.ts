export interface UserProfile {
  id: number;
  name: string;
  email: string;
  avatar_url?: string;
  university?: string;
  faculty?: string;
  department?: string;
  study_level?: string;
  stats: {
    total_xp: number;
    current_streak: number;
    longest_streak: number;
    lessons_completed: number;
    quizzes_completed: number;
    courses_enrolled: number;
    courses_completed: number;
    study_time_hours: number;
    level: number;
  };
  badges: Badge[];
  achievements: Achievement[];
  recent_activity: RecentActivity[];
}

export interface Badge {
  id: number;
  name: string;
  description: string;
  icon_url: string;
  earned_at: string;
}

export interface Achievement {
  id: number;
  title: string;
  description: string;
  icon_url: string;
  unlocked_at: string;
}

export interface RecentActivity {
  id: number;
  type: "lesson" | "quiz" | "course";
  title: string;
  xp_earned: number;
  completed_at: string;
}
