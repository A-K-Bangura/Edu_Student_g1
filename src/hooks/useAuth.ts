import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import * as authService from "../services/auth";

export const useAuth = () => {
  const navigate = useNavigate();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: () => {
      // Redirect based on user status
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      console.error("Login error:", error);
    },
  });

  // Send OTP mutation (used for signup)
  const sendOtpMutation = useMutation({
    mutationFn: authService.sendOtp,
    onSuccess: () => {
      // Redirect to OTP verification
      navigate("/auth/verify");
    },
    onError: (error: Error) => {
      console.error("Send OTP error:", error);
    },
  });

  // Verify OTP mutation
  const verifyOtpMutation = useMutation({
    mutationFn: authService.verifyOtp,
    onSuccess: (data) => {
      // Redirect based on onboarding status
      if (data.requires_onboarding) {
        navigate("/onboarding");
      } else {
        navigate("/dashboard");
      }
    },
    onError: (error: Error) => {
      console.error("OTP verification error:", error);
    },
  });

  // Logout
  const logout = async () => {
    await authService.logout();
    navigate("/auth/login");
  };

  return {
    login: loginMutation.mutate,
    signup: sendOtpMutation.mutate, // Alias for sendOtp
    sendOtp: sendOtpMutation.mutate,
    verifyOtp: verifyOtpMutation.mutate,
    logout,
    isLoading:
      loginMutation.isPending ||
      sendOtpMutation.isPending ||
      verifyOtpMutation.isPending,
    error:
      loginMutation.error || sendOtpMutation.error || verifyOtpMutation.error,
  };
};
