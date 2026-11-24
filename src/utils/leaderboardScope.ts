import type { User } from "../types";

export type LeaderboardScope =
  | "overall"
  | "university"
  | "faculty"
  | "department"
  | "organization";

type ScopedUser = Pick<User, "department" | "faculty" | "university" | "organization">;

/**
 * The leaderboard a student sees first: the narrowest group they belong to, so
 * the first ranking on screen is their own peers rather than every learner.
 *
 * Department is the target; the rest is a fallback for students whose profile
 * has no department, narrowing from the most specific group they do have.
 * A scope is only chosen when the stored user carries that group's id, because
 * the scoped endpoints require an explicit `*_id` (a missing one is a 422 —
 * nothing auto-scopes to the caller). With no group at all it stays "overall".
 */
export const getDefaultLeaderboardScope = (
  user: ScopedUser | null | undefined
): LeaderboardScope => {
  if (user?.department?.id) return "department";
  if (user?.faculty?.id) return "faculty";
  if (user?.university?.id) return "university";
  if (user?.organization?.id) return "organization";
  return "overall";
};
