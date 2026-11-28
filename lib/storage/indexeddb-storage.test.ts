import { describe, expect, it } from "vitest";
import {
  clearLegacyLocalStorageData,
  createIndexedDBStateStorage,
  IDB_STORE_NAME,
  LEGACY_LOCAL_STORAGE_KEYS,
} from "./indexeddb-storage";

function createMemoryLegacyStorage(initial: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(initial));
  const removedKeys: string[] = [];

  return {
    map,
    removedKeys,
    storage: {
      removeItem(key: string) {
        removedKeys.push(key);
        map.delete(key);
      },
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
    const legacy = createMemoryLegacyStorage();
    const storage = createIndexedDBStateStorage({
      indexedDBFactory: factory,
      legacyStorage: legacy.storage,
    });

    await storage.setItem("elonga-test", JSON.stringify({ count: 42 }));
    expect(backing.get("elonga-test")).toBe('{"count":42}');

    const read = await storage.getItem("elonga-test");
    expect(read).toBe('{"count":42}');

    await storage.removeItem("elonga-test");
    expect(backing.has("elonga-test")).toBe(false);
    expect(await storage.getItem("elonga-test")).toBeNull();
  });

  it("purges legacy localStorage keys without reading or migrating old data", async () => {
    const { factory, backing } = createMockIndexedDBFactory();
    const legacy = createMemoryLegacyStorage({
      "jianyue-workbench-storage": '{"state":{"platform":"douyin"}}',
      "elonga-organization-storage": '{"state":{"name":"legacy"}}',
      "unrelated-app-key": "keep-me",
    });
    const storage = createIndexedDBStateStorage({
      indexedDBFactory: factory,
      legacyStorage: legacy.storage,
    });

    const value = await storage.getItem("jianyue-workbench-storage");
    expect(value).toBeNull();
    expect(backing.has("jianyue-workbench-storage")).toBe(false);
    expect(legacy.map.has("jianyue-workbench-storage")).toBe(false);
    expect(legacy.map.has("elonga-organization-storage")).toBe(false);
    expect(legacy.map.get("unrelated-app-key")).toBe("keep-me");
  });

  it("falls back to in-memory storage when IndexedDB is unavailable", async () => {
    const legacy = createMemoryLegacyStorage({
      "jianyue-workbench-storage": "stale",
    });
    const storage = createIndexedDBStateStorage({
      indexedDBFactory: null,
      legacyStorage: legacy.storage,
    });

    expect(await storage.getItem("jianyue-workbench-storage")).toBeNull();
    expect(legacy.map.has("jianyue-workbench-storage")).toBe(false);

    await storage.setItem("memory-key", "hello");
    expect(await storage.getItem("memory-key")).toBe("hello");

    await storage.removeItem("memory-key");
    expect(await storage.getItem("memory-key")).toBeNull();
  });

  it("clearLegacyLocalStorageData removes all known legacy keys safely", () => {
    const initial: Record<string, string> = { "other-key": "preserved" };
    for (const key of LEGACY_LOCAL_STORAGE_KEYS) {
      initial[key] = "legacy";
    }
    const legacy = createMemoryLegacyStorage(initial);

    clearLegacyLocalStorageData(LEGACY_LOCAL_STORAGE_KEYS, legacy.storage);

    for (const key of LEGACY_LOCAL_STORAGE_KEYS) {
      expect(legacy.map.has(key)).toBe(false);
    }
    expect(legacy.map.get("other-key")).toBe("preserved");
  });
});
