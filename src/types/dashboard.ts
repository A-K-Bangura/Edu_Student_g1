export interface DashboardStats {
  xp_total: number;
  streak_days: number;
  current_level: number;
  xp_to_next_level: number;
  courses_enrolled: number;
  courses_completed: number;
  lessons_completed: number;
  badges_count: number;
}

export interface Course {
  id: number;
  uuid: string;
  title: string;
  description: string;
  level: string;
  semester?: string;
  thumbnail_url: string;
  university: {
    id: number;
    name: string;
  };
  faculty: {
    id: number;
    name: string;
  };
  department?: {
    id: number;
    name: string;
  };
  meta: {
    modules_count: number;
    lessons_count: number;
    estimated_hours: number;
    published_at: string;
  };
  is_enrolled?: boolean;
  progress?: {
    progress_percent: number;
    last_accessed_at?: string;
    next_lesson?: {
      id: number;
      title: string;
    };
  };
}

export interface RecentActivity {
  type: "lesson_completed" | "badge_earned" | "course_enrolled";
  title?: string;
  xp_earned?: number;
  timestamp: string;
}

export interface Badge {
  id: number;
  name: string;
  description: string;
  icon_url: string;
  earned_at?: string;
}
