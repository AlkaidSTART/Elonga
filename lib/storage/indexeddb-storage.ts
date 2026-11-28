import type { StateStorage } from "zustand/middleware";

export const IDB_DATABASE_NAME = "elonga-local-db";
export const IDB_DATABASE_VERSION = 1;
export const IDB_STORE_NAME = "kv";

export const LEGACY_LOCAL_STORAGE_KEYS = [
  "jianyue-workbench-storage",
  "elonga-organization-storage",
  "elonga-monthly-reports-storage",
  "elonga-personal-profile-storage",
  "elonga-analytics-chat-storage",
] as const;

export type LegacyStorageRemover = Pick<Storage, "removeItem">;

export interface IndexedDBStorageOptions {
  dbName?: string;
  storeName?: string;
  indexedDBFactory?: IDBFactory | null;
  legacyStorage?: LegacyStorageRemover | null;
}

export type LocalStorageBackend = "indexeddb" | "memory";

function getGlobalIndexedDB(): IDBFactory | null {
  if (typeof window === "undefined") return null;
  try {
    return window.indexedDB ?? null;
  } catch {
    return null;
  }
}

function getGlobalLegacyLocalStorage(): LegacyStorageRemover | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

export function clearLegacyLocalStorageData(
  keys: readonly string[] = LEGACY_LOCAL_STORAGE_KEYS,
  storage?: LegacyStorageRemover | null,
): void {
  const target = storage !== undefined ? storage : getGlobalLegacyLocalStorage();
  if (!target) return;

  for (const key of keys) {
    try {
      target.removeItem(key);
    } catch {
      // Ignore storage access errors in restricted or privacy browser modes
    }
  }
}

function openDatabase(
  factory: IDBFactory,
  dbName: string,
  storeName: string,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(dbName, IDB_DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

function idbGet(db: IDBDatabase, storeName: string, key: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.get(key);

    req.onsuccess = () => {
      const result = req.result;
      resolve(typeof result === "string" ? result : null);
    };
    req.onerror = () => reject(req.error ?? new Error(`Failed to read key "${key}"`));
  });
}

function idbSet(db: IDBDatabase, storeName: string, key: string, value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.put(value, key);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error(`Failed to write key "${key}"`));
  });
}

function idbDelete(db: IDBDatabase, storeName: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.delete(key);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error(`Failed to delete key "${key}"`));
  });
}

/**
 * Create a Zustand-compatible async StateStorage backed exclusively by browser IndexedDB.
 * - Proactively purges legacy localStorage keys once without reading or migrating them.
 * - Falls back to in-memory storage only when IndexedDB is unavailable (e.g. SSR).
 */
export function createIndexedDBStateStorage(options: IndexedDBStorageOptions = {}): StateStorage {
  const dbName = options.dbName ?? IDB_DATABASE_NAME;
  const storeName = options.storeName ?? IDB_STORE_NAME;
  const memoryFallback = new Map<string, string>();
  let dbPromise: Promise<IDBDatabase> | null = null;
  let hasPurgedKnownLegacyKeys = false;
  const purgedKeySet = new Set<string>();

  const resolveFactory = () =>
    options.indexedDBFactory !== undefined ? options.indexedDBFactory : getGlobalIndexedDB();
  const resolveLegacyStorage = () =>
    options.legacyStorage !== undefined ? options.legacyStorage : getGlobalLegacyLocalStorage();

  const purgeLegacyOnce = (key?: string): void => {
    const legacyStorage = resolveLegacyStorage();
    if (!legacyStorage) return;

    if (!hasPurgedKnownLegacyKeys) {
      hasPurgedKnownLegacyKeys = true;
      clearLegacyLocalStorageData(LEGACY_LOCAL_STORAGE_KEYS, legacyStorage);
      for (const knownKey of LEGACY_LOCAL_STORAGE_KEYS) {
        purgedKeySet.add(knownKey);
      }
    }

    if (key && !purgedKeySet.has(key)) {
      purgedKeySet.add(key);
      clearLegacyLocalStorageData([key], legacyStorage);
    }
  };

  const getDb = (): Promise<IDBDatabase> | null => {
    const factory = resolveFactory();
    if (!factory) return null;
    if (!dbPromise) {
      dbPromise = openDatabase(factory, dbName, storeName).catch((err) => {
        dbPromise = null;
        throw err;
      });
    }
    return dbPromise;
  };

  return {
    async getItem(name: string): Promise<string | null> {
      purgeLegacyOnce(name);
      const pendingDb = getDb();

      if (pendingDb) {
        try {
          const db = await pendingDb;
          return await idbGet(db, storeName, name);
        } catch {
          // Fall through to in-memory fallback when IndexedDB fails at runtime
        }
      }

      return memoryFallback.get(name) ?? null;
    },

    async setItem(name: string, value: string): Promise<void> {
      purgeLegacyOnce(name);
      const pendingDb = getDb();

      if (pendingDb) {
        try {
          const db = await pendingDb;
          await idbSet(db, storeName, name, value);
          return;
        } catch {
          // Fall through to in-memory fallback when IndexedDB fails at runtime
        }
      }

      memoryFallback.set(name, value);
    },

    async removeItem(name: string): Promise<void> {
      purgeLegacyOnce(name);
      const pendingDb = getDb();

      if (pendingDb) {
        try {
          const db = await pendingDb;
          await idbDelete(db, storeName, name);
        } catch {
          // Ignore IDB delete error
        }
      }

      memoryFallback.delete(name);
    },
  };
}

export function detectLocalStorageBackend(): LocalStorageBackend {
  return getGlobalIndexedDB() ? "indexeddb" : "memory";
}

export const indexedDBStorage: StateStorage = createIndexedDBStateStorage();
