import { useCallback, useState, useSyncExternalStore } from "react";
import {
  dismissInstallPrompt,
  getInstallPromptState,
  isIosDevice,
  isRunningInstalled,
  promptInstall,
  subscribeInstallPrompt,
} from "../utils/pwaInstall";

/**
 * - `native`: the browser can install the app now; show an Install button.
 * - `ios`: iOS Safari can't be prompted; show Share -> Add to Home Screen steps.
 * - `null`: nothing to offer (already installed, closed during this visit, or
 *   the browser can't install).
 */
export type InstallPromptMode = "native" | "ios" | null;

export const useInstallPrompt = (): {
  mode: InstallPromptMode;
  install: () => Promise<void>;
  dismiss: () => void;
} => {
  const { deferredPrompt, installed, dismissed } = useSyncExternalStore(
    subscribeInstallPrompt,
    getInstallPromptState,
    getInstallPromptState
  );
  const [runningInstalled] = useState(isRunningInstalled);
  const [ios] = useState(isIosDevice);

  // Whatever the user answers, they've dealt with it for this visit. (If they
  // cancel the browser dialog, Chrome may hand us a fresh event later; we
  // shouldn't pop up again straight after they said no.)
  const install = useCallback(async () => {
    const outcome = await promptInstall();
    if (outcome !== "unavailable") dismissInstallPrompt();
  }, []);

  let mode: InstallPromptMode = null;
  if (!runningInstalled && !installed && !dismissed) {
    if (deferredPrompt) mode = "native";
    else if (ios) mode = "ios";
  }

  return { mode, install, dismiss: dismissInstallPrompt };
};
