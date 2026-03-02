import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";

interface PremiumGateProps {
  children: ReactNode;
  label?: string;
}

export default function PremiumGate({ children, label = "Desbloquea con Premium" }: PremiumGateProps) {
  const { isPremium } = useAuth();
  const navigate = useNavigate();

  if (isPremium()) return <>{children}</>;

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none" }}>
        {children}
      </div>
      <button
        onClick={() => navigate("/paywall")}
        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2"
        style={{ background: "rgba(15,15,15,0.4)" }}
      >
        <Lock className="h-6 w-6 text-foreground" />
        <span className="font-body text-xs" style={{ color: "#A89F95" }}>{label}</span>
      </button>
    </div>
  );
}
