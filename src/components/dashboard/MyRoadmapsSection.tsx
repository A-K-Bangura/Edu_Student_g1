import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useMyRoadmaps } from "../../hooks/useMyRoadmaps";
import { getContinueRoadmaps } from "../../utils/roadmap";
import { RoadmapGrid } from "../roadmap/RoadmapGrid";

// Roadmap tiles are tall posters; a handful is enough on the home screen. The
// rest are one tap away on /roadmaps.
const MAX_SHOWN = 4;

/**
 * The student's in-progress roadmaps, shown at the top of the dashboard.
 *
 * Renders nothing unless there is at least one in-progress roadmap: no empty
 * box for students who haven't started one, and no placeholder while loading
 * or if the request fails (the rest of the dashboard doesn't depend on it).
 */
export const MyRoadmapsSection = () => {
  const { data } = useMyRoadmaps();
  const inProgress = useMemo(
    () => getContinueRoadmaps(data?.data ?? []),
    [data]
  );

  if (inProgress.length === 0) return null;

  return (
    <section aria-labelledby="dashboard-roadmaps-title" className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2
          id="dashboard-roadmaps-title"
          className="text-xl font-semibold text-gray-900 dark:text-white"
        >
          My Learning Journeys
        </h2>
        {/* `own-links` keeps the global unlayered `a { color }` rule off this link. */}
        <span className="own-links">
          <Link
            to="/roadmaps"
            className="text-azure-500 hover:text-azure-600 flex items-center gap-2 text-sm font-medium"
          >
            See all <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </span>
      </div>
      <RoadmapGrid roadmaps={inProgress.slice(0, MAX_SHOWN)} />
    </section>
  );
};
