import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { ProtectedRoute } from "./components/common/ProtectedRoute";
import { OfflineIndicator } from "./components/common/OfflineIndicator";
import { PageShell } from "./components/layout/PageShell";
import { useUIStore } from "./store/uiStore";
import { isAuthenticated } from "./services/auth";

// Lazy load pages for code splitting
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Dashboard }))
);
const Courses = lazy(() =>
  import("./pages/Courses").then((m) => ({ default: m.Courses }))
);
const Leaderboard = lazy(() =>
  import("./pages/Leaderboard").then((m) => ({ default: m.Leaderboard }))
);
const Profile = lazy(() =>
  import("./pages/Profile").then((m) => ({ default: m.Profile }))
);
const Login = lazy(() =>
  import("./pages/Auth/Login").then((m) => ({ default: m.Login }))
);
const Signup = lazy(() =>
  import("./pages/Auth/Signup").then((m) => ({ default: m.Signup }))
);
const VerifyOtp = lazy(() =>
  import("./pages/Auth/VerifyOtp").then((m) => ({ default: m.VerifyOtp }))
);
const Onboarding = lazy(() =>
  import("./pages/Onboarding").then((m) => ({ default: m.Onboarding }))
);
const CourseDetailPage = lazy(() =>
  import("./pages/CourseDetail").then((m) => ({ default: m.CourseDetailPage }))
);
const CoursePlayer = lazy(() =>
  import("./pages/CoursePlayer").then((m) => ({ default: m.CoursePlayer }))
);
const Feed = lazy(() =>
  import("./pages/Feed").then((m) => ({ default: m.Feed }))
);
const EnrolledCourses = lazy(() =>
  import("./pages/EnrolledCourses").then((m) => ({
    default: m.EnrolledCourses,
  }))
);
const Landing = lazy(() =>
  import("./pages/Landing").then((m) => ({ default: m.Landing }))
);
const Wallet = lazy(() =>
  import("./pages/Wallet").then((m) => ({ default: m.Wallet }))
);

// Loading fallback component
const LoadingFallback = () => (
  <PageShell>
    <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
        ))}
      </div>
    </div>
  </PageShell>
);

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const darkMode = useUIStore((state) => state.darkMode);

  // Apply dark mode to html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <OfflineIndicator />
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/signup" element={<Signup />} />
              <Route path="/auth/verify" element={<VerifyOtp />} />

              {/* Protected Routes */}
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute requireOnboarding>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              {/* Public: guests can browse courses without an account */}
              <Route path="/courses" element={<Courses />} />
              <Route
                path="/courses/enrolled"
                element={
                  <ProtectedRoute requireOnboarding>
                    <EnrolledCourses />
                  </ProtectedRoute>
                }
              />
              {/* Public: guests can preview a course's full curriculum */}
              <Route path="/course/:courseId" element={<CourseDetailPage />} />
              {/* Alias for Monime's checkout-return redirect, which the
                  backend sends to {STUDENT_PORTAL_URL}/courses/{slug} (plural) */}
              <Route
                path="/courses/:courseId"
                element={<CourseDetailPage />}
              />
              <Route
                path="/course/:courseId/play"
                element={
                  <ProtectedRoute requireOnboarding>
                    <CoursePlayer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/course/:courseId/module/:moduleId/lesson/:lessonId"
                element={
                  <ProtectedRoute requireOnboarding>
                    <CoursePlayer />
                  </ProtectedRoute>
                }
              />
              {/* Public: guests can read the feed without an account */}
              <Route path="/feed" element={<Feed />} />
              <Route
                path="/leaderboard"
                element={
                  <ProtectedRoute requireOnboarding>
                    <Leaderboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute requireOnboarding>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/wallet"
                element={
                  <ProtectedRoute requireOnboarding>
                    <Wallet />
                  </ProtectedRoute>
                }
              />

              {/* Root: dashboard for signed-in users, landing page for guests */}
              <Route
                path="/"
                element={
                  isAuthenticated() ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <Landing />
                  )
                }
              />
              <Route
                path="*"
                element={
                  isAuthenticated() ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
