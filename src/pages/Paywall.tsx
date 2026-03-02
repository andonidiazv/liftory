import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Check, Dumbbell, Calendar, Trophy, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const PLANS = [
  { id: "monthly", label: "Mensual", price: "$14.99", perMonth: "$14.99/mes", oldPrice: null as string | null, badge: null as string | null, badgeColor: "" },
  { id: "semiannual", label: "Semestral", price: "$12.49", perMonth: "$12.49/mes", oldPrice: "$14.99/mes", badge: "AHORRA 15%", badgeColor: "#C75B39" },
  { id: "annual", label: "Anual", price: "$10.99", perMonth: "$10.99/mes", oldPrice: "$14.99/mes", badge: "MEJOR VALOR — 25% OFF", badgeColor: "#D4A843" },
];

const METRICS = [
  { value: "5", label: "completados", suffix: " workouts", icon: Check },
  { value: "2,450", label: "volumen total", suffix: " kg", icon: Dumbbell },
  { value: "83", label: "consistencia", suffix: "%", icon: Calendar },
  { value: "2", label: "registrados", suffix: " PRs", icon: Trophy },
];

export default function Paywall() {
  const navigate = useNavigate();
  const { isExpired, daysLeftInTrial } = useAuth();
  const [selected, setSelected] = useState("semiannual");

  const expired = isExpired();
  const trialDays = Math.max(1, 6 - daysLeftInTrial());

  const handleCTA = () => {
    toast({ title: "Integración con Stripe pendiente", description: "Esta funcionalidad se conectará próximamente." });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0F0F0F" }}>
      {/* Header */}
      <div className="relative px-5 pt-14 pb-2">
        {!expired && (
          <button
            onClick={() => navigate("/home")}
            className="absolute right-5 top-14 flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: "#1A1A1A" }}
          >
            <X className="h-4 w-4 text-foreground" />
          </button>
        )}
        <h1 className="text-center font-display text-foreground" style={{ fontSize: 20, fontWeight: 700 }}>
          Tu progreso en {trialDays} días
        </h1>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 px-5 mt-6">
        {METRICS.map((m) => (
          <div key={m.label} className="flex flex-col items-center rounded-xl p-4" style={{ background: "#1A1A1A" }}>
            <m.icon className="h-5 w-5 mb-2" style={{ color: "#C75B39" }} />
            <span className="font-mono text-foreground" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
              {m.value}<span style={{ fontSize: 16 }}>{m.suffix.includes("%") ? "%" : ""}</span>
            </span>
            <span className="font-mono mt-1" style={{ fontSize: 12, color: "#A89F95", letterSpacing: "0.05em" }}>
              {m.suffix.includes("%") ? m.label : `${m.suffix.trim()} ${m.label}`}
            </span>
          </div>
        ))}
      </div>

      {/* Main Message */}
      <p className="text-center px-8 font-display text-foreground" style={{ fontSize: 18, fontWeight: 600, padding: "24px 32px" }}>
        Lo que construiste en {trialDays} días es tuyo. Continúa.
      </p>

      {/* Plans */}
      <div className="flex gap-3 px-5">
        {PLANS.map((plan) => {
          const active = selected === plan.id;
          const featured = plan.id === "semiannual";
          return (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className="flex-1 flex flex-col items-center rounded-xl p-4 transition-all"
              style={{
                background: active ? "rgba(199,91,57,0.08)" : "#1A1A1A",
                border: `1.5px solid ${active ? "#C75B39" : "#2A2A2A"}`,
                transform: featured ? "scale(1.02)" : undefined,
              }}
            >
              {plan.badge && (
                <span
                  className="mb-2 rounded-full px-2 py-0.5 font-mono"
                  style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "#fff", background: plan.badgeColor }}
                >
                  {plan.badge}
                </span>
              )}
              <span className="font-body text-foreground" style={{ fontSize: 13, fontWeight: 600 }}>{plan.label}</span>
              <span className="font-mono text-foreground mt-2" style={{ fontSize: 20, fontWeight: 700 }}>{plan.price}</span>
              <span className="font-mono" style={{ fontSize: 11, color: "#A89F95" }}>/mes</span>
              {plan.oldPrice && (
                <span className="mt-1 line-through font-mono" style={{ fontSize: 11, color: "#6B6360" }}>{plan.oldPrice}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* CTA */}
      <div className="px-5 mt-8">
        <button
          onClick={handleCTA}
          className="w-full rounded-xl font-body text-foreground"
          style={{ background: "#C75B39", padding: 16, fontSize: 16, fontWeight: 700 }}
        >
          Continuar construyendo
        </button>
      </div>

      {/* Footer */}
      <p className="text-center mt-6 mb-8 px-5" style={{ fontSize: 11, color: "#6B6360" }}>
        Cancela cuando quieras. Tu progreso siempre se preserva.
      </p>
    </div>
  );
}
