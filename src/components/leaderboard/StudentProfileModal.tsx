import { useCallback, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  Award,
  BookOpen,
  Building2,
  Calendar,
  ChevronDown,
  Flame,
  GraduationCap,
  Github,
  Globe,
  Landmark,
  Library,
  Linkedin,
  Maximize2,
  RefreshCw,
  Trophy,
  Twitter,
  type LucideIcon,
} from "lucide-react";
import { BottomSheet } from "../common/BottomSheet";
import { Avatar } from "../common/Avatar";
import { AvatarViewer } from "../profile/AvatarViewer";
import { RatingStars } from "../gigs/RatingStars";
import { getStudentProfile } from "../../services/profile";
import { formatXP } from "../../utils/format";
import {
  formatAcademicLevel,
  getInitials,
  getInstitutionName,
} from "../../utils/profileDisplay";
import { getSafeExternalUrl } from "../../utils/safeUrl";
import type { LeaderboardEntry } from "../../types/leaderboard";

const BADGES_SHOWN_AT_FIRST = 6;

interface StudentProfileModalProps {
  /** The leaderboard row that was tapped. `null` keeps the modal closed. */
  entry: LeaderboardEntry | null;
  onClose: () => void;
}

/**
 * Another student's public profile, opened from a leaderboard row. The row
 * already carries their name, photo and rank, so the top of the sheet appears
 * at once and only the details wait for the request.
 */
export const StudentProfileModal = ({ entry, onClose }: StudentProfileModalProps) =>
  entry ? <StudentProfileSheet entry={entry} onClose={onClose} /> : null;

const SectionHeading = ({ children }: { children: ReactNode }) => (
  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
    {children}
  </h4>
);

const StatTile = ({
  icon: Icon,
  iconClassName,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  value: string | number;
  hint?: string;
}) => (
  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
    <Icon className={`size-5 ${iconClassName}`} aria-hidden />
    <p className="mt-2 text-lg font-bold leading-none text-gray-900 dark:text-white">{value}</p>
    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{label}</p>
    {hint && <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
  </div>
);

/** A badge's picture, or a medal when it has none or it won't load. */
const BadgeIcon = ({ url }: { url?: string | null }) => {
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);

  if (url && url !== brokenUrl) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        onError={() => setBrokenUrl(url)}
        className="size-10 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-900 text-amber-300 dark:bg-amber-200 dark:text-amber-700"
    >
      <Award className="size-5" />
    </span>
  );
};

const StudentProfileSheet = ({
  entry,
  onClose,
}: {
  entry: LeaderboardEntry;
  onClose: () => void;
}) => {
  const {
    data: profile,
    isPending,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["student-profile", entry.student_id],
    queryFn: () => getStudentProfile(entry.student_id),
  });

  const [viewerOpen, setViewerOpen] = useState(false);
  // The photo address that failed to load, so we don't offer to enlarge a broken picture.
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);
  const closeViewer = useCallback(() => setViewerOpen(false), []);

  const name =
    profile?.full_name ||
    [profile?.firstname, profile?.lastname].filter(Boolean).join(" ") ||
    entry.student_name.trim() ||
    "Student";
  // The row's photo is shown straight away; the full profile's replaces it if it differs.
  const photoUrl = profile?.avatar_url || entry.student_avatar || null;
  const canEnlarge = !!photoUrl && photoUrl !== failedPhoto;

  const academicLevel = formatAcademicLevel(profile?.level);

  const unavailable =
    axios.isAxiosError(error) &&
    (error.response?.status === 403 || error.response?.status === 404);

  const details = [
    { label: "University", value: getInstitutionName(profile?.university), icon: Landmark },
    { label: "Faculty", value: getInstitutionName(profile?.faculty), icon: Library },
    { label: "Department", value: getInstitutionName(profile?.department), icon: BookOpen },
    { label: "Organization", value: getInstitutionName(profile?.organization), icon: Building2 },
  ].filter((row): row is typeof row & { value: string } => !!row.value);

  const links = (
    [
      { label: "LinkedIn", href: profile?.social_links?.linkedin, icon: Linkedin },
      { label: "GitHub", href: profile?.social_links?.github, icon: Github },
      { label: "Twitter", href: profile?.social_links?.twitter, icon: Twitter },
      { label: "Portfolio", href: profile?.social_links?.portfolio, icon: Globe },
    ] as const
  )
    .map((link) => ({ ...link, safeHref: getSafeExternalUrl(link.href) }))
    .filter((link) => link.safeHref !== null);

  const badges = profile?.badges ?? [];
  const visibleBadges = showAllBadges ? badges : badges.slice(0, BADGES_SHOWN_AT_FIRST);

  const memberSince = profile?.created_at ? new Date(profile.created_at) : null;
  const hasMemberSince = memberSince !== null && !Number.isNaN(memberSince.getTime());

  const badgeCount = profile?.badges_count ?? (profile?.badges ? profile.badges.length : undefined);
  const reputation = profile?.gig_reputation;
  const interests = profile?.interests ?? [];

  return (
    <>
      <BottomSheet
        open
        onClose={onClose}
        title="Student profile"
        maxWidthClassName="sm:max-w-xl"
      >
        <div className="space-y-6">
          {/* Who — from the leaderboard row, so it's there immediately. */}
          <section
            aria-label={`${name}, summary`}
            className="rounded-2xl bg-linear-to-br from-azure-400 to-blue-violet-400 px-5 py-6 text-center text-white shadow-sm"
          >
            <div className="relative mx-auto w-fit">
              {canEnlarge ? (
                <>
                  <button
                    ref={avatarButtonRef}
                    type="button"
                    onClick={() => setViewerOpen(true)}
                    aria-label={`View ${name}'s photo`}
                    className="block rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  >
                    <Avatar
                      src={photoUrl}
                      name={name}
                      onStatusChange={(status) => {
                        if (status === "failed") setFailedPhoto(photoUrl);
                      }}
                      className="size-28 text-4xl ring-4 ring-white/40"
                    />
                  </button>
                  {/* Says "tap to enlarge" without a word; the button above is the control. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -bottom-1 -right-1 grid size-9 place-items-center rounded-full bg-white text-azure-300 shadow-lg ring-4 ring-azure-400/60"
                  >
                    <Maximize2 className="size-4" />
                  </span>
                </>
              ) : (
                <Avatar src={photoUrl} name={name} className="size-28 text-4xl ring-4 ring-white/40" />
              )}
            </div>

            <h3 className="mt-4 text-2xl font-bold leading-tight [overflow-wrap:anywhere]">
              {name}
            </h3>

            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-semibold text-azure-300">
                <Trophy className="size-4" aria-hidden />
                Rank #{entry.rank}
              </span>
              {academicLevel && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1 text-sm font-semibold">
                  <GraduationCap className="size-4" aria-hidden />
                  {academicLevel}
                </span>
              )}
            </div>
          </section>

          {/* The rest — waits for the request. */}
          {isPending && (
            <div role="status" aria-busy="true" className="animate-pulse space-y-6">
              <span className="sr-only">Loading profile…</span>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800" />
                ))}
              </div>
              <div className="space-y-2">
                <div className="h-3 w-24 rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-4 rounded bg-gray-100 dark:bg-gray-800" />
                <div className="h-4 w-4/5 rounded bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          )}

          {isError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-800 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-200"
            >
              <p>
                {unavailable
                  ? "This student's profile isn't available."
                  : "We couldn't load this profile."}
              </p>
              {!unavailable && (
                <button
                  type="button"
                  onClick={() => void refetch()}
                  disabled={isRefetching}
                  className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-azure-400 px-4 py-2 font-semibold text-white transition-colors hover:bg-azure-300 disabled:opacity-60"
                >
                  <RefreshCw className={`size-4 ${isRefetching ? "animate-spin" : ""}`} aria-hidden />
                  Try again
                </button>
              )}
            </div>
          )}

          {profile && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {profile.xp_total != null && (
                  <StatTile
                    icon={Trophy}
                    iconClassName="text-amber-500"
                    label="Total XP"
                    value={formatXP(profile.xp_total)}
                  />
                )}
                {profile.streak_days != null && (
                  <StatTile
                    icon={Flame}
                    iconClassName="text-rose-500"
                    label="Day streak"
                    value={profile.streak_days}
                  />
                )}
                {badgeCount !== undefined && (
                  <StatTile
                    icon={Award}
                    iconClassName="text-azure-500"
                    label="Badges"
                    value={badgeCount}
                  />
                )}
                {profile.courses_enrolled != null && (
                  <StatTile
                    icon={BookOpen}
                    iconClassName="text-blue-violet-500"
                    label="Courses"
                    value={profile.courses_enrolled}
                    hint={
                      profile.courses_completed != null
                        ? `${profile.courses_completed} completed`
                        : undefined
                    }
                  />
                )}
              </div>

              {profile.bio && (
                <section>
                  <SectionHeading>About</SectionHeading>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700 [overflow-wrap:anywhere] dark:text-gray-300">
                    {profile.bio}
                  </p>
                </section>
              )}

              {details.length > 0 && (
                <section>
                  <SectionHeading>Academic</SectionHeading>
                  <dl className="space-y-3">
                    {details.map(({ label, value, icon: Icon }) => (
                      <div key={label} className="flex items-start gap-3">
                        <span
                          aria-hidden
                          className="grid size-8 shrink-0 place-items-center rounded-lg bg-azure-900 text-azure-300 dark:bg-azure-200 dark:text-azure-700"
                        >
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
                          <dd className="text-sm font-medium text-gray-900 [overflow-wrap:anywhere] dark:text-white">
                            {value}
                          </dd>
                        </div>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              {reputation && (
                <section>
                  <SectionHeading>Gig reputation</SectionHeading>
                  {reputation.rating_count > 0 ? (
                    <>
                      <div className="flex items-center gap-3">
                        <RatingStars value={reputation.average_rating} />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {reputation.average_rating?.toFixed(1)} · {reputation.rating_count}{" "}
                          {reputation.rating_count === 1 ? "rating" : "ratings"}
                        </span>
                      </div>
                      <ul className="mt-3 space-y-2">
                        {reputation.reviews.slice(0, 3).map((review) => (
                          <li
                            key={review.id}
                            className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800"
                          >
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {review.reviewer.name}
                              </span>
                              <span className="text-xs capitalize text-gray-500 dark:text-gray-400">
                                as {review.as}
                              </span>
                            </div>
                            <RatingStars value={review.rating} size="sm" />
                            {review.review && (
                              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                {review.review}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400">No ratings yet.</p>
                  )}
                </section>
              )}

              {interests.length > 0 && (
                <section>
                  <SectionHeading>Interests</SectionHeading>
                  <ul className="flex flex-wrap gap-2">
                    {interests.map((interest, index) => (
                      <li
                        key={`${interest}-${index}`}
                        className="rounded-full bg-azure-900 px-3 py-1 text-sm text-azure-300 dark:bg-azure-200 dark:text-azure-800"
                      >
                        {interest}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {badges.length > 0 && (
                <section>
                  <SectionHeading>Badges ({badges.length})</SectionHeading>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {visibleBadges.map((badge) => (
                      <li
                        key={badge.id}
                        className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700"
                      >
                        <BadgeIcon url={badge.icon_url} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {badge.name}
                          </p>
                          {badge.description && (
                            <p className="line-clamp-2 text-xs text-gray-600 dark:text-gray-400">
                              {badge.description}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {badges.length > BADGES_SHOWN_AT_FIRST && (
                    <button
                      type="button"
                      onClick={() => setShowAllBadges((open) => !open)}
                      aria-expanded={showAllBadges}
                      className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-azure-300 hover:bg-azure-900 dark:text-azure-700 dark:hover:bg-azure-200"
                    >
                      {showAllBadges ? "Show fewer" : `Show all ${badges.length} badges`}
                      <ChevronDown
                        className={`size-4 transition-transform ${showAllBadges ? "rotate-180" : ""}`}
                        aria-hidden
                      />
                    </button>
                  )}
                </section>
              )}

              {links.length > 0 && (
                <section>
                  <SectionHeading>Links</SectionHeading>
                  {/* `own-links`: opts these out of the global link hover colour (index.css). */}
                  <ul className="own-links flex flex-wrap gap-2">
                    {links.map(({ label, safeHref, icon: Icon }) => (
                      <li key={label}>
                        <a
                          href={safeHref ?? undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-gray-200 px-4 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
                        >
                          <Icon className="size-4" aria-hidden />
                          {label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {hasMemberSince && (
                <p className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Calendar className="size-4" aria-hidden />
                  Member since{" "}
                  {memberSince.toLocaleDateString("en-US", { year: "numeric", month: "long" })}
                </p>
              )}
            </>
          )}
        </div>
      </BottomSheet>

      {viewerOpen && photoUrl && (
        <AvatarViewer
          imageUrl={photoUrl}
          initials={getInitials(name)}
          name={name}
          onClose={closeViewer}
          returnFocusRef={avatarButtonRef}
        />
      )}
    </>
  );
};
