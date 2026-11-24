import { Mascot, type MascotPose } from "../common/Mascot";
import { getStableBrandColor, getInkOn, hashString } from "../../utils/brandColors";
import { ApiError } from "../../utils/apiError";
import type { CoursePack } from "../../types/coursePack";

// Reused by the enrollment dialog and the Course Packs catalogue page so
// pricing/terms can't drift between the two (docs/designs/
// univybe_course_packs_student_design_guide.md §4, §9).

const MASCOT_POSES: MascotPose[] = ["coins", "hat", "learning"];

/** Stable per-pack art/accent so the same pack always looks the same. */
const pickMascotPose = (seed: string): MascotPose =>
  MASCOT_POSES[hashString(seed) % MASCOT_POSES.length];

const formatMoney = (currency: string, amount: number) =>
  `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const blockedReasonMessage = (pack: CoursePack): string | null => {
  if (!pack.blocked_reason) return null;
  return new ApiError("", pack.blocked_reason, {
    validity_type: pack.validity_type,
  }).getUserFriendlyMessage();
};

export const CoursePackCard = ({
  pack,
  onChoose,
  isChoosing = false,
  disabled = false,
  errorMessage = null,
  chooseLabel = "Choose this pack",
}: {
  pack: CoursePack;
  onChoose: () => void;
  isChoosing?: boolean;
  /** Disable the button for a reason other than this pack's own eligibility (e.g. another action in flight). */
  disabled?: boolean;
  errorMessage?: string | null;
  chooseLabel?: string;
}) => {
  const accent = getStableBrandColor(pack.uuid);
  const ink = getInkOn(accent);
  const pose = pickMascotPose(pack.uuid);
  const blockedMessage = blockedReasonMessage(pack);

  const hasPromo = pack.promo_applied && pack.standard_price > pack.price;
  const savings = hasPromo ? pack.standard_price - pack.price : 0;
  const savingsPercent = hasPromo
    ? Math.round((savings / pack.standard_price) * 100)
    : 0;

  const unlockLabel = `${pack.unlock_count} unlock${pack.unlock_count === 1 ? "" : "s"}`;

  return (
    <div
      className="relative flex min-w-[240px] flex-col overflow-hidden rounded-2xl border-2 bg-white p-5 pt-8 shadow-sm dark:bg-gray-800"
      style={{ borderColor: accent }}
    >
      {/* Sale tag: a factual label, punched-hole decoration is purely visual */}
      <div className="absolute -top-1 left-4 -rotate-3">
        <div
          className="relative rounded-md px-3 py-1 text-[11px] font-bold uppercase tracking-wide shadow-sm"
          style={{ backgroundColor: accent, color: ink }}
        >
          <span
            aria-hidden
            className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-white dark:bg-gray-800"
          />
          {unlockLabel}
        </div>
      </div>

      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold leading-snug text-gray-900 dark:text-white">
          {pack.name}
        </h3>
        <Mascot
          pose={pose}
          className="h-14 w-14 shrink-0 object-contain"
          alt=""
        />
      </div>

      {pack.description && (
        <p className="mt-1.5 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
          {pack.description}
        </p>
      )}

      <div className="mt-4">
        {hasPromo ? (
          <>
            <div className="flex items-baseline gap-2">
              <span
                aria-label="Standard price"
                className="text-sm text-gray-400 line-through dark:text-gray-500"
              >
                {formatMoney(pack.currency, pack.standard_price)}
              </span>
              <span
                aria-label="Now"
                className="text-2xl font-bold text-gray-900 dark:text-white"
              >
                {formatMoney(pack.currency, pack.price)}
              </span>
            </div>
            <p className="mt-0.5 text-xs font-semibold text-green-600 dark:text-green-400">
              Save {formatMoney(pack.currency, savings)}
              {savingsPercent >= 1 ? ` · ${savingsPercent}% off` : ""}
            </p>
          </>
        ) : (
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatMoney(pack.currency, pack.price)}
          </span>
        )}
      </div>

      <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        {pack.academic_period?.name ?? "No open period for your university yet"}
      </p>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {pack.terms.unlock_scope}
      </p>

      {blockedMessage && (
        <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
          {blockedMessage}
        </p>
      )}

      <button
        type="button"
        onClick={onChoose}
        disabled={!pack.can_purchase || disabled || isChoosing}
        className="mt-4 w-full min-h-11 rounded-xl bg-azure-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-azure-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
      >
        {isChoosing ? "Starting checkout…" : chooseLabel}
      </button>

      {errorMessage && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      )}
    </div>
  );
};
