// Round 16: Monime's Course Pack return always lands on the generic
// /course-packs page (STUDENT_PORTAL_COURSE_PACKS_RETURN_PATH), never back
// on the course the student was trying to unlock. A short-lived, same-tab
// hint lets that return page offer "Use 1 unlock for {course}" directly
// instead of just "Browse courses" — see the design guide §6. Optional by
// design: missing or mismatched storage just falls back to the generic flow.

const STORAGE_KEY = "course_pack_checkout_intent";
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes — comfortably longer than a Monime checkout takes

export interface CoursePackCheckoutIntent {
  purchaseUuid: string;
  courseId: string;
  courseTitle: string;
  storedAt: number;
}

export const storeCoursePackCheckoutIntent = (
  intent: Omit<CoursePackCheckoutIntent, "storedAt">
): void => {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...intent, storedAt: Date.now() })
    );
  } catch {
    // Storage unavailable — continuation is optional, just skip it.
  }
};

export const getCoursePackCheckoutIntent = (): CoursePackCheckoutIntent | null => {
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<CoursePackCheckoutIntent>;
    if (
      !parsed.purchaseUuid ||
      !parsed.courseId ||
      !parsed.courseTitle ||
      typeof parsed.storedAt !== "number"
    ) {
      return null;
    }
    if (Date.now() - parsed.storedAt > MAX_AGE_MS) {
      clearCoursePackCheckoutIntent();
      return null;
    }
    return parsed as CoursePackCheckoutIntent;
  } catch {
    return null;
  }
};

export const clearCoursePackCheckoutIntent = (): void => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do if storage is unavailable.
  }
};
