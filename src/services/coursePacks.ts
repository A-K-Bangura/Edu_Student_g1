import api from "./api";
import type { ApiResponse, PageMeta } from "../types";
import type {
  CoursePacksCatalog,
  CoursePackPurchase,
  CourseAccessOverview,
  UnlockCourseResult,
} from "../types/coursePack";

// GET /student/course-packs — packs on sale, priced as they'd be charged
// now, with the student's own period for each, plus their unlock balance.
export const getCoursePacks = async (): Promise<CoursePacksCatalog> => {
  const response = await api.get<ApiResponse<CoursePacksCatalog>>(
    "/student/course-packs"
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch course packs");
  }

  return response.data.data;
};

// POST /student/course-packs/{pack}/purchase — no body; the server decides
// price, unlock count and period. 201 for a new checkout, 200 when an
// identical one is already open (both come back through this one call).
export const purchaseCoursePack = async (
  packIdOrUuid: string | number
): Promise<CoursePackPurchase> => {
  const response = await api.post<ApiResponse<{ purchase: CoursePackPurchase }>>(
    `/student/course-packs/${packIdOrUuid}/purchase`,
    {}
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to start checkout");
  }

  return response.data.data.purchase;
};

type MetaEnvelope = { meta?: PageMeta };

// GET /student/course-packs/purchases — my packs and checkouts, newest first.
export const getCoursePackPurchases = async (
  page = 1,
  perPage = 15,
  status?: string
): Promise<{ data: CoursePackPurchase[]; meta: PageMeta }> => {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  if (status) params.append("status", status);

  const response = await api.get<ApiResponse<CoursePackPurchase[]> & MetaEnvelope>(
    `/student/course-packs/purchases?${params.toString()}`
  );

  if (!response.data.success || !response.data.data || !response.data.meta) {
    throw new Error(response.data.message || "Failed to fetch your packs");
  }

  return { data: response.data.data, meta: response.data.meta };
};

// GET /student/course-packs/purchases/{uuid} — one pack: balance + the
// courses it unlocked. Used both for "pack details" and to verify a Monime
// return (the ?purchase=... query string is a display hint only).
export const getCoursePackPurchase = async (
  uuid: string
): Promise<CoursePackPurchase> => {
  const response = await api.get<ApiResponse<{ purchase: CoursePackPurchase }>>(
    `/student/course-packs/purchases/${uuid}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch purchase");
  }

  return response.data.data.purchase;
};

// POST /student/courses/{course}/unlock — spend one unlock from the
// soonest-ending usable pack. Safe to repeat: a course already accessible
// returns outcome "already_accessible" and spends nothing (treat as success).
export const unlockCourse = async (
  courseId: string | number
): Promise<UnlockCourseResult> => {
  const response = await api.post<ApiResponse<UnlockCourseResult>>(
    `/student/courses/${courseId}/unlock`,
    {}
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to unlock course");
  }

  return response.data.data;
};

// GET /student/course-access — unlock balance, access currently active, and
// access that ended (the "renew" list: courses lost and not held again).
export const getCourseAccessOverview = async (): Promise<CourseAccessOverview> => {
  const response = await api.get<ApiResponse<CourseAccessOverview>>(
    "/student/course-access"
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch your course access");
  }

  return response.data.data;
};
