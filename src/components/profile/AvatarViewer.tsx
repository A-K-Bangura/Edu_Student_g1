import { useEffect, useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Camera, X } from "lucide-react";

interface AvatarViewerProps {
  /** The student's photo; `null` shows their initials instead. */
  imageUrl: string | null;
  initials: string;
  name: string;
  onClose: () => void;
  onChangePhoto: () => void;
  /** Focus goes back here when the viewer closes. */
  returnFocusRef: RefObject<HTMLElement | null>;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Full-size view of the profile photo, with the way to change it. Mount it
 * only while open: Escape, backdrop and the close button dismiss it, focus is
 * held inside while it's up, and returns to the avatar it was opened from.
 *
 * Rendered into `document.body` so it sits above the bottom nav (a fixed
 * sibling later in the page, which would otherwise paint over it).
 */
export const AvatarViewer = ({
  imageUrl,
  initials,
  name,
  onClose,
  onChangePhoto,
  returnFocusRef,
}: AvatarViewerProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus moves into the dialog on open and back to the avatar on close.
  useEffect(() => {
    const returnTo = returnFocusRef.current;
    closeRef.current?.focus();
    return () => returnTo?.focus();
  }, [returnFocusRef]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      // Keep Tab inside the dialog: it is modal, so the page behind must not be reachable.
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Profile photo"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <X className="size-6" aria-hidden />
      </button>

      {/* Clicks on the photo or the button must not count as clicks on the backdrop. */}
      <div
        className="flex w-full max-w-sm flex-col items-center gap-6"
        onClick={(event) => event.stopPropagation()}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`${name}'s profile photo`}
            className="max-h-[65dvh] w-full rounded-2xl bg-black/30 object-contain"
          />
        ) : (
          <div
            aria-hidden
            className="flex aspect-square w-3/4 max-w-72 items-center justify-center rounded-full bg-white/15 text-7xl font-bold text-white ring-4 ring-white/30"
          >
            {initials}
          </div>
        )}

        <button
          type="button"
          onClick={onChangePhoto}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-azure-300 shadow-lg transition-colors hover:bg-azure-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Camera className="size-4" aria-hidden />
          {imageUrl ? "Change photo" : "Add a photo"}
        </button>
      </div>
    </div>,
    document.body
  );
};
