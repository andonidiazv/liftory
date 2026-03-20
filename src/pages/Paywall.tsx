import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Target, Play, TrendingUp, Check } from "lucide-react";
import { toast } from "sonner";

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
      const priceId = selectedPlan === "annual" ? ANNUAL_PRICE : MONTHLY_PRICE;
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12" style={{ background: "#0F0F0F" }}>
      {/* Logo */}
      <span
        className="font-display text-[28px] font-extrabold tracking-tight mb-10"
        style={{ color: "#C75B39", letterSpacing: "-0.04em" }}
      >
        LIFTORY
      </span>

      {/* Title */}
      <h1 className="font-display text-[28px] font-bold text-white text-center leading-tight">
        Entrenamiento de élite.
      </h1>
      <p className="mt-2 text-[15px] font-body text-center" style={{ color: "#888" }}>
        Diseñado por expertos en kinesiología.
      </p>

      {/* Benefits */}
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
        {/* Monthly */}
        <button
          onClick={() => setSelectedPlan("monthly")}
          className="relative w-full text-left transition-all"
          style={{
            background: "#1A1A1A",
            border: selectedPlan === "monthly" ? "2px solid #C75B39" : "2px solid #2A2A2A",
            borderRadius: 16,
            padding: 20,
          }}
        >
          <p className="font-display text-[22px] font-bold text-white">
            $14.99 <span className="text-[14px] font-normal" style={{ color: "#888" }}>USD/mes</span>
          </p>
          <p className="mt-1 text-[12px] font-body" style={{ color: "#888" }}>
            Cancela cuando quieras
          </p>
        </button>

        {/* Annual */}
        <button
          onClick={() => setSelectedPlan("annual")}
          className="relative w-full text-left transition-all"
          style={{
            background: "#1A1A1A",
            border: selectedPlan === "annual" ? "2px solid #C75B39" : "2px solid #2A2A2A",
            borderRadius: 16,
            padding: 20,
          }}
        >
          <span
            className="absolute -top-2.5 right-4 rounded-full px-3 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white"
            style={{ background: "#C75B39" }}
          >
            AHORRA 45%
          </span>
          <p className="font-display text-[22px] font-bold text-white">
            $99 <span className="text-[14px] font-normal" style={{ color: "#888" }}>USD/año</span>
          </p>
          <p className="mt-1 font-mono text-[13px]" style={{ color: "#C75B39" }}>
            = $8.25/mes
          </p>
        </button>
      </div>

      {/* Subscribe button */}
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

      {/* Legal */}
      <p className="mt-4 text-[11px] font-body text-center" style={{ color: "#666" }}>
        Cancela cuando quieras. Sin contratos.
      </p>
    </div>
  );
}
