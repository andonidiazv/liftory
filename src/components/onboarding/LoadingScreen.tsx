import { useState, useEffect, useRef } from "react";

const MESSAGES = [
  "Construyendo tu programa...",
  "6 semanas de periodización inteligente...",
  "Cada sesión diseñada por expertos...",
  "Tu mesociclo está listo.",
];

const MIN_DURATION = 6000;
const MSG_INTERVAL = 1500;

interface LoadingScreenProps {
  onComplete: () => void;
  warningMessage?: string | null;
  generationPromise?: Promise<unknown>;
}

export default function LoadingScreen({ onComplete, warningMessage, generationPromise }: LoadingScreenProps) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);
  const [generationDone, setGenerationDone] = useState(!generationPromise);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const startTime = useRef(Date.now());

  useEffect(() => {
    if (generationPromise) {
      generationPromise.then(() => setGenerationDone(true)).catch(() => setGenerationDone(true));
    }
  }, [generationPromise]);

  useEffect(() => {
    const t = setTimeout(() => setMinTimePassed(true), MIN_DURATION);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (generationDone && minTimePassed && !fadingOut) {
      setFadingOut(true);
      setTimeout(onComplete, 600);
    }
  }, [generationDone, minTimePassed, fadingOut, onComplete]);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex((prev) => (prev < MESSAGES.length - 1 ? prev + 1 : prev));
    }, MSG_INTERVAL);

    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      const maxPct = generationDone ? 100 : 90;
      setProgress(Math.min((elapsed / MIN_DURATION) * 100, maxPct));
    }, 50);

    return () => {
      clearInterval(msgTimer);
      clearInterval(progressTimer);
    };
  }, [generationDone]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-500 ${
        fadingOut ? "opacity-0" : "opacity-100"
      }`}
      style={{ backgroundColor: "hsl(var(--background))" }}
    >
      {/* Wordmark */}
      <h1
        className="font-display font-bold tracking-tight"
        style={{ fontSize: 28, color: "hsl(var(--primary))", letterSpacing: "-0.03em" }}
      >
        LIFTORY
      </h1>

      {/* Spinner */}
      <div
        className="mt-8 h-10 w-10 rounded-full border-[3px] border-transparent animate-spin"
        style={{ borderTopColor: "hsl(var(--primary))", borderRightColor: "hsl(var(--primary))" }}
      />

      {/* Rotating messages */}
      <div className="mt-6 h-6 relative w-72">
        {MESSAGES.map((msg, i) => (
          <p
            key={i}
            className="absolute inset-0 text-center font-body transition-opacity duration-500"
            style={{ fontSize: 14, color: "hsl(var(--muted-foreground))", opacity: i === msgIndex ? 1 : 0 }}
          >
            {msg}
          </p>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mt-10 h-1.5 w-64 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {warningMessage && (
        <p className="mt-6 max-w-xs text-center text-xs font-body text-muted-foreground" style={{ opacity: 0.6 }}>
          {warningMessage}
        </p>
      )}
    </div>
  );
}
