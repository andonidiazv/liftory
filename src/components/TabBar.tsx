import { Home, BarChart3, Play, Lightbulb, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const tabs = [
  { id: "home", icon: Home, label: "Hoy", path: "/home" },
  { id: "progress", icon: BarChart3, label: "Progreso", path: "/progress" },
  { id: "workout", icon: Play, label: "Workout", path: "__workout__" },
  { id: "insights", icon: Lightbulb, label: "Insights", path: "/insights" },
  { id: "profile", icon: User, label: "Perfil", path: "/profile" },
];

export default function TabBar({ onStartWorkout }: { onStartWorkout: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card pb-safe">
      <div className="flex items-center justify-around px-2 pt-2">
        {tabs.map((tab) => {
          const isWorkout = tab.id === "workout";
          const isActive = location.pathname === tab.path;

          if (isWorkout) {
            return (
              <button
                key={tab.id}
                onClick={onStartWorkout}
                className="press-scale -mt-5 flex flex-col items-center"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg glow-primary">
                  <Play className="h-6 w-6 fill-primary-foreground text-primary-foreground ml-0.5" />
                </div>
                <span className="mt-1 text-[10px] font-medium text-primary">
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className="press-scale flex flex-col items-center gap-0.5 py-1 px-3"
            >
              <tab.icon
                className={`h-5 w-5 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
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
