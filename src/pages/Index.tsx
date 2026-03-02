import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Index() {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          try {
            const { data: profile } = await supabase
              .from("user_profiles")
              .select("onboarding_completed, subscription_status")
              .eq("user_id", session.user.id)
              .single();

            if (!profile || !profile.onboarding_completed) {
              navigate("/onboarding", { replace: true });
            } else if (profile.subscription_status === "expired") {
              navigate("/paywall", { replace: true });
            } else {
              navigate("/home", { replace: true });
            }
          } catch {
            // If profile fetch fails, still show splash
            setChecking(false);
            requestAnimationFrame(() => setShowContent(true));
            setTimeout(() => setShowCta(true), 600);
          }
          return;
        }
        setChecking(false);
        requestAnimationFrame(() => setShowContent(true));
        setTimeout(() => setShowCta(true), 600);
      }
    );

    supabase.auth.getSession();

    // Fallback: if nothing happens in 3s, show splash
    const timeout = setTimeout(() => {
      setChecking(false);
      requestAnimationFrame(() => setShowContent(true));
      setTimeout(() => setShowCta(true), 600);
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  if (checking) {
    return <div className="min-h-screen" style={{ background: "#0F0F0F" }} />;
  }

  return (
    <div
      className="grain-overlay flex min-h-screen flex-col items-center justify-center px-6"
      style={{ background: "#0F0F0F" }}
    >
      <div className="relative z-10 flex flex-col items-center">
        <div
          className="flex flex-col items-center transition-all duration-[600ms] ease-out"
          style={{
            opacity: showContent ? 1 : 0,
            transform: showContent ? "translateY(0)" : "translateY(12px)",
          }}
        >
          <h1
            className="font-display"
            style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.02em", color: "#FFFFFF", lineHeight: 1 }}
          >
            LIFTORY
          </h1>
          <p
            className="mt-3 text-center font-body"
            style={{ fontSize: 14, fontWeight: 400, color: "#A89F95", lineHeight: 1.5 }}
          >
            Move Better. Lift Stronger. Live Longer.
          </p>
        </div>

        <div
          className="mt-10 flex flex-col items-center transition-all duration-[600ms] ease-out"
          style={{
            opacity: showCta ? 1 : 0,
            transform: showCta ? "translateY(0)" : "translateY(12px)",
          }}
        >
          <button
            onClick={() => navigate("/onboarding")}
            className="press-scale font-body"
            style={{
              background: "#C75B39",
              color: "#FFFFFF",
              borderRadius: 12,
              padding: "14px 48px",
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Comenzar
          </button>

          <button
            onClick={() => navigate("/login")}
            className="mt-4 font-body transition-colors"
            style={{ fontSize: 14, fontWeight: 400, color: "#A89F95", background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#C75B39")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#A89F95")}
          >
            ¿Ya tienes cuenta? Inicia sesión
          </button>
        </div>
      </div>
    </div>
  );
}
