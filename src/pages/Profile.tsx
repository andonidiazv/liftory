import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { Settings, ChevronRight, Watch, Bell, Shield, HelpCircle, LogOut } from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const displayName = profile?.full_name || "Usuario";
  const level = profile?.experience_level || "—";
  const goals = profile?.goals?.join(", ") || "—";
  const daysPerWeek = profile?.training_days_per_week || 0;
  const location = profile?.training_location || "—";
  const wearable = profile?.wearable || "Ninguno";

  const menuItems = [
    { icon: Watch, label: "Wearable conectado", detail: wearable },
    { icon: Bell, label: "Notificaciones", detail: "Activadas" },
    { icon: Shield, label: "Privacidad", detail: "" },
    { icon: HelpCircle, label: "Ayuda y soporte", detail: "" },
    { icon: Settings, label: "Configuración", detail: "" },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <Layout>
      <div className="animate-fade-up px-5 pt-14">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary font-display text-3xl font-bold text-primary">
            {displayName[0]}
          </div>
          <div>
            <h1 className="font-display text-[22px] font-bold text-foreground" style={{ letterSpacing: "-0.03em" }}>{displayName}</h1>
            <p className="text-sm text-muted-foreground font-body font-light">
              {level} · {goals}
            </p>
            <p className="text-xs text-muted-foreground font-body font-normal">
              {daysPerWeek} días/semana · {location}
            </p>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          {[
            { label: "Plan", value: profile?.subscription_status || "—" },
            { label: "Unidad", value: profile?.weight_unit || "kg" },
            { label: "Días/sem", value: daysPerWeek },
          ].map((s) => (
            <div key={s.label} className="card-fbb text-center">
              <p className="font-mono text-xl font-medium text-foreground" style={{ letterSpacing: "0.05em" }}>{s.value}</p>
              <p className="text-label-tech text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Menu */}
        <div className="mt-8 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.label}
              className="press-scale flex w-full items-center gap-4 rounded-xl p-4 text-left transition-colors hover:bg-secondary/50"
            >
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-sm font-body font-normal text-foreground">{item.label}</span>
              {item.detail && (
                <span className="text-xs text-muted-foreground font-body">{item.detail}</span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="press-scale mt-4 flex w-full items-center gap-4 rounded-xl p-4 text-left transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-5 w-5 text-destructive" />
          <span className="flex-1 text-sm font-body font-medium text-destructive">Cerrar sesión</span>
        </button>

        {/* Footer wordmark */}
        <div className="flex flex-col items-center py-8">
          <span
            className="font-display"
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: "#6B6360",
              textAlign: "center",
            }}
          >
            LIFTORY v1.0
          </span>
        </div>
      </div>
    </Layout>
  );
}
