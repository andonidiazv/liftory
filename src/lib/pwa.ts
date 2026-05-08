/**
 * PWA service worker registration with auto-update + kill switch.
 *
 * The SW does two things (see src/sw.ts):
 *   1. Web Push notifications (preserved from the legacy /sw.js).
 *   2. Offline asset precache (Sprint 3).
 *
 * Auto-update flow: registerType 'autoUpdate' from vite-plugin-pwa hands us a
 * Workbox `Workbox` instance. When a new deploy ships:
 *   - Workbox detects the SW source changed.
 *   - The new SW installs in the background.
 *   - On the next page visit (after the user closes/reopens), it activates.
 *
 * Kill switch: setting `LIFTORY_DISABLE_SW` in localStorage to "1" will
 * unregister the active SW and never re-register. Useful if a bad deploy
 * caches a broken bundle and we need to bail out — instructions can be
 * shipped via email/chat ("paste this in the URL bar").
 */

const KILL_SWITCH_KEY = "LIFTORY_DISABLE_SW";

export async function registerPwaServiceWorker(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  // Kill switch: if a prior deploy has burned someone, they can opt out.
  if (localStorage.getItem(KILL_SWITCH_KEY) === "1") {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) await reg.unregister();
      console.warn("[PWA] kill switch active — service worker(s) unregistered");
    } catch { /* noop */ }
    return;
  }

  // Don't register a SW in dev — HMR works better without one.
  if (import.meta.env.DEV) return;

  try {
    // Dynamically import the virtual entry only in production builds where the
    // plugin generates it. This avoids breaking dev mode (no virtual module).
    const { registerSW } = await import("virtual:pwa-register");
    registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, registration) {
        // Periodically check for updates. Silent — no popups.
        if (registration) {
          setInterval(() => {
            registration.update().catch(() => {});
          }, 60 * 60 * 1000); // every hour
        }
      },
      onOfflineReady() {
        // First-load offline-ready signal — could surface a tiny toast,
        // but we keep it silent to match Sprint 1+2 polish.
      },
      onNeedRefresh() {
        // A new SW is waiting. Don't prompt — let it activate on next visit.
        // Auto-skip-waiting is handled in src/sw.ts (`self.skipWaiting()`).
      },
    });
  } catch (err) {
    // virtual:pwa-register isn't generated in dev; this is expected.
    if (import.meta.env.PROD) console.warn("[PWA] registration failed:", err);
  }
}

/** Console helper users can call to nuke their SW state on any device. */
if (typeof window !== "undefined") {
  (window as unknown as { __liftoryDisablePwa: () => Promise<void> }).__liftoryDisablePwa = async () => {
    localStorage.setItem(KILL_SWITCH_KEY, "1");
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) await reg.unregister();
    }
    console.warn("[PWA] disabled. Reload the page.");
  };
}
