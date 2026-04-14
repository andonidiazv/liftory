/* ─── shared audio engine ───
 *
 * iOS Safari blocks AudioContext playback unless it is created + resumed
 * inside a user-gesture handler. This module exposes a single unlocked
 * AudioContext shared across features (rest timer, EMOM, etc.).
 *
 * Usage:
 *   - Call `unlockAudio()` from ANY synchronous user-gesture handler early
 *     in the workout flow (tap-to-start, tap-to-complete-set, etc.).
 *     It's idempotent — calling it many times is safe.
 *   - Call `playTick()` / `playFinishBeep()` anywhere; they will be audible
 *     once audio has been unlocked at least once.
 */

const SAFE_VOLUME = 0.15; // hard cap — never exceed

let ctxSingleton: AudioContext | null = null;
let unlocked = false;

function createSilentBuffer(ctx: AudioContext): AudioBuffer {
  return ctx.createBuffer(1, 1, ctx.sampleRate);
}

export function unlockAudio(): void {
  if (unlocked && ctxSingleton && ctxSingleton.state !== "closed") {
    // Already unlocked — just ensure it's resumed
    if (ctxSingleton.state === "suspended") ctxSingleton.resume().catch(() => {});
    return;
  }
  try {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return;
    const ctx: AudioContext = ctxSingleton ?? new Ctor();
    ctxSingleton = ctx;

    // Play a silent buffer to permanently unlock the audio pipeline on iOS
    const source = ctx.createBufferSource();
    source.buffer = createSilentBuffer(ctx);
    source.connect(ctx.destination);
    source.start(0);

    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    unlocked = true;
  } catch {
    // AudioContext unavailable — silent fail; vibration still works
  }
}

function getCtx(): AudioContext | null {
  if (!ctxSingleton) {
    try {
      const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (Ctor) ctxSingleton = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctxSingleton?.state === "suspended") ctxSingleton.resume().catch(() => {});
  return ctxSingleton;
}

/** Single countdown tick — same 880Hz as EMOM */
export function playTick(): void {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880; // A5
    gain.gain.setValueAtTime(SAFE_VOLUME, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.start(now);
    osc.stop(now + 0.13);
  } catch {}
}

/** Micro-click for set completion — subtle tactile feedback for iOS */
export function playSetClick(): void {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 440; // A4
    gain.gain.setValueAtTime(0.03, now); // very quiet — tactile, not audible
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);
    osc.start(now);
    osc.stop(now + 0.01);
  } catch {}
}

/** Double finish beep — same 1046.5Hz as EMOM */
export function playFinishBeep(): void {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.15;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 1046.5; // C6
      gain.gain.setValueAtTime(SAFE_VOLUME, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.start(t);
      osc.stop(t + 0.13);
    }
  } catch {}
}
