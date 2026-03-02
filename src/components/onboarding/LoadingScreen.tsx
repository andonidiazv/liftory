import { useState, useEffect, useRef } from "react";

const MESSAGES = [
  "Analizando tu perfil y objetivos...",
  "Seleccionando ejercicios para tu nivel...",
  "Calibrando pesos e intensidades...",
  "Diseñando tu periodización...",
  "Tu programa está casi listo...",
];

const DURATION = 8000;
const MSG_INTERVAL = 2000;

interface LoadingScreenProps {
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex((prev) => (prev < MESSAGES.length - 1 ? prev + 1 : prev));
    }, MSG_INTERVAL);

    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      setProgress(Math.min((elapsed / DURATION) * 100, 100));
    }, 50);

    const finishTimer = setTimeout(() => {
      setFadingOut(true);
      setTimeout(onComplete, 600);
    }, DURATION);

    return () => {
      clearInterval(msgTimer);
      clearInterval(progressTimer);
      clearTimeout(finishTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-500 ${
        fadingOut ? "opacity-0" : "opacity-100"
      }`}
      style={{ backgroundColor: "#0F0F0F" }}
    >
      {/* Spinner */}
      <div
        className="h-12 w-12 rounded-full border-[3px] border-transparent animate-spin"
        style={{
          borderTopColor: "#C75B39",
          borderRightColor: "#C75B39",
        }}
      />

      {/* Title */}
      <h2
        className="mt-8 text-center font-display"
        style={{ color: "#FFFFFF", fontSize: 22, fontWeight: 700 }}
      >
        Construyendo tu programa
      </h2>

      {/* Rotating message */}
      <div className="mt-4 h-6 relative w-72">
        {MESSAGES.map((msg, i) => (
          <p
            key={i}
            className="absolute inset-0 text-center text-sm font-body transition-opacity duration-500"
            style={{
              color: "rgba(255,255,255,0.55)",
              opacity: i === msgIndex ? 1 : 0,
            }}
          >
            {msg}
          </p>
        ))}
      </div>

      {/* Progress bar */}
      <div
        className="mt-10 h-1.5 w-64 overflow-hidden rounded-full"
        style={{ backgroundColor: "#2A2A2A" }}
      >
        <div
          className="h-full rounded-full transition-all duration-100 ease-linear"
          style={{
            width: `${progress}%`,
            backgroundColor: "#C75B39",
          }}
        />
      </div>
    </div>
  );
}
