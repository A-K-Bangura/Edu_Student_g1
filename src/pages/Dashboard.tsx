import { useQuery } from "@tanstack/react-query";
import { PageShell } from "../components/layout/PageShell";
import { StatCard } from "../components/common/StatCard";
import { CourseCard } from "../components/course/CourseCard";
import { Trophy, Flame, BookOpen, Award, ArrowRight } from "lucide-react";
import { XPCounter } from "../components/common/XPCounter";
import { StreakIndicator } from "../components/common/StreakIndicator";
import {
  getDashboardStats,
  getEnrolledCourses,
  getRecommendedCourses,
} from "../services/dashboard";

export const Dashboard = () => {
  // Get current user
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const firstName = user?.firstname || "Student";

  // Fetch data
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStats,
  });

  const { data: enrolledCourses = [] } = useQuery({
    queryKey: ["enrolled-courses"],
    queryFn: getEnrolledCourses,
  });

  const { data: recommendedCourses = [] } = useQuery({
    queryKey: ["recommended-courses"],
    queryFn: getRecommendedCourses,
  });

  // Get current progress course
  const inProgressCourse = enrolledCourses.find(
    (course) => course.progress && course.progress.progress_percent < 100
  );

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
              <XPCounter xp={stats?.xp_total || 0} animate={false} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Level {stats?.current_level || 1}
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
              <StreakIndicator days={stats?.streak_days || 0} size="lg" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Keep it going!
            </p>
          </div>
          <StatCard
            title="Courses"
            value={`${stats?.courses_enrolled || 0} enrolled`}
            icon={BookOpen}
            color="bg-gradient-to-br from-aquamarine-500 to-azure-500"
            subtitle={`${stats?.courses_completed || 0} completed`}
          />
          <StatCard
            title="Badges"
            value={stats?.badges_count || 0}
            icon={Award}
            color="bg-gradient-to-br from-amber-500 to-blue-violet-500"
            subtitle="Achievements unlocked"
          />
        </div>

        {/* Continue Learning */}
        {inProgressCourse && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Continue Learning
              </h2>
              <button className="text-azure-500 hover:text-azure-600 flex items-center gap-2 text-sm font-medium">
                View all <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <CourseCard course={inProgressCourse} />
          </div>
        )}

        {/* My Courses */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              My Courses
            </h2>
            <button className="text-azure-500 hover:text-azure-600 flex items-center gap-2 text-sm font-medium">
              Browse all <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {enrolledCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.slice(0, 3).map((course) => (
                <CourseCard key={course.id} course={course} />
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
              <button className="inline-flex items-center gap-2 bg-azure-500 hover:bg-azure-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
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
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 text-left">
            <Trophy className="w-8 h-8 text-azure-500 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              View Leaderboard
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Check your ranking and compete with others
            </p>
          </button>
          <button className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700 text-left">
            <Award className="w-8 h-8 text-amber-500 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              View Achievements
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              See your badges and accomplishments
            </p>
          </button>
        </div>
      </div>
    </PageShell>
  );
};
