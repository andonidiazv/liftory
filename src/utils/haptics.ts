/**
 * Lightweight haptic feedback for scroll pickers.
 * - Android / Chrome: uses navigator.vibrate()
 * - All platforms: plays a near-silent AudioContext "tick" that triggers
 *   the device's taptic engine on supported hardware (iOS Safari 13+).
 *
 * The tick is throttled so rapid-fire calls (fast scrolling) don't
 * queue up dozens of vibrations — at most one tick per 30ms.
 */

let lastTick = 0;
let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (audioCtx) return audioCtx;
  try {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return audioCtx;
  } catch {
    return null;
  }
}

/** Light haptic tick — call on each snap boundary crossing */
export function hapticTick(): void {
  const now = performance.now();
  if (now - lastTick < 30) return; // throttle
  lastTick = now;

  // Android vibration
  if (navigator.vibrate) {
    navigator.vibrate(3);
  }

  // AudioContext tick (iOS taptic fallback + audible-silent confirmation)
  const ctx = getAudioCtx();
  if (ctx && ctx.state === "running") {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0.01; // near-silent
    osc.frequency.value = 150;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.003); // 3ms pulse
  }
}

/**
 * Must be called from a user gesture (tap/click) to unlock AudioContext
 * on iOS Safari. Call once when the picker sheet opens.
 */
export function unlockHaptics(): void {
  const ctx = getAudioCtx();
  if (ctx && ctx.state === "suspended") {
    ctx.resume();
  }
}
