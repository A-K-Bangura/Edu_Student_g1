// Common types for the application

export interface User {
  id: string | number;
  uuid?: string;
  email: string;
  full_name?: string;
  firstname?: string | null;
  lastname?: string | null;
  phone?: string;
  date_of_birth?: string;
  gender?: "male" | "female" | "other";
  student_id?: string;
  university?: {
    id: number;
    name: string;
    code?: string;
  };
  faculty?: {
    id: number;
    name: string;
    code?: string;
  };
  department?: {
    id: number;
    name: string;
    code?: string;
  };
  level?: string;
  xp_total?: number;
  streak_days?: number;
  current_streak?: number;
  last_activity_date?: string;
  status?: string;
  avatar_url?: string;
  bio?: string;
  interests?: string[];
  is_onboarded?: boolean;
  preferences?: Record<string, unknown>;
  social_links?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    portfolio?: string;
  };
  created_at?: string;
  updated_at?: string;
  last_login_at?: string;
}

export interface AuthToken {
  token: string;
  token_type: string;
  expires_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  error_code?: string;
  timestamp?: string;
  request_id?: string;
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
  links?: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
}
