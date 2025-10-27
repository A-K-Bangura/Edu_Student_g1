export interface CourseFilters {
  university_id?: number;
  faculty_id?: number;
  department_id?: number;
  level?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface Module {
  id: number;
  title: string;
  order_index: number;
  lessons: Lesson[];
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
  modules: Module[];
  instructor?: Instructor;
  your_progress?: {
    enrolled: boolean;
    progress_percent: number;
    completed_lessons: number;
    xp_earned: number;
  };
}
