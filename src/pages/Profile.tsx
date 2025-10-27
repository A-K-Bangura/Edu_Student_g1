import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PageShell } from "../components/layout/PageShell";
import {
  User,
  Award,
  Settings,
  Trophy,
  Flame,
  BookOpen,
  GraduationCap,
  Clock,
  TrendingUp,
  LogOut,
} from "lucide-react";
import { getUserProfile, updateSettings } from "../services/profile";
import { logout as authLogout } from "../services/auth";
import { useUIStore } from "../store/uiStore";
import { formatXP } from "../utils/format";
import { formatRelativeTime } from "../utils/format";

export const Profile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "overview" | "badges" | "settings"
  >("overview");
  const { darkMode, toggleDarkMode, lowBandwidthMode, toggleLowBandwidthMode } =
    useUIStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile"],
    queryFn: getUserProfile,
  });

  const settingsMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });

  const handleLogout = () => {
    authLogout();
    queryClient.clear();
    navigate("/auth/login");
  };

  const handleDarkModeToggle = () => {
    toggleDarkMode();
    settingsMutation.mutate({ dark_mode: !darkMode });
  };

  const handleLowBandwidthToggle = () => {
    toggleLowBandwidthMode();
    settingsMutation.mutate({ low_bandwidth_mode: !lowBandwidthMode });
  };

  if (isLoading) {
    return (
      <PageShell>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>
        </div>
      </PageShell>
    );
  }

  if (!profile) return null;

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-azure-500 to-blue-violet-500 rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-4xl font-bold text-white">
              {profile.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">
                {profile.name}
              </h1>
              <div className="space-y-1 text-white text-opacity-90">
                <p className="font-medium">{profile.email}</p>
                {profile.university && (
                  <p>
                    {profile.university}{" "}
                    {profile.faculty && `• ${profile.faculty}`}{" "}
                    {profile.department && `• ${profile.department}`}
                  </p>
                )}
                {profile.study_level && <p>Level: {profile.study_level}</p>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-white text-6xl font-bold">
                {Math.floor(profile.stats.total_xp / 100)}
              </div>
              <div className="text-white text-opacity-80">Level</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
          {[
            { id: "overview", label: "Overview", icon: User },
            { id: "badges", label: "Badges", icon: Award },
            { id: "settings", label: "Settings", icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors whitespace-nowrap border-b-2 ${
                activeTab === tab.id
                  ? "border-azure-500 text-azure-600 dark:text-azure-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Total XP
                  </span>
                  <Trophy className="w-8 h-8 text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatXP(profile.stats.total_xp)}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Current Streak
                  </span>
                  <Flame className="w-8 h-8 text-rose-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile.stats.current_streak} days
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Best: {profile.stats.longest_streak} days
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Lessons Completed
                  </span>
                  <BookOpen className="w-8 h-8 text-azure-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile.stats.lessons_completed}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Quizzes Completed
                  </span>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile.stats.quizzes_completed}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Courses Enrolled
                  </span>
                  <GraduationCap className="w-8 h-8 text-blue-violet-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile.stats.courses_enrolled}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {profile.stats.courses_completed} completed
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Study Time
                  </span>
                  <Clock className="w-8 h-8 text-aquamarine-500" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profile.stats.study_time_hours.toFixed(1)}h
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            {profile.recent_activity && profile.recent_activity.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Recent Activity
                </h2>
                <div className="space-y-3">
                  {profile.recent_activity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {activity.type === "lesson" && (
                          <BookOpen className="w-5 h-5 text-azure-500" />
                        )}
                        {activity.type === "quiz" && (
                          <TrendingUp className="w-5 h-5 text-green-500" />
                        )}
                        {activity.type === "course" && (
                          <GraduationCap className="w-5 h-5 text-blue-violet-500" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {activity.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {formatRelativeTime(
                              new Date(activity.completed_at)
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-500">
                          +{activity.xp_earned} XP
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "badges" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Earned Badges ({profile.badges.length})
            </h2>
            {profile.badges.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {profile.badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    title={badge.description}
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-rose-500 rounded-full flex items-center justify-center mb-3">
                      <Award className="w-8 h-8 text-white" />
                    </div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white text-center">
                      {badge.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center">
                      {formatRelativeTime(new Date(badge.earned_at))}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No badges earned yet. Keep learning to earn your first badge!
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                App Settings
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-semibold text-gray-900 dark:text-white">
                      Dark Mode
                    </label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Switch between light and dark themes
                    </p>
                  </div>
                  <button
                    onClick={handleDarkModeToggle}
                    className="w-14 h-7 rounded-full transition-colors relative bg-gray-300 dark:bg-gray-600"
                  >
                    <div
                      className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                        darkMode ? "translate-x-7" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-semibold text-gray-900 dark:text-white">
                      Low Bandwidth Mode
                    </label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Optimize for slower connections
                    </p>
                  </div>
                  <button
                    onClick={handleLowBandwidthToggle}
                    className="w-14 h-7 rounded-full transition-colors relative bg-gray-300 dark:bg-gray-600"
                  >
                    <div
                      className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                        lowBandwidthMode ? "translate-x-7" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                Account Actions
              </h2>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-semibold transition-colors w-full"
              >
                <LogOut className="w-5 h-5" />
                Log Out
              </button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
};
