import api from "./api";
import {
  getOfflineActions,
  removeOfflineAction,
  isOnline,
  onOnlineStatusChange,
} from "../utils/db";

export const syncOfflineActions = async (): Promise<void> => {
  if (!isOnline()) {
    console.log("Offline - skipping sync");
    return;
  }

  const actions = await getOfflineActions();

  for (const action of actions) {
    try {
      // Execute the action
      switch (action.method) {
        case "POST":
          await api.post(action.url, action.payload);
          break;
        case "PUT":
          await api.put(action.url, action.payload);
          break;
        case "DELETE":
          await api.delete(action.url);
          break;
        default:
          console.error("Unknown method:", action.method);
          continue;
      }

      // Success - remove from queue
      await removeOfflineAction(action.id as string);
      console.log("Synced action:", action.type);
    } catch (error) {
      console.error("Failed to sync action:", action.type, error);
      // Increment retry count and potentially remove after too many retries
      if (action.retryCount >= 3) {
        await removeOfflineAction(action.id as string);
        console.log("Removed action after max retries:", action.type);
      }
    }
  }
};

export const initSync = (): (() => void) => {
  // Initial sync if online
  if (isOnline()) {
    syncOfflineActions();
  }

  // Sync when coming back online
  return onOnlineStatusChange((online) => {
    if (online) {
      console.log("Back online - syncing actions");
      syncOfflineActions();
    }
  });
};
