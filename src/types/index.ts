// Common types for the application

export interface User {
  id: number;
  uuid: string;
  email: string;
  full_name: string;
  firstname: string;
  lastname: string;
  university: string;
  faculty: string;
  department: string;
  level: string;
  xp_total: number;
  streak_days: number;
  status: string;
  avatar_url?: string;
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
  timestamp?: string;
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
