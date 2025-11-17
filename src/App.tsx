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
const QuizPage = lazy(() =>
  import("./pages/Quiz").then((m) => ({ default: m.QuizPage }))
);
const Feed = lazy(() =>
  import("./pages/Feed").then((m) => ({ default: m.Feed }))
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
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/courses"
                element={
                  <ProtectedRoute>
                    <Courses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/course/:courseId"
                element={
                  <ProtectedRoute>
                    <CourseDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/course/:courseId/play"
                element={
                  <ProtectedRoute>
                    <CoursePlayer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/course/:courseId/module/:moduleId/lesson/:lessonId"
                element={
                  <ProtectedRoute>
                    <CoursePlayer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/lesson/:lessonId/quiz"
                element={
                  <ProtectedRoute>
                    <QuizPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/feed"
                element={
                  <ProtectedRoute>
                    <Feed />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leaderboard"
                element={
                  <ProtectedRoute>
                    <Leaderboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* Default redirect - check authentication first */}
              <Route
                path="/"
                element={
                  isAuthenticated() ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <Navigate to="/auth/login" replace />
                  )
                }
              />
              <Route
                path="*"
                element={
                  isAuthenticated() ? (
                    <Navigate to="/dashboard" replace />
                  ) : (
                    <Navigate to="/auth/login" replace />
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
