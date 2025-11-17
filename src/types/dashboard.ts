// Legacy types for backward compatibility
export interface LegacyDashboardStats {
  xp_total: number;
  streak_days: number;
  current_level: number;
  xp_to_next_level: number;
  courses_enrolled: number;
  courses_completed: number;
  lessons_completed: number;
  badges_count: number;
}

// New dashboard types matching API response
export interface StudentInfo {
  id: string;
  name: string;
  avatar_url?: string;
  level: number;
  total_xp: number;
  profile_completion: number;
}

export interface DashboardStats {
  enrolled_courses: number;
  completed_courses: number;
  in_progress_courses: number;
  lessons_completed: number;
  quizzes_passed: number;
  badges_earned: number;
  current_streak: number;
}

export interface RecentActivity {
  id: number;
  action_type: string;
  xp_change: number;
  reason: string;
  created_at: string;
  course?: {
    id: number;
    title: string;
  } | null;
}

export interface DashboardEnrolledCourse {
  id: number;
  title: string;
  description: string;
  thumbnail_url?: string;
  progress_percentage: string | number;
  status: "in_progress" | "completed" | "not_started";
  enrolled_at: string;
  last_accessed_at?: string;
}

export interface ProgressSummary {
  courses: {
    total: number;
    completed: number;
    percentage: number;
  };
  lessons: {
    total: number;
    completed: number;
    percentage: number;
  };
  quizzes: {
    total: number;
    passed: number;
    percentage: number;
  };
}

export interface Badge {
  id: number;
  name: string;
  description: string;
  icon_url: string;
  earned_at?: string;
}

export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon_url?: string;
  earned_at?: string;
}

export interface LeaderboardPosition {
  position: number;
  total_students: number;
  percentile: number;
}

export interface StreakHistoryItem {
  date: string;
  active: boolean;
}

export interface StreakStats {
  current_streak: number;
  longest_streak: number;
  active_days: number;
  average_activity: number;
  streak_history: StreakHistoryItem[];
}

export interface XPStats {
  total_xp: number;
  xp_by_action: Record<string, string | number>;
  recent_xp: string | number;
}

export interface DashboardData {
  student: StudentInfo;
  stats: DashboardStats;
  recent_activity: RecentActivity[];
  enrolled_courses: DashboardEnrolledCourse[];
  progress_summary: ProgressSummary;
  badges: Badge[];
  achievements: Achievement[];
  leaderboard_position: LeaderboardPosition;
  streak_stats: StreakStats;
  xp_stats: XPStats;
}

// Creator/Instructor type
export interface Creator {
  id: number;
  uuid: string;
  email: string;
  email_verified_at?: string | null;
  firstname: string;
  lastname: string;
  phone?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  role_id: number;
  university_id?: number | null;
  faculty_id?: number | null;
  department_id?: number | null;
  qualification?: string | null;
  expertise_area?: string | null;
  bio?: string | null;
  credentials_file?: string | null;
  certifications?: any;
  years_experience?: number | null;
  avatar_url?: string | null;
  preferences?: any;
  social_links?: any;
  status: string;
  verified_at?: string | null;
  verified_by?: number | null;
  last_login_at?: string | null;
  last_login_ip?: string | null;
  courses_created?: number;
  students_taught?: number;
  otp_expires_at?: string | null;
  otp_attempts?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// Module type (simplified for nested course)
export interface CourseModule {
  id: number;
  uuid: string;
  course_id: number;
  title: string;
  description?: string;
  order_index: number;
  is_published?: boolean;
  learning_objectives?: string[];
  estimated_duration_minutes?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

// Course type matching the API response structure
export interface Course {
  id: number;
  uuid: string;
  title: string;
  description: string;
  short_description?: string;
  university_id?: number;
  faculty_id?: number;
  department_id?: number;
  level: string;
  semester?: string;
  course_code?: string;
  created_by?: number;
  estimated_duration_hours?: number;
  estimated_lessons_count?: number;
  estimated_quizzes_count?: number;
  learning_objectives?: string[];
  prerequisites?: string[];
  thumbnail_url: string;
  tags?: string[];
  status?: string;
  approved_by?: number;
  approved_at?: string | null;
  published_at?: string | null;
  rejection_reason?: string | null;
  enrolled_students_count?: number;
  completed_students_count?: number;
  average_rating?: string;
  total_ratings_count?: number;
  total_xp_available?: number;
  slug?: string;
  metadata?: {
    difficulty?: string;
    language?: string;
  };
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  is_published?: boolean;
  is_approved?: boolean;
  creator?: Creator;
  modules?: CourseModule[];
  // Legacy fields for backward compatibility
  university?: {
    id: number;
    name: string;
  };
  faculty?: {
    id: number;
    name: string;
  };
  department?: {
    id: number;
    name: string;
  };
  meta?: {
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

// Enrollment type matching the API response
export interface Enrollment {
  id: number;
  uuid: string;
  student_id: number;
  course_id: number;
  progress_percent: string | number; // API returns as string, but we'll convert to number
  xp_earned: number;
  lessons_completed: number;
  quizzes_completed: number;
  quizzes_passed: number;
  last_lesson_id?: number | null;
  last_module_id?: number | null;
  streak_count: number;
  last_accessed_date?: string | null;
  last_accessed_at?: string | null;
  completed_at?: string | null;
  completed_lessons?: number[] | null;
  completed_quizzes?: number[] | null;
  created_at: string;
  updated_at: string;
  course: Course; // Nested course object
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
