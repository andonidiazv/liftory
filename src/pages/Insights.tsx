import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import { Lightbulb, Lock, Check, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const CATEGORY_COLORS: Record<string, string> = {
  DESEQUILIBRIO: "rgba(199,91,57,0.15)",
  HRV: "rgba(199,91,57,0.15)",
  TEMPO: "rgba(199,91,57,0.15)",
  VOLUMEN: "rgba(199,91,57,0.15)",
};

const LOCKED_INSIGHTS = [
  {
    id: "imbalance",
    category: "DESEQUILIBRIO",
    title: "Análisis de desequilibrio muscular",
    preview: "Tu pecho está 16% más débil que tu espalda. Esto puede generar compensaciones en press y afectar tu postura a largo plazo.",
    price: "$2 USD",
  },
  {
    id: "hrv",
    category: "HRV",
    title: "Ventana óptima de entrenamiento",
    preview: "Basado en tu HRV de las últimas 2 semanas, tus mejores sesiones ocurren entre las 9am y 11am. Entrenar en esta ventana puede mejorar tu rendimiento.",
    price: "$2 USD",
  },
  {
    id: "tempo",
    category: "TEMPO",
    title: "Análisis de calidad de tempo",
    preview: "Estás perdiendo 23% de tensión mecánica por ejecutar la fase excéntrica demasiado rápido. Controlar el tempo puede acelerar tu hipertrofia.",
    price: "$2 USD",
  },
  {
    id: "volume",
    category: "VOLUMEN",
    title: "Volumen vs recuperación",
    preview: "Tu volumen semanal de pierna excede tu capacidad de recuperación estimada. Reducir 2 series por sesión podría mejorar tu progreso.",
    price: "$2 USD",
  },
];

const MOTIVATIONAL = [
  "Estás a 12 workouts de alcanzar tu objetivo mensual de fuerza.",
  "Usuarios con tu perfil mejoraron sus resultados 34% más rápido con Whoop conectado.",
];

export default function Insights() {
  const navigate = useNavigate();
  const { isPremium } = useAuth();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleUnlock = (insightId: string) => {
    if (!isPremium()) {
      navigate("/paywall");
      return;
    }
    setConfirmId(insightId);
  };

  const handleConfirm = () => {
    toast({
      title: "Integración con Stripe pendiente",
      description: "Esta funcionalidad se conectará próximamente.",
    });
    setConfirmId(null);
  };

  return (
    <Layout>
      <div className="px-5 pt-14 pb-8 stagger-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "rgba(199,91,57,0.12)" }}
          >
            <Lightbulb className="h-5 w-5" style={{ color: "#C75B39" }} />
          </div>
          <div>
            <h1
              className="font-display text-foreground"
              style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em" }}
            >
              Insights
            </h1>
            <p className="font-body text-xs" style={{ color: "#A89F95" }}>
              Análisis personalizados de tu entrenamiento
            </p>
          </div>
        </div>

        {/* Section 1 — Free Insight */}
        <div className="mt-8">
          <span className="eyebrow-label">TU INSIGHT GRATUITO</span>
          <div
            className="mt-4 rounded-xl p-5"
            style={{
              background: "#1A1A1A",
              border: "1px solid #2A2A2A",
            }}
          >
            <span
              className="inline-block rounded-full px-2.5 py-0.5 font-mono"
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#fff",
                background: "#3CB371",
              }}
            >
              GRATIS
            </span>
            <h3
              className="mt-3 font-display text-foreground"
              style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}
            >
              Tu primer análisis
            </h3>
            <p
              className="mt-2 font-body text-sm leading-relaxed"
              style={{ color: "#A89F95" }}
            >
              Basado en tus primeras sesiones, tu volumen de tren superior es
              23% mayor que el inferior. Equilibrar esto mejorará tu rendimiento
              general.
            </p>
            <button
              className="mt-4 flex items-center gap-2 font-body text-sm font-semibold"
              style={{ color: "#C75B39" }}
            >
              Ver completo <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Section 2 — Locked Analytic Insights */}
        <div className="mt-8">
          <span className="eyebrow-label">INSIGHTS ANALÍTICOS</span>
          <div className="mt-4 space-y-4">
            {LOCKED_INSIGHTS.map((insight) => (
              <div
                key={insight.id}
                className="rounded-xl p-5 overflow-hidden"
                style={{
                  background: "#1A1A1A",
                  border: "1px solid #2A2A2A",
                }}
              >
                <span
                  className="inline-block rounded-full px-2.5 py-0.5 font-mono"
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "#C75B39",
                    background: CATEGORY_COLORS[insight.category],
                  }}
                >
                  {insight.category}
                </span>
                <h3
                  className="mt-3 font-display text-foreground"
                  style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}
                >
                  {insight.title}
                </h3>

                {/* Preview with blur fade */}
                <div className="relative mt-2">
                  <p
                    className="font-body text-sm leading-relaxed"
                    style={{ color: "#A89F95" }}
                  >
                    {insight.preview}
                  </p>
                  <div
                    className="absolute bottom-0 left-0 right-0 h-10"
                    style={{
                      background:
                        "linear-gradient(to top, #1A1A1A, transparent)",
                    }}
                  />
                </div>

                <button
                  onClick={() => handleUnlock(insight.id)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 font-body text-sm font-semibold transition-colors"
                  style={{
                    color: "#C75B39",
                    border: "1.5px solid #C75B39",
                    background: "transparent",
                  }}
                >
                  <Lock className="h-3.5 w-3.5" />
                  Desbloquear — {insight.price}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3 — Motivational Insights */}
        <div className="mt-8">
          <span className="eyebrow-label">INSIGHTS MOTIVACIONALES</span>
          <div className="mt-4 space-y-3">
            {MOTIVATIONAL.map((text, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl p-4"
                style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
              >
                <Sparkles
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: "#D4A843" }}
                />
                <p
                  className="font-body text-sm leading-relaxed"
                  style={{ color: "#A89F95" }}
                >
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setConfirmId(null)}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative mx-6 w-full max-w-sm rounded-2xl p-6"
            style={{ background: "#1A1A1A" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="font-display text-foreground text-center"
              style={{ fontSize: 17, fontWeight: 700 }}
            >
              ¿Desbloquear este insight por $2 USD?
            </h3>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 rounded-xl py-3 font-body text-sm font-semibold"
                style={{
                  background: "#2A2A2A",
                  color: "#A89F95",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 rounded-xl py-3 font-body text-sm font-semibold text-foreground"
                style={{ background: "#C75B39" }}
              >
                Desbloquear
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
