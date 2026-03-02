import { useState, useEffect, useRef } from "react";

const MESSAGES = [
  "Analizando tu perfil y objetivos...",
  "Seleccionando ejercicios para tu nivel...",
  "Calibrando pesos e intensidades...",
  "Diseñando tu periodización...",
  "Tu programa está casi listo...",
];

const MIN_DURATION = 8000;
const MSG_INTERVAL = 2000;

interface LoadingScreenProps {
  onComplete: () => void;
  /** Optional message to display when generation couldn't fully complete */
  warningMessage?: string | null;
  /** Promise that resolves when the actual generation is done */
  generationPromise?: Promise<any>;
}

export default function LoadingScreen({ onComplete, warningMessage, generationPromise }: LoadingScreenProps) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);
  const [generationDone, setGenerationDone] = useState(!generationPromise);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const startTime = useRef(Date.now());

  // Wait for generation promise
  useEffect(() => {
    if (generationPromise) {
      generationPromise.then(() => setGenerationDone(true)).catch(() => setGenerationDone(true));
    }
  }, [generationPromise]);

  // Min duration timer
  useEffect(() => {
    const t = setTimeout(() => setMinTimePassed(true), MIN_DURATION);
    return () => clearTimeout(t);
  }, []);

  // Complete when both are done
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
      // Cap at 90% until generation is done
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
      style={{ backgroundColor: "#0F0F0F" }}
    >
      <div
        className="h-12 w-12 rounded-full border-[3px] border-transparent animate-spin"
        style={{ borderTopColor: "#C75B39", borderRightColor: "#C75B39" }}
      />

      <h2
        className="mt-8 text-center font-display"
        style={{ color: "#FFFFFF", fontSize: 22, fontWeight: 700 }}
      >
        Construyendo tu programa
      </h2>

      <div className="mt-4 h-6 relative w-72">
        {MESSAGES.map((msg, i) => (
          <p
            key={i}
            className="absolute inset-0 text-center text-sm font-body transition-opacity duration-500"
            style={{ color: "rgba(255,255,255,0.55)", opacity: i === msgIndex ? 1 : 0 }}
          >
            {msg}
          </p>
        ))}
      </div>

      <div className="mt-10 h-1.5 w-64 overflow-hidden rounded-full" style={{ backgroundColor: "#2A2A2A" }}>
        <div
          className="h-full rounded-full transition-all duration-100 ease-linear"
          style={{ width: `${progress}%`, backgroundColor: "#C75B39" }}
        />
      </div>

      {warningMessage && (
        <p className="mt-6 max-w-xs text-center text-xs font-body" style={{ color: "rgba(255,255,255,0.4)" }}>
          {warningMessage}
        </p>
      )}
    </div>
  );
}
