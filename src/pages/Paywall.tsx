import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Target, Play, TrendingUp, Check } from "lucide-react";

const MONTHLY_PRICE = "price_1TCuLg0XOkcK4IZP06AbZY9E";
const ANNUAL_PRICE = "price_1TCuM70XOkcK4IZPtnkc7xBm";

export default function Paywall() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, refreshProfile, isAdmin, hasOnboarded } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("annual");
  const [loading, setLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const isSuccess = searchParams.get("success") === "true";

  // After returning from Stripe, check subscription status
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

  // Redirect when subscription becomes active
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
      const priceId = selectedPlan === "annual" ? ANNUAL_PRICE : MONTHLY_PRICE;
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error("Checkout error:", e);
    }
    setLoading(false);
  };

  if (isAdmin()) {
    navigate("/home", { replace: true });
    return null;
  }

  if (checkingPayment || isSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6" style={{ background: "#0D0C0A" }}>
        <div className="flex h-16 w-16 items-center justify-center rounded-full mb-4" style={{ background: "rgba(199,91,57,0.15)" }}>
          <Check className="h-8 w-8" style={{ color: "#C75B39" }} />
        </div>
        <p className="font-display text-lg text-foreground">Verificando tu pago…</p>
        <p className="mt-2 text-sm text-muted-foreground font-body">Esto puede tomar unos segundos.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12" style={{ background: "#0D0C0A" }}>
      <span className="font-display text-[28px] font-extrabold tracking-tight text-primary mb-8" style={{ letterSpacing: "-0.04em" }}>
        LIFTORY
      </span>

      <h1 className="font-display text-[28px] font-bold text-foreground text-center">
        Entrenamiento de élite.
      </h1>
      <p className="mt-2 text-[15px] text-muted-foreground font-body text-center">
        Diseñado por expertos en kinesiología.
      </p>

      <div className="mt-8 w-full max-w-sm space-y-4">
        {[
          { icon: Target, text: "Programas periodizados de 6 semanas" },
          { icon: Play, text: "120+ videos demostrativos" },
          { icon: TrendingUp, text: "Progresión inteligente semana a semana" },
        ].map((b) => (
          <div key={b.text} className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: "rgba(199,91,57,0.1)" }}>
              <b.icon className="h-4 w-4 text-primary" />
            </div>
            <span className="text-[14px] text-foreground font-body">{b.text}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 w-full max-w-sm space-y-3">
        <button
          onClick={() => setSelectedPlan("monthly")}
          className="relative w-full rounded-2xl p-4 text-left transition-all"
          style={{
            background: "hsl(var(--card))",
            border: selectedPlan === "monthly" ? "2px solid hsl(var(--primary))" : "2px solid hsl(var(--border))",
          }}
        >
          <p className="font-display text-[22px] font-bold text-foreground">$14.99 <span className="text-[14px] font-normal text-muted-foreground">USD/mes</span></p>
          <p className="mt-0.5 text-[12px] text-muted-foreground font-body">Cancela cuando quieras</p>
        </button>

        <button
          onClick={() => setSelectedPlan("annual")}
          className="relative w-full rounded-2xl p-4 text-left transition-all"
          style={{
            background: "hsl(var(--card))",
            border: selectedPlan === "annual" ? "2px solid hsl(var(--primary))" : "2px solid hsl(var(--border))",
          }}
        >
          <span
            className="absolute -top-2.5 right-4 rounded-full px-3 py-0.5 font-mono text-[9px] uppercase tracking-wider"
            style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
          >
            AHORRA 45%
          </span>
          <p className="font-display text-[22px] font-bold text-foreground">$99 <span className="text-[14px] font-normal text-muted-foreground">USD/año</span></p>
          <p className="mt-0.5 font-mono text-[12px] text-primary">= $8.25/mes</p>
        </button>
      </div>

      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="mt-8 w-full max-w-sm rounded-2xl bg-primary py-4 font-display text-[16px] font-semibold text-primary-foreground disabled:opacity-50"
      >
        {loading ? "Cargando…" : "Suscribirse"}
      </button>

      <p className="mt-4 text-[11px] text-muted-foreground font-body text-center">
        Cancela cuando quieras. Sin contratos.
      </p>
    </div>
  );
}
