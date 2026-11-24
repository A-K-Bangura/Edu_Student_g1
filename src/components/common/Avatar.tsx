import { useState } from "react";
import { getInitials } from "../../utils/profileDisplay";

interface AvatarProps {
  /** The student's photo, if they have one. */
  src?: string | null;
  /** Used for the initials shown until the photo arrives, or when there's none. */
  name: string;
  /** Size and type size, e.g. `"size-8 text-xs md:size-10 md:text-base"`, plus any ring. */
  className?: string;
  /** Defer loading until it nears the screen — for rows far down a long list. */
  lazy?: boolean;
  /** Reports whether the photo could be shown, e.g. so a click-to-enlarge can be withheld. */
  onStatusChange?: (status: "loaded" | "failed") => void;
}

type Status = { src: string; state: "loaded" | "failed" };

/**
 * A round profile picture. The initials are drawn first and stay until the
 * photo has actually loaded, so a slow connection shows a sensible circle
 * rather than a blank one, and a photo that fails to load (or never existed)
 * simply leaves the initials. Purely decorative: wherever it appears the
 * student's name is already on screen next to it.
 */
export const Avatar = ({
  src,
  name,
  className = "",
  lazy = false,
  onStatusChange,
}: AvatarProps) => {
  const [status, setStatus] = useState<Status | null>(null);
  // Remembered per address, so a new photo for the same student gets a fresh try.
  const state = src && status?.src === src ? status.state : "loading";

  const report = (next: Status["state"]) => {
    if (!src) return;
    setStatus({ src, state: next });
    onStatusChange?.(next);
  };

  const showImage = !!src && state !== "failed";

  return (
    <span
      aria-hidden
      className={`relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold text-white ${
        // The gradient is for initials; once a photo is there (it may have
        // transparent areas) a neutral backing is less jarring behind it.
        state === "loaded"
          ? "bg-gray-200 dark:bg-gray-700"
          : "bg-linear-to-br from-azure-400 to-blue-violet-400"
      } ${className}`}
    >
      {state !== "loaded" && getInitials(name)}
      {showImage && (
        <img
          src={src}
          alt=""
          loading={lazy ? "lazy" : "eager"}
          decoding="async"
          draggable={false}
          onLoad={() => report("loaded")}
          onError={() => report("failed")}
          className="absolute inset-0 size-full object-cover"
        />
      )}
    </span>
  );
};
