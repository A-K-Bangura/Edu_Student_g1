import { useLocation } from "react-router-dom";
import { Share, SquarePlus, X } from "lucide-react";
import { useInstallPrompt } from "../../hooks/useInstallPrompt";

// The lesson player is a full-height layout with its own bottom toolbar; a
// floating card there would sit on top of the Previous/Next controls. The
// prompt shows again as soon as the student leaves it.
const IMMERSIVE_ROUTE = /^\/course\/[^/]+\/(?:play|module\/)/;

/**
 * Asks the visitor to install the app. Shown on every visit (per tab/session)
 * until it's closed or the app is installed. See `useInstallPrompt`.
 */
export const InstallPrompt = () => {
  const { pathname } = useLocation();
  const { mode, install, dismiss } = useInstallPrompt();

  if (!mode || IMMERSIVE_ROUTE.test(pathname)) return null;

  return (
    // z-40: above page content, below the bottom nav (z-50) and modals. On
    // phones it floats just above the ~54px nav (bottom-[4.5rem]); on md+
    // there is no nav.
    <div
      role="region"
      aria-label="Install UniVybe"
      className="animate-sheet-up fixed inset-x-3 bottom-[4.5rem] z-40 md:inset-x-auto md:bottom-4 md:right-4 md:w-96"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <img
          src="/icon-192.png"
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded-xl"
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Install UniVybe
          </p>

          {mode === "native" ? (
            <>
              <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
                Add it to your home screen. It opens faster and works like an
                app.
              </p>
              <button
                type="button"
                onClick={() => void install()}
                className="mt-2 rounded-lg bg-azure-500 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-azure-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-azure-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
              >
                Install app
              </button>
            </>
          ) : (
            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
              Tap{" "}
              <Share
                className="inline h-4 w-4 align-text-bottom text-azure-500"
                aria-label="Share"
              />{" "}
              in Safari, then{" "}
              <span className="font-semibold">Add to Home Screen</span>{" "}
              <SquarePlus
                className="inline h-4 w-4 align-text-bottom text-azure-500"
                aria-hidden
              />{" "}
              to install the app.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Close install prompt"
          className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-azure-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  );
};
