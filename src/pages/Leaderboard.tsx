import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "../components/layout/PageShell";
import {
  Trophy,
  Medal,
  Search,
  Flame,
  GraduationCap,
  Award,
  Users,
} from "lucide-react";
import { getLeaderboard } from "../services/leaderboard";
import { formatXP } from "../utils/format";
import type { LeaderboardFilters } from "../types/leaderboard";

export const Leaderboard = () => {
  const [filters, setFilters] = useState<LeaderboardFilters>({
    type: "overall",
    page: 1,
    per_page: 50,
  });

  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchQuery, page: 1 }));
  };

  const { data: leaderboardData, isLoading } = useQuery({
    queryKey: ["leaderboard", filters],
    queryFn: () => getLeaderboard(filters),
  });

  const handleFilterChange = (
    type: "overall" | "weekly" | "monthly" | "university"
  ) => {
    setFilters((prev) => ({ ...prev, type, page: 1 }));
  };

  const entries = leaderboardData?.entries || [];
  const currentUser = leaderboardData?.current_user;
  const meta = leaderboardData?.meta;

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

        {/* Filters and Search */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-azure-500"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-azure-500 hover:bg-azure-600 text-white rounded-lg font-semibold transition-colors"
              >
                Search
              </button>
            </div>

            {/* Filter */}
            <div className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => handleFilterChange("overall")}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  filters.type === "overall"
                    ? "bg-azure-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                Overall
              </button>
              <button
                onClick={() => handleFilterChange("weekly")}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  filters.type === "weekly"
                    ? "bg-azure-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => handleFilterChange("monthly")}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  filters.type === "monthly"
                    ? "bg-azure-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => handleFilterChange("university")}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  filters.type === "university"
                    ? "bg-azure-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                My University
              </button>
            </div>
          </div>
        </div>

        {/* Current User Card */}
        {currentUser && (
          <div className="bg-gradient-to-r from-azure-500 to-blue-violet-500 rounded-lg shadow-md p-6 mb-8 text-white">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Your Position
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-2xl font-bold">
                  {currentUser.user.name.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-lg">{currentUser.user.name}</p>
                  <p className="text-sm text-white text-opacity-80">
                    {currentUser.user.university}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <p className="font-bold text-lg">{currentUser.rank}</p>
                  <p className="text-sm text-white text-opacity-80">Rank</p>
                </div>
                <div>
                  <p className="font-bold text-lg">
                    {formatXP(currentUser.total_xp)}
                  </p>
                  <p className="text-sm text-white text-opacity-80">Total XP</p>
                </div>
                <div>
                  <p className="font-bold text-lg flex items-center gap-1">
                    <Flame className="w-5 h-5" />
                    {currentUser.current_streak}
                  </p>
                  <p className="text-sm text-white text-opacity-80">
                    Day Streak
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
              <div className="col-span-2">Courses</div>
              <div className="col-span-1">Badges</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {entries.map((entry) => (
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
                      {entry.user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {entry.user.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {entry.user.university}
                      </p>
                    </div>
                  </div>

                  {/* XP */}
                  <div className="col-span-6 md:col-span-2 flex flex-col justify-center">
                    <span className="md:hidden text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Total XP
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatXP(entry.total_xp)}
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
                        {entry.current_streak}
                      </span>
                    </div>
                  </div>

                  {/* Courses */}
                  <div className="col-span-3 md:col-span-2 flex flex-col justify-center">
                    <span className="md:hidden text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Courses
                    </span>
                    <div className="flex items-center gap-1">
                      <GraduationCap className="w-4 h-4 text-azure-500" />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {entry.completed_courses}
                      </span>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="col-span-12 md:col-span-1 flex items-center gap-1">
                    {entry.badges.slice(0, 3).map((badge) => (
                      <div
                        key={badge.id}
                        className="w-6 h-6 bg-gradient-to-br from-amber-500 to-rose-500 rounded-full flex items-center justify-center"
                        title={badge.name}
                      >
                        <Award className="w-3 h-3 text-white" />
                      </div>
                    ))}
                    {entry.badges.length > 3 && (
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        +{entry.badges.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {meta && meta.last_page > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Showing{" "}
                  {Math.min(
                    (meta.current_page - 1) * meta.per_page + 1,
                    meta.total
                  )}{" "}
                  to {Math.min(meta.current_page * meta.per_page, meta.total)}{" "}
                  of {meta.total} entries
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        page: Math.max(1, (prev.page || 1) - 1),
                      }))
                    }
                    disabled={meta.current_page === 1}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Previous
                  </button>
                  <div className="px-4 py-2 bg-azure-500 text-white rounded-lg">
                    {meta.current_page} / {meta.last_page}
                  </div>
                  <button
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        page: Math.min(meta.last_page, (prev.page || 1) + 1),
                      }))
                    }
                    disabled={meta.current_page === meta.last_page}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Next
                  </button>
                </div>
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
