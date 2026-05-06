/**
 * Offline storage adapter.
 *
 * Abstract interface so we can swap IndexedDB (web) for SQLite (Capacitor)
 * with a single line change. All offline-first logic talks to this interface.
 *
 * Object stores:
 *   - pending_writes:  queue of mutations to flush to Supabase when online.
 *                      key = auto-incrementing id, value = QueuedWrite.
 *   - cached:          generic key/value cache (workouts, exercises, etc.).
 *                      key = string like "workout:<id>" or "exercises:catalog",
 *                      value = { data, cachedAt }.
 *   - metadata:        misc flags (last sync timestamp, user id of cache, etc.).
 */

import type { Database } from "@/integrations/supabase/types";

type WorkoutSetUpdate = Database["public"]["Tables"]["workout_sets"]["Update"];

/** A single mutation queued for sync. */
export type QueuedWrite =
  | {
      kind: "update_set";
      id: string;                  // unique id generated at enqueue time
      setId: string;
      changes: WorkoutSetUpdate;   // partial update payload
      enqueuedAt: number;          // ms since epoch
      attempts: number;            // retry counter
      nextAttemptAt: number;       // ms since epoch
    };

export type CachedEntry<T = unknown> = {
  data: T;
  cachedAt: number;
};

export interface OfflineStorage {
  // Pending writes queue
  enqueue(write: Omit<QueuedWrite, "id" | "enqueuedAt" | "attempts" | "nextAttemptAt"> & Partial<Pick<QueuedWrite, "id">>): Promise<QueuedWrite>;
  listPendingWrites(): Promise<QueuedWrite[]>;
  updatePendingWrite(write: QueuedWrite): Promise<void>;
  removePendingWrite(id: string): Promise<void>;
  countPendingWrites(): Promise<number>;
  clearPendingWrites(): Promise<void>;

  // Generic cache
  cacheGet<T>(key: string): Promise<CachedEntry<T> | null>;
  cacheSet<T>(key: string, data: T): Promise<void>;
  cacheDelete(key: string): Promise<void>;
  cacheClear(): Promise<void>;

  // Metadata (flat KV)
  metaGet<T>(key: string): Promise<T | null>;
  metaSet<T>(key: string, value: T): Promise<void>;
  metaDelete(key: string): Promise<void>;

  // Utility
  isAvailable(): Promise<boolean>;
}

/* ───────── IndexedDB implementation ───────── */

const DB_NAME = "liftory-offline";
const DB_VERSION = 1;
const STORE_PENDING = "pending_writes";
const STORE_CACHE = "cached";
const STORE_META = "metadata";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PENDING)) {
        db.createObjectStore(STORE_PENDING, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        let result: T | undefined;
        Promise.resolve(fn(store))
          .then((maybeReq) => {
            if (maybeReq && typeof (maybeReq as IDBRequest).onsuccess !== "undefined") {
              const req = maybeReq as IDBRequest<T>;
              req.onsuccess = () => { result = req.result; };
              req.onerror = () => reject(req.error);
            } else {
              result = maybeReq as T;
            }
          })
          .catch(reject);
        tx.oncomplete = () => resolve(result as T);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

function genId(): string {
  // crypto.randomUUID is supported in modern browsers + Capacitor WebView
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

class IndexedDBStorage implements OfflineStorage {
  async isAvailable(): Promise<boolean> {
    try {
      await openDb();
      return true;
    } catch {
      return false;
    }
  }

  async enqueue(write: Omit<QueuedWrite, "id" | "enqueuedAt" | "attempts" | "nextAttemptAt"> & Partial<Pick<QueuedWrite, "id">>): Promise<QueuedWrite> {
    const now = Date.now();
    const full: QueuedWrite = {
      id: write.id ?? genId(),
      enqueuedAt: now,
      attempts: 0,
      nextAttemptAt: now,
      ...write,
    };
    await withStore(STORE_PENDING, "readwrite", (s) => s.put(full));
    return full;
  }

  async listPendingWrites(): Promise<QueuedWrite[]> {
    return withStore(STORE_PENDING, "readonly", (s) => s.getAll() as IDBRequest<QueuedWrite[]>);
  }

  async updatePendingWrite(write: QueuedWrite): Promise<void> {
    await withStore(STORE_PENDING, "readwrite", (s) => s.put(write));
  }

  async removePendingWrite(id: string): Promise<void> {
    await withStore(STORE_PENDING, "readwrite", (s) => s.delete(id));
  }

  async countPendingWrites(): Promise<number> {
    return withStore(STORE_PENDING, "readonly", (s) => s.count() as IDBRequest<number>);
  }

  async clearPendingWrites(): Promise<void> {
    await withStore(STORE_PENDING, "readwrite", (s) => s.clear());
  }

  async cacheGet<T>(key: string): Promise<CachedEntry<T> | null> {
    const row = await withStore(STORE_CACHE, "readonly", (s) => s.get(key) as IDBRequest<{ key: string; entry: CachedEntry<T> } | undefined>);
    return row?.entry ?? null;
  }

  async cacheSet<T>(key: string, data: T): Promise<void> {
    const entry: CachedEntry<T> = { data, cachedAt: Date.now() };
    await withStore(STORE_CACHE, "readwrite", (s) => s.put({ key, entry }));
  }

  async cacheDelete(key: string): Promise<void> {
    await withStore(STORE_CACHE, "readwrite", (s) => s.delete(key));
  }

  async cacheClear(): Promise<void> {
    await withStore(STORE_CACHE, "readwrite", (s) => s.clear());
  }

  async metaGet<T>(key: string): Promise<T | null> {
    const row = await withStore(STORE_META, "readonly", (s) => s.get(key) as IDBRequest<{ key: string; value: T } | undefined>);
    return row?.value ?? null;
  }

  async metaSet<T>(key: string, value: T): Promise<void> {
    await withStore(STORE_META, "readwrite", (s) => s.put({ key, value }));
  }

  async metaDelete(key: string): Promise<void> {
    await withStore(STORE_META, "readwrite", (s) => s.delete(key));
  }
}

/** Singleton instance — switch this to SQLiteStorage when we move to Capacitor. */
export const offlineStorage: OfflineStorage = new IndexedDBStorage();
