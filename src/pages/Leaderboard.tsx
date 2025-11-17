import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "../components/layout/PageShell";
import { Trophy, Medal, Flame, Award, Users } from "lucide-react";
import {
  getLeaderboard,
  getUniversityLeaderboard,
  getFacultyLeaderboard,
  getDepartmentLeaderboard,
  getAchievementLeaderboard,
} from "../services/leaderboard";
import { getCurrentUser } from "../services/auth";
import { formatXP } from "../utils/format";
import type {
  LeaderboardData,
  UniversityLeaderboard,
  FacultyLeaderboard,
  DepartmentLeaderboard,
  AchievementLeaderboard,
  LeaderboardEntry,
} from "../types/leaderboard";

type LeaderboardType =
  | "overall"
  | "university"
  | "faculty"
  | "department"
  | "achievements";

export const Leaderboard = () => {
  const [leaderboardType, setLeaderboardType] =
    useState<LeaderboardType>("overall");
  const [limit] = useState(50);
  const [offset] = useState(0);

  // Get current user to extract university, faculty, and department IDs
  const currentUser = getCurrentUser();
  const universityId = currentUser?.university?.id;
  const facultyId = currentUser?.faculty?.id;
  const departmentId = currentUser?.department?.id;

  const { data: leaderboardData, isLoading } = useQuery<
    | LeaderboardData
    | UniversityLeaderboard
    | FacultyLeaderboard
    | DepartmentLeaderboard
    | AchievementLeaderboard
  >({
    queryKey: [
      "leaderboard",
      leaderboardType,
      limit,
      offset,
      universityId,
      facultyId,
      departmentId,
    ],
    queryFn: async () => {
      switch (leaderboardType) {
        case "university":
          if (!universityId) {
            throw new Error("University ID not available");
          }
          return getUniversityLeaderboard(universityId, limit, offset);
        case "faculty":
          if (!facultyId) {
            throw new Error("Faculty ID not available");
          }
          return getFacultyLeaderboard(facultyId, limit, offset);
        case "department":
          if (!departmentId) {
            throw new Error("Department ID not available");
          }
          return getDepartmentLeaderboard(departmentId, limit, offset);
        case "achievements":
          return getAchievementLeaderboard(limit, offset);
        default:
          return getLeaderboard(limit, offset);
      }
    },
    enabled:
      leaderboardType === "overall" ||
      leaderboardType === "achievements" ||
      (leaderboardType === "university" && !!universityId) ||
      (leaderboardType === "faculty" && !!facultyId) ||
      (leaderboardType === "department" && !!departmentId),
  });

  const entries = leaderboardData?.leaderboard || [];
  const userPosition = leaderboardData?.user_position;
  const totalUsers = leaderboardData?.total_users || 0;

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-amber-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return null;
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return "from-amber-500 to-amber-600";
    if (rank === 2) return "from-gray-300 to-gray-400";
    if (rank === 3) return "from-amber-700 to-amber-800";
    return "from-gray-400 to-gray-500";
  };

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Leaderboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            See how you rank among all learners
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8 border border-gray-200 dark:border-gray-700">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setLeaderboardType("overall")}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                leaderboardType === "overall"
                  ? "bg-azure-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              Overall
            </button>
            <button
              onClick={() => setLeaderboardType("university")}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                leaderboardType === "university"
                  ? "bg-azure-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              University
            </button>
            <button
              onClick={() => setLeaderboardType("faculty")}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                leaderboardType === "faculty"
                  ? "bg-azure-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              Faculty
            </button>
            <button
              onClick={() => setLeaderboardType("department")}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                leaderboardType === "department"
                  ? "bg-azure-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              Department
            </button>
            <button
              onClick={() => setLeaderboardType("achievements")}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                leaderboardType === "achievements"
                  ? "bg-azure-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              Achievements
            </button>
          </div>
        </div>

        {/* Current User Card */}
        {userPosition && (
          <div className="bg-gradient-to-r from-azure-500 to-blue-violet-500 rounded-lg shadow-md p-6 mb-8 text-white">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Your Position
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-2xl font-bold">
                  #{userPosition.rank}
                </div>
                <div>
                  <p className="font-bold text-lg">Rank #{userPosition.rank}</p>
                  <p className="text-sm text-white text-opacity-80">
                    Top {((1 - userPosition.percentile / 100) * 100).toFixed(1)}
                    %
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <p className="font-bold text-lg">{userPosition.rank}</p>
                  <p className="text-sm text-white text-opacity-80">Rank</p>
                </div>
                <div>
                  <p className="font-bold text-lg">
                    {formatXP(userPosition.xp_total)}
                  </p>
                  <p className="text-sm text-white text-opacity-80">Total XP</p>
                </div>
                <div>
                  <p className="font-bold text-lg">
                    {userPosition.percentile.toFixed(1)}%
                  </p>
                  <p className="text-sm text-white text-opacity-80">
                    Percentile
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 animate-pulse"
              >
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : entries.length > 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400">
              <div className="col-span-1">Rank</div>
              <div className="col-span-4">Learner</div>
              <div className="col-span-2">Total XP</div>
              <div className="col-span-2">Streak</div>
              <div className="col-span-2">Badges</div>
              <div className="col-span-1"></div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {entries.map((entry: LeaderboardEntry) => (
                <div
                  key={entry.rank}
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {/* Rank */}
                  <div className="col-span-1 flex items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                        entry.rank <= 3
                          ? `bg-gradient-to-br ${getRankBadgeColor(entry.rank)}`
                          : "bg-gray-400"
                      }`}
                    >
                      {getRankIcon(entry.rank) || entry.rank}
                    </div>
                  </div>

                  {/* User */}
                  <div className="col-span-12 md:col-span-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-azure-500 to-blue-violet-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {entry.student_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {entry.student_name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {entry.university ||
                          entry.faculty ||
                          entry.department ||
                          ""}
                      </p>
                    </div>
                  </div>

                  {/* XP */}
                  <div className="col-span-6 md:col-span-2 flex flex-col justify-center">
                    <span className="md:hidden text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Total XP
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatXP(entry.xp_total)}
                    </span>
                  </div>

                  {/* Streak */}
                  <div className="col-span-3 md:col-span-2 flex flex-col justify-center">
                    <span className="md:hidden text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Streak
                    </span>
                    <div className="flex items-center gap-1">
                      <Flame className="w-4 h-4 text-amber-500" />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {entry.streak_days || 0}
                      </span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="col-span-3 md:col-span-2 flex flex-col justify-center">
                    <span className="md:hidden text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Badges
                    </span>
                    <div className="flex items-center gap-1">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {entry.badges_count}
                      </span>
                    </div>
                  </div>

                  {/* Empty column for spacing */}
                  <div className="col-span-12 md:col-span-1" />
                </div>
              ))}
            </div>

            {/* User Count */}
            {totalUsers > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Showing top {entries.length} of {totalUsers} learners
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No entries yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Be the first to make it to the leaderboard!
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
};
