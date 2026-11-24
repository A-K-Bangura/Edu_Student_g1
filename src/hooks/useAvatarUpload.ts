import { useState } from "react";
import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadAvatar } from "../services/upload";
import { ApiError } from "../utils/apiError";
import { debugLog } from "../utils/debug";
import { prepareAvatarImage } from "../utils/imageResize";

/** The types the backend accepts for an avatar (`CloudinaryService`). */
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const AVATAR_ACCEPT = AVATAR_TYPES.join(",");
/** What the backend accepts — applies to what is *sent*, i.e. after shrinking. */
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
/**
 * The biggest file we'll try to shrink. Phone photos are well under this; it
 * only stops a huge file being decoded into memory on a low-end device.
 */
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

const CONNECTION_MESSAGE =
  "We couldn't reach the server. Check your connection and try again.";
const GENERIC_MESSAGE =
  "We couldn't upload your photo right now. Please try again in a moment.";

/** A problem with the chosen photo itself; its message is written for the student. */
class AvatarFileError extends Error {}

/**
 * `null` when the file is worth trying, otherwise what to tell the student.
 * The size limit isn't checked here: a 9 MB phone photo is fine, because it is
 * shrunk before it is sent (see `useAvatarUpload`).
 */
export const validateAvatarFile = (file: File): string | null => {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) {
    return "Please choose a JPEG, PNG or WebP image.";
  }
  if (file.size < 1) {
    return "That file is empty. Please choose another photo.";
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return "That photo is too large to use. Please choose one under 25 MB.";
  }
  return null;
};

/**
 * What to tell the student when an upload fails. The backend's own words are
 * used only for a 422 (wrong type / too big — they're written for people);
 * anything else could carry internals (a 500 can say "Cloudinary credentials
 * not configured"), and Cloudinary's errors are technical ("Invalid
 * Signature …"), so those get plain language and go to the debug log instead.
 */
export const getAvatarUploadErrorMessage = (error: unknown): string => {
  if (error instanceof AvatarFileError) return error.message;
  if (axios.isAxiosError(error)) {
    if (!error.response) return CONNECTION_MESSAGE;
    if (error.response.status === 422) {
      return ApiError.fromAxiosError(error).getUserFriendlyMessage();
    }
    return GENERIC_MESSAGE;
  }
  // `fetch` rejects with a TypeError when the request never reaches Cloudinary.
  if (error instanceof TypeError) return CONNECTION_MESSAGE;
  return GENERIC_MESSAGE;
};

/**
 * Uploads the signed-in student's profile photo and tracks the outcome. A
 * failure is kept in `error` for the UI to show — before, it was swallowed and
 * the student was left with no sign that anything had gone wrong.
 *
 * The photo is shrunk on the device first, so `isUploading` covers that step
 * too (it can take a moment on a slow phone). Only the shrunk file has to fit
 * the backend's 5 MB limit.
 */
export const useAvatarUpload = () => {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const prepared = await prepareAvatarImage(file);
      if (prepared.size > MAX_AVATAR_BYTES) {
        throw new AvatarFileError(
          "We couldn't make that photo small enough to upload (the limit is 5 MB). Please choose a smaller one."
        );
      }
      return uploadAvatar(prepared);
    },
    onMutate: () => setError(null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (failure) => {
      debugLog("useAvatarUpload", "Avatar upload failed", failure);
      setError(getAvatarUploadErrorMessage(failure));
    },
  });

  const upload = (file: File) => {
    const problem = validateAvatarFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setError("You're offline. Connect to the internet and try again.");
      return;
    }
    mutation.mutate(file);
  };

  return {
    upload,
    isUploading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error,
    clearError: () => setError(null),
  };
};
