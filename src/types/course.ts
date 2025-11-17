export interface CourseFilters {
  university_id?: number;
  faculty_id?: number;
  department_id?: number;
  level?: string;
  search?: string;
  sort_by?: "created_at" | "title";
  sort_order?: "asc" | "desc";
  page?: number;
  per_page?: number;
}

export interface Module {
  id: number;
  uuid?: string;
  title: string;
  description?: string;
  order_index: number;
  course_id?: number;
  lessons?: Lesson[];
  created_at?: string;
  updated_at?: string;
}

export interface Lesson {
  id: number;
  title: string;
  description: string;
  order_index: number;
  mini_lessons_count: number;
  quizzes_count: number;
  estimated_minutes: number;
  is_completed: boolean;
}

export interface Instructor {
  id: number;
  name: string;
  title: string;
  avatar_url?: string;
}

export interface CourseDetail {
  id: number;
  uuid: string;
  slug?: string;
  title: string;
  description: string;
  level: string;
  status?: string;
  semester?: string;
  thumbnail_url?: string;
  creator?: Instructor;
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
  modules?: Module[];
  instructor?: Instructor;
  enrollments_count?: number;
  is_enrolled?: boolean;
  progress?: {
    progress_percentage: number;
    completed_lessons: number;
    completed_quizzes: number;
    is_completed: boolean;
    last_activity_at?: string;
    enrolled_at?: string;
  };
  created_at?: string;
}

export interface CourseProgress {
  id: number;
  course_id: number;
  student_id: number;
  progress_percentage: number;
  progress_percent?: number | string;
  completed_lessons: number;
  completed_quizzes: number;
  quizzes_passed?: number;
  streak_count?: number;
  xp_earned?: number;
  xp_available?: number;
  total_xp_available?: number;
  xp_awarded?: number;
  is_completed: boolean;
  last_activity_at?: string;
  enrolled_at?: string;
  last_lesson_id?: number | null;
  last_module_id?: number | null;
  course?: {
    id: number;
    title: string;
    modules?: Module[];
  };
}
