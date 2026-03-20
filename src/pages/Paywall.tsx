import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Target, Play, TrendingUp, Check } from "lucide-react";
import { toast } from "sonner";

const MONTHLY_PRICE = "price_1TD5ll0XOkcK4IZPIGWDFpUX";
const SEMIANNUAL_PRICE = "price_1TD5kI0XOkcK4IZPiI7dsbJO";
const ANNUAL_PRICE = "price_1TD5lM0XOkcK4IZPqQudTkwk";

type Plan = "monthly" | "semiannual" | "annual";

export default function Paywall() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, refreshProfile, isAdmin, hasOnboarded } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("annual");
  const [loading, setLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const isSuccess = searchParams.get("success") === "true";

  useEffect(() => {
    if (!isSuccess || !user) return;
    setCheckingPayment(true);
    const checkSub = async () => {
      try {
        await supabase.functions.invoke("check-subscription");
        await refreshProfile();
      } catch (e) {
        console.error("Error checking subscription:", e);
      }
      setCheckingPayment(false);
    };
    const timer = setTimeout(checkSub, 2000);
    return () => clearTimeout(timer);
  }, [isSuccess, user, refreshProfile]);

  useEffect(() => {
    if (profile?.subscription_status === "active") {
      if (!hasOnboarded()) {
        navigate("/onboarding", { replace: true });
      } else {
        navigate("/home", { replace: true });
      }
    }
  }, [profile?.subscription_status, navigate, hasOnboarded]);

  const handleSubscribe = async () => {
    if (!user) { navigate("/login"); return; }
    setLoading(true);
    try {
      const priceMap: Record<Plan, string> = {
        monthly: MONTHLY_PRICE,
        semiannual: SEMIANNUAL_PRICE,
        annual: ANNUAL_PRICE,
      };
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: priceMap[selectedPlan] },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL");
      }
    } catch (e) {
      console.error("Checkout error:", e);
      toast.error("Suscripción no disponible en este momento. Contacta soporte.");
    }
    setLoading(false);
  };

  if (isAdmin()) {
    navigate("/home", { replace: true });
    return null;
  }

  if (checkingPayment || isSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6" style={{ background: "#0F0F0F" }}>
        <div className="flex h-16 w-16 items-center justify-center rounded-full mb-4" style={{ background: "rgba(199,91,57,0.15)" }}>
          <Check className="h-8 w-8" style={{ color: "#C75B39" }} />
        </div>
        <p className="font-display text-lg text-white">Verificando tu pago…</p>
        <p className="mt-2 text-sm font-body" style={{ color: "#888" }}>Esto puede tomar unos segundos.</p>
      </div>
    );
  }

  const benefits = [
    { icon: Target, text: "Programas periodizados de 6 semanas" },
    { icon: Play, text: "120+ videos demostrativos" },
    { icon: TrendingUp, text: "Progresión inteligente semana a semana" },
  ];

  const plans: { key: Plan; label: string; price: string; detail: string; savings?: string; badge?: string; badgeColor?: string }[] = [
    {
      key: "monthly",
      label: "Mensual",
      price: "$399 MXN/mes",
      detail: "Sin compromiso",
    },
    {
      key: "semiannual",
      label: "Semestral",
      price: "$2,094 MXN",
      detail: "cada 6 meses · $349 MXN/mes",
      savings: "Ahorras $300",
      badge: "POPULAR",
      badgeColor: "#C9A96E",
    },
    {
      key: "annual",
      label: "Anual",
      price: "$3,588 MXN",
      detail: "cada 12 meses · $299 MXN/mes",
      savings: "Ahorras $1,200",
      badge: "MEJOR PRECIO",
      badgeColor: "#C75B39",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12" style={{ background: "#0F0F0F" }}>
      <span
        className="font-display text-[28px] font-extrabold tracking-tight mb-10"
        style={{ color: "#C75B39", letterSpacing: "-0.04em" }}
      >
        LIFTORY
      </span>

      <h1 className="font-display text-[28px] font-bold text-white text-center leading-tight">
        Entrenamiento de élite.
      </h1>
      <p className="mt-2 text-[15px] font-body text-center" style={{ color: "#888" }}>
        Diseñado por expertos en kinesiología.
      </p>

      <div className="mt-8 w-full max-w-sm space-y-4">
        {benefits.map((b) => (
          <div key={b.text} className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ background: "rgba(199,91,57,0.1)" }}
            >
              <b.icon className="h-5 w-5" style={{ color: "#C75B39" }} />
            </div>
            <span className="text-[14px] text-white font-body">{b.text}</span>
          </div>
        ))}
      </div>

      {/* Price cards */}
      <div className="mt-8 w-full max-w-sm space-y-3">
        {plans.map((plan) => (
          <button
            key={plan.key}
            onClick={() => setSelectedPlan(plan.key)}
            className="relative w-full text-left transition-all active:scale-[0.98]"
            style={{
              background: "#1A1A1A",
              border: selectedPlan === plan.key
                ? `2px solid ${plan.badgeColor || "#C75B39"}`
                : "2px solid #2A2A2A",
              borderRadius: 16,
              padding: 16,
            }}
          >
            {plan.badge && (
              <span
                className="absolute -top-2.5 right-4 rounded-full px-3 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white"
                style={{ background: plan.badgeColor }}
              >
                {plan.badge}
              </span>
            )}
            <p className="font-display text-[20px] font-bold text-white">
              {plan.price}
            </p>
            <p className="mt-1 font-mono text-[12px]" style={{ color: "#888" }}>
              {plan.detail}
            </p>
            {plan.savings && (
              <p className="mt-1 font-body text-[12px]" style={{ color: "#C75B39" }}>
                {plan.savings}
              </p>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="mt-8 w-full max-w-sm font-display text-[16px] font-semibold text-white disabled:opacity-50 active:scale-[0.97] transition-transform"
        style={{
          background: "#C75B39",
          borderRadius: 12,
          height: 52,
        }}
      >
        {loading ? "Cargando…" : "Suscribirse"}
      </button>

      <p className="mt-4 text-[11px] font-body text-center" style={{ color: "#666" }}>
        Cancela cuando quieras. Sin contratos.
      </p>
    </div>
  );
}