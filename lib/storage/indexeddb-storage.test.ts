import { describe, expect, it } from "vitest";
import {
  createIndexedDBStateStorage,
  IDB_STORE_NAME,
  type StorageLike,
} from "./indexeddb-storage";

function createMemoryStorage(initial: Record<string, string> = {}): StorageLike {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    getItem(key: string) {
      return map.has(key) ? (map.get(key) ?? null) : null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
  };
}

function createMockIndexedDBFactory() {
  const backing = new Map<string, string>();
  const storeNames = new Set<string>();

  const makeRequest = <T>(executor: () => T) => {
    const req: {
      result?: T;
      error?: Error | null;
      onsuccess: ((ev: Event) => void) | null;
      onerror: ((ev: Event) => void) | null;
    } = {
      onsuccess: null,
      onerror: null,
    };

    queueMicrotask(() => {
      try {
        req.result = executor();
        req.onsuccess?.({} as Event);
      } catch (err) {
        req.error = err instanceof Error ? err : new Error(String(err));
        req.onerror?.({} as Event);
      }
    });

    return req;
  };

  const mockDb = {
    objectStoreNames: {
      contains: (name: string) => storeNames.has(name),
    },
    createObjectStore: (name: string) => {
      storeNames.add(name);
      return {};
    },
    transaction: (name: string) => {
      if (!storeNames.has(name)) {
        throw new Error(`Store ${name} does not exist`);
      }
      return {
        objectStore: () => ({
          get: (key: string) => makeRequest(() => backing.get(key)),
          put: (value: string, key: string) =>
            makeRequest(() => {
              backing.set(key, value);
              return key;
            }),
          delete: (key: string) =>
            makeRequest(() => {
              backing.delete(key);
              return undefined;
            }),
        }),
      };
    },
  };

  const factory = {
    open: () => {
      const openReq: {
        result: typeof mockDb;
        error: Error | null;
        onupgradeneeded: ((ev: Event) => void) | null;
        onsuccess: ((ev: Event) => void) | null;
        onerror: ((ev: Event) => void) | null;
      } = {
        result: mockDb,
        error: null,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      };

      queueMicrotask(() => {
        if (!storeNames.has(IDB_STORE_NAME)) {
          openReq.onupgradeneeded?.({} as Event);
        }
        openReq.onsuccess?.({} as Event);
      });

      return openReq;
    },
  } as unknown as IDBFactory;

  return { factory, backing };
}

describe("createIndexedDBStateStorage", () => {
  it("writes, reads, and removes values in IndexedDB", async () => {
    const { factory, backing } = createMockIndexedDBFactory();
    const fallback = createMemoryStorage();
    const storage = createIndexedDBStateStorage({
      indexedDBFactory: factory,
      fallbackStorage: fallback,
    });

    await storage.setItem("elonga-test", JSON.stringify({ count: 42 }));
    expect(backing.get("elonga-test")).toBe('{"count":42}');

    const read = await storage.getItem("elonga-test");
    expect(read).toBe('{"count":42}');

    await storage.removeItem("elonga-test");
    expect(backing.has("elonga-test")).toBe(false);
    expect(await storage.getItem("elonga-test")).toBeNull();
  });

  it("migrates legacy localStorage data into IndexedDB on first read", async () => {
    const { factory, backing } = createMockIndexedDBFactory();
    const fallback = createMemoryStorage({
      "jianyue-workbench-storage": '{"state":{"platform":"douyin"}}',
    });
    const storage = createIndexedDBStateStorage({
      indexedDBFactory: factory,
      fallbackStorage: fallback,
    });

    const migrated = await storage.getItem("jianyue-workbench-storage");
    expect(migrated).toBe('{"state":{"platform":"douyin"}}');
    expect(backing.get("jianyue-workbench-storage")).toBe('{"state":{"platform":"douyin"}}');
  });

  it("removes keys from both IndexedDB and fallback localStorage", async () => {
    const { factory, backing } = createMockIndexedDBFactory();
    const fallback = createMemoryStorage({
      "legacy-key": "old-value",
    });
    const storage = createIndexedDBStateStorage({
      indexedDBFactory: factory,
      fallbackStorage: fallback,
    });

    await storage.getItem("legacy-key");
    expect(backing.get("legacy-key")).toBe("old-value");

    await storage.removeItem("legacy-key");
    expect(backing.has("legacy-key")).toBe(false);
    expect(fallback.getItem("legacy-key")).toBeNull();
  });

  it("falls back to localStorage when IndexedDB is unavailable", async () => {
    const fallback = createMemoryStorage();
    const storage = createIndexedDBStateStorage({
      indexedDBFactory: null,
      fallbackStorage: fallback,
    });

    await storage.setItem("fallback-key", "hello");
    expect(fallback.getItem("fallback-key")).toBe("hello");
    expect(await storage.getItem("fallback-key")).toBe("hello");
  });
});
