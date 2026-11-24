import { useLayoutEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "../components/layout/PageShell";
import { Avatar } from "../components/common/Avatar";
import { StudentProfileModal } from "../components/leaderboard/StudentProfileModal";
import { Trophy, Medal, Flame, Award, Users } from "lucide-react";
import {
  getLeaderboard,
  getUniversityLeaderboard,
  getFacultyLeaderboard,
  getDepartmentLeaderboard,
  getOrganizationLeaderboard,
} from "../services/leaderboard";
import { getCurrentUser } from "../services/auth";
import { formatXP } from "../utils/format";
import {
  getDefaultLeaderboardScope,
  type LeaderboardScope as LeaderboardType,
} from "../utils/leaderboardScope";
import { useScrollToTopOnMount } from "../hooks/useScrollToTopOnMount";
import type {
  LeaderboardData,
  UniversityLeaderboard,
  FacultyLeaderboard,
  DepartmentLeaderboard,
  OrganizationLeaderboard,
  LeaderboardEntry,
} from "../types/leaderboard";

export const Leaderboard = () => {
  // Always open at the top of the list, whatever offset the previous page left.
  useScrollToTopOnMount();

  // Get current user to extract university, faculty, department, and organization IDs
  const currentUser = getCurrentUser();

  // Open on the student's own department (falling back to the next-narrowest
  // group they have, then overall) rather than on everyone.
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>(() =>
    getDefaultLeaderboardScope(currentUser)
  );
  // On a phone the scope tabs scroll sideways, and the landing tab (usually
  // Department) can sit past the right edge. Nudge the strip — horizontally
  // only, so the page's own scroll is untouched — until the selected tab shows.
  const scopeStripRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const strip = scopeStripRef.current;
    const active = strip?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!strip || !active) return;
    const stripBox = strip.getBoundingClientRect();
    const activeBox = active.getBoundingClientRect();
    if (activeBox.right > stripBox.right) {
      strip.scrollLeft += activeBox.right - stripBox.right;
    } else if (activeBox.left < stripBox.left) {
      strip.scrollLeft -= stripBox.left - activeBox.left;
    }
  }, [leaderboardType]);

  const [limit] = useState(50);
  // The row whose profile is open; its details are fetched by the modal itself.
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(null);

  const universityId = currentUser?.university?.id;
  const facultyId = currentUser?.faculty?.id;
  const departmentId = currentUser?.department?.id;
  const organizationId = currentUser?.organization?.id;

  const { data: leaderboardData, isLoading } = useQuery<
    | LeaderboardData
    | UniversityLeaderboard
    | FacultyLeaderboard
    | DepartmentLeaderboard
    | OrganizationLeaderboard
  >({
    queryKey: [
      "leaderboard",
      leaderboardType,
      limit,
      universityId,
      facultyId,
      departmentId,
      organizationId,
    ],
    queryFn: async () => {
      switch (leaderboardType) {
        case "university":
          if (!universityId) {
            throw new Error("University ID not available");
          }
          return getUniversityLeaderboard(universityId, limit);
        case "faculty":
          if (!facultyId) {
            throw new Error("Faculty ID not available");
          }
          return getFacultyLeaderboard(facultyId, limit);
        case "department":
          if (!departmentId) {
            throw new Error("Department ID not available");
          }
          return getDepartmentLeaderboard(departmentId, limit);
        case "organization":
          if (!organizationId) {
            throw new Error("Organization ID not available");
          }
          return getOrganizationLeaderboard(organizationId, limit);
        default:
          return getLeaderboard(limit);
      }
    },
    enabled:
      leaderboardType === "overall" ||
      (leaderboardType === "university" && !!universityId) ||
      (leaderboardType === "faculty" && !!facultyId) ||
      (leaderboardType === "department" && !!departmentId) ||
      (leaderboardType === "organization" && !!organizationId),
  });

  const entries = leaderboardData?.leaderboard || [];
  const userPosition = leaderboardData?.user_position;
  const totalUsers = leaderboardData?.total_users || 0;

  const getRankIcon = (rank: number) => {
    if (rank === 1)
      return <Trophy className="w-4 h-4 md:w-6 md:h-6 text-amber-500" />;
    if (rank === 2)
      return <Medal className="w-4 h-4 md:w-6 md:h-6 text-gray-400" />;
    if (rank === 3)
      return <Medal className="w-4 h-4 md:w-6 md:h-6 text-amber-600" />;
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
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Leaderboard
          </h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
            See how you rank among all learners
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 md:p-6 mb-6 md:mb-8 border border-gray-200 dark:border-gray-700">
          <div
            ref={scopeStripRef}
            role="group"
            aria-label="Leaderboard scope"
            className="flex gap-2 overflow-x-auto"
          >
            <button
              onClick={() => setLeaderboardType("overall")}
              aria-pressed={leaderboardType === "overall"}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-sm md:text-base font-medium whitespace-nowrap transition-colors ${
                leaderboardType === "overall"
                  ? "bg-azure-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              Overall
            </button>
            <button
              onClick={() => setLeaderboardType("university")}
              aria-pressed={leaderboardType === "university"}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-sm md:text-base font-medium whitespace-nowrap transition-colors ${
                leaderboardType === "university"
                  ? "bg-azure-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              University
            </button>
            <button
              onClick={() => setLeaderboardType("faculty")}
              aria-pressed={leaderboardType === "faculty"}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-sm md:text-base font-medium whitespace-nowrap transition-colors ${
                leaderboardType === "faculty"
                  ? "bg-azure-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              Faculty
            </button>
            <button
              onClick={() => setLeaderboardType("department")}
              aria-pressed={leaderboardType === "department"}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-sm md:text-base font-medium whitespace-nowrap transition-colors ${
                leaderboardType === "department"
                  ? "bg-azure-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              Department
            </button>
            {!!organizationId && (
              <button
                onClick={() => setLeaderboardType("organization")}
                aria-pressed={leaderboardType === "organization"}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-sm md:text-base font-medium whitespace-nowrap transition-colors ${
                  leaderboardType === "organization"
                    ? "bg-azure-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                Organization
              </button>
            )}
          </div>
        </div>

        {/* Current User Card */}
        {userPosition && (
          // Gradient starts at azure-400 (not -500): white on azure-500 is only 3.48:1.
          <div className="bg-gradient-to-r from-azure-400 to-blue-violet-400 rounded-lg shadow-md p-4 md:p-6 mb-8 text-white">
            <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 md:w-5 md:h-5" />
              Your Position
            </h3>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-black/20 rounded-full flex items-center justify-center text-xl md:text-2xl font-bold">
                  #{userPosition.rank}
                </div>
                <div>
                  <p className="font-bold text-base md:text-lg">
                    Rank #{userPosition.rank}
                  </p>
                  <p className="text-xs md:text-sm text-white/95">
                    Top {((1 - userPosition.percentile / 100) * 100).toFixed(1)}
                    %
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 md:gap-6">
                <div>
                  <p className="font-bold text-base md:text-lg">
                    {userPosition.rank}
                  </p>
                  <p className="text-xs md:text-sm text-white/95">
                    Rank
                  </p>
                </div>
                <div>
                  <p className="font-bold text-base md:text-lg">
                    {formatXP(userPosition.xp_total)}
                  </p>
                  <p className="text-xs md:text-sm text-white/95">
                    Total XP
                  </p>
                </div>
                <div>
                  <p className="font-bold text-base md:text-lg">
                    {userPosition.percentile.toFixed(1)}%
                  </p>
                  <p className="text-xs md:text-sm text-white/95">
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
            {/* Table Header - Desktop Only */}
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
              {entries.map((entry: LeaderboardEntry) => {
                const institutionName =
                  entry.university || entry.faculty || entry.department || "";

                return (
                  <div
                    key={entry.rank}
                    role="button"
                    tabIndex={0}
                    aria-haspopup="dialog"
                    onClick={() => setSelectedEntry(entry)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedEntry(entry);
                      }
                    }}
                    className="flex md:grid md:grid-cols-12 gap-3 md:gap-4 px-3 md:px-6 py-3 md:py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-azure-500"
                  >
                    {/* Rank */}
                    <div className="flex-shrink-0 md:col-span-1 flex items-center">
                      <div
                        className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-white text-xs md:text-sm ${
                          entry.rank <= 3
                            ? `bg-gradient-to-br ${getRankBadgeColor(
                                entry.rank
                              )}`
                            : "bg-gray-400"
                        }`}
                      >
                        {getRankIcon(entry.rank) || entry.rank}
                      </div>
                    </div>

                    {/* User - Mobile: Takes remaining space, Desktop: 4 columns */}
                    <div className="flex-1 md:col-span-4 flex items-center gap-2 md:gap-3 min-w-0">
                      {/* Their photo when they have one (lazy: most rows are off-screen), else initials. */}
                      <Avatar
                        src={entry.student_avatar}
                        name={entry.student_name}
                        lazy
                        className="size-8 text-xs md:size-10 md:text-base"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm md:text-base text-gray-900 dark:text-white truncate">
                          {entry.student_name}
                        </p>
                        {institutionName && (
                          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">
                            {institutionName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* XP - Mobile: Right aligned, Desktop: 2 columns */}
                    <div className="flex-shrink-0 md:col-span-2 flex flex-col justify-center text-right md:text-left">
                      <span className="md:hidden text-xs text-gray-600 dark:text-gray-400 mb-0.5">
                        XP
                      </span>
                      <span className="font-semibold text-sm md:text-base text-gray-900 dark:text-white">
                        {formatXP(entry.xp_total)}
                      </span>
                    </div>

                    {/* Streak - Desktop Only */}
                    <div className="hidden md:flex md:col-span-2 flex-col justify-center">
                      <div className="flex items-center gap-1">
                        <Flame className="w-4 h-4 text-amber-500" />
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {entry.streak_days || 0}
                        </span>
                      </div>
                    </div>

                    {/* Badges - Desktop Only */}
                    <div className="hidden md:flex md:col-span-2 flex-col justify-center">
                      <div className="flex items-center gap-1">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {entry.badges_count}
                        </span>
                      </div>
                    </div>

                    {/* Empty column for spacing - Desktop Only */}
                    <div className="hidden md:block md:col-span-1" />
                  </div>
                );
              })}
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

        {/* Another student's public profile */}
        <StudentProfileModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      </div>
    </PageShell>
  );
};
