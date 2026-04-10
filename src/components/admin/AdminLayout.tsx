import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { BarChart3, Users, Dumbbell, Sparkles, Brain, ScrollText, LogOut, Home, ClipboardList, MessageSquare, Award, CreditCard, Menu, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { label: "Dashboard", icon: BarChart3, to: "/admin" },
  { label: "Usuarios", icon: Users, to: "/admin/users" },
  { label: "Programas", icon: ClipboardList, to: "/admin/programs" },
  { label: "Ejercicios", icon: Dumbbell, to: "/admin/exercises" },
  { label: "Feedback", icon: MessageSquare, to: "/admin/feedback" },
  { label: "Badges", icon: Award, to: "/admin/badges" },
  { label: "Pagos", icon: CreditCard, to: "/admin/payments" },
  { label: "Insights", icon: Sparkles, to: "/admin/insights" },
  { label: "Reglas de IA", icon: Brain, to: "/admin/ai-rules" },
  { label: "Audit Log", icon: ScrollText, to: "/admin/audit" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer whenever route changes (e.g. user taps a nav item)
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Lock body scroll while drawer is open on mobile
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [drawerOpen]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  // Current page title for the mobile top bar
  const currentNav = navItems.find((n) =>
    n.to === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(n.to)
  );
  const pageTitle = currentNav?.label ?? "Admin";

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-6 pt-7 pb-5">
        <span className="font-display" style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.04em", color: "#FAF8F5" }}>
          LIFTORY
        </span>
        {/* Close button (mobile only) */}
        <button
          onClick={() => setDrawerOpen(false)}
          className="md:hidden flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: "rgba(250,248,245,0.06)" }}
          aria-label="Cerrar menú"
        >
          <X className="h-4 w-4" style={{ color: "#FAF8F5" }} />
        </button>
      </div>

      <div className="separator-dark" />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 pt-4 overflow-y-auto">
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
    </>
  );

  return (
    <div className="flex min-h-screen" style={{ background: "#0D0C0A" }}>
      {/* ─── Desktop sidebar (always visible on md+) ─── */}
      <aside
        className="fixed left-0 top-0 z-40 hidden h-screen w-[260px] flex-col md:flex"
        style={{ background: "#1C1C1E" }}
      >
        {sidebarContent}
      </aside>

      {/* ─── Mobile drawer + backdrop ─── */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 animate-fade-in"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`md:hidden fixed left-0 top-0 z-50 flex h-screen w-[280px] max-w-[85vw] flex-col transition-transform duration-300 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "#1C1C1E" }}
      >
        {sidebarContent}
      </aside>

      {/* ─── Main content ─── */}
      <div className="flex min-w-0 flex-1 flex-col md:ml-[260px]">
        {/* Mobile top bar */}
        <header
          className="md:hidden sticky top-0 z-30 flex items-center gap-3 border-b px-4 py-3"
          style={{
            background: "#1C1C1E",
            borderColor: "rgba(250,248,245,0.08)",
          }}
        >
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ background: "rgba(250,248,245,0.06)" }}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" style={{ color: "#FAF8F5" }} />
          </button>
          <span
            className="font-display truncate"
            style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", color: "#FAF8F5" }}
          >
            {pageTitle}
          </span>
          <span
            className="ml-auto font-display text-[11px] tracking-[0.15em]"
            style={{ color: "#8A8A8E" }}
          >
            ADMIN
          </span>
        </header>

        <main className="min-h-screen flex-1 p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
