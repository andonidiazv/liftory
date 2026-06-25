import { useState, useEffect, useRef, useCallback } from "react";
import { playTick, playFinishBeep, unlockAudio } from "@/lib/audio";

interface RestTimerSheetProps {
  durationSeconds: number;
  visible: boolean;
  onDismiss: () => void;
  /** Optional absolute end timestamp (ms). When provided, overrides durationSeconds
   *  and resumes an existing timer (e.g. after a page reload). */
  initialEndTime?: number | null;
  /** Called when the timer is (re)started so parent can persist endTime. */
  onTimerStart?: (endTime: number) => void;
}

export default function RestTimerSheet({
  durationSeconds,
  visible,
  onDismiss,
  initialEndTime,
  onTimerStart,
}: RestTimerSheetProps) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const [total, setTotal] = useState(durationSeconds);
  const [flash, setFlash] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number>(0); // absolute timestamp (ms) when timer should hit 0
  const lastBeepSecRef = useRef<number>(-1); // dedupe beeps if tick fires multiple times
  const wasVisibleRef = useRef(false); // tracks false→true transitions so we only init once per session

  // Initialize the timer ONCE per visible session (and on remounts while visible).
  // We intentionally do NOT re-init when initialEndTime changes mid-session,
  // because +15s updates the parent's endTime and we don't want that to reset local state.
  useEffect(() => {
    if (!visible) {
      wasVisibleRef.current = false;
      return;
    }
    if (wasVisibleRef.current) return; // already initialized this session
    wasVisibleRef.current = true;

    // Unlock audio as a safety net (parent should have unlocked via tap already)
    unlockAudio();

    if (initialEndTime && initialEndTime > Date.now()) {
      // Resume existing timer (remount after refetch/loading, page reload, etc.)
      endTimeRef.current = initialEndTime;
      const msLeft = initialEndTime - Date.now();
      const secsLeft = Math.max(0, Math.ceil(msLeft / 1000));
      setRemaining(secsLeft);
      setTotal(durationSeconds);
    } else if (initialEndTime != null) {
      // initialEndTime exists but already expired — the timer ran out while the
      // athlete was away. Dismiss instead of creating a fresh full-duration
      // timer (that was Víctor's "timer reinicia al volver" bug).
      onDismiss();
      return;
    } else {
      const end = Date.now() + durationSeconds * 1000;
      endTimeRef.current = end;
      setRemaining(durationSeconds);
      setTotal(durationSeconds);
      onTimerStart?.(end);
    }
    setFlash(false);
    setDone(false);
    lastBeepSecRef.current = -1;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, durationSeconds, initialEndTime]);

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
    if (lastBeepSecRef.current === remaining) return; // dedupe
    lastBeepSecRef.current = remaining;
    playTick();
    try { navigator.vibrate?.(3); } catch {}
  }, [remaining, visible, done]);

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
  }, [remaining, visible, done, onDismiss]);

  const addTime = useCallback(() => {
    // Extend the absolute end time by 15 seconds
    endTimeRef.current += 15 * 1000;
    onTimerStart?.(endTimeRef.current);
    setTotal((p) => p + 15);
    setRemaining((p) => p + 15);
    setDone(false);
  }, [onTimerStart]);

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
        className="px-6 pb-8 pt-4 transition-colors duration-200"
        style={{
          background: flash ? "#C4A24E" : "#15151A",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTop: "1px solid hsl(var(--border))",
          height: 180,
          animation: done ? "rest-pulse 1s ease-in-out infinite" : undefined,
        }}
      >
        <style>{`
          @keyframes rest-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.65; }
          }
        `}</style>

        {/* Drag handle */}
        <div className="mx-auto mb-4 h-0.5 w-9 rounded-full" style={{ background: "hsl(var(--muted-foreground))", opacity: 0.4 }} />

        <div className="flex items-center justify-between">
          <button
            onClick={onDismiss}
            className="press-scale font-mono uppercase"
            style={{ fontSize: 10, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
          >
            {done ? "Cerrar" : "Saltar"}
          </button>
          <p
            className="font-mono uppercase"
            style={{ fontSize: 10, letterSpacing: "3px", color: done ? "#C4A24E" : "hsl(var(--muted-foreground))" }}
          >
            {done ? "Listo" : "Descanso"}
          </p>
          <button
            onClick={addTime}
            className="press-scale font-mono uppercase"
            style={{ fontSize: 10, letterSpacing: "2.5px", color: "#C4A24E", fontWeight: 600 }}
          >
            +15s
          </button>
        </div>

        {/* Countdown — Syne 300 light */}
        <p
          className="mt-3 text-center font-display tabular-nums"
          style={{
            fontWeight: 300,
            fontSize: 56,
            lineHeight: 1,
            letterSpacing: "-0.05em",
            color: done
              ? "#C4A24E"
              : remaining <= 5 && remaining > 0
                ? "#C4A24E"
                : "hsl(var(--foreground))",
          }}
        >
          {formatTime(remaining)}
        </p>

        {/* Progress hairline */}
        <div className="mt-4 h-px w-full overflow-hidden" style={{ background: "hsl(var(--border))", opacity: 0.5 }}>
          <div
            className="h-full transition-all duration-1000 linear"
            style={{ width: `${progress * 100}%`, background: "#C4A24E" }}
          />
        </div>
      </div>
    </div>
  );
}
