import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
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
  const location = useLocation();
  
  // Check if user is authenticated (has main auth token)
  const authenticated = isAuthenticated();
  
  // Check if user has pending token (for onboarding flow)
  const hasPendingToken = !!localStorage.getItem("pending_auth_token");

  // Get user data to check onboarding status
  const userStr = localStorage.getItem("user") || localStorage.getItem("pending_user");
  const parsedUser = userStr ? JSON.parse(userStr) : null;

  // Check if user has completed onboarding
  const hasOnboarded =
    parsedUser?.is_onboarded ||
    (parsedUser?.university && parsedUser?.faculty);

  // For onboarding route, allow access if user has pending token (new signup flow)
  // For other routes, require full authentication
  const isOnboardingRoute = location.pathname === "/onboarding";
  const canAccess = authenticated || (isOnboardingRoute && hasPendingToken);

  // Redirect to login if authentication is required but user cannot access
  if (requireAuth && !canAccess) {
    return <Navigate to="/auth/login" replace />;
  }

  // If onboarding is required and user hasn't onboarded, redirect to onboarding
  if (requireOnboarding && !hasOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
