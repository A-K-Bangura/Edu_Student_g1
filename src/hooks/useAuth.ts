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

  // Signup mutation
  const signupMutation = useMutation({
    mutationFn: authService.signup,
    onSuccess: () => {
      // Redirect to OTP verification
      navigate("/auth/verify");
    },
    onError: (error: Error) => {
      console.error("Signup error:", error);
    },
  });

  // Verify OTP mutation
  const verifyOtpMutation = useMutation({
    mutationFn: authService.verifyOtp,
    onSuccess: () => {
      // Redirect to onboarding
      navigate("/onboarding");
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
    signup: signupMutation.mutate,
    verifyOtp: verifyOtpMutation.mutate,
    logout,
    isLoading:
      loginMutation.isPending ||
      signupMutation.isPending ||
      verifyOtpMutation.isPending,
    error:
      loginMutation.error || signupMutation.error || verifyOtpMutation.error,
  };
};
