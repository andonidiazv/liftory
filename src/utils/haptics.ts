/**
 * Lightweight haptic feedback for scroll pickers.
 *
 * - Android / Chrome: navigator.vibrate() — real vibration
 * - iOS Safari: no web API for haptics exists — noop until
 *   the app is wrapped with Capacitor (native bridge).
 *
 * Throttled to max one tick per 30ms.
 */

let lastTick = 0;

/** Light haptic tick — call on each snap boundary crossing */
export function hapticTick(): void {
  const now = performance.now();
  if (now - lastTick < 30) return;
  lastTick = now;

  if (navigator.vibrate) {
    navigator.vibrate(3);
  }
}

/** No-op — kept for API compatibility. Will be needed for Capacitor. */
export function unlockHaptics(): void {
  // noop in web — Capacitor will use @capacitor/haptics here
}
