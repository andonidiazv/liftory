/**
 * Sync queue: persist mutations offline, drain to Supabase when online.
 *
 * - Writes go through `enqueueWrite()` — they're persisted to IndexedDB
 *   (so they survive app close / browser crash / OS kill).
 * - `processQueue()` drains the queue. Called automatically on online events
 *   and on demand. Retries with exponential backoff on per-row failure.
 * - UI subscribes to the queue's state via `subscribe()` to render an indicator.
 *
 * State machine for the indicator:
 *   - idle:        no pending writes, last sync OK
 *   - syncing:     processing the queue right now
 *   - pending:     N writes waiting (offline, or transient errors)
 *   - error:       repeated failures even with network — needs attention
 */

import { supabase } from "@/integrations/supabase/client";
import { offlineStorage, type QueuedWrite } from "@/lib/offlineStorage";

export type SyncState =
  | { kind: "idle" }
  | { kind: "syncing"; pending: number }
  | { kind: "pending"; pending: number }
  | { kind: "error"; pending: number; lastError: string };

type Listener = (state: SyncState) => void;

/** Backoff schedule: 1s, 3s, 10s, 30s, 60s, then capped at 60s. */
function nextDelayMs(attempts: number): number {
  const schedule = [1000, 3000, 10000, 30000, 60000];
  return schedule[Math.min(attempts, schedule.length - 1)];
}

class SyncQueueManager {
  private listeners = new Set<Listener>();
  private state: SyncState = { kind: "idle" };
  private processing = false;
  private rescheduleTimer: ReturnType<typeof setTimeout> | null = null;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => { this.listeners.delete(listener); };
  }

  private emit(next: SyncState) {
    this.state = next;
    for (const l of this.listeners) l(next);
  }

  getState(): SyncState {
    return this.state;
  }

  async enqueueWrite(input: { kind: "update_set"; setId: string; changes: QueuedWrite["changes"] }): Promise<void> {
    await offlineStorage.enqueue(input);
    const pending = await offlineStorage.countPendingWrites();
    this.emit({ kind: "pending", pending });
    // Try to drain right away — if offline the supabase call will fail
    // and we'll reschedule with backoff.
    void this.processQueue();
  }

  /**
   * Drain pending writes. Safe to call concurrently — guarded by `processing`.
   * For each write: try the Supabase update. On success, remove from queue.
   * On failure: increment attempts, set nextAttemptAt with backoff.
   */
  async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    if (this.rescheduleTimer) {
      clearTimeout(this.rescheduleTimer);
      this.rescheduleTimer = null;
    }

    try {
      const writes = await offlineStorage.listPendingWrites();
      if (writes.length === 0) {
        this.emit({ kind: "idle" });
        return;
      }
      this.emit({ kind: "syncing", pending: writes.length });

      const now = Date.now();
      const due = writes.filter((w) => w.nextAttemptAt <= now);
      let earliestNext = Infinity;
      let lastError: string | null = null;

      for (const write of due) {
        try {
          await this.applyWrite(write);
          await offlineStorage.removePendingWrite(write.id);
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          const attempts = write.attempts + 1;
          const delay = nextDelayMs(attempts);
          const updated: QueuedWrite = {
            ...write,
            attempts,
            nextAttemptAt: Date.now() + delay,
          };
          await offlineStorage.updatePendingWrite(updated);
          earliestNext = Math.min(earliestNext, updated.nextAttemptAt);
        }
      }

      // Anything still scheduled in the future → reschedule a process pass
      const remaining = await offlineStorage.listPendingWrites();
      const pending = remaining.length;
      if (pending === 0) {
        this.emit({ kind: "idle" });
        return;
      }

      // Schedule the next pass at the earliest nextAttemptAt
      const nextRun = Math.min(
        ...remaining.map((w) => w.nextAttemptAt),
        earliestNext === Infinity ? Date.now() + 60000 : earliestNext
      );
      const delay = Math.max(500, nextRun - Date.now());
      this.rescheduleTimer = setTimeout(() => {
        this.rescheduleTimer = null;
        void this.processQueue();
      }, delay);

      // Surface error state only after a couple of failed attempts to avoid
      // flicker when the network briefly drops.
      const maxAttempts = Math.max(...remaining.map((w) => w.attempts));
      if (maxAttempts >= 3 && lastError) {
        this.emit({ kind: "error", pending, lastError });
      } else {
        this.emit({ kind: "pending", pending });
      }
    } finally {
      this.processing = false;
    }
  }

  private async applyWrite(write: QueuedWrite): Promise<void> {
    if (write.kind === "update_set") {
      const { error } = await supabase
        .from("workout_sets")
        .update(write.changes)
        .eq("id", write.setId);
      if (error) throw new Error(error.message);
      return;
    }
    throw new Error(`Unknown write kind: ${(write as { kind: string }).kind}`);
  }

  async drainOnReconnect(): Promise<void> {
    // Reset retry timers so all pending writes are eligible immediately.
    const writes = await offlineStorage.listPendingWrites();
    const now = Date.now();
    for (const w of writes) {
      if (w.nextAttemptAt > now) {
        await offlineStorage.updatePendingWrite({ ...w, nextAttemptAt: now });
      }
    }
    void this.processQueue();
  }
}

export const syncQueue = new SyncQueueManager();

if (typeof window !== "undefined") {
  // When connectivity returns, drain immediately.
  window.addEventListener("online", () => { void syncQueue.drainOnReconnect(); });
  // Also try once on load in case the app was closed with pending writes.
  window.addEventListener("load", () => { void syncQueue.processQueue(); });
}
