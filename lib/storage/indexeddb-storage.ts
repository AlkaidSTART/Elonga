import type { StateStorage } from "zustand/middleware";

export const IDB_DATABASE_NAME = "elonga-local-db";
export const IDB_DATABASE_VERSION = 1;
export const IDB_STORE_NAME = "kv";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface IndexedDBStorageOptions {
  dbName?: string;
  storeName?: string;
  indexedDBFactory?: IDBFactory | null;
  fallbackStorage?: StorageLike | null;
}

export type LocalStorageBackend = "indexeddb" | "localstorage" | "memory";

function getGlobalIndexedDB(): IDBFactory | null {
  if (typeof window === "undefined") return null;
  try {
    return window.indexedDB ?? null;
  } catch {
    return null;
  }
}

function getGlobalLocalStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
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
 * Create a Zustand-compatible async StateStorage backed by browser IndexedDB.
 * - Automatically migrates existing keys from localStorage on first read.
 * - Falls back gracefully to localStorage (or no-op on SSR) when IndexedDB is unavailable.
 */
export function createIndexedDBStateStorage(options: IndexedDBStorageOptions = {}): StateStorage {
  const dbName = options.dbName ?? IDB_DATABASE_NAME;
  const storeName = options.storeName ?? IDB_STORE_NAME;
  let dbPromise: Promise<IDBDatabase> | null = null;

  const resolveFactory = () =>
    options.indexedDBFactory !== undefined ? options.indexedDBFactory : getGlobalIndexedDB();
  const resolveFallback = () =>
    options.fallbackStorage !== undefined ? options.fallbackStorage : getGlobalLocalStorage();

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
      const fallback = resolveFallback();
      const pendingDb = getDb();

      if (pendingDb) {
        try {
          const db = await pendingDb;
          const stored = await idbGet(db, storeName, name);
          if (stored !== null) {
            return stored;
          }

          // One-time transparent migration from legacy localStorage data
          const legacy = fallback?.getItem(name) ?? null;
          if (legacy !== null) {
            try {
              await idbSet(db, storeName, name, legacy);
            } catch {
              // Ignore migration write error and still return legacy data
            }
            return legacy;
          }
          return null;
        } catch {
          // Fall through to localStorage fallback
        }
      }

      try {
        return fallback?.getItem(name) ?? null;
      } catch {
        return null;
      }
    },

    async setItem(name: string, value: string): Promise<void> {
      const fallback = resolveFallback();
      const pendingDb = getDb();

      if (pendingDb) {
        try {
          const db = await pendingDb;
          await idbSet(db, storeName, name, value);
          return;
        } catch {
          // Fall through to localStorage fallback
        }
      }

      try {
        fallback?.setItem(name, value);
      } catch {
        // Ignore quota or privacy-mode storage errors
      }
    },

    async removeItem(name: string): Promise<void> {
      const fallback = resolveFallback();
      const pendingDb = getDb();

      if (pendingDb) {
        try {
          const db = await pendingDb;
          await idbDelete(db, storeName, name);
        } catch {
          // Ignore IDB delete error
        }
      }

      try {
        fallback?.removeItem(name);
      } catch {
        // Ignore fallback delete error
      }
    },
  };
}

export function detectLocalStorageBackend(): LocalStorageBackend {
  if (getGlobalIndexedDB()) return "indexeddb";
  if (getGlobalLocalStorage()) return "localstorage";
  return "memory";
}

export const indexedDBStorage: StateStorage = createIndexedDBStateStorage();
