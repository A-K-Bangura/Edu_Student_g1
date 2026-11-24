import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { AxiosError } from "axios";

vi.mock("../services/upload", () => ({ uploadAvatar: vi.fn() }));
vi.mock("../utils/imageResize", () => ({ prepareAvatarImage: vi.fn() }));

import { uploadAvatar } from "../services/upload";
import { prepareAvatarImage } from "../utils/imageResize";
import {
  MAX_AVATAR_BYTES,
  MAX_SOURCE_BYTES,
  getAvatarUploadErrorMessage,
  useAvatarUpload,
  validateAvatarFile,
} from "./useAvatarUpload";

const image = (overrides: { type?: string; size?: number } = {}) => {
  const file = new File(["x"], "me.png", { type: overrides.type ?? "image/png" });
  if (overrides.size !== undefined) {
    Object.defineProperty(file, "size", { value: overrides.size });
  }
  return file;
};

// A minimal AxiosError: axios.isAxiosError() looks for `isAxiosError: true`.
const axiosError = (status: number | null, data: unknown = {}) =>
  ({
    isAxiosError: true,
    message: "Request failed",
    response: status === null ? undefined : { status, data },
  }) as unknown as AxiosError;

describe("validateAvatarFile", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("accepts %s", (type) => {
    expect(validateAvatarFile(image({ type }))).toBeNull();
  });

  it.each(["image/gif", "image/heic", "application/pdf", ""])(
    "rejects %s with a clear message",
    (type) => {
      expect(validateAvatarFile(image({ type }))).toMatch(/JPEG, PNG or WebP/);
    }
  );

  it("rejects an empty file", () => {
    expect(validateAvatarFile(image({ size: 0 }))).toMatch(/empty/i);
  });

  // The 5 MB limit applies to what is sent, i.e. after the photo is shrunk, so
  // a typical 9 MB phone photo must be accepted here.
  it("accepts a photo bigger than the 5 MB upload limit, because it will be shrunk", () => {
    expect(validateAvatarFile(image({ size: 9 * 1024 * 1024 }))).toBeNull();
    expect(validateAvatarFile(image({ size: MAX_AVATAR_BYTES + 1 }))).toBeNull();
  });

  it("refuses something too big to even try to shrink, but accepts exactly the cap", () => {
    expect(validateAvatarFile(image({ size: MAX_SOURCE_BYTES + 1 }))).toMatch(/25 MB/);
    expect(validateAvatarFile(image({ size: MAX_SOURCE_BYTES }))).toBeNull();
  });
});

describe("getAvatarUploadErrorMessage", () => {
  it("uses the backend's own words for a 422 (wrong type or too big)", () => {
    const message = getAvatarUploadErrorMessage(
      axiosError(422, {
        success: false,
        message: "File type 'image/gif' is not allowed",
        error: { code: "VALIDATION_ERROR", message: "File type 'image/gif' is not allowed" },
      })
    );
    expect(message).toBe("File type 'image/gif' is not allowed");
  });

  it("never shows server internals from a 500", () => {
    const message = getAvatarUploadErrorMessage(
      axiosError(500, {
        success: false,
        error: {
          code: "CONFIGURATION_ERROR",
          message: "Cloudinary credentials not configured. Please set CLOUDINARY_URL",
        },
      })
    );
    expect(message).not.toMatch(/cloudinary|credentials|CLOUDINARY_URL/i);
    expect(message).toMatch(/try again/i);
  });

  it("says it's the connection when the API can't be reached at all", () => {
    expect(getAvatarUploadErrorMessage(axiosError(null))).toMatch(/connection/i);
  });

  it("says it's the connection when the upload to Cloudinary never leaves the device (fetch TypeError)", () => {
    expect(getAvatarUploadErrorMessage(new TypeError("Failed to fetch"))).toMatch(
      /connection/i
    );
  });

  it("keeps Cloudinary's technical errors out of the UI", () => {
    const message = getAvatarUploadErrorMessage(
      new Error("Invalid Signature abc123. String to sign - 'folder=x&timestamp=1'.")
    );
    expect(message).not.toMatch(/signature|string to sign/i);
    expect(message).toMatch(/try again/i);
  });
});

describe("useAvatarUpload", () => {
  let client: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.resetAllMocks();
    client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    vi.spyOn(client, "invalidateQueries");
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    // By default shrinking hands the same file back (nothing to gain).
    vi.mocked(prepareAvatarImage).mockImplementation(async (file) => file);
  });

  it("uploads the shrunk photo, not the original", async () => {
    const original = image({ size: 9 * 1024 * 1024 });
    const shrunk = new File(["small"], "me.jpg", { type: "image/jpeg" });
    vi.mocked(prepareAvatarImage).mockResolvedValue(shrunk);
    vi.mocked(uploadAvatar).mockResolvedValue({ file_upload: { id: 1 } } as never);
    const { result } = renderHook(() => useAvatarUpload(), { wrapper });

    act(() => result.current.upload(original));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(uploadAvatar).toHaveBeenCalledTimes(1);
    // Identity, not equality: two different `File`s compare as equal.
    expect(vi.mocked(prepareAvatarImage).mock.calls[0][0]).toBe(original);
    expect(vi.mocked(uploadAvatar).mock.calls[0][0]).toBe(shrunk);
  });

  it("counts shrinking as part of uploading, so the spinner shows while it works", async () => {
    let finishShrinking!: (file: File) => void;
    vi.mocked(prepareAvatarImage).mockReturnValue(
      new Promise((resolve) => {
        finishShrinking = resolve;
      })
    );
    vi.mocked(uploadAvatar).mockResolvedValue({ file_upload: { id: 1 } } as never);
    const { result } = renderHook(() => useAvatarUpload(), { wrapper });

    act(() => result.current.upload(image()));

    await waitFor(() => expect(result.current.isUploading).toBe(true));
    expect(uploadAvatar).not.toHaveBeenCalled(); // still shrinking

    await act(async () => finishShrinking(image()));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("says so, and uploads nothing, when the photo is still over 5 MB after shrinking", async () => {
    vi.mocked(prepareAvatarImage).mockResolvedValue(image({ size: MAX_AVATAR_BYTES + 1 }));
    const { result } = renderHook(() => useAvatarUpload(), { wrapper });

    act(() => result.current.upload(image({ size: 9 * 1024 * 1024 })));

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error).toMatch(/small enough/i);
    expect(result.current.error).toMatch(/5 MB/);
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it("uploads a photo that is exactly 5 MB after shrinking", async () => {
    vi.mocked(prepareAvatarImage).mockResolvedValue(image({ size: MAX_AVATAR_BYTES }));
    vi.mocked(uploadAvatar).mockResolvedValue({ file_upload: { id: 1 } } as never);
    const { result } = renderHook(() => useAvatarUpload(), { wrapper });

    act(() => result.current.upload(image()));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("doesn't start shrinking a file that is the wrong type or far too big", () => {
    const { result } = renderHook(() => useAvatarUpload(), { wrapper });

    act(() => result.current.upload(image({ type: "image/gif" })));
    act(() => result.current.upload(image({ size: MAX_SOURCE_BYTES + 1 })));

    expect(prepareAvatarImage).not.toHaveBeenCalled();
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it("uploads a valid photo, then refreshes the profile and dashboard", async () => {
    vi.mocked(uploadAvatar).mockResolvedValue({ file_upload: { id: 1 } } as never);
    const { result } = renderHook(() => useAvatarUpload(), { wrapper });

    act(() => result.current.upload(image()));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(uploadAvatar).toHaveBeenCalledTimes(1);
    expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["user-profile"] });
    expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
    expect(result.current.error).toBeNull();
  });

  it("reports a failed upload instead of swallowing it", async () => {
    vi.mocked(uploadAvatar).mockRejectedValue(new Error("Invalid Signature"));
    const { result } = renderHook(() => useAvatarUpload(), { wrapper });

    act(() => result.current.upload(image()));

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error).toMatch(/try again/i);
    expect(result.current.isUploading).toBe(false);
    expect(client.invalidateQueries).not.toHaveBeenCalled();
  });

  it("flags a bad file without calling the API at all", () => {
    const { result } = renderHook(() => useAvatarUpload(), { wrapper });

    act(() => result.current.upload(image({ type: "image/gif" })));

    expect(result.current.error).toMatch(/JPEG, PNG or WebP/);
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it("tells an offline student, rather than waiting on a request that can't succeed", () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    const { result } = renderHook(() => useAvatarUpload(), { wrapper });

    act(() => result.current.upload(image()));

    expect(result.current.error).toMatch(/offline/i);
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it("clears the old error when a new attempt starts, and on request", async () => {
    vi.mocked(uploadAvatar).mockRejectedValueOnce(new Error("boom"));
    vi.mocked(uploadAvatar).mockResolvedValueOnce({ file_upload: { id: 1 } } as never);
    const { result } = renderHook(() => useAvatarUpload(), { wrapper });

    act(() => result.current.upload(image()));
    await waitFor(() => expect(result.current.error).not.toBeNull());

    act(() => result.current.upload(image()));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.error).toBeNull();

    act(() => result.current.upload(image({ type: "image/gif" })));
    expect(result.current.error).not.toBeNull();
    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });

  it("reports that an upload is in flight", async () => {
    let finish!: () => void;
    vi.mocked(uploadAvatar).mockReturnValue(
      new Promise((resolve) => {
        finish = () => resolve({ file_upload: { id: 1 } } as never);
      })
    );
    const { result } = renderHook(() => useAvatarUpload(), { wrapper });

    act(() => result.current.upload(image()));
    await waitFor(() => expect(result.current.isUploading).toBe(true));

    await act(async () => finish());
    await waitFor(() => expect(result.current.isUploading).toBe(false));
  });
});
