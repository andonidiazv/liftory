import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Search, ChevronLeft, ChevronRight, X, AlertTriangle, MoreHorizontal, Mail, KeyRound, CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

/* ─── types ─── */
interface UserRow {
  id: string;
  user_id: string;
  full_name: string | null;
  gender: string | null;
  weight_unit: string;
  subscription_status: string;
  subscription_tier: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  experience_level: string | null;
  training_days_per_week: number | null;
  training_location: string | null;
  injuries: string[] | null;
  injuries_detail: string | null;
  emotional_barriers: string | null;
  goals: string[] | null;
  wearable: string | null;
  created_at: string;
  updated_at: string;
}

interface OnboardingRow {
  experience_level: string;
  primary_goal: string;
  training_days: number;
  equipment: string;
  injuries: string[] | null;
  emotional_barriers: string[] | null;
}

interface UserStats {
  totalWorkouts: number;
  totalPRs: number;
  lastWorkoutDate: string | null;
}

const PAGE_SIZE = 20;

const statusColors: Record<string, string> = {
  active: "#7A8B5C",
  trial: "#8A8A8E",
  expired: "#B8622F",
  cancelled: "#6B6360",
};

const levelColors: Record<string, string> = {
  beginner: "#7A8B5C",
  intermediate: "#B8622F",
  advanced: "#C9A96E",
};

export default function AdminUsers() {
  const { user: adminUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");

  // Detail panel
  const [selected, setSelected] = useState<UserRow | null>(null);
  const [selectedOnboarding, setSelectedOnboarding] = useState<OnboardingRow | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Confirm modal
  const [confirmAction, setConfirmAction] = useState<{ label: string; fn: () => Promise<void> } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Dropdown
  const [dropdownUserId, setDropdownUserId] = useState<string | null>(null);

  // Modals
  const [emailModal, setEmailModal] = useState<UserRow | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const [passwordModal, setPasswordModal] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // We need user emails — fetch from auth via a helper
  const [userEmails, setUserEmails] = useState<Record<string, string>>({});

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("user_profiles")
      .select("*", { count: "exact" })
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter !== "all") query = query.eq("subscription_status", statusFilter);
    if (tierFilter !== "all") query = query.eq("subscription_tier", tierFilter);
    if (search.trim()) {
      query = query.or(`full_name.ilike.%${search.trim()}%`);
    }

    const { data, count } = await query;
    setUsers((data as unknown as UserRow[]) || []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, statusFilter, tierFilter, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setPage(0); }, [statusFilter, tierFilter, search]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownUserId) return;
    const handler = () => setDropdownUserId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [dropdownUserId]);

  const openDetail = async (u: UserRow) => {
    setSelected(u);
    setSelectedOnboarding(null);
    setStatsLoading(true);
    const [workoutsRes, prsRes, lastRes, onbRes] = await Promise.all([
      supabase.from("workouts").select("*", { count: "exact", head: true }).eq("user_id", u.user_id).eq("is_completed", true),
      supabase.from("workout_sets").select("*", { count: "exact", head: true }).eq("user_id", u.user_id).eq("is_pr", true),
      supabase.from("workouts").select("completed_at").eq("user_id", u.user_id).eq("is_completed", true).order("completed_at", { ascending: false }).limit(1),
      supabase.from("onboarding_answers").select("experience_level, primary_goal, training_days, equipment, injuries, emotional_barriers").eq("user_id", u.user_id).maybeSingle(),
    ]);
    setStats({
      totalWorkouts: workoutsRes.count ?? 0,
      totalPRs: prsRes.count ?? 0,
      lastWorkoutDate: lastRes.data?.[0]?.completed_at ?? null,
    });
    setSelectedOnboarding(onbRes.data as OnboardingRow | null);
    setStatsLoading(false);
  };

  /* ─── Admin actions ─── */
  const auditAndUpdate = async (
    targetUser: UserRow,
    actionType: string,
    newValues: Record<string, unknown>
  ) => {
    const oldValues: Record<string, unknown> = {};
    for (const key of Object.keys(newValues)) {
      oldValues[key] = (targetUser as any)[key];
    }

    const { error } = await supabase
      .from("user_profiles")
      .update(newValues)
      .eq("user_id", targetUser.user_id);

    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }

    await supabase.from("audit_log").insert({
      admin_user_id: adminUser!.id,
      action_type: actionType,
      target_table: "user_profiles",
      target_id: targetUser.user_id,
      old_values: oldValues,
      new_values: newValues,
    } as any);

    toast({ title: "Acción completada", description: `${actionType} aplicado correctamente.` });
    await fetchUsers();
    setSelected((prev) => prev ? { ...prev, ...newValues } as unknown as UserRow : null);
  };

  const activateSubscription = (u: UserRow) => {
    setConfirmAction({
      label: `Activar suscripción para ${u.full_name || u.user_id}`,
      fn: async () => {
        await auditAndUpdate(u, "subscription_activated", {
          subscription_status: "active",
          subscription_tier: "monthly",
        });
      },
    });
  };

  const deactivateSubscription = (u: UserRow) => {
    setConfirmAction({
      label: "¿Seguro? El usuario perderá acceso a la app",
      fn: async () => {
        await auditAndUpdate(u, "subscription_deactivated", {
          subscription_status: "expired",
          subscription_tier: null,
        });
      },
    });
  };

  /* ─── Credential actions via edge function ─── */
  const handleChangeEmail = async () => {
    if (!emailModal || !newEmail.trim()) return;
    setEmailLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-update-user", {
        body: { userId: emailModal.user_id, action: "update_email", newValue: newEmail.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Email actualizado", description: `Email cambiado a ${newEmail.trim()}` });
      setEmailModal(null);
      setNewEmail("");
      await fetchUsers();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo actualizar el email", variant: "destructive" });
    }
    setEmailLoading(false);
  };

  const handleSendRecovery = async () => {
    if (!passwordModal) return;
    setPasswordLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-update-user", {
        body: { userId: passwordModal.user_id, action: "send_recovery" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Email enviado", description: data?.message || "Email de recuperación enviado." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo enviar el email", variant: "destructive" });
    }
    setPasswordLoading(false);
  };

  const handleSetPassword = async () => {
    if (!passwordModal) return;
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 6 caracteres", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }
    setPasswordLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-update-user", {
        body: { userId: passwordModal.user_id, action: "update_password", newValue: newPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Contraseña actualizada", description: "La contraseña ha sido cambiada." });
      setPasswordModal(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo actualizar la contraseña", variant: "destructive" });
    }
    setPasswordLoading(false);
  };

  const toggleSubscription = (u: UserRow) => {
    const isActive = u.subscription_status === "active";
    setConfirmAction({
      label: isActive ? "Desactivar suscripción" : "Activar suscripción",
      fn: async () => {
        if (isActive) {
          await auditAndUpdate(u, "subscription_deactivated", {
            subscription_status: "expired",
            subscription_tier: null,
            current_period_end: null,
          });
        } else {
          await auditAndUpdate(u, "subscription_activated", {
            subscription_status: "active",
            subscription_tier: "monthly",
            current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
          });
        }
      },
    });
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="relative">
      <h1 className="text-hero" style={{ color: "#FAF8F5" }}>Usuarios</h1>
      <p className="mt-1 text-sm text-muted-foreground font-body">{total} usuarios registrados</p>

      {/* ─── Filters ─── */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full rounded-lg py-2.5 pl-10 pr-4 text-sm font-body"
            style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.08)", color: "#FAF8F5", outline: "none" }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg px-3 py-2.5 text-sm font-body"
          style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.08)", color: "#FAF8F5", outline: "none" }}
        >
          <option value="all">Todos los estados</option>
          <option value="trial">Trial</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="rounded-lg px-3 py-2.5 text-sm font-body"
          style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.08)", color: "#FAF8F5", outline: "none" }}
        >
          <option value="all">Todos los tiers</option>
          <option value="monthly">Monthly</option>
          <option value="semiannual">Semiannual</option>
          <option value="annual">Annual</option>
        </select>
      </div>

      {/* ─── Table ─── */}
      {loading ? (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" style={{ background: "#1C1C1E" }} />
          ))}
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl" style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.08)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(250,248,245,0.06)" }}>
                {["Nombre", "Nivel", "Estado", "Tier", "Días", "Registrado", ""].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-label-tech text-muted-foreground font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="cursor-pointer transition-colors"
                  style={{ borderBottom: "1px solid rgba(250,248,245,0.04)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(250,248,245,0.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td className="px-5 py-3 text-[13px] font-body" style={{ color: "#FAF8F5" }} onClick={() => openDetail(u)}>
                    {u.full_name || "Sin nombre"}
                  </td>
                  <td className="px-5 py-3" onClick={() => openDetail(u)}>
                    <span
                      className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: `${levelColors[u.experience_level || ""] || "#8A8A8E"}20`,
                        color: levelColors[u.experience_level || ""] || "#8A8A8E",
                      }}
                    >
                      {u.experience_level || "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3" onClick={() => openDetail(u)}>
                    <span
                      className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: `${statusColors[u.subscription_status] || "#8A8A8E"}20`,
                        color: statusColors[u.subscription_status] || "#8A8A8E",
                      }}
                    >
                      {u.subscription_status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[13px] text-muted-foreground" onClick={() => openDetail(u)}>{u.subscription_tier || "—"}</td>
                  <td className="px-5 py-3 text-[13px] text-muted-foreground font-mono" onClick={() => openDetail(u)}>{u.training_days_per_week ?? "—"}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground" onClick={() => openDetail(u)}>
                    {format(new Date(u.created_at), "dd MMM yyyy", { locale: es })}
                  </td>
                  <td className="px-5 py-3 relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDropdownUserId(dropdownUserId === u.user_id ? null : u.user_id);
                      }}
                      className="rounded-lg p-1.5 hover:bg-white/5 transition-colors"
                    >
                      <MoreHorizontal className="h-4 w-4" style={{ color: "#8A8A8E" }} />
                    </button>
                    {dropdownUserId === u.user_id && (
                      <div
                        className="absolute right-4 top-10 z-50 w-52 rounded-xl py-1.5 shadow-xl"
                        style={{ background: "#2A2A2E", border: "1px solid rgba(250,248,245,0.1)" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownItem
                          icon={<Mail className="h-4 w-4" />}
                          label="Cambiar email"
                          onClick={() => { setEmailModal(u); setDropdownUserId(null); }}
                        />
                        <DropdownItem
                          icon={<KeyRound className="h-4 w-4" />}
                          label="Resetear contraseña"
                          onClick={() => { setPasswordModal(u); setDropdownUserId(null); }}
                        />
                        <div className="my-1" style={{ borderTop: "1px solid rgba(250,248,245,0.06)" }} />
                        <DropdownItem
                          icon={<CreditCard className="h-4 w-4" />}
                          label={u.subscription_status === "active" ? "Desactivar suscripción" : "Activar suscripción"}
                          onClick={() => { toggleSubscription(u); setDropdownUserId(null); }}
                          danger={u.subscription_status === "active"}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">No hay usuarios con estos filtros.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Pagination ─── */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-mono">
            Página {page + 1} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg p-2 disabled:opacity-30 transition-colors"
              style={{ background: "#1C1C1E" }}
            >
              <ChevronLeft className="h-4 w-4" style={{ color: "#FAF8F5" }} />
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg p-2 disabled:opacity-30 transition-colors"
              style={{ background: "#1C1C1E" }}
            >
              <ChevronRight className="h-4 w-4" style={{ color: "#FAF8F5" }} />
            </button>
          </div>
        </div>
      )}

      {/* ─── Detail Panel (slide-in) ─── */}
      {selected && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setSelected(null)}
          />
          <div
            className="fixed right-0 top-0 z-50 h-full w-[400px] overflow-y-auto animate-fade-up"
            style={{ background: "#1C1C1E", borderLeft: "1px solid rgba(250,248,245,0.08)" }}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <h2 className="font-display text-lg font-semibold" style={{ color: "#FAF8F5" }}>
                {selected.full_name || "Sin nombre"}
              </h2>
              <button onClick={() => setSelected(null)} className="rounded-lg p-1.5 hover:bg-white/5 transition-colors">
                <X className="h-5 w-5" style={{ color: "#8A8A8E" }} />
              </button>
            </div>

            <div className="separator-dark" />

            {/* Section: Profile */}
            <div className="px-6 py-5 space-y-3">
              <span className="eyebrow-label">PERFIL</span>
              <DetailRow label="User ID" value={selected.user_id} mono />
              <DetailRow label="Género" value={selected.gender || "—"} />
              <DetailRow label="Unidad peso" value={selected.weight_unit} />
              <DetailRow label="Estado" value={selected.subscription_status} color={statusColors[selected.subscription_status]} />
              <DetailRow label="Tier" value={selected.subscription_tier || "—"} />
              
              <DetailRow label="Period end" value={selected.current_period_end ? format(new Date(selected.current_period_end), "dd MMM yyyy", { locale: es }) : "—"} />
              <DetailRow label="Registrado" value={format(new Date(selected.created_at), "dd MMM yyyy HH:mm", { locale: es })} />
            </div>

            <div className="separator-dark" />

            {/* Section: Onboarding */}
            <div className="px-6 py-5 space-y-3">
              <span className="eyebrow-label">ONBOARDING</span>
              {!selectedOnboarding ? (
                <p className="text-sm text-muted-foreground">Sin datos de onboarding.</p>
              ) : (
                <>
                  <DetailRow label="Nivel" value={selectedOnboarding.experience_level} />
                  <DetailRow label="Objetivo" value={selectedOnboarding.primary_goal} />
                  <DetailRow label="Días entreno" value={String(selectedOnboarding.training_days)} />
                  <DetailRow label="Equipamiento" value={selectedOnboarding.equipment} />
                  {selectedOnboarding.injuries && selectedOnboarding.injuries.length > 0 && (
                    <div>
                      <span className="text-label-tech text-muted-foreground">Lesiones</span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {selectedOnboarding.injuries.map((inj) => (
                          <span key={inj} className="pill text-xs">{inj}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedOnboarding.emotional_barriers && selectedOnboarding.emotional_barriers.length > 0 && (
                    <div>
                      <span className="text-label-tech text-muted-foreground">Barreras emocionales</span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {selectedOnboarding.emotional_barriers.map((b) => (
                          <span key={b} className="pill text-xs">{b}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="separator-dark" />

            {/* Section: Stats */}
            <div className="px-6 py-5 space-y-3">
              <span className="eyebrow-label">ESTADÍSTICAS</span>
              {statsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" style={{ background: "rgba(250,248,245,0.06)" }} />
                  <Skeleton className="h-4 w-24" style={{ background: "rgba(250,248,245,0.06)" }} />
                </div>
              ) : stats ? (
                <>
                  <DetailRow label="Workouts completados" value={String(stats.totalWorkouts)} />
                  <DetailRow label="Total PRs" value={String(stats.totalPRs)} />
                  <DetailRow
                    label="Último workout"
                    value={stats.lastWorkoutDate ? format(new Date(stats.lastWorkoutDate), "dd MMM yyyy", { locale: es }) : "Nunca"}
                  />
                  <DetailRow
                    label="Días sin entrenar"
                    value={stats.lastWorkoutDate
                      ? String(Math.floor((Date.now() - new Date(stats.lastWorkoutDate).getTime()) / 86400000))
                      : "—"}
                  />
                </>
              ) : null}
            </div>

            <div className="separator-dark" />

            {/* Section: Admin Actions */}
            <div className="px-6 py-5 space-y-3">
              <span className="eyebrow-label">ACCIONES ADMIN</span>
              <button
                onClick={() => { setEmailModal(selected); }}
                className="w-full rounded-lg px-4 py-2.5 text-sm font-body font-medium text-left transition-colors flex items-center gap-2"
                style={{ background: "rgba(250,248,245,0.04)", color: "#FAF8F5" }}
              >
                <Mail className="h-4 w-4" style={{ color: "#8A8A8E" }} /> Cambiar email
              </button>
              <button
                onClick={() => { setPasswordModal(selected); }}
                className="w-full rounded-lg px-4 py-2.5 text-sm font-body font-medium text-left transition-colors flex items-center gap-2"
                style={{ background: "rgba(250,248,245,0.04)", color: "#FAF8F5" }}
              >
                <KeyRound className="h-4 w-4" style={{ color: "#8A8A8E" }} /> Resetear contraseña
              </button>
              <div className="my-1" />
              {selected.subscription_status !== "active" && (
                <button
                  onClick={() => activateSubscription(selected)}
                  className="w-full rounded-lg px-4 py-2.5 text-sm font-body font-medium text-left transition-colors"
                  style={{ background: "rgba(122,139,92,0.1)", color: "#7A8B5C" }}
                >
                  Activar suscripción
                </button>
              )}
              {selected.subscription_status === "active" && (
                <button
                  onClick={() => deactivateSubscription(selected)}
                  className="w-full rounded-lg px-4 py-2.5 text-sm font-body font-medium text-left transition-colors"
                  style={{ background: "rgba(212,85,85,0.1)", color: "#D45555" }}
                >
                  Desactivar suscripción
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ─── Change Email Modal ─── */}
      {emailModal && (
        <ModalOverlay onClose={() => { setEmailModal(null); setNewEmail(""); }}>
          <h3 className="font-display text-base font-semibold mb-1" style={{ color: "#FAF8F5" }}>Cambiar email</h3>
          <p className="text-sm text-muted-foreground font-body mb-5">
            Usuario: <strong style={{ color: "#FAF8F5" }}>{emailModal.full_name || emailModal.user_id}</strong>
          </p>
          <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Nuevo email</label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="nuevo@email.com"
            className="w-full rounded-lg px-4 py-2.5 text-sm font-body mb-5"
            style={{ background: "#0D0C0A", border: "1px solid rgba(250,248,245,0.1)", color: "#FAF8F5", outline: "none" }}
          />
          <div className="flex gap-3">
            <button
              onClick={() => { setEmailModal(null); setNewEmail(""); }}
              disabled={emailLoading}
              className="flex-1 rounded-lg py-2.5 text-sm font-body font-medium transition-colors"
              style={{ background: "rgba(250,248,245,0.06)", color: "#FAF8F5" }}
            >
              Cancelar
            </button>
            <button
              onClick={handleChangeEmail}
              disabled={emailLoading || !newEmail.trim()}
              className="flex-1 rounded-lg py-2.5 text-sm font-body font-medium transition-colors disabled:opacity-50"
              style={{ background: "#B8622F", color: "#FAF8F5" }}
            >
              {emailLoading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* ─── Reset Password Modal ─── */}
      {passwordModal && (
        <ModalOverlay onClose={() => { setPasswordModal(null); setNewPassword(""); setConfirmPassword(""); }}>
          <h3 className="font-display text-base font-semibold mb-1" style={{ color: "#FAF8F5" }}>Resetear contraseña</h3>
          <p className="text-sm text-muted-foreground font-body mb-5">
            Usuario: <strong style={{ color: "#FAF8F5" }}>{passwordModal.full_name || passwordModal.user_id}</strong>
          </p>

          {/* Option A: Send recovery email */}
          <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(250,248,245,0.03)", border: "1px solid rgba(250,248,245,0.06)" }}>
            <p className="text-xs font-mono text-muted-foreground mb-2">OPCIÓN A — ENVIAR EMAIL DE RECUPERACIÓN</p>
            <p className="text-sm text-muted-foreground font-body mb-3">
              El usuario recibirá un link para crear una nueva contraseña.
            </p>
            <button
              onClick={handleSendRecovery}
              disabled={passwordLoading}
              className="w-full rounded-lg py-2.5 text-sm font-body font-medium transition-colors disabled:opacity-50"
              style={{ background: "rgba(250,248,245,0.06)", color: "#FAF8F5" }}
            >
              {passwordLoading ? "Enviando..." : "Enviar email de recuperación"}
            </button>
          </div>

          {/* Option B: Set manual password */}
          <div className="rounded-xl p-4" style={{ background: "rgba(250,248,245,0.03)", border: "1px solid rgba(250,248,245,0.06)" }}>
            <p className="text-xs font-mono text-muted-foreground mb-3">OPCIÓN B — ESTABLECER CONTRASEÑA MANUAL</p>
            <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Nueva contraseña</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full rounded-lg px-4 py-2.5 text-sm font-body mb-3"
              style={{ background: "#0D0C0A", border: "1px solid rgba(250,248,245,0.1)", color: "#FAF8F5", outline: "none" }}
            />
            <label className="text-xs font-mono text-muted-foreground mb-1.5 block">Confirmar contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repetir contraseña"
              className="w-full rounded-lg px-4 py-2.5 text-sm font-body mb-4"
              style={{ background: "#0D0C0A", border: "1px solid rgba(250,248,245,0.1)", color: "#FAF8F5", outline: "none" }}
            />
            <button
              onClick={handleSetPassword}
              disabled={passwordLoading || newPassword.length < 6 || newPassword !== confirmPassword}
              className="w-full rounded-lg py-2.5 text-sm font-body font-medium transition-colors disabled:opacity-50"
              style={{ background: "#B8622F", color: "#FAF8F5" }}
            >
              {passwordLoading ? "Guardando..." : "Guardar contraseña"}
            </button>
          </div>

          <button
            onClick={() => { setPasswordModal(null); setNewPassword(""); setConfirmPassword(""); }}
            className="mt-4 w-full rounded-lg py-2.5 text-sm font-body font-medium transition-colors"
            style={{ background: "rgba(250,248,245,0.06)", color: "#FAF8F5" }}
          >
            Cancelar
          </button>
        </ModalOverlay>
      )}

      {/* ─── Confirm Modal ─── */}
      {confirmAction && (
        <ModalOverlay onClose={() => setConfirmAction(null)}>
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h3 className="font-display text-base font-semibold" style={{ color: "#FAF8F5" }}>Confirmar acción</h3>
          </div>
          <p className="text-sm text-muted-foreground font-body mb-1">
            <strong style={{ color: "#FAF8F5" }}>{confirmAction.label}</strong>
          </p>
          <p className="text-sm text-muted-foreground font-body mb-6">
            ¿Estás seguro? Esta acción se registrará en el audit log.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmAction(null)}
              disabled={actionLoading}
              className="flex-1 rounded-lg py-2.5 text-sm font-body font-medium transition-colors"
              style={{ background: "rgba(250,248,245,0.06)", color: "#FAF8F5" }}
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                setActionLoading(true);
                await confirmAction.fn();
                setActionLoading(false);
                setConfirmAction(null);
              }}
              disabled={actionLoading}
              className="flex-1 rounded-lg py-2.5 text-sm font-body font-medium transition-colors"
              style={{ background: "#B8622F", color: "#FAF8F5" }}
            >
              {actionLoading ? "Procesando..." : "Confirmar"}
            </button>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

/* ─── Helper Components ─── */
function DetailRow({ label, value, mono, color }: { label: string; value: string; mono?: boolean; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-label-tech text-muted-foreground">{label}</span>
      <span
        className={`text-[13px] ${mono ? "font-mono" : "font-body"}`}
        style={{ color: color || "#FAF8F5", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
      >
        {value}
      </span>
    </div>
  );
}

function DropdownItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-4 py-2 text-sm font-body transition-colors hover:bg-white/5"
      style={{ color: danger ? "#E74C3C" : "#FAF8F5" }}
    >
      <span style={{ color: danger ? "#E74C3C" : "#8A8A8E" }}>{icon}</span>
      {label}
    </button>
  );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div
        className="w-[420px] max-h-[90vh] overflow-y-auto rounded-xl p-6"
        style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.08)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
