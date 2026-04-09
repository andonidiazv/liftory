import { useState, useEffect, useRef, useCallback } from "react";

interface RestTimerSheetProps {
  durationSeconds: number;
  visible: boolean;
  onDismiss: () => void;
}

export default function RestTimerSheet({ durationSeconds, visible, onDismiss }: RestTimerSheetProps) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const [total, setTotal] = useState(durationSeconds);
  const [flash, setFlash] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (visible) {
      setRemaining(durationSeconds);
      setTotal(durationSeconds);
      setFlash(false);
    }
  }, [visible, durationSeconds]);

  useEffect(() => {
    if (!visible || remaining <= 0) return;
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [visible, remaining > 0]); // eslint-disable-line

  // When timer hits 0 — safe audio with gain ramping (no harsh pops)
  useEffect(() => {
    if (remaining !== 0 || !visible) return;
    // Vibrate
    try { navigator.vibrate?.([80, 50, 80]); } catch {}
    // Sound — premium beep with proper gain envelope
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      // Resume if suspended (critical for iOS)
      if (ctx.state === "suspended") ctx.resume();

      const now = ctx.currentTime;
      const SAFE = 0.15; // hard volume cap — never exceed
      // Double beep for rest complete (similar to EMOM ronda beep)
      for (let i = 0; i < 2; i++) {
        const t = now + i * 0.15;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = 1046.5; // C6 — same as EMOM
        gain.gain.setValueAtTime(SAFE, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.start(t);
        osc.stop(t + 0.13);
      }
    } catch {}
    // Flash
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
    // Auto-close
    const t = setTimeout(onDismiss, 1500);
    return () => clearTimeout(t);
  }, [remaining, visible, onDismiss]);

  const addTime = useCallback(() => {
    setRemaining((p) => p + 15);
    setTotal((p) => p + 15);
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
        }}
      >
        {/* Drag handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/30" />

        <div className="flex items-center justify-between">
          <button
            onClick={onDismiss}
            className="font-body text-sm text-muted-foreground"
          >
            Saltar
          </button>
          <p className="font-body text-sm text-muted-foreground">Descanso</p>
          <button
            onClick={addTime}
            className="font-body text-sm font-medium text-primary"
          >
            +15s
          </button>
        </div>

        {/* Countdown */}
        <p
          className="mt-2 text-center font-mono font-bold text-foreground"
          style={{ fontSize: 48, lineHeight: 1, letterSpacing: "-0.02em" }}
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
