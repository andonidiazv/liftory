import { useEffect, useRef } from "react";

/**
 * Keep the screen awake while a timer is running.
 *
 * Uses the Screen Wake Lock API (Chrome + iOS 16.4+). When `active` is true, we
 * request the lock; when it goes false or the component unmounts, we release.
 *
 * If the tab loses visibility, the browser auto-releases the lock — we
 * re-acquire it on visibility return so a quick check-in on WhatsApp doesn't
 * kill the wake state.
 *
 * If the API is unavailable, the hook silently no-ops (the app still works,
 * just without the wake benefit — same behavior as before).
 */
export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    if (!active) return;

    let released = false;

    const acquire = async () => {
      if (released) return;
      const wakeLock = (navigator as Navigator & { wakeLock?: { request(type: "screen"): Promise<WakeLockSentinel> } }).wakeLock;
      if (!wakeLock) return; // API unavailable — nothing to do
      try {
        const sentinel = await wakeLock.request("screen");
        if (released) {
          sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
        // If iOS/Chrome auto-releases (background, screen off), re-arm so the
        // next visibility return re-acquires cleanly.
        sentinel.addEventListener("release", () => {
          if (sentinelRef.current === sentinel) sentinelRef.current = null;
        });
      } catch {
        // Permission denied or transient failure — silent fail.
      }
    };

    acquire();

    // Re-acquire on tab visibility return (auto-released on background)
    const onVisibility = () => {
      if (document.visibilityState === "visible" && !sentinelRef.current && activeRef.current) {
        acquire();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisibility);
      const s = sentinelRef.current;
      sentinelRef.current = null;
      if (s) s.release().catch(() => {});
    };
  }, [active]);
}

// Minimal shape — some TS libs don't ship WakeLockSentinel yet.
interface WakeLockSentinel extends EventTarget {
  release(): Promise<void>;
}
