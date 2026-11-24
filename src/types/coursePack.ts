// Course Packs & Academic-Period Access (Round 16) — see docs/COURSE_PACKS_API.md
// and docs/STUDENT_API_PAYLOADS.md §100-103. Paid course access is temporary
// (tied to a university's academic period); learning itself never expires.

export type AcademicPeriodType = "semester" | "academic_year";
export type AcademicPeriodStatus = "upcoming" | "active" | "closed";

export interface AcademicPeriod {
  id: number;
  uuid?: string;
  name: string;
  type: AcademicPeriodType;
  academic_year: string;
  semester?: number | null;
  status?: AcademicPeriodStatus;
  university_id?: number;
  expected_starts_on?: string | null;
  expected_ends_on?: string | null;
  opened_at?: string | null;
  closed_at?: string | null;
}

/** Why a pack/course can't be bought right now — no open period for the student's university. */
export type AcademicPeriodBlockedReason =
  | "UNIVERSITY_REQUIRED"
  | "NO_ACTIVE_ACADEMIC_PERIOD";

export interface CoursePackPromotion {
  promo_price: number;
  starts_at: string | null;
  ends_at: string | null;
}

export interface CoursePackTerms {
  unlock_scope: string;
  expires_when: string;
  unused_unlocks: string;
  refunds: string;
}

export interface CoursePack {
  id: number;
  uuid: string;
  name: string;
  description?: string | null;
  unlock_count: number;
  /** What would be charged today (promo price while one runs, else standard_price). */
  price: number;
  standard_price: number;
  currency: string;
  promo_applied: boolean;
  promotion: CoursePackPromotion | null;
  validity_type: AcademicPeriodType;
  /** The student's university's open period this pack would run on, or null when blocked. */
  academic_period: AcademicPeriod | null;
  can_purchase: boolean;
  blocked_reason: AcademicPeriodBlockedReason | null;
  terms: CoursePackTerms;
}

/** One pack a student owns, with its remaining-unlock balance (unlocks.packs[] / access.options.pack_unlock.pack). */
export interface OwnedPackBalance {
  uuid: string;
  name: string;
  unlocks_granted: number;
  unlocks_used: number;
  remaining_unlocks: number;
  academic_period: AcademicPeriod | null;
}

export interface UnlocksSummary {
  available: number;
  /** In spend order — the first entry is used next. */
  packs: OwnedPackBalance[];
}

export interface CoursePacksCatalog {
  packs: CoursePack[];
  unlocks: UnlocksSummary;
}

/** A checkout the student hasn't finished paying yet. */
export type CoursePackPurchaseState = "payment_pending" | "payment_processing";

/** Lifecycle of a paid-for pack. */
export type CoursePackState =
  | "pending"
  | "not_paid"
  | "active"
  | "exhausted"
  | "expired";

export interface UnlockedCourseRef {
  entitlement_uuid: string;
  course: { id: number; uuid: string; title: string; slug?: string };
  unlocked_at: string;
  access_status: string;
  access_ended_at: string | null;
}

export interface CoursePackPurchase {
  id: number;
  uuid: string;
  name: string;
  unlocks_granted: number;
  validity_type: AcademicPeriodType;
  amount: number;
  standard_price: number;
  currency: string;
  promo_applied: boolean;
  promotion: CoursePackPromotion | null;
  academic_period: AcademicPeriod | null;
  payment_status: string;
  state: CoursePackPurchaseState | null;
  /** Redirect the browser here. `null` while `payment_processing` (nothing new to reopen). */
  checkout_url: string | null;
  paid_at: string | null;
  pack_state: CoursePackState;
  unlocks_used: number;
  unlocks_expired: number;
  remaining_unlocks: number;
  activated_at: string | null;
  expired_at: string | null;
  /** Paid after the period had already closed: recorded, but born expired. */
  lapsed_before_activation: boolean;
  created_at: string;
  /** Only on the single-purchase detail endpoint. */
  unlocked_courses?: UnlockedCourseRef[];
}

export type UnlockOutcome = "unlocked" | "already_accessible";

export interface AccessOptionIndividual {
  available: boolean;
  price: number | null;
  currency: string | null;
}

export interface AccessOptionPackUnlock {
  eligible: boolean;
  available: boolean;
  remaining_unlocks: number;
  pack: OwnedPackBalance | null;
}

export interface AccessValidity {
  type: AcademicPeriodType;
  academic_period: AcademicPeriod | null;
  blocked_reason: AcademicPeriodBlockedReason | null;
  ends_when: string;
}

export interface AccessOptions {
  individual: AccessOptionIndividual;
  pack_unlock: AccessOptionPackUnlock;
}

/** How the student currently has (or doesn't have) access. `null` on a free course: never locked. */
export type AccessSource =
  | "free"
  | "grandfathered"
  | "purchase"
  | "pack_unlock"
  | null;

/**
 * Gate paid content on `has_access` — never on `is_enrolled` alone. Returned
 * on course details (`data.course.access`), enrollment-status and the
 * unlock response. `validity`/`options` are `null` for a free course.
 */
export interface AccessBlock {
  has_access: boolean;
  source: AccessSource;
  /** A progress record exists (kept after expiry, so history survives). */
  enrollment_exists: boolean;
  /** They had access and lost it — distinct from never having bought it. */
  expired: boolean;
  validity: AccessValidity | null;
  options: AccessOptions | null;
}

/** Compact variant carried on `GET /student/courses/enrolled` rows. */
export interface CompactAccess {
  has_access: boolean;
  source: AccessSource;
  expired: boolean;
  academic_period: AcademicPeriod | null;
}

export interface UnlockCourseResult {
  outcome: UnlockOutcome;
  unlock_used: boolean;
  xp_awarded?: number;
  pack?: OwnedPackBalance | null;
  remaining_unlocks: number;
  access: AccessBlock;
}

export type AccessEndedBecause =
  | "period_closed"
  | "period_closed_before_activation"
  | "redundant_existing_access";

interface CourseAccessOverviewCourseRef {
  id: number;
  uuid: string;
  title: string;
  slug?: string;
  thumbnail_url?: string | null;
}

export interface CourseAccessOverviewActive {
  uuid: string;
  source: "purchase" | "pack_unlock";
  status: string;
  granted_at: string;
  ended_at: string | null;
  ended_because: AccessEndedBecause | null;
  course: CourseAccessOverviewCourseRef;
  academic_period: AcademicPeriod | null;
  pack?: { uuid: string; name: string } | null;
  payment?: { uuid: string; amount: number; currency: string; paid_at: string | null } | null;
}

/** The "renew" list: courses lost and not currently held again another way. */
export type CourseAccessOverviewExpired = CourseAccessOverviewActive;

export interface CourseAccessOverview {
  unlocks: UnlocksSummary;
  active_access: CourseAccessOverviewActive[];
  expired_access: CourseAccessOverviewExpired[];
}
