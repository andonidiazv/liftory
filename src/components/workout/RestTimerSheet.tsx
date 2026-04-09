import { useState, useEffect, useRef, useCallback } from "react";

interface RestTimerSheetProps {
  durationSeconds: number;
  visible: boolean;
  onDismiss: () => void;
}

const SAFE_VOLUME = 0.15; // hard cap — never exceed

export default function RestTimerSheet({ durationSeconds, visible, onDismiss }: RestTimerSheetProps) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const [total, setTotal] = useState(durationSeconds);
  const [flash, setFlash] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const endTimeRef = useRef<number>(0); // timestamp (ms) when timer should hit 0

  // Helper: get or create AudioContext
  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }, []);

  // Helper: play a single tick beep (countdown style)
  const playTick = useCallback(() => {
    try {
      const ctx = getAudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 880; // A5 — same as EMOM countdown
      gain.gain.setValueAtTime(SAFE_VOLUME, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {}
  }, [getAudioCtx]);

  // Helper: play double beep for timer complete
  const playFinishBeep = useCallback(() => {
    try {
      const ctx = getAudioCtx();
      const now = ctx.currentTime;
      for (let i = 0; i < 2; i++) {
        const t = now + i * 0.15;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = 1046.5; // C6 — same as EMOM
        gain.gain.setValueAtTime(SAFE_VOLUME, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.start(t);
        osc.stop(t + 0.13);
      }
    } catch {}
  }, [getAudioCtx]);

  // Reset state when timer becomes visible — set absolute end time
  useEffect(() => {
    if (visible) {
      endTimeRef.current = Date.now() + durationSeconds * 1000;
      setRemaining(durationSeconds);
      setTotal(durationSeconds);
      setFlash(false);
      setDone(false);
    }
  }, [visible, durationSeconds]);

  // Main countdown — uses absolute time so it survives app switching
  useEffect(() => {
    if (!visible || done) return;

    const tick = () => {
      const now = Date.now();
      const msLeft = endTimeRef.current - now;
      const secsLeft = Math.max(0, Math.ceil(msLeft / 1000));
      setRemaining(secsLeft);
    };

    // Immediately sync on mount (catches up if we were in background)
    tick();

    intervalRef.current = setInterval(tick, 250); // 4x/sec for smoother catch-up

    // Also sync when page regains visibility (user comes back from WhatsApp etc)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [visible, done]);

  // Countdown beeps for last 5 seconds (5, 4, 3, 2, 1)
  useEffect(() => {
    if (!visible || remaining > 5 || remaining <= 0 || done) return;
    playTick();
    try { navigator.vibrate?.(3); } catch {}
  }, [remaining, visible, done, playTick]);

  // When timer hits 0 — finish beep + enter done state
  useEffect(() => {
    if (remaining !== 0 || !visible || done) return;

    // Vibrate
    try { navigator.vibrate?.([80, 50, 80]); } catch {}

    // Finish beep
    playFinishBeep();

    // Flash once
    setFlash(true);
    setTimeout(() => setFlash(false), 300);

    // Enter done/pulsing state
    setDone(true);

    // Auto-close after 5 seconds of pulsing
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [remaining, visible, done, onDismiss, playFinishBeep]);

  const addTime = useCallback(() => {
    // Extend the absolute end time by 15 seconds
    endTimeRef.current += 15 * 1000;
    setTotal((p) => p + 15);
    setRemaining((p) => p + 15);
    setDone(false);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  if (!visible) return null;

  const progress = total > 0 ? remaining / total : 0;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[70] animate-slide-up"
      style={{ touchAction: "none" }}
      onTouchStart={(e) => {
        const startY = e.touches[0].clientY;
        const handleMove = (ev: TouchEvent) => {
          if (ev.touches[0].clientY - startY > 60) {
            onDismiss();
            document.removeEventListener("touchmove", handleMove);
          }
        };
        document.addEventListener("touchmove", handleMove, { passive: true });
        document.addEventListener("touchend", () => document.removeEventListener("touchmove", handleMove), { once: true });
      }}
    >
      <div
        className="rounded-t-2xl px-6 pb-8 pt-4 transition-colors duration-200"
        style={{
          backgroundColor: flash ? "hsl(var(--primary))" : "hsl(var(--card))",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
          height: 180,
          animation: done ? "rest-pulse 1s ease-in-out infinite" : undefined,
        }}
      >
        {/* Pulse animation for done state */}
        <style>{`
          @keyframes rest-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
        `}</style>

        {/* Drag handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/30" />

        <div className="flex items-center justify-between">
          <button
            onClick={onDismiss}
            className="font-body text-sm text-muted-foreground"
          >
            {done ? "Cerrar" : "Saltar"}
          </button>
          <p className="font-body text-sm text-muted-foreground">
            {done ? "Listo" : "Descanso"}
          </p>
          <button
            onClick={addTime}
            className="font-body text-sm font-medium text-primary"
          >
            +15s
          </button>
        </div>

        {/* Countdown */}
        <p
          className="mt-2 text-center font-mono font-bold"
          style={{
            fontSize: 48,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            color: done
              ? "hsl(var(--primary))"
              : remaining <= 5 && remaining > 0
                ? "hsl(var(--primary))"
                : "hsl(var(--foreground))",
          }}
        >
          {formatTime(remaining)}
        </p>

        {/* Progress bar */}
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full" style={{ backgroundColor: "hsl(var(--border))" }}>
          <div
            className="h-full rounded-full bg-primary transition-all duration-1000 linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
