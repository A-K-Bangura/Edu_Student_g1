import type { AxiosError } from "axios";
import type { ApiResponse } from "../types";

export class ApiError extends Error {
  code: string;
  details?: Record<string, unknown>;
  statusCode?: number;
  requestId?: string;

  constructor(
    message: string,
    code: string,
    details?: Record<string, unknown>,
    statusCode?: number,
    requestId?: string
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
    this.requestId = requestId;
  }

  static fromAxiosError(error: AxiosError<ApiResponse>): ApiError {
    const response = error.response;
    const data = response?.data;

    // Check if response has error object
    if (data?.error) {
      const errorData = data.error;
      const details = errorData.details as Record<string, unknown> | undefined;

      // Extract specific error message from details if available
      let message = errorData.message || "An error occurred";

      // Check for specific error details
      if (details?.details && typeof details.details === "string") {
        message = details.details;
      }

      return new ApiError(
        message,
        errorData.code || "UNKNOWN_ERROR",
        details,
        response?.status,
        data.request_id
      );
    }

    // Fallback to generic error
    return new ApiError(
      data?.message || error.message || "An unexpected error occurred",
      data?.error_code || "UNKNOWN_ERROR",
      undefined,
      response?.status,
      data?.request_id
    );
  }

  // Get user-friendly error message based on error code
  getUserFriendlyMessage(): string {
    switch (this.code) {
      case "LOGIN_FAILED":
        // Check if it's an email not found error
        if (this.details?.details === "The selected email is invalid.") {
          return "The email address you entered is not registered. Please check your email or sign up for a new account.";
        }
        return (
          this.message ||
          "Login failed. Please check your credentials and try again."
        );

      case "INVALID_CREDENTIALS":
        return "The email/phone or password you entered is incorrect. Please try again or reset your password if you've forgotten it.";

      case "TOKEN_EXPIRED":
        return "Your session has expired. Please log in again.";

      case "TOKEN_INVALID":
        return "Your session is invalid. Please log in again.";

      case "USER_SUSPENDED":
        return "Your account has been suspended. Please contact support for assistance.";

      case "RATE_LIMIT_EXCEEDED":
        return "Too many login attempts. Please wait a few minutes before trying again.";

      case "VALIDATION_ERROR":
        return this.message || "Please check your input and try again.";

      default:
        return this.message || "An error occurred. Please try again.";
    }
  }
}
