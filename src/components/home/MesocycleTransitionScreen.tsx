import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const MESSAGES = [
  "Analizando tu rendimiento de las últimas 6 semanas...",
  "Ajustando cargas basadas en tu progreso real...",
  "Seleccionando nuevas variaciones...",
  "Tu próximo mesociclo está listo.",
];

interface MesocycleTransitionScreenProps {
  generationPromise?: Promise<any>;
}

export default function MesocycleTransitionScreen({ generationPromise }: MesocycleTransitionScreenProps) {
  const navigate = useNavigate();
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [generationDone, setGenerationDone] = useState(false);

  // Track generation completion
  useEffect(() => {
    if (generationPromise) {
      generationPromise.then(() => setGenerationDone(true)).catch(() => setGenerationDone(true));
    } else {
      setGenerationDone(true);
    }
  }, [generationPromise]);

  // Rotate messages every 2s
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => Math.min(prev + 1, MESSAGES.length - 1));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Progress bar over 8 seconds
  useEffect(() => {
    const start = Date.now();
    const duration = 8000;
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
      if (elapsed < duration) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  // Redirect when both progress + generation done
  useEffect(() => {
    if (progress >= 100 && generationDone) {
      const timer = setTimeout(() => navigate("/home", { replace: true }), 500);
      return () => clearTimeout(timer);
    }
  }, [progress, generationDone, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>

        <p className="font-mono uppercase text-primary mb-3" style={{ fontSize: 11, letterSpacing: "2.5px" }}>
          MESOCICLO COMPLETADO
        </p>

        <h1 className="text-hero text-foreground font-body font-normal">
          Construyendo tu siguiente bloque...
        </h1>

        <p
          className="mt-6 font-serif italic transition-all duration-500"
          style={{ fontSize: 15, fontWeight: 300, color: "hsl(var(--muted-foreground))", lineHeight: 1.4, minHeight: 44 }}
          key={messageIndex}
        >
          {MESSAGES[messageIndex]}
        </p>

        {/* Progress bar */}
        <div className="mt-8 w-full">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
