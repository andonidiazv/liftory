import { Home, CalendarDays, TrendingUp, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDarkMode } from "@/hooks/useDarkMode";
import { dia, noche } from "@/lib/colors";

const tabs = [
  { id: "home", icon: Home, label: "Home", path: "/home" },
  { id: "program", icon: CalendarDays, label: "Programa", path: "/program" },
  { id: "progress", icon: TrendingUp, label: "Progreso", path: "/progress" },
  { id: "profile", icon: User, label: "Perfil", path: "/profile" },
];

export default function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useDarkMode();
  const t = isDark ? noche : dia;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: t.bg,
        borderTop: `1px solid ${t.border}`,
        height: 60,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-center justify-around h-[60px] px-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const color = isActive ? t.accent : t.muted;

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className="press-scale flex flex-col items-center gap-0.5 py-1 px-3"
            >
              <tab.icon
                className="h-5 w-5 transition-colors"
                style={{ color }}
                strokeWidth={2.5}
              />
              <span
                className="font-body font-medium transition-colors"
                style={{ fontSize: 10, color }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
