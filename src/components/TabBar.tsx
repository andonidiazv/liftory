import { Home, CalendarDays, TrendingUp, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * ATELIER TAB BAR.
 *
 * Premium navigation that reads like a watch-face strap:
 *   - backdrop-blur for depth
 *   - mono caps labels tracked at 2.5px
 *   - light-weight icon strokes (1.6) so they sit quietly
 *   - gold pill indicator floating above the active tab with a soft glow
 *   - inactive items at 55% opacity so the active one rings out
 *
 * Replaces the previous TabBar (heavier icons + labels in DM Sans 10px).
 */

const tabs = [
  { id: "home", icon: Home, label: "Home", path: "/home" },
  { id: "program", icon: CalendarDays, label: "Programa", path: "/program" },
  { id: "progress", icon: TrendingUp, label: "Progreso", path: "/progress" },
  { id: "profile", icon: User, label: "Perfil", path: "/profile" },
];

const NAV_HEIGHT = 76;

export default function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(13,13,15,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid hsl(var(--border))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div
        className="flex items-stretch justify-around"
        style={{ height: NAV_HEIGHT }}
      >
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const tone = isActive
            ? "#C4A24E"
            : "color-mix(in srgb, hsl(var(--muted-foreground)) 55%, transparent)";
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className="press-scale relative flex flex-col items-center justify-center gap-1.5 px-3"
              style={{ flex: 1 }}
            >
              {/* Gold pill indicator above active tab */}
              {isActive && (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: 0,
                    width: 22,
                    height: 2,
                    borderRadius: 999,
                    background: "#C4A24E",
                    boxShadow: "0 0 12px rgba(196,162,78,0.55)",
                  }}
                />
              )}
              <tab.icon
                style={{ width: 18, height: 18, color: tone, transition: "color 0.2s" }}
                strokeWidth={1.6}
              />
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: 8,
                  fontWeight: 500,
                  letterSpacing: "2.5px",
                  color: tone,
                  transition: "color 0.2s",
                  lineHeight: 1,
                }}
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
