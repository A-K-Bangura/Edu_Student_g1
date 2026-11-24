import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { AxiosError } from "axios";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  Ticket,
  AlertCircle,
} from "lucide-react";
import { PageShell } from "../components/layout/PageShell";
import { EmptyState } from "../components/common/EmptyState";
import { CoursePackCard } from "../components/coursePacks/CoursePackCard";
import {
  getCoursePacks,
  getCoursePackPurchase,
  getCoursePackPurchases,
  getCourseAccessOverview,
  purchaseCoursePack,
  unlockCourse,
} from "../services/coursePacks";
import {
  getCoursePackCheckoutIntent,
  clearCoursePackCheckoutIntent,
} from "../utils/coursePackCheckoutIntent";
import { ApiError } from "../utils/apiError";
import type { ApiResponse } from "../types";
import type { CoursePackPurchase, CoursePackState } from "../types/coursePack";

// Catalogue + "My packs" + the Monime checkout-return surface for Course
// Packs — see docs/designs/univybe_course_packs_student_design_guide.md §§6-7.

const PACK_STATE_LABEL: Record<CoursePackState, string> = {
  pending: "Pending",
  not_paid: "Not paid",
  active: "Active",
  exhausted: "Fully used",
  expired: "Expired",
};

const PACK_STATE_COLOR: Record<CoursePackState, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  active: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300",
  exhausted: "bg-azure-100 text-azure-700 dark:bg-azure-900/20 dark:text-azure-300",
  not_paid: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  expired: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

const PACK_STATE_ICON: Record<CoursePackState, typeof Clock> = {
  pending: Clock,
  active: CheckCircle,
  exhausted: CheckCircle,
  not_paid: XCircle,
  expired: XCircle,
};

const getErrorMessage = (error: unknown): string | null => {
  if (!error) return null;
  if (typeof error === "object" && "response" in error) {
    return ApiError.fromAxiosError(
      error as AxiosError<ApiResponse>
    ).getUserFriendlyMessage();
  }
  return error instanceof Error ? error.message : "Something went wrong.";
};

/** The "My packs" row for a purchase still mid-checkout — resumes the same open checkout, never creates a new one. */
const PendingPackActions = ({ purchase }: { purchase: CoursePackPurchase }) => {
  const resumeMutation = useMutation({
    mutationFn: () => purchaseCoursePack(purchase.uuid),
    onSuccess: (resumed) => {
      if (resumed.checkout_url) window.location.href = resumed.checkout_url;
    },
  });

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => resumeMutation.mutate()}
        disabled={resumeMutation.isPending}
        className="text-sm font-semibold text-azure-600 hover:text-azure-700 disabled:opacity-60 dark:text-azure-400"
      >
        {resumeMutation.isPending ? "Resuming…" : "Resume payment"}
      </button>
      {resumeMutation.isError && (
        <span className="text-sm text-red-600 dark:text-red-400">
          {getErrorMessage(resumeMutation.error)}
        </span>
      )}
    </div>
  );
};

/** The return banner's "ready" state, with the optional one-click unlock if a checkout intent matches. */
const ReadyPackBanner = ({ purchase }: { purchase: CoursePackPurchase }) => {
  const navigate = useNavigate();
  const intent = getCoursePackCheckoutIntent();
  const matches = intent?.purchaseUuid === purchase.uuid;

  const unlockMutation = useMutation({
    mutationFn: () => unlockCourse(intent!.courseId),
    onSuccess: () => {
      clearCoursePackCheckoutIntent();
      navigate(`/course/${intent!.courseId}/play`);
    },
  });

  return (
    <div>
      <p className="font-semibold text-green-800 dark:text-green-300">
        Your pack is ready! {purchase.remaining_unlocks} unlock
        {purchase.remaining_unlocks === 1 ? "" : "s"} remaining
        {purchase.academic_period ? ` · ${purchase.academic_period.name}` : ""}.
      </p>
      {matches && (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => unlockMutation.mutate()}
            disabled={unlockMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-azure-500 px-4 py-2 text-sm font-semibold text-white hover:bg-azure-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Ticket className="h-4 w-4" aria-hidden />
            {unlockMutation.isPending
              ? "Unlocking…"
              : `Use 1 unlock for ${intent!.courseTitle}`}
          </button>
          {unlockMutation.isError && (
            <span className="text-sm text-red-600 dark:text-red-400">
              {getErrorMessage(unlockMutation.error)}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export const CoursePacks = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);

  // ---- Monime checkout return (?purchase=...&purchase_id=...) ----
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollStartedAt, setPollStartedAt] = useState<number | null>(null);
  const [showStillConfirming, setShowStillConfirming] = useState(false);

  const stripReturnParams = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("purchase");
        next.delete("purchase_id");
        return next;
      },
      { replace: true }
    );
  };

  useEffect(() => {
    const outcome = searchParams.get("purchase");
    const id = searchParams.get("purchase_id");
    if (outcome && id) {
      setPurchaseId(id);
      if (outcome === "processing") {
        setIsPolling(true);
        setPollStartedAt(Date.now());
      } else {
        stripReturnParams();
      }
    }
    // Read only the query params present when this page first mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const purchaseQuery = useQuery({
    queryKey: ["course-pack-purchase", purchaseId],
    queryFn: () => getCoursePackPurchase(purchaseId!),
    enabled: !!purchaseId,
    refetchInterval: isPolling ? 4000 : false,
  });

  useEffect(() => {
    if (!purchaseQuery.data) return;
    if (isPolling && purchaseQuery.data.pack_state !== "pending") {
      setIsPolling(false);
      stripReturnParams();
      queryClient.invalidateQueries({ queryKey: ["course-pack-purchases"] });
      queryClient.invalidateQueries({ queryKey: ["course-packs"] });
    }
    if (purchaseQuery.data.pack_state !== "pending") {
      clearCoursePackCheckoutIntent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseQuery.data]);

  useEffect(() => {
    if (!isPolling || !pollStartedAt) {
      setShowStillConfirming(false);
      return;
    }
    const timer = setTimeout(() => setShowStillConfirming(true), 60000);
    return () => clearTimeout(timer);
  }, [isPolling, pollStartedAt]);

  // ---- Catalogue, my packs, renewal overview ----
  const catalogQuery = useQuery({ queryKey: ["course-packs"], queryFn: getCoursePacks });

  const purchasesQuery = useQuery({
    queryKey: ["course-pack-purchases", page],
    queryFn: () => getCoursePackPurchases(page, 15),
    placeholderData: keepPreviousData,
  });

  const accessOverviewQuery = useQuery({
    queryKey: ["course-access-overview"],
    queryFn: getCourseAccessOverview,
  });

  const purchaseMutation = useMutation({
    mutationFn: (packIdOrUuid: string | number) => purchaseCoursePack(packIdOrUuid),
    onSuccess: (purchase) => {
      if (purchase.checkout_url) window.location.href = purchase.checkout_url;
    },
  });

  const purchase = purchaseQuery.data;
  const packState = purchase?.pack_state;

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <button
          onClick={() => navigate("/courses/enrolled")}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-azure-500 dark:text-gray-400"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
          Back to My Courses
        </button>

        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          Course Packs
        </h1>
        <p className="mb-8 text-gray-600 dark:text-gray-400">
          Buy several course unlocks at once — each one opens any eligible paid course for
          the period shown.
        </p>

        {purchaseId && purchase && (
          <div
            className={`mb-8 rounded-xl border p-4 ${
              packState === "active"
                ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
                : packState === "pending"
                  ? "border-azure-700 bg-azure-900 dark:border-azure-400/40 dark:bg-azure-100/30"
                  : "border-amber-700 bg-amber-900 dark:border-amber-400/40 dark:bg-amber-100/30"
            }`}
          >
            {packState === "pending" && (
              <div>
                <p className="font-semibold text-azure-200 dark:text-azure-800">
                  Confirming your payment…
                </p>
                {showStillConfirming && (
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-sm text-azure-300 dark:text-azure-700">
                      This is taking longer than usual.
                    </span>
                    <button
                      type="button"
                      onClick={() => purchaseQuery.refetch()}
                      className="text-sm font-semibold text-azure-300 hover:text-azure-100 dark:text-azure-700"
                    >
                      Check again
                    </button>
                  </div>
                )}
              </div>
            )}
            {packState === "active" && <ReadyPackBanner purchase={purchase} />}
            {packState === "exhausted" && (
              <p className="font-semibold text-amber-200 dark:text-amber-800">
                This pack's {purchase.unlocks_granted} unlocks are already fully used.
              </p>
            )}
            {packState === "expired" &&
              (purchase.lapsed_before_activation ? (
                <p className="font-semibold text-amber-200 dark:text-amber-800">
                  Payment received. The academic period closed before this pack could
                  activate.
                </p>
              ) : (
                <p className="font-semibold text-amber-200 dark:text-amber-800">
                  This pack's access period has already ended.
                </p>
              ))}
            {packState === "not_paid" && (
              <p className="font-semibold text-amber-200 dark:text-amber-800">
                That checkout wasn't completed — you can choose a pack below to try again.
              </p>
            )}
          </div>
        )}

        {accessOverviewQuery.data && accessOverviewQuery.data.expired_access.length > 0 && (
          <section className="mb-8 rounded-xl border border-amber-700 bg-amber-900 p-4 dark:border-amber-400/40 dark:bg-amber-100/20">
            <div className="mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400 dark:text-amber-600" aria-hidden />
              <h2 className="text-sm font-bold text-amber-200 dark:text-amber-800">
                Courses that need renewing
              </h2>
            </div>
            <ul className="space-y-1.5">
              {accessOverviewQuery.data.expired_access.map((entry) => (
                <li key={entry.uuid}>
                  <Link
                    to={`/course/${entry.course.uuid}?renew=1`}
                    className="text-sm font-medium text-amber-300 underline hover:text-amber-100 dark:text-amber-700 dark:hover:text-amber-900"
                  >
                    {entry.course.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mb-10">
          <h2 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">
            Available packs
          </h2>
          {catalogQuery.data && (
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              You have {catalogQuery.data.unlocks.available} unlock
              {catalogQuery.data.unlocks.available === 1 ? "" : "s"} available.
            </p>
          )}

          {catalogQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-56 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
                />
              ))}
            </div>
          ) : catalogQuery.isError ? (
            <EmptyState
              title="Couldn't load Course Packs"
              description="Something went wrong fetching the catalogue."
              action={
                <button
                  onClick={() => catalogQuery.refetch()}
                  className="rounded-xl bg-azure-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-azure-600"
                >
                  Retry
                </button>
              }
            />
          ) : catalogQuery.data && catalogQuery.data.packs.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {catalogQuery.data.packs.map((pack) => (
                <CoursePackCard
                  key={pack.uuid}
                  pack={pack}
                  onChoose={() => purchaseMutation.mutate(pack.uuid)}
                  isChoosing={
                    purchaseMutation.isPending && purchaseMutation.variables === pack.uuid
                  }
                  disabled={purchaseMutation.isPending}
                  errorMessage={
                    purchaseMutation.isError && purchaseMutation.variables === pack.uuid
                      ? getErrorMessage(purchaseMutation.error)
                      : null
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No Course Packs on sale"
              description="Check back later, or buy a paid course individually from its own page."
            />
          )}
        </section>

        <section>
          <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">My packs</h2>

          {purchasesQuery.isLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
                />
              ))}
            </div>
          ) : purchasesQuery.data && purchasesQuery.data.data.length > 0 ? (
            <>
              <div className="space-y-3">
                {purchasesQuery.data.data.map((p) => {
                  const StatusIcon = PACK_STATE_ICON[p.pack_state];
                  return (
                    <div
                      key={p.uuid}
                      className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {p.name} — {p.currency} {p.amount.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {p.unlocks_used}/{p.unlocks_granted} unlocks used
                            {p.unlocks_expired > 0 ? ` · ${p.unlocks_expired} forfeited` : ""}
                            {p.academic_period ? ` · ${p.academic_period.name}` : ""}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${PACK_STATE_COLOR[p.pack_state]}`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" aria-hidden />
                          {PACK_STATE_LABEL[p.pack_state]}
                        </span>
                      </div>
                      {p.pack_state === "pending" && <PendingPackActions purchase={p} />}
                      {p.pack_state === "expired" && p.lapsed_before_activation && (
                        <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                          Payment received after the academic period closed — recorded, but
                          born expired.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {purchasesQuery.data.meta.last_page > 1 && (
                <div className="mt-4 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={purchasesQuery.data.meta.current_page <= 1}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {purchasesQuery.data.meta.current_page} / {purchasesQuery.data.meta.last_page}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={
                      purchasesQuery.data.meta.current_page >= purchasesQuery.data.meta.last_page
                    }
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title="No packs yet"
              description="Course Packs you buy will show up here, with their unlock balance."
            />
          )}
        </section>
      </div>
    </PageShell>
  );
};
