import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PageShell } from "../components/layout/PageShell";
import { StatCard } from "../components/common/StatCard";
import { CourseCard } from "../components/course/CourseCard";
import {
  Trophy,
  Flame,
  BookOpen,
  Award,
  ArrowRight,
  ArrowUpRight,
  Coins,
} from "lucide-react";
import { XPCounter } from "../components/common/XPCounter";
import { StreakIndicator } from "../components/common/StreakIndicator";
import { getDashboard, getEnrolledCourses } from "../services/dashboard";
import { getRecommendedCourses } from "../services/courses";

export const Dashboard = () => {
  const navigate = useNavigate();
  // Get current user
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  // Fetch dashboard data
  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    retry: 1,
  });

  // Use student name from dashboard API or fallback to localStorage
  const firstName =
    dashboard?.student?.name?.split(" ")[0] || user?.firstname || "Student";

  const { data: enrolledCourses = [] } = useQuery({
    queryKey: ["enrolled-courses"],
    queryFn: getEnrolledCourses,
  });

  const { data: recommendedCourses = [] } = useQuery({
    queryKey: [
      "recommended-courses",
      user?.department?.id,
      user?.faculty?.id,
      user?.university?.id,
      user?.year_of_study || user?.level,
    ],
    queryFn: () =>
      getRecommendedCourses({
        department_id: user?.department?.id,
        faculty_id: user?.faculty?.id,
        university_id: user?.university?.id,
        level: user?.year_of_study || user?.level,
      }),
  });

  // Get current progress course (from enrollment objects)
  const inProgressCourse = enrolledCourses.find((enrollment) => {
    const progressPercent =
      typeof enrollment.progress_percent === "string"
        ? parseFloat(enrollment.progress_percent)
        : enrollment.progress_percent;
    return progressPercent < 100;
  });

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {getGreeting()}, {firstName}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Continue your learning journey
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total XP
              </p>
              <div className="bg-gradient-to-br from-azure-500 to-blue-violet-500 p-2 rounded-lg">
                <Trophy className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              <XPCounter
                xp={dashboard?.student?.total_xp || 0}
                animate={false}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Level {dashboard?.student?.score_level ?? 1}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">Streak</p>
              <div className="bg-gradient-to-br from-rose-500 to-amber-500 p-2 rounded-lg">
                <Flame className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              <StreakIndicator
                days={dashboard?.stats?.current_streak || 0}
                size="lg"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Keep it going!
            </p>
          </div>
          <StatCard
            title="Courses"
            value={`${dashboard?.stats?.enrolled_courses || 0} enrolled`}
            icon={BookOpen}
            color="bg-gradient-to-br from-aquamarine-500 to-azure-500"
            subtitle={`${dashboard?.stats?.completed_courses || 0} completed`}
          />
          <StatCard
            title="Badges"
            value={
              dashboard?.stats?.badges_earned ||
              dashboard?.badges?.filter((b) => b.has_badge).length ||
              0
            }
            icon={Award}
            color="bg-gradient-to-br from-amber-500 to-blue-violet-500"
            subtitle="Achievements unlocked"
          />
          <button
            onClick={() => navigate("/wallet")}
            className="relative text-left bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
          >
            <ArrowUpRight
              strokeWidth={3}
              className="absolute bottom-3 right-3 w-6 h-6 text-gray-500 dark:text-gray-400"
            />
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Vybe Coins
              </p>
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-2 rounded-lg">
                <Coins className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {(dashboard?.student?.coins?.available ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Manage wallet
            </p>
          </button>
        </div>

        {/* Continue Learning */}
        {inProgressCourse && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Continue Learning
              </h2>
              <button
                onClick={() => navigate("/courses/enrolled")}
                className="text-azure-500 hover:text-azure-600 flex items-center gap-2 text-sm font-medium"
              >
                View all <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <CourseCard
              course={inProgressCourse.course}
              enrollment={inProgressCourse}
              source="dashboard-continue"
            />
          </div>
        )}

        {/* My Courses */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              My Courses
            </h2>
            <button
              onClick={() => navigate("/courses")}
              className="text-azure-500 hover:text-azure-600 flex items-center gap-2 text-sm font-medium"
            >
              Browse all <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {enrolledCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.slice(0, 3).map((enrollment) => (
                <CourseCard
                  key={enrollment.id}
                  course={enrollment.course}
                  enrollment={enrollment}
                  source="dashboard-my-courses"
                />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No enrolled courses yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Start your learning journey by exploring available courses
              </p>
              <button
                onClick={() => navigate("/courses")}
                className="inline-flex items-center gap-2 bg-azure-500 hover:bg-azure-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Browse Courses <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Recommended Courses */}
        {recommendedCourses.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Recommended for You
              </h2>
              <button className="text-azure-500 hover:text-azure-600 flex items-center gap-2 text-sm font-medium">
                View all <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedCourses.slice(0, 3).map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  source="dashboard-recommended"
                />
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => navigate("/leaderboard")}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 text-left"
          >
            <Trophy className="w-8 h-8 text-azure-500 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              View Leaderboard
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Check your ranking and compete with others
            </p>
          </button>
          <button
            onClick={() => navigate("/profile?tab=badges")}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 text-left"
          >
            <Award className="w-8 h-8 text-amber-500 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              View Achievements
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              See your badges and accomplishments
            </p>
          </button>
          <button
            onClick={() => navigate("/wallet")}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 text-left"
          >
            <Coins className="w-8 h-8 text-amber-500 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Manage Vybe Coins
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              View your balance, history, and exchange for Leones
            </p>
          </button>
        </div>
      </div>
    </PageShell>
  );
};
