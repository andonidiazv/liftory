import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Target, Play, TrendingUp, Check, Flame, Zap } from "lucide-react";
import { toast } from "sonner";

const MONTHLY_PRICE = "price_1TD5ll0XOkcK4IZPIGWDFpUX";
const SEMIANNUAL_PRICE = "price_1TD5kI0XOkcK4IZPiI7dsbJO";
const ANNUAL_PRICE = "price_1TD5lM0XOkcK4IZPqQudTkwk";
const FOUNDER_PRICE = "price_1TFjro0XOkcK4IZPvsYWsviF";

/* ── palette ── */
const cream = "#FAF8F5";
const charcoal = "#1C1C1E";
const muted = "#8A8580";
const subtle = "#B0ACA7";
const border = "#E0DCD7";
const cardBg = "#FFFFFF";

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
    badgeColor: "#C9A96E",
    btnLabel: "Suscribirse · $2,094 MXN/semestre",
  },
  {
    key: "annual",
    label: "Anual",
    price: "$3,588 MXN",
    detail: "cada 12 meses · $299 MXN/mes",
    savings: "Ahorras $1,200",
    badge: "MEJOR PRECIO",
    badgeColor: "#C75B39",
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
  const { user, profile, refreshProfile, isAdmin, hasOnboarded, signOut } = useAuth();
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

  if (isAdmin()) {
    navigate("/home", { replace: true });
    return null;
  }

  if (checkingPayment || isSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6" style={{ background: cream }}>
        <div className="flex h-16 w-16 items-center justify-center rounded-full mb-4" style={{ background: "rgba(28,28,30,0.06)" }}>
          <Check className="h-8 w-8" style={{ color: charcoal }} />
        </div>
        <p className="font-display text-lg" style={{ color: charcoal }}>Verificando tu pago…</p>
        <p className="mt-2 text-sm font-body" style={{ color: muted }}>Esto puede tomar unos segundos.</p>
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
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12 overflow-y-auto" style={{ background: cream }}>
        {/* Badge */}
        <span
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em]"
          style={{ background: "rgba(28,28,30,0.06)", color: charcoal, border: `1px solid ${border}` }}
        >
          <Flame className="h-3.5 w-3.5" />
          Founder's Access
        </span>

        {/* Logo */}
        <span
          className="font-display text-[28px] font-extrabold tracking-tight mt-5"
          style={{ color: charcoal, letterSpacing: "-0.04em" }}
        >
          LIFTORY
        </span>

        <h1 className="font-display text-[24px] font-bold text-center leading-tight mt-3" style={{ color: charcoal }}>
          Bienvenido, Founder.
        </h1>
        <p className="mt-2 text-[14px] font-body text-center" style={{ color: muted }}>
          Acceso exclusivo para los primeros 100.
        </p>

        {/* Pricing Card */}
        <div
          className="mt-8 w-full max-w-sm rounded-2xl overflow-hidden"
          style={{ background: cardBg, border: `1px solid ${border}` }}
        >
          <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, transparent, ${charcoal}, transparent)` }} />

          <div className="p-8 text-center">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[9px] uppercase tracking-[0.2em]"
              style={{ background: "rgba(28,28,30,0.06)", color: charcoal }}
            >
              <Zap className="h-3 w-3" />
              50% de descuento — para siempre
            </span>

            <div className="mt-5">
              <span className="font-body text-[16px] line-through" style={{ color: subtle }}>
                $399 MXN
              </span>
              <div className="mt-1 flex items-baseline justify-center gap-1">
                <span className="font-display text-[48px] font-bold" style={{ color: charcoal, letterSpacing: "-0.03em" }}>
                  $199
                </span>
                <span className="font-body text-[14px]" style={{ color: muted }}>
                  MXN/mes
                </span>
              </div>
            </div>

            {/* Benefits */}
            <div className="mt-8 space-y-3 text-left">
              {founderBenefits.map((benefit) => (
                <div key={benefit} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#7A8B5C" }} />
                  <span className="font-body text-[13px]" style={{ color: charcoal }}>{benefit}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={handleFounderSubscribe}
              disabled={loading}
              className="press-scale mt-8 w-full font-display text-[15px] font-semibold disabled:opacity-50 active:scale-[0.97] transition-transform"
              style={{
                background: charcoal,
                color: cream,
                borderRadius: 50,
                height: 52,
              }}
            >
              {loading ? "Cargando…" : "Activar Founder's Access · $199 MXN/mes"}
            </button>

            <p className="mt-3 font-body text-[11px]" style={{ color: subtle }}>
              Cancela cuando quieras. Sin contratos. Sin sorpresas.
            </p>
          </div>
        </div>

        {/* Switch to regular plans */}
        <button
          onClick={() => { setIsFounder(false); localStorage.removeItem("liftory_founder"); }}
          className="mt-6 font-body text-[13px] underline transition-colors"
          style={{ color: muted }}
        >
          Ver planes regulares
        </button>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="mt-3 mb-4 font-body text-[13px] underline active:scale-[0.97] transition-transform"
          style={{ color: subtle }}
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-6 py-12 overflow-y-auto" style={{ background: cream }}>
      {/* Section 1 — Context */}
      <p className="font-body text-[14px] text-center" style={{ color: muted }}>
        Tu membresía no está activa
      </p>
      <span
        className="font-display text-[28px] font-extrabold tracking-tight mt-4"
        style={{ color: charcoal, letterSpacing: "-0.04em" }}
      >
        LIFTORY
      </span>
      {/* Personalized message if coming from onboarding */}
      {profile?.full_name && profile?.onboarding_completed && (
        <p className="mt-3 text-[14px] font-body text-center" style={{ color: muted }}>
          {profile.full_name.split(" ")[0]}, tu programa está listo.
        </p>
      )}
      <h1 className="font-display text-[24px] font-bold text-center leading-tight mt-3" style={{ color: charcoal }}>
        Entrenamiento de élite.
      </h1>
      <p className="mt-2 text-[14px] font-body text-center" style={{ color: muted }}>
        Crafted by movement scientists.
      </p>

      {/* Section 2 — Benefits */}
      <div className="mt-6 w-full max-w-sm space-y-4">
        {benefits.map((b) => (
          <div key={b.text} className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ background: "rgba(28,28,30,0.06)" }}
            >
              <b.icon className="h-5 w-5" style={{ color: charcoal }} />
            </div>
            <span className="text-[14px] font-body" style={{ color: charcoal }}>{b.text}</span>
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
              background: cardBg,
              border: selectedPlan === plan.key
                ? `2px solid ${charcoal}`
                : `2px solid ${border}`,
              borderRadius: 16,
              padding: 16,
            }}
          >
            {plan.badge && (
              <span
                className="absolute -top-2.5 right-4 rounded-full px-3 py-0.5 font-mono text-[9px] uppercase tracking-wider"
                style={{ background: plan.badgeColor, color: "#FFFFFF" }}
              >
                {plan.badge}
              </span>
            )}
            <p className="font-display text-[20px] font-bold" style={{ color: charcoal }}>{plan.price}</p>
            <p className="mt-1 font-mono text-[12px]" style={{ color: muted }}>{plan.detail}</p>
            {plan.savings && (
              <p className="mt-1 font-body text-[12px]" style={{ color: "#C75B39" }}>{plan.savings}</p>
            )}
          </button>
        ))}
      </div>

      {/* Section 4 — CTA */}
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="mt-6 w-full max-w-sm font-display text-[15px] font-semibold disabled:opacity-50 active:scale-[0.97] transition-transform"
        style={{ background: charcoal, color: cream, borderRadius: 50, height: 52 }}
      >
        {loading ? "Cargando…" : activePlan.btnLabel}
      </button>

      {/* Section 5 — Secondary */}
      <p className="mt-4 text-[11px] font-body text-center" style={{ color: subtle }}>
        Cancela cuando quieras. Sin contratos.
      </p>
      <button
        onClick={handleSignOut}
        className="mt-3 mb-4 font-body text-[13px] underline active:scale-[0.97] transition-transform"
        style={{ color: muted }}
      >
        Cerrar sesión
      </button>
    </div>
  );
}
