import { useState, useEffect } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Target, Play, TrendingUp, Check, Flame, Zap } from "lucide-react";
import { toast } from "sonner";
import { useDarkMode } from "@/hooks/useDarkMode";
import { dia, noche } from "@/lib/colors";

const MONTHLY_PRICE = "price_1TD5ll0XOkcK4IZPIGWDFpUX";
const SEMIANNUAL_PRICE = "price_1TD5kI0XOkcK4IZPiI7dsbJO";
const ANNUAL_PRICE = "price_1TD5lM0XOkcK4IZPqQudTkwk";
const FOUNDER_PRICE = "price_1TFjro0XOkcK4IZPvsYWsviF";

type Plan = "monthly" | "semiannual" | "annual";

const plans: {
  key: Plan;
  label: string;
  price: string;
  detail: string;
  savings?: string;
  badge?: string;
  badgeColor?: string;
  btnLabel: string;
}[] = [
  {
    key: "monthly",
    label: "Mensual",
    price: "$399 MXN/mes",
    detail: "Sin compromiso",
    btnLabel: "Suscribirse · $399 MXN/mes",
  },
  {
    key: "semiannual",
    label: "Semestral",
    price: "$2,094 MXN",
    detail: "cada 6 meses · $349 MXN/mes",
    savings: "Ahorras $300",
    badge: "POPULAR",
    badgeColor: "#D4FF00",
    btnLabel: "Suscribirse · $2,094 MXN/semestre",
  },
  {
    key: "annual",
    label: "Anual",
    price: "$3,588 MXN",
    detail: "cada 12 meses · $299 MXN/mes",
    savings: "Ahorras $1,200",
    badge: "MEJOR PRECIO",
    badgeColor: "#D4FF00",
    btnLabel: "Suscribirse · $3,588 MXN/año",
  },
];

const benefits = [
  { icon: Target, text: "Programas periodizados de 6 semanas" },
  { icon: Play, text: "120+ videos demostrativos" },
  { icon: TrendingUp, text: "Progresión estructurada semana a semana" },
];

export default function Paywall() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, loading: authLoading, refreshProfile, isAdmin, hasOnboarded, signOut } = useAuth();
  const { isDark } = useDarkMode();
  const t = isDark ? noche : dia;
  const [selectedPlan, setSelectedPlan] = useState<Plan>("annual");
  const [loading, setLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [isFounder, setIsFounder] = useState(false);

  // Detect founder flag from Welcome page
  useEffect(() => {
    const founderFlag = localStorage.getItem("liftory_founder");
    if (founderFlag) {
      setIsFounder(true);
    }
  }, []);

  const isSuccess = searchParams.get("success") === "true";

  useEffect(() => {
    if (!isSuccess || !user) return;
    setCheckingPayment(true);
    const checkSub = async () => {
      try {
        await supabase.functions.invoke("check-subscription");
        await refreshProfile();
      } catch {
        // Silent — will retry on next visit
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

  const handleFounderSubscribe = async () => {
    if (!user) { navigate("/login"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: FOUNDER_PRICE },
      });
      if (error) throw error;
      if (data?.url) {
        localStorage.removeItem("liftory_founder");
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL");
      }
    } catch {
      toast.error("Suscripción no disponible en este momento. Contacta soporte.");
    }
    setLoading(false);
  };

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
    } catch {
      toast.error("Suscripción no disponible en este momento. Contacta soporte.");
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  // Auth guard (no ProtectedRoute wrapper)
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: t.bg }}>
        <span className="font-display text-sm" style={{ color: t.accent, opacity: 0.25, fontWeight: 800, letterSpacing: "-0.04em" }}>
          LIFTORY
        </span>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isAdmin()) {
    navigate("/home", { replace: true });
    return null;
  }

  if (checkingPayment || isSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6" style={{ background: t.bg }}>
        <div className="flex h-16 w-16 items-center justify-center rounded-full mb-4" style={{ background: t.accentBg }}>
          <Check className="h-8 w-8" style={{ color: t.text }} />
        </div>
        <p className="font-display text-lg" style={{ color: t.text }}>Verificando tu pago…</p>
        <p className="mt-2 text-sm font-body" style={{ color: t.muted }}>Esto puede tomar unos segundos.</p>
      </div>
    );
  }

  const activePlan = plans.find((p) => p.key === selectedPlan)!;

  /* ──── FOUNDER'S ACCESS VIEW ──── */
  if (isFounder) {
    const founderBenefits = [
      "Programas periodizados de 6 semanas",
      "120+ ejercicios con video demostrativo",
      "Progresión estructurada de cargas y volumen",
      "Tracking de volumen, tonelaje y PRs",
      "Coaching cues en cada ejercicio",
      "Acceso a todas las actualizaciones futuras",
      "Precio de fundador bloqueado de por vida",
    ];

    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12 overflow-y-auto" style={{ background: t.bg }}>
        {/* Badge */}
        <span
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em]"
          style={{ background: t.accentBg, color: t.text, border: `1px solid ${t.border}` }}
        >
          <Flame className="h-3.5 w-3.5" />
          Founder's Access
        </span>

        {/* Logo */}
        <span
          className="font-display text-[28px] font-extrabold tracking-tight mt-5"
          style={{ color: t.wordmark, letterSpacing: "-0.04em" }}
        >
          LIFTORY
        </span>

        <h1 className="font-display text-[24px] font-bold text-center leading-tight mt-3" style={{ color: t.text }}>
          Bienvenido, Founder.
        </h1>
        <p className="mt-2 text-[14px] font-body text-center" style={{ color: t.muted }}>
          Acceso exclusivo para los primeros 100.
        </p>

        {/* Pricing Card */}
        <div
          className="mt-8 w-full max-w-sm rounded-2xl overflow-hidden"
          style={{ background: t.card, border: `1px solid ${t.border}`, boxShadow: `0 4px 16px ${t.shadow}` }}
        >
          <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, transparent, ${t.accent}, transparent)` }} />

          <div className="p-8 text-center">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[9px] uppercase tracking-[0.2em]"
              style={{ background: t.accentBg, color: t.text }}
            >
              <Zap className="h-3 w-3" />
              50% de descuento — para siempre
            </span>

            <div className="mt-5">
              <span className="font-body text-[16px] line-through" style={{ color: t.muted }}>
                $399 MXN
              </span>
              <div className="mt-1 flex items-baseline justify-center gap-1">
                <span className="font-display text-[48px] font-bold" style={{ color: t.text, letterSpacing: "-0.03em" }}>
                  $199
                </span>
                <span className="font-body text-[14px]" style={{ color: t.muted }}>
                  MXN/mes
                </span>
              </div>
            </div>

            {/* Benefits */}
            <div className="mt-8 space-y-3 text-left">
              {founderBenefits.map((benefit) => (
                <div key={benefit} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: t.success }} />
                  <span className="font-body text-[13px]" style={{ color: t.text }}>{benefit}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={handleFounderSubscribe}
              disabled={loading}
              className="press-scale mt-8 w-full font-display text-[15px] font-semibold disabled:opacity-50 active:scale-[0.97] transition-transform"
              style={{
                background: t.accent,
                color: t.btnText,
                borderRadius: 50,
                height: 52,
              }}
            >
              {loading ? "Cargando…" : "Activar Founder's Access · $199 MXN/mes"}
            </button>

            <p className="mt-3 font-body text-[11px]" style={{ color: t.muted }}>
              Cancela cuando quieras. Sin contratos. Sin sorpresas.
            </p>
          </div>
        </div>

        {/* Switch to regular plans */}
        <button
          onClick={() => { setIsFounder(false); localStorage.removeItem("liftory_founder"); }}
          className="mt-6 font-body text-[13px] underline transition-colors"
          style={{ color: t.muted }}
        >
          Ver planes regulares
        </button>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="mt-3 mb-4 font-body text-[13px] underline active:scale-[0.97] transition-transform"
          style={{ color: t.muted }}
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-12 overflow-y-auto" style={{ background: t.bg }}>
      {/* Section 1 — Context */}
      <p className="font-body text-[14px] text-center" style={{ color: t.muted }}>
        Tu membresía no está activa
      </p>
      <span
        className="font-display text-[28px] font-extrabold tracking-tight mt-4"
        style={{ color: t.wordmark, letterSpacing: "-0.04em" }}
      >
        LIFTORY
      </span>
      {/* Personalized message if coming from onboarding */}
      {profile?.full_name && profile?.onboarding_completed && (
        <p className="mt-3 text-[14px] font-body text-center" style={{ color: t.muted }}>
          {profile.full_name.split(" ")[0]}, tu programa está listo.
        </p>
      )}
      <h1 className="font-display text-[24px] font-bold text-center leading-tight mt-3" style={{ color: t.text }}>
        Entrenamiento de élite.
      </h1>
      <p className="mt-2 text-[14px] font-body text-center" style={{ color: t.muted }}>
        Crafted by movement scientists.
      </p>

      {/* Section 2 — Benefits */}
      <div className="mt-6 w-full max-w-sm space-y-4">
        {benefits.map((b) => (
          <div key={b.text} className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ background: t.accentBg }}
            >
              <b.icon className="h-5 w-5" style={{ color: t.text }} />
            </div>
            <span className="text-[14px] font-body" style={{ color: t.text }}>{b.text}</span>
          </div>
        ))}
      </div>

      {/* Section 3 — Price cards */}
      <div className="mt-6 w-full max-w-sm space-y-3">
        {plans.map((plan) => (
          <button
            key={plan.key}
            onClick={() => setSelectedPlan(plan.key)}
            className="relative w-full text-left transition-all active:scale-[0.98]"
            style={{
              background: t.card,
              border: selectedPlan === plan.key
                ? `2px solid ${t.accent}`
                : `2px solid ${t.border}`,
              borderRadius: 16,
              padding: 16,
              boxShadow: `0 2px 8px ${t.shadow}`,
            }}
          >
            {plan.badge && (
              <span
                className="absolute -top-2.5 right-4 rounded-full px-3 py-0.5 font-mono text-[9px] uppercase tracking-wider"
                style={{ background: t.accent, color: t.btnText }}
              >
                {plan.badge}
              </span>
            )}
            <p className="font-display text-[20px] font-bold" style={{ color: t.text }}>{plan.price}</p>
            <p className="mt-1 font-mono text-[12px]" style={{ color: t.muted }}>{plan.detail}</p>
            {plan.savings && (
              <p className="mt-1 font-body text-[12px]" style={{ color: t.accent }}>{plan.savings}</p>
            )}
          </button>
        ))}
      </div>

      {/* Section 4 — CTA */}
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="mt-6 w-full max-w-sm font-display text-[15px] font-semibold disabled:opacity-50 active:scale-[0.97] transition-transform"
        style={{ background: t.accent, color: t.btnText, borderRadius: 50, height: 52 }}
      >
        {loading ? "Cargando…" : activePlan.btnLabel}
      </button>

      {/* Section 5 — Secondary */}
      <p className="mt-4 text-[11px] font-body text-center" style={{ color: t.muted }}>
        Cancela cuando quieras. Sin contratos.
      </p>
      <button
        onClick={handleSignOut}
        className="mt-3 mb-4 font-body text-[13px] underline active:scale-[0.97] transition-transform"
        style={{ color: t.muted }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}
