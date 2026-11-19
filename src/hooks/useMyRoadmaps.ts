import { useQuery } from "@tanstack/react-query";
import { getRoadmaps } from "../services/roadmaps";
import { isAuthenticated } from "../services/auth";

/**
 * The signed-in student's own roadmaps (`participating=true`): in progress and
 * completed (split them with `getContinueRoadmaps` / `getCompletedRoadmaps`).
 *
 * One definition shared by the dashboard and the Roadmaps page so both read the
 * same cache entry instead of each fetching its own. The `["roadmaps", …]` key
 * prefix is what `invalidateRoadmapQueries` refreshes after a course is taken
 * or completed.
 */
export const useMyRoadmaps = ({ enabled = true }: { enabled?: boolean } = {}) => {
  // Personalised, so it never shares a cache entry with a guest's lists. The
  // endpoint needs a Student token (a guest gets 401), hence the guard.
  const signedIn = isAuthenticated();

  return useQuery({
    queryKey: ["roadmaps", "mine", signedIn],
    queryFn: () => getRoadmaps({ participating: true, per_page: 50 }),
    enabled: signedIn && enabled,
  });
};
