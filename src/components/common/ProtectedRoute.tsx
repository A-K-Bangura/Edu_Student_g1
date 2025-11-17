import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { isAuthenticated } from "../../services/auth";

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
  // Check if user is authenticated
  const authenticated = isAuthenticated();

  // Get user data to check onboarding status
  const userStr = localStorage.getItem("user");
  const parsedUser = userStr ? JSON.parse(userStr) : null;

  // Check if user has completed onboarding
  const hasOnboarded =
    parsedUser?.is_onboarded ||
    (parsedUser?.university && parsedUser?.faculty);

  // Redirect to login if authentication is required but user is not authenticated
  if (requireAuth && !authenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  // If onboarding is required and user hasn't onboarded, redirect to onboarding
  if (requireOnboarding && !hasOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
