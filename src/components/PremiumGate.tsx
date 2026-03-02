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
        className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
        style={{ background: "rgba(15,15,15,0.55)" }}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: "rgba(199,91,57,0.15)", border: "1px solid rgba(199,91,57,0.3)" }}>
          <Lock className="h-5 w-5" style={{ color: "#C75B39" }} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="font-display text-sm font-semibold text-foreground" style={{ letterSpacing: "-0.01em" }}>Members only</span>
          <span className="font-body text-xs" style={{ color: "#A89F95" }}>Upgrade para desbloquear</span>
        </div>
      </button>
    </div>
  );
}
