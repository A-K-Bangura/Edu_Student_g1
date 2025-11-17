import api from "./api";
import type { ApiResponse, User } from "../types";

export interface LoginCredentials {
  email?: string;
  phone?: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
}

export interface OTPVerification {
  email: string;
  otp: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface VerifyOtpResponse {
  token: string;
  user: User;
  requires_onboarding: boolean;
}

export interface CompleteOnboardingData {
  firstname: string;
  lastname: string;
  phone: string;
  date_of_birth?: string;
  gender?: "male" | "female" | "other";
  level: string;
  student_id?: string;
  password: string;
  password_confirmation: string;
  university_id: number;
  faculty_id: number;
  department_id: number;
  bio?: string;
}

export interface CompleteOnboardingResponse {
  user: User;
}

// Login
export const login = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  const response = await api.post<ApiResponse<AuthResponse>>(
    "/student/auth/login",
    credentials
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Login failed");
  }

  // Store token
  localStorage.setItem("auth_token", response.data.data.token);
  localStorage.setItem("user", JSON.stringify(response.data.data.user));

  return response.data.data;
};

// Send OTP
export const sendOtp = async (
  email: string
): Promise<{ email: string; expires_in: number }> => {
  const response = await api.post<
    ApiResponse<{
      email: string;
      expires_in: number;
    }>
  >("/student/auth/send-otp", { email });

  if (!response.data.success) {
    throw new Error(response.data.message || "OTP send failed");
  }

  return response.data.data as {
    email: string;
    expires_in: number;
  };
};

// Verify OTP
export const verifyOtp = async (
  verification: OTPVerification
): Promise<VerifyOtpResponse> => {
  const response = await api.post<ApiResponse<VerifyOtpResponse>>(
    "/student/auth/verify-otp",
    verification
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "OTP verification failed");
  }

  const data = response.data.data;

  // Store token and user if provided
  if (data.token) {
    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
  }

  return data;
};

// Complete Onboarding
export const completeOnboarding = async (
  data: CompleteOnboardingData
): Promise<CompleteOnboardingResponse> => {
  const response = await api.post<ApiResponse<CompleteOnboardingResponse>>(
    "/student/auth/complete-onboarding",
    data
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Onboarding completion failed");
  }

  // Update user in localStorage
  if (response.data.data.user) {
    localStorage.setItem("user", JSON.stringify(response.data.data.user));
  }

  return response.data.data;
};

// Logout
export const logout = async (): Promise<void> => {
  try {
    await api.post("/student/auth/logout");
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
  }
};

// Get Auth Profile
export const getAuthProfile = async (): Promise<{ user: User }> => {
  const response = await api.get<ApiResponse<{ user: User }>>(
    "/student/auth/profile"
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to get profile");
  }

  // Update user in localStorage
  if (response.data.data.user) {
    localStorage.setItem("user", JSON.stringify(response.data.data.user));
  }

  return response.data.data;
};

// Get current user
export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;

  try {
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
};

// Check if authenticated
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem("auth_token");
};
