import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Index() {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // TODO: check onboarding_completed from profiles table
        navigate("/home", { replace: true });
        return;
      }
      setChecking(false);
      // Start animations
      requestAnimationFrame(() => setShowContent(true));
      setTimeout(() => setShowCta(true), 600);
    };
    checkAuth();
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
        {/* Logo + Tagline */}
        <div
          className="flex flex-col items-center transition-all duration-[600ms] ease-out"
          style={{
            opacity: showContent ? 1 : 0,
            transform: showContent ? "translateY(0)" : "translateY(12px)",
          }}
        >
          <h1
            className="font-display"
            style={{
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#FFFFFF",
              lineHeight: 1,
            }}
          >
            LIFTORY
          </h1>
          <p
            className="mt-3 text-center font-body"
            style={{
              fontSize: 14,
              fontWeight: 400,
              color: "#A89F95",
              lineHeight: 1.5,
            }}
          >
            Entrenamiento inteligente. Resultados reales.
          </p>
        </div>

        {/* CTA */}
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
            style={{
              fontSize: 14,
              fontWeight: 400,
              color: "#A89F95",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
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
