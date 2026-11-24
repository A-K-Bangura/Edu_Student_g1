import { useCallback, useRef, useState, type ChangeEvent } from "react";
import {
  AlertCircle,
  BookOpen,
  Building2,
  Camera,
  GraduationCap,
  Landmark,
  Library,
  Loader2,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { AvatarViewer } from "./AvatarViewer";
import { AVATAR_ACCEPT, useAvatarUpload } from "../../hooks/useAvatarUpload";
import {
  formatAcademicLevel,
  getInitials,
  getInstitutionName,
} from "../../utils/profileDisplay";
import type { UserProfile } from "../../types/profile";

interface ProfileHeaderProps {
  profile: UserProfile;
  /** XP-tier level from gamification — distinct from the academic year. */
  scoreLevel: number;
}

const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

interface DetailRow {
  label: string;
  value: string;
  icon: LucideIcon;
}

/**
 * The card at the top of the profile: photo, name, email, level, where the
 * student studies, and how complete their profile is.
 *
 * The photo is two controls on purpose: tapping it opens a full-size view
 * (where it can also be changed), and the camera badge goes straight to the
 * file picker.
 */
export const ProfileHeader = ({ profile, scoreLevel }: ProfileHeaderProps) => {
  const { upload, isUploading, isSuccess, error, clearError } = useAvatarUpload();
  const [viewerOpen, setViewerOpen] = useState(false);
  // A photo URL that fails to load shouldn't leave a blank circle.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);

  const displayName =
    profile.full_name ||
    (profile.firstname && profile.lastname
      ? `${profile.firstname} ${profile.lastname}`
      : profile.name || profile.email);
  const initials = getInitials(displayName, profile.email);
  const photoUrl =
    profile.avatar_url && profile.avatar_url !== brokenUrl ? profile.avatar_url : null;

  const openFilePicker = () => fileInputRef.current?.click();
  const closeViewer = useCallback(() => setViewerOpen(false), []);

  const handleFileChosen = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clear the input so choosing the same file again (e.g. to retry after a
    // failure) still fires `change`.
    event.target.value = "";
    if (!file) return;

    setViewerOpen(false);
    upload(file);
  };

  const academicLevel = formatAcademicLevel(profile.level);

  const details: DetailRow[] = [];
  const university = getInstitutionName(profile.university);
  const faculty = getInstitutionName(profile.faculty);
  const department = getInstitutionName(profile.department);
  const organization = getInstitutionName(profile.organization);
  if (university) details.push({ label: "University", value: university, icon: Landmark });
  if (faculty) details.push({ label: "Faculty", value: faculty, icon: Library });
  if (department) details.push({ label: "Department", value: department, icon: BookOpen });
  if (organization) details.push({ label: "Organization", value: organization, icon: Building2 });

  const completion =
    profile.profile_completion === undefined || profile.profile_completion === null
      ? null
      : clampPercent(Number(profile.profile_completion));

  return (
    <section
      aria-label="Profile summary"
      className="mb-8 overflow-hidden rounded-2xl bg-linear-to-br from-azure-400 to-blue-violet-400 text-white shadow-md"
    >
      <div className="flex flex-col items-center gap-5 p-6 text-center md:flex-row md:items-start md:gap-8 md:p-8 md:text-left">
        {/* Photo */}
        <div className="relative shrink-0">
          <button
            ref={avatarButtonRef}
            type="button"
            onClick={() => setViewerOpen(true)}
            aria-label="View profile photo"
            className="block rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt=""
                width={112}
                height={112}
                onError={() => setBrokenUrl(photoUrl)}
                className="size-28 rounded-full object-cover ring-4 ring-white/40 md:size-32"
              />
            ) : (
              <span
                aria-hidden
                className="flex size-28 items-center justify-center rounded-full bg-black/25 text-4xl font-bold text-white ring-4 ring-white/40 md:size-32 md:text-5xl"
              >
                {initials}
              </span>
            )}
          </button>

          {isUploading && (
            <div
              role="status"
              aria-label="Uploading photo"
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55"
            >
              <Loader2 className="size-7 animate-spin text-white" aria-hidden />
            </div>
          )}

          <button
            type="button"
            onClick={openFilePicker}
            disabled={isUploading}
            aria-label="Change profile photo"
            className="absolute -bottom-1 -right-1 flex size-11 items-center justify-center rounded-full bg-white text-azure-300 shadow-lg ring-4 ring-azure-400/60 transition-colors hover:bg-azure-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
          >
            <Camera className="size-5" aria-hidden />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept={AVATAR_ACCEPT}
            onChange={handleFileChosen}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
          />
        </div>

        {/* Identity and details */}
        <div className="w-full min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-tight [overflow-wrap:anywhere] md:text-3xl">
            {displayName}
          </h1>
          <p className="mt-1 text-sm [overflow-wrap:anywhere] md:text-base">
            {profile.email}
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-semibold text-azure-300">
              <Zap className="size-4" aria-hidden />
              Level {scoreLevel}
            </span>
            {academicLevel && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1 text-sm font-semibold text-white">
                <GraduationCap className="size-4" aria-hidden />
                {academicLevel}
              </span>
            )}
          </div>

          {details.length > 0 && (
            <dl className="mt-4 space-y-2.5 rounded-xl bg-black/20 p-4 text-left text-sm md:text-base">
              {details.map(({ label, value, icon: Icon }) => (
                <div key={label}>
                  <dt className="sr-only">{label}</dt>
                  <dd className="flex items-start gap-3">
                    <Icon className="mt-0.5 size-4 shrink-0 text-white/80 md:mt-1" aria-hidden />
                    <span className="min-w-0 [overflow-wrap:anywhere]">{value}</span>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      {completion !== null && (
        <div className="border-t border-white/20 bg-black/10 px-6 py-4 md:px-8">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Profile completion</span>
            <span>{completion}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Profile completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completion}
            className="mt-2 h-2 overflow-hidden rounded-full bg-black/25"
          >
            <div
              className="h-full rounded-full bg-white transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 border-t border-white/20 bg-red-50 px-6 py-3 text-sm text-red-800 md:px-8"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p className="flex-1">{error}</p>
          <button
            type="button"
            onClick={clearError}
            aria-label="Dismiss"
            className="-m-1 rounded p-1 hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-red-800"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}

      {/* Spoken confirmation; the new photo appearing is the visual one. */}
      <p role="status" className="sr-only">
        {isSuccess && !isUploading && !error ? "Profile photo updated" : ""}
      </p>

      {viewerOpen && (
        <AvatarViewer
          imageUrl={photoUrl}
          initials={initials}
          name={displayName}
          onClose={closeViewer}
          onChangePhoto={openFilePicker}
          returnFocusRef={avatarButtonRef}
        />
      )}
    </section>
  );
};
