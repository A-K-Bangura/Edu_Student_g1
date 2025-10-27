import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { initSync } from "../../services/sync";

export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncInProgress, setSyncInProgress] = useState(false);

  useEffect(() => {
    const cleanup = initSync();

    const handleOnline = () => {
      setIsOnline(true);
      setSyncInProgress(true);
      setTimeout(() => setSyncInProgress(false), 2000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      cleanup();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && !syncInProgress) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white px-4 py-3 flex items-center justify-center gap-2 shadow-lg">
      {isOnline ? (
        <>
          <Wifi className="w-5 h-5" />
          <span className="font-semibold">Syncing data...</span>
        </>
      ) : (
        <>
          <WifiOff className="w-5 h-5" />
          <span className="font-semibold">
            You're offline - changes will sync when you're back online
          </span>
        </>
      )}
    </div>
  );
};
