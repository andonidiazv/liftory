import Layout from "@/components/Layout";
import { user } from "@/data/workout";
import { Settings, ChevronRight, Watch, Bell, Shield, HelpCircle } from "lucide-react";

const menuItems = [
  { icon: Watch, label: "Wearable conectado", detail: user.wearable },
  { icon: Bell, label: "Notificaciones", detail: "Activadas" },
  { icon: Shield, label: "Privacidad", detail: "" },
  { icon: HelpCircle, label: "Ayuda y soporte", detail: "" },
  { icon: Settings, label: "Configuración", detail: "" },
];

export default function Profile() {
  return (
    <Layout>
      <div className="animate-fade-up px-5 pt-14">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary font-display text-3xl font-bold text-primary">
            {user.name[0]}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">{user.name}</h1>
            <p className="text-sm text-muted-foreground">
              {user.level} · {user.goal}
            </p>
            <p className="text-xs text-muted-foreground">
              {user.daysPerWeek} días/semana · {user.equipment}
            </p>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          {[
            { label: "Workouts", value: user.totalWorkouts },
            { label: "Racha", value: `${user.streak}d` },
            { label: "Volumen", value: `${(user.lifetimeVolume / 1000).toFixed(0)}k kg` },
          ].map((s) => (
            <div key={s.label} className="card-fbb text-center">
              <p className="font-mono text-xl font-semibold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Wearable info */}
        <div className="mt-8 card-fbb">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Whoop — Hoy</p>
          <div className="mt-3 grid grid-cols-3 gap-4">
            <div>
              <p className="font-mono text-lg font-semibold text-success">{user.recovery}%</p>
              <p className="text-[10px] text-muted-foreground">Recovery</p>
            </div>
            <div>
              <p className="font-mono text-lg font-semibold text-foreground">{user.hrv}ms</p>
              <p className="text-[10px] text-muted-foreground">HRV</p>
            </div>
            <div>
              <p className="font-mono text-lg font-semibold text-foreground">{user.sleep}h</p>
              <p className="text-[10px] text-muted-foreground">Sueño</p>
            </div>
          </div>
        </div>

        {/* Menu */}
        <div className="mt-8 space-y-1 mb-4">
          {menuItems.map((item) => (
            <button
              key={item.label}
              className="press-scale flex w-full items-center gap-4 rounded-2xl p-4 text-left transition-colors hover:bg-secondary/50"
            >
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium text-foreground">{item.label}</span>
              {item.detail && (
                <span className="text-xs text-muted-foreground">{item.detail}</span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
}
