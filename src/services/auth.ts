import api from "./api";
import type { ApiResponse, User } from "../types";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
}

export interface OTPVerification {
  email: string;
  otp: string;
  purpose: "signup" | "reset" | "verify";
  user_type: "student";
}

export interface AuthResponse {
  token: string;
  token_type: string;
  expires_at: string;
  user: User;
}

// Login
export const login = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  const response = await api.post<ApiResponse<AuthResponse>>(
    "/auth/login/student",
    credentials
  );

  if (!response.data.data) {
    throw new Error(response.data.message || "Login failed");
  }

  // Store token
  localStorage.setItem("auth_token", response.data.data.token);
  localStorage.setItem("user", JSON.stringify(response.data.data.user));

  return response.data.data;
};

// Signup
export const signup = async (
  credentials: SignupCredentials
): Promise<{ email: string; otp_sent: boolean }> => {
  const response = await api.post<
    ApiResponse<{ email: string; otp_sent: boolean }>
  >("/auth/signup/student", credentials);

  if (!response.data.success) {
    throw new Error(response.data.message || "Signup failed");
  }

  return response.data.data as { email: string; otp_sent: boolean };
};

// Send OTP
export const sendOtp = async (
  email: string,
  purpose: "signup" | "reset" | "verify"
): Promise<{ email: string; expires_in: number; can_resend_at: string }> => {
  const response = await api.post<
    ApiResponse<{
      email: string;
      expires_in: number;
      can_resend_at: string;
    }>
  >("/auth/send-otp", { email, purpose });

  if (!response.data.success) {
    throw new Error(response.data.message || "OTP send failed");
  }

  return response.data.data as {
    email: string;
    expires_in: number;
    can_resend_at: string;
  };
};

// Verify OTP
export const verifyOtp = async (
  verification: OTPVerification
): Promise<{ verified: boolean; email: string }> => {
  const response = await api.post<
    ApiResponse<{ verified: boolean; email: string }>
  >("/auth/verify-otp", verification);

  if (!response.data.success) {
    throw new Error(response.data.message || "OTP verification failed");
  }

  return response.data.data as { verified: boolean; email: string };
};

// Logout
export const logout = async (): Promise<void> => {
  try {
    await api.post("/auth/logout");
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
  }
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
