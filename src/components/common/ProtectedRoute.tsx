import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requireOnboarding?: boolean;
}

export const ProtectedRoute = ({
  children,
  requireAuth = true,
  requireOnboarding = false,
}: ProtectedRouteProps) => {
  // Check if user is authenticated (has token)
  const isAuthenticated = !!localStorage.getItem("auth_token");
  const user = localStorage.getItem("user");
  const parsedUser = user ? JSON.parse(user) : null;

  // Check if user has completed onboarding
  const hasOnboarded = parsedUser?.university && parsedUser?.faculty;

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  // If onboarding is required and user hasn't onboarded, redirect to onboarding
  if (requireOnboarding && !hasOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
