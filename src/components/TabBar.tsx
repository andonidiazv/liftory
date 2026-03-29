import { Home, CalendarDays, Dumbbell, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const tabs = [
  { id: "home", icon: Home, label: "Home", path: "/home" },
  { id: "program", icon: CalendarDays, label: "Programa", path: "/program" },
  { id: "exercises", icon: Dumbbell, label: "Ejercicios", path: "/exercises" },
  { id: "profile", icon: User, label: "Perfil", path: "/profile" },
];

export default function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "#FAF8F5",
        borderTop: "1px solid #E0DCD7",
        height: 60,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-center justify-around h-[60px] px-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const color = isActive ? "#1C1C1E" : "#B0ACA7";

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
