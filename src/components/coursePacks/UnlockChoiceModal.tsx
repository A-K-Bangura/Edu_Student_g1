import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { Ticket, Sparkles } from "lucide-react";
import { BottomSheet } from "../common/BottomSheet";
import { CoursePackCard } from "./CoursePackCard";
import { enrollInCourse } from "../../services/courses";
import { getCoursePacks, purchaseCoursePack, unlockCourse } from "../../services/coursePacks";
import { ApiError } from "../../utils/apiError";
import { storeCoursePackCheckoutIntent } from "../../utils/coursePackCheckoutIntent";
import type { ApiResponse } from "../../types";
import type { AccessBlock } from "../../types/coursePack";

// "Choose how to unlock" (and its "Renew access" variant for an expired
// course) — the main discovery surface for Course Packs. Opened from a paid
// course's Enroll/Renew button; never performs a mutation on its own, only
// on an explicit tap. docs/designs/univybe_course_packs_student_design_guide.md §§1-5.

const getErrorMessage = (error: unknown): string | null => {
  if (!error) return null;
  if (typeof error === "object" && "response" in error) {
    return ApiError.fromAxiosError(
      error as AxiosError<ApiResponse>
    ).getUserFriendlyMessage();
  }
  return error instanceof Error ? error.message : "Something went wrong.";
};

export const UnlockChoiceModal = ({
  open,
  onClose,
  courseId,
  courseTitle,
  access,
  /** Called after access was granted in place (unlock spent, or a free restore) — never after a pack/individual checkout redirect, since the page unloads for that. */
  onUnlocked,
}: {
  open: boolean;
  onClose: () => void;
  courseId: string | number;
  courseTitle: string;
  access: AccessBlock;
  onUnlocked: () => void;
}) => {
  const [confirmingUnlock, setConfirmingUnlock] = useState(false);

  const packsQuery = useQuery({
    queryKey: ["course-packs"],
    queryFn: getCoursePacks,
    enabled: open,
  });

  const enrollMutation = useMutation({
    mutationFn: () => enrollInCourse(courseId),
    onSuccess: (result) => {
      if (result.requires_payment) {
        if (result.checkout_url) window.location.href = result.checkout_url;
        return;
      }
      onUnlocked();
    },
  });

  const unlockMutation = useMutation({
    mutationFn: () => unlockCourse(courseId),
    onSuccess: () => {
      setConfirmingUnlock(false);
      onUnlocked();
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: (packIdOrUuid: string | number) => purchaseCoursePack(packIdOrUuid),
    onSuccess: (purchase) => {
      if (purchase.checkout_url) {
        // Monime's return always lands on the generic /course-packs page —
        // this lets it offer "Use 1 unlock for {course}" directly.
        storeCoursePackCheckoutIntent({
          purchaseUuid: purchase.uuid,
          courseId: String(courseId),
          courseTitle,
        });
        window.location.href = purchase.checkout_url;
      }
      // payment_processing with no checkout_url: nothing to reopen; the pack
      // detail/history page is where that state is surfaced.
    },
  });

  const individual = access.options?.individual;
  const packUnlock = access.options?.pack_unlock;
  const isRenewal = access.expired;

  const anyMutationPending =
    enrollMutation.isPending || unlockMutation.isPending || purchaseMutation.isPending;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isRenewal ? "Renew access" : "Choose how to unlock"}
      description={
        isRenewal
          ? "Your progress is saved. Renew to pick up where you left off."
          : courseTitle
      }
      maxWidthClassName="sm:max-w-3xl"
    >
      <div className="space-y-5">
        {packUnlock?.available && (
          <div className="rounded-xl border border-azure-700 bg-azure-900 p-4 dark:border-azure-400/40 dark:bg-azure-100/30">
            <p className="text-sm font-semibold text-azure-200 dark:text-azure-800">
              You have {packUnlock.remaining_unlocks} unlock
              {packUnlock.remaining_unlocks === 1 ? "" : "s"} available.
            </p>
            {packUnlock.pack && (
              <p className="mt-0.5 text-xs text-azure-300 dark:text-azure-700">
                Next from {packUnlock.pack.name}
                {packUnlock.pack.academic_period
                  ? ` · ${packUnlock.pack.academic_period.name}`
                  : ""}
              </p>
            )}

            {confirmingUnlock ? (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Use 1 unlock for <span className="font-semibold">{courseTitle}</span>?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => unlockMutation.mutate()}
                    disabled={unlockMutation.isPending}
                    className="min-h-11 flex-1 rounded-xl bg-azure-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-azure-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {unlockMutation.isPending ? "Unlocking…" : "Confirm"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingUnlock(false)}
                    disabled={unlockMutation.isPending}
                    className="min-h-11 flex-1 rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingUnlock(true)}
                disabled={anyMutationPending}
                className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-azure-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-azure-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Ticket className="h-4 w-4" aria-hidden />
                Use 1 unlock
              </button>
            )}
            {unlockMutation.isError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                {getErrorMessage(unlockMutation.error)}
              </p>
            )}
          </div>
        )}

        {individual?.available && (
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              This course only
            </p>
            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
              {individual.currency} {individual.price?.toFixed(2)}
            </p>
            {access.validity?.academic_period && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {access.validity.academic_period.name}
              </p>
            )}
            <button
              type="button"
              onClick={() => enrollMutation.mutate()}
              disabled={anyMutationPending}
              className="mt-3 w-full min-h-11 rounded-xl border-2 border-azure-500 px-4 text-sm font-semibold text-azure-600 transition-colors hover:bg-azure-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-azure-700 dark:hover:bg-azure-100/30"
            >
              {enrollMutation.isPending ? "Preparing checkout…" : "Continue with this course"}
            </button>
            {enrollMutation.isError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                {getErrorMessage(enrollMutation.error)}
              </p>
            )}
          </div>
        )}

        {access.validity?.blocked_reason && (
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
            {new ApiError("", access.validity.blocked_reason).getUserFriendlyMessage()}
          </p>
        )}

        {packUnlock?.eligible !== false && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-violet-500" aria-hidden />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Choose a Course Pack
              </h3>
            </div>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              Each unlock opens one eligible paid course. Free courses never use one.
            </p>

            {packsQuery.isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className="h-56 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-700"
                  />
                ))}
              </div>
            ) : packsQuery.isError ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Couldn't load Course Packs right now — your other options above still work.
              </p>
            ) : packsQuery.data && packsQuery.data.packs.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {packsQuery.data.packs.map((pack) => (
                  <CoursePackCard
                    key={pack.uuid}
                    pack={pack}
                    onChoose={() => purchaseMutation.mutate(pack.uuid)}
                    isChoosing={
                      purchaseMutation.isPending &&
                      purchaseMutation.variables === pack.uuid
                    }
                    disabled={anyMutationPending}
                    errorMessage={
                      purchaseMutation.isError && purchaseMutation.variables === pack.uuid
                        ? getErrorMessage(purchaseMutation.error)
                        : null
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No Course Packs on sale right now.
              </p>
            )}
          </div>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Access ends when your university administrator closes the period shown. Unused
          unlocks expire with it and do not roll over. Payments are non-refundable.
        </p>
      </div>
    </BottomSheet>
  );
};
