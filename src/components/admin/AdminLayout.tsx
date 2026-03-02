import { NavLink, useNavigate } from "react-router-dom";
import { BarChart3, Users, Dumbbell, Sparkles, Brain, ScrollText, LogOut, Home } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { label: "Dashboard", icon: BarChart3, to: "/admin" },
  { label: "Usuarios", icon: Users, to: "/admin/users" },
  { label: "Ejercicios", icon: Dumbbell, to: "/admin/exercises" },
  { label: "Insights", icon: Sparkles, to: "/admin/insights" },
  { label: "Reglas de IA", icon: Brain, to: "/admin/ai-rules" },
  { label: "Audit Log", icon: ScrollText, to: "/admin/audit" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen" style={{ background: "#0D0C0A" }}>
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col" style={{ background: "#1C1C1E" }}>
        {/* Logo */}
        <div className="px-6 pt-7 pb-5">
          <span className="font-display" style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.04em", color: "#FAF8F5" }}>
            LIFTORY
          </span>
        </div>

        <div className="separator-dark" />

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 pt-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-body font-normal transition-colors ${
                  isActive
                    ? "border-l-[3px] border-primary text-[#FAF8F5]"
                    : "border-l-[3px] border-transparent text-[#8A8A8E] hover:text-[#FAF8F5]"
                }`
              }
              style={({ isActive }) => ({
                background: isActive ? "rgba(184,98,47,0.1)" : "transparent",
              })}
            >
              <item.icon className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="separator-dark" />

        {/* Footer links */}
        <div className="space-y-1 px-3 py-4">
          <button
            onClick={() => navigate("/home")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-body font-normal text-[#8A8A8E] hover:text-[#FAF8F5] transition-colors"
          >
            <Home className="h-[18px] w-[18px]" />
            Ver como atleta
          </button>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-body font-normal text-[#8A8A8E] hover:text-destructive transition-colors"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-[260px] flex-1 min-h-screen p-8">
        {children}
      </main>
    </div>
  );
}
