import { Mascot, type MascotPose } from "../common/Mascot";
import { hashString } from "../../utils/brandColors";
import { ApiError } from "../../utils/apiError";
import type { CoursePack } from "../../types/coursePack";

// Reused by the enrollment dialog and the Course Packs catalogue page so
// pricing/terms can't drift between the two (docs/designs/
// univybe_course_packs_student_design_guide.md §4, §9). Visual language
// (hanging sale tag, lilac/indigo for a regular pack, warm gold for an
// active promotion) follows the 2026-11-24 dark-mode mockup.

const MASCOT_POSES: MascotPose[] = ["coins", "hat", "learning"];

/** Stable per-pack art so the same pack always shows the same mascot pose. */
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

// A warm gold used only for an active promotion — deliberately not the
// shared `amber` token: that scale runs dark→light (KNOWN_ISSUES.md #73),
// nothing like a conventional warm gold, and this colour means one
// specific thing ("this pack is on promotion"), not decorative variety.
// Tailwind can't resolve an arbitrary-value class built from a JS
// variable (its scanner needs the literal `bg-[#...]` in source), so the
// hex appears as literal class names below; this constant only backs the
// inline-styled glow.
const GOLD_SOFT = "#F4D9A3";

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
  const pose = pickMascotPose(pack.uuid);
  const blockedMessage = blockedReasonMessage(pack);

  const hasPromo = pack.promo_applied && pack.standard_price > pack.price;
  const savings = hasPromo ? pack.standard_price - pack.price : 0;
  const savingsPercent = hasPromo
    ? Math.round((savings / pack.standard_price) * 100)
    : 0;
  // A real (if tiny) promotion still gets the gold treatment and a "Save
  // X" line, but never a nonsensical "0% OFF" badge — that one detail
  // falls back to the ordinary unlock-count tag.
  const showPercentTag = hasPromo && savingsPercent >= 1;

  const unlockLabel = `${pack.unlock_count} unlock${pack.unlock_count === 1 ? "" : "s"}`;

  return (
    <div
      className={`relative flex h-full flex-col rounded-2xl border p-5 pt-9 shadow-sm ${
        hasPromo
          ? "border-[#D9A441]/50 bg-gradient-to-br from-[#FFF8EA] to-[#FFF0D6] dark:border-[#D9A441]/40 dark:from-[#2A2216] dark:to-[#1F1A10]"
          : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
      }`}
    >
      {/* Sale tag, hanging from a pinned string — purely decorative; the
          label itself (unlock count or % off) is the one factual claim. */}
      <div className="absolute left-5 top-1 flex -translate-y-1/2 -rotate-6 flex-col items-center">
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full border border-gray-400 dark:border-gray-500"
        />
        <span aria-hidden className="h-2.5 w-px bg-gray-400 dark:bg-gray-500" />
        <span
          className={`relative rounded-md px-3 py-1 font-accent text-xs uppercase tracking-wide shadow-sm ${
            showPercentTag
              ? "bg-[#EAB654] text-[#3A2508]"
              : "bg-indigo-300 text-indigo-950"
          }`}
        >
          <span
            aria-hidden
            className={`absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${
              hasPromo ? "bg-[#FFF8EA] dark:bg-[#2A2216]" : "bg-white dark:bg-gray-800"
            }`}
          />
          {showPercentTag ? `${savingsPercent}% off` : unlockLabel}
        </span>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-title text-lg leading-snug tracking-wide text-gray-900 dark:text-white">
            {pack.name}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {pack.unlock_count} course {pack.unlock_count === 1 ? "unlock" : "unlocks"}
          </p>
        </div>
        <div className="relative h-20 w-20 shrink-0">
          <div
            aria-hidden
            className="absolute inset-0 rounded-full opacity-40 blur-xl"
            style={{ backgroundColor: hasPromo ? GOLD_SOFT : "#818CF8" }}
          />
          <Mascot pose={pose} className="relative h-20 w-20 object-contain" alt="" />
        </div>
      </div>

      <div className="mt-5">
        {hasPromo ? (
          <div className="flex flex-wrap items-baseline gap-2">
            <span
              aria-label="Now"
              className="font-accent text-2xl tracking-wide text-gray-900 dark:text-white"
            >
              {formatMoney(pack.currency, pack.price)}
            </span>
            <span
              aria-label="Standard price"
              className="font-accent text-base text-gray-400 line-through dark:text-gray-500"
            >
              {formatMoney(pack.currency, pack.standard_price)}
            </span>
          </div>
        ) : (
          <span
            aria-label="Now"
            className="font-accent text-2xl tracking-wide text-gray-900 dark:text-white"
          >
            {formatMoney(pack.currency, pack.price)}
          </span>
        )}
        {hasPromo && (
          <p className="mt-0.5 text-xs font-semibold text-green-600 dark:text-green-400">
            Save {formatMoney(pack.currency, savings)}
          </p>
        )}
      </div>

      {/* Pinned to the bottom: a shorter card's button aligns with a
          taller one's, even when only one has a savings line above. */}
      <div className="mt-auto pt-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {pack.academic_period?.name ?? "No open period for your university yet"}
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
          className={`mt-3 w-full min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-700 dark:disabled:text-gray-400 ${
            hasPromo
              ? "bg-[#EAB654] text-[#3A2508] hover:bg-[#F0C36B]"
              : "bg-indigo-500 text-white hover:bg-indigo-600"
          }`}
        >
          {isChoosing ? "Starting checkout…" : chooseLabel}
        </button>

        {errorMessage && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
};
