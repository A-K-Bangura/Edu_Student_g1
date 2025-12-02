import api from "./api";
import type { ApiResponse, User } from "../types";
import { ApiError } from "../utils/apiError";
import type { AxiosError } from "axios";

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
  level: string; // Supports: "UnderGrad", "100", "200", "300", "400", "500", "graduate"
  student_id?: string; // Required for levels 100-500, optional for UnderGrad/graduate
  password: string;
  password_confirmation: string;
  // For levels 100-500: university_id, faculty_id, department_id are required
  // For UnderGrad/graduate: organization_id is optional, university/faculty/department are not allowed
  university_id?: number; // Required for levels 100-500
  faculty_id?: number; // Required for levels 100-500
  department_id?: number; // Required for levels 100-500
  organization_id?: number; // Optional for UnderGrad/graduate levels
  bio?: string;
}

export interface CompleteOnboardingResponse {
  user: User;
}

// Login
export const login = async (
  credentials: LoginCredentials
): Promise<AuthResponse> => {
  try {
    const response = await api.post<ApiResponse<AuthResponse>>(
      "/student/auth/login",
      credentials
    );

    if (!response.data.success || !response.data.data) {
      // Handle error response
      const errorData = response.data.error;
      if (errorData) {
        throw new ApiError(
          errorData.message || "Login failed",
          errorData.code || "LOGIN_FAILED",
          errorData.details as Record<string, unknown> | undefined,
          undefined,
          response.data.request_id
        );
      }
      throw new Error(response.data.message || "Login failed");
    }

    // Store token
    localStorage.setItem("auth_token", response.data.data.token);
    localStorage.setItem("user", JSON.stringify(response.data.data.user));

    return response.data.data;
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle axios errors
    if (error && typeof error === "object" && "response" in error) {
      throw ApiError.fromAxiosError(error as AxiosError<ApiResponse>);
    }

    // Fallback
    throw error;
  }
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

  // For new signups requiring onboarding, store token temporarily
  // User will only be logged in after completing onboarding
  if (data.token) {
    if (data.requires_onboarding) {
      // Store token temporarily for onboarding API calls
      localStorage.setItem("pending_auth_token", data.token);
      // Store minimal user info for onboarding page
      localStorage.setItem("pending_user", JSON.stringify(data.user));
    } else {
      // For existing users or already onboarded, log in immediately
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
    }
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

  // Move pending token to main auth token (user is now logged in)
  const pendingToken = localStorage.getItem("pending_auth_token");
  if (pendingToken) {
    localStorage.setItem("auth_token", pendingToken);
    localStorage.removeItem("pending_auth_token");
    localStorage.removeItem("pending_user");
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
    localStorage.removeItem("pending_auth_token");
    localStorage.removeItem("pending_user");
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
