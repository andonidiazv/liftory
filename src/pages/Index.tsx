import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";

const Index = () => {
  const navigate = useNavigate();
  const { onboardingComplete } = useApp();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(onboardingComplete ? "/home" : "/onboarding", { replace: true });
    }, 2800);
    return () => clearTimeout(timer);
  }, [onboardingComplete, navigate]);

  return (
    <div
      className="grain-overlay flex min-h-screen flex-col items-center justify-center"
      style={{ background: "#0D0C0A" }}
    >
      <div className="relative z-10 flex flex-col items-center stagger-fade-in">
        <h1
          className="font-display"
          style={{
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          <span style={{ color: "#FAF8F5" }}>LIFT</span>
          <span style={{ color: "#C9A96E" }}>ORY</span>
        </h1>

        <p
          className="mt-4 font-serif italic"
          style={{
            fontSize: 18,
            fontWeight: 300,
            color: "rgba(250,248,245,0.55)",
            lineHeight: 1.3,
          }}
        >
          Move better. Lift stronger. Live longer.
        </p>

        <p
          className="mt-4 font-mono uppercase"
          style={{
            fontSize: 10,
            fontWeight: 400,
            letterSpacing: "0.20em",
            color: "rgba(250,248,245,0.25)",
          }}
        >
          HYBRID PERFORMANCE FOR REAL HUMANS
        </p>
      </div>
    </div>
  );
};

export default Index;
