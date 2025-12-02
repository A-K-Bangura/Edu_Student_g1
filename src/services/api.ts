import axios, { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { env } from "../config/env";

// Create axios instance
export const api = axios.create({
  baseURL: env.API_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 30000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Check for pending token first (for onboarding flow), then main auth token
    const token =
      localStorage.getItem("pending_auth_token") ||
      localStorage.getItem("auth_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Only redirect on 401 if we're not already on the login page
    // This prevents redirect loops and allows login errors to be displayed
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const isLoginPage =
        currentPath === "/auth/login" || currentPath.includes("/auth/login");

      if (!isLoginPage) {
        // Handle unauthorized - clear all tokens and redirect to login
        localStorage.removeItem("auth_token");
        localStorage.removeItem("pending_auth_token");
        localStorage.removeItem("user");
        localStorage.removeItem("pending_user");
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
