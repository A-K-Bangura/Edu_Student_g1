import { openDB, type IDBPDatabase } from "idb";

export interface OfflineAction {
  id: string;
  type: "quiz" | "lesson_complete" | "quiz_complete" | "enrollment";
  method: "POST" | "PUT" | "DELETE";
  url: string;
  payload: unknown;
  timestamp: number;
  retryCount: number;
}

const DB_NAME = "EduLiftDB";
const DB_VERSION = 1;
const STORE_ACTIONS = "offlineActions";
const STORE_CACHE = "apiCache";

let dbInstance: IDBPDatabase | null = null;

export const initDB = async (): Promise<IDBPDatabase> => {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Offline actions store
      if (!db.objectStoreNames.contains(STORE_ACTIONS)) {
        db.createObjectStore(STORE_ACTIONS, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
      // API cache store
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE);
      }
    },
  });

  return dbInstance;
};

export const addOfflineAction = async (
  action: Omit<OfflineAction, "id" | "timestamp" | "retryCount">
): Promise<void> => {
  const db = await initDB();
  await db.add(STORE_ACTIONS, {
    ...action,
    timestamp: Date.now(),
    retryCount: 0,
  });
};

export const getOfflineActions = async (): Promise<OfflineAction[]> => {
  const db = await initDB();
  return await db.getAll(STORE_ACTIONS);
};

export const removeOfflineAction = async (id: string): Promise<void> => {
  const db = await initDB();
  await db.delete(STORE_ACTIONS, id);
};

export const clearOfflineActions = async (): Promise<void> => {
  const db = await initDB();
  await db.clear(STORE_ACTIONS);
};

export const getCachedResponse = async <T>(
  key: string
): Promise<T | undefined> => {
  const db = await initDB();
  return await db.get(STORE_CACHE, key);
};

export const setCachedResponse = async (
  key: string,
  value: unknown,
  ttl: number = 3600000
): Promise<void> => {
  const db = await initDB();
  await db.put(
    STORE_CACHE,
    {
      value,
      timestamp: Date.now(),
      ttl,
    },
    key
  );
};

export const clearCache = async (): Promise<void> => {
  const db = await initDB();
  await db.clear(STORE_CACHE);
};

export const isOnline = (): boolean => {
  return navigator.onLine;
};

export const onOnlineStatusChange = (
  callback: (online: boolean) => void
): (() => void) => {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
};
