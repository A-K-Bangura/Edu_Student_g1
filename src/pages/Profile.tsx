import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { getUserProfile, updateProfile } from "../services/profile";
import { uploadAvatar } from "../services/upload";
import {
  getGamificationDashboard,
  getAchievements,
} from "../services/gamification";
import { getDashboard } from "../services/dashboard";
import { logout as authLogout } from "../services/auth";
import { useUIStore } from "../store/uiStore";
import { formatXP } from "../utils/format";
import { formatRelativeTime } from "../utils/format";

export const Profile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<
    "overview" | "badges" | "settings"
  >("overview");
  const { darkMode, toggleDarkMode, lowBandwidthMode, toggleLowBandwidthMode } =
    useUIStore();

  // Handle tab query parameter
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (
      tabParam === "badges" ||
      tabParam === "settings" ||
      tabParam === "overview"
    ) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["user-profile"],
    queryFn: getUserProfile,
  });

  const { data: gamificationData, isLoading: isGamificationLoading } = useQuery(
    {
      queryKey: ["gamification-dashboard"],
      queryFn: getGamificationDashboard,
    }
  );

  const { data: achievementsData, isLoading: isAchievementsLoading } = useQuery(
    {
      queryKey: ["achievements", 20],
      queryFn: () => getAchievements(20),
    }
  );

  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
  });

  const isLoading =
    isProfileLoading ||
    isGamificationLoading ||
    isAchievementsLoading ||
    isDashboardLoading;

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });

  const updateAvatarMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      // Also update user in localStorage
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
    // Note: Dark mode is now handled by UI store, not API
  };

  const handleLowBandwidthToggle = () => {
    toggleLowBandwidthMode();
    // Note: Low bandwidth mode is now handled by UI store, not API
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (only jpeg, png, webp allowed for avatars)
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      alert("Please select a valid image file (JPEG, PNG, or WebP)");
      return;
    }

    // Validate file size (max 5MB for Cloudinary upload)
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeBytes) {
      alert("Image size must be less than 5MB");
      return;
    }

    // Validate minimum file size
    if (file.size < 1) {
      alert("File size must be at least 1 byte");
      return;
    }

    try {
      updateAvatarMutation.mutate(file);
    } catch (error) {
      console.error("Avatar upload error:", error);
      alert("Failed to upload avatar. Please try again.");
    }
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
        <div className="bg-gradient-to-r from-azure-500 to-blue-violet-500 rounded-lg shadow-md p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-center gap-6 text-center md:text-left">
            <div className="relative">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name || profile.name || "Profile"}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white border-opacity-30"
                />
              ) : (
                <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-4xl font-bold text-white border-4 border-white border-opacity-30">
                  {(
                    profile.full_name ||
                    profile.name ||
                    profile.firstname ||
                    profile.email
                  )
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 cursor-pointer hover:bg-gray-100 transition-colors shadow-lg">
                <Settings className="w-4 h-4 text-gray-700" />
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={updateAvatarMutation.isPending}
                />
              </label>
              {updateAvatarMutation.isPending && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1 w-full">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {profile.full_name ||
                  (profile.firstname && profile.lastname
                    ? `${profile.firstname} ${profile.lastname}`
                    : profile.name || profile.email)}
              </h1>
              <div className="space-y-1 text-white text-opacity-90">
                <p className="font-medium">{profile.email}</p>
                {profile.university && (
                  <p>
                    {typeof profile.university === "object"
                      ? profile.university.name
                      : profile.university}{" "}
                    {profile.faculty &&
                      (typeof profile.faculty === "object"
                        ? `• ${profile.faculty.name}`
                        : `• ${profile.faculty}`)}{" "}
                    {profile.department &&
                      (typeof profile.department === "object"
                        ? `• ${profile.department.name}`
                        : `• ${profile.department}`)}
                  </p>
                )}
                {profile.year_of_study && (
                  <p>Year of Study: {profile.year_of_study}</p>
                )}
                {profile.profile_completion !== undefined && (
                  <p>Profile Completion: {profile.profile_completion}%</p>
                )}
              </div>
            </div>
            <div className="text-center md:text-right">
              <div className="text-white text-5xl md:text-6xl font-bold">
                {gamificationData?.xp_stats?.total_xp
                  ? Math.floor(gamificationData.xp_stats.total_xp / 100)
                  : profile.xp_total
                  ? Math.floor(profile.xp_total / 100)
                  : 0}
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
                  {formatXP(
                    gamificationData?.xp_stats?.total_xp ||
                      profile.xp_total ||
                      profile.stats?.total_xp ||
                      0
                  )}
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
                  {gamificationData?.streak_stats?.current_streak ||
                    profile.current_streak ||
                    profile.streak_days ||
                    profile.stats?.current_streak ||
                    0}{" "}
                  days
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Best:{" "}
                  {gamificationData?.streak_stats?.longest_streak ||
                    profile.longest_streak ||
                    profile.stats?.longest_streak ||
                    0}{" "}
                  days
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
                  {dashboardData?.stats?.lessons_completed ||
                    profile.stats?.lessons_completed ||
                    0}
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
                  {dashboardData?.stats?.quizzes_passed ||
                    profile.stats?.quizzes_completed ||
                    0}
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
                  {dashboardData?.stats?.enrolled_courses ||
                    profile.stats?.courses_enrolled ||
                    0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {dashboardData?.stats?.completed_courses ||
                    profile.stats?.courses_completed ||
                    0}{" "}
                  completed
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
                  {profile.stats?.study_time_hours?.toFixed(1) || "0.0"}h
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            {(() => {
              const activities =
                dashboardData?.recent_activity || profile.recent_activity || [];
              if (activities.length === 0) return null;

              return (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Recent Activity
                  </h2>
                  <div className="space-y-3">
                    {activities.map((activity) => {
                      // Dashboard activity has different structure
                      if (
                        "action_type" in activity ||
                        "xp_change" in activity
                      ) {
                        const dashActivity = activity as {
                          id: number;
                          action_type: string;
                          xp_change: number;
                          reason: string;
                          created_at: string;
                          course?: { id: number; title: string } | null;
                        };
                        return (
                          <div
                            key={dashActivity.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              {dashActivity.action_type?.includes("lesson") && (
                                <BookOpen className="w-5 h-5 text-azure-500" />
                              )}
                              {dashActivity.action_type?.includes("quiz") && (
                                <TrendingUp className="w-5 h-5 text-green-500" />
                              )}
                              {dashActivity.action_type?.includes("course") && (
                                <GraduationCap className="w-5 h-5 text-blue-violet-500" />
                              )}
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {dashActivity.reason ||
                                    dashActivity.action_type}
                                </p>
                                {dashActivity.course && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {dashActivity.course.title}
                                  </p>
                                )}
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {formatRelativeTime(
                                    new Date(dashActivity.created_at)
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p
                                className={`font-bold ${
                                  dashActivity.xp_change >= 0
                                    ? "text-amber-500"
                                    : "text-rose-500"
                                }`}
                              >
                                {dashActivity.xp_change >= 0 ? "+" : ""}
                                {dashActivity.xp_change} XP
                              </p>
                            </div>
                          </div>
                        );
                      }
                      // Profile activity structure
                      const profileActivity = activity as {
                        id: number;
                        type: "lesson" | "quiz" | "course";
                        title: string;
                        xp_earned: number;
                        completed_at: string;
                      };
                      return (
                        <div
                          key={profileActivity.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {profileActivity.type === "lesson" && (
                              <BookOpen className="w-5 h-5 text-azure-500" />
                            )}
                            {profileActivity.type === "quiz" && (
                              <TrendingUp className="w-5 h-5 text-green-500" />
                            )}
                            {profileActivity.type === "course" && (
                              <GraduationCap className="w-5 h-5 text-blue-violet-500" />
                            )}
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {profileActivity.title}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {formatRelativeTime(
                                  new Date(profileActivity.completed_at)
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-amber-500">
                              +{profileActivity.xp_earned} XP
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {activeTab === "badges" && (
          <div className="space-y-6">
            {/* Badges Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                Earned Badges ({gamificationData?.badges?.length || 0})
              </h2>
              {gamificationData?.badges &&
              gamificationData.badges.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {gamificationData.badges.map((badge) => (
                    <div
                      key={badge.id}
                      className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      title={badge.description}
                    >
                      {badge.icon_url ? (
                        <img
                          src={badge.icon_url}
                          alt={badge.name}
                          className="w-16 h-16 rounded-full mb-3 object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-rose-500 rounded-full flex items-center justify-center mb-3">
                          <Award className="w-8 h-8 text-white" />
                        </div>
                      )}
                      <p className="font-semibold text-sm text-gray-900 dark:text-white text-center">
                        {badge.name}
                      </p>
                      {badge.earned_at && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center">
                          {formatRelativeTime(new Date(badge.earned_at))}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No badges earned yet. Keep learning to earn your first
                    badge!
                  </p>
                </div>
              )}
            </div>

            {/* Achievements Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                Achievements ({achievementsData?.earned_count || 0} /{" "}
                {achievementsData?.total_count || 0})
              </h2>
              {achievementsData?.achievements &&
              achievementsData.achievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievementsData.achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-colors ${
                        achievement.earned
                          ? "bg-amber-50 dark:bg-amber-900/20 border-amber-500"
                          : "bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {achievement.icon_url ? (
                        <img
                          src={achievement.icon_url}
                          alt={achievement.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-rose-500 rounded-full flex items-center justify-center">
                          <Award className="w-8 h-8 text-white" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {achievement.name}
                          </p>
                          {achievement.earned && (
                            <span className="text-xs bg-amber-500 text-white px-2 py-1 rounded">
                              Earned
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {achievement.description}
                        </p>
                        {!achievement.earned && achievement.progress < 100 && (
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div
                              className="bg-amber-500 h-2 rounded-full transition-all"
                              style={{ width: `${achievement.progress}%` }}
                            />
                          </div>
                        )}
                        {achievement.earned_at && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Earned{" "}
                            {formatRelativeTime(
                              new Date(achievement.earned_at)
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No achievements yet. Complete courses and lessons to unlock
                    achievements!
                  </p>
                </div>
              )}
            </div>
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
