import { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw, Mail, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PastDueUser {
  user_id: string;
  subscription_status: string;
  subscription_tier: string | null;
  payment_failed_at: string | null;
  dunning_step: number;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  // joined from auth
  email?: string;
  display_name?: string;
}

const TIER_LABELS: Record<string, string> = {
  monthly: "Mensual",
  semiannual: "Semestral",
  annual: "Anual",
};

const DUNNING_LABELS: Record<number, string> = {
  0: "Sin enviar",
  1: "Dia 1 — Notificacion",
  2: "Dia 3 — Recordatorio",
  3: "Dia 7 — Ultimo aviso",
  4: "Dia 14 — Pausado",
};

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminPayments() {
  const [users, setUsers] = useState<PastDueUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPastDueUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get all users with payment issues
      const { data, error: queryError } = await (supabase as any)
        .from("user_profiles")
        .select("user_id, subscription_status, subscription_tier, payment_failed_at, dunning_step, current_period_end, stripe_customer_id")
        .in("subscription_status", ["past_due", "cancelled"])
        .order("payment_failed_at", { ascending: false, nullsFirst: false });

      if (queryError) throw queryError;

      // Enrich with user email info via auth admin
      // Note: We can't call auth.admin from client, so we'll use a workaround
      // by getting emails from a separate query or displaying user_id
      // For now, we'll fetch emails via the admin edge function pattern
      const enriched: PastDueUser[] = (data || []).map((u: any) => ({
        ...u,
        email: undefined,
        display_name: undefined,
      }));

      // Try to get user emails via service role (if available from a view or function)
      // For now we'll show user_id and link to user management
      setUsers(enriched);
    } catch (err: any) {
      console.error("[AdminPayments] Error:", err);
      setError(err.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPastDueUsers();
  }, []);

  const pastDueUsers = users.filter((u) => u.subscription_status === "past_due");
  const cancelledUsers = users.filter((u) => u.subscription_status === "cancelled");

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="font-display"
            style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "#FAF8F5" }}
          >
            Pagos
          </h1>
          <p className="font-body text-sm mt-1" style={{ color: "#8A8A8E" }}>
            Usuarios con problemas de pago y suscripciones vencidas
          </p>
        </div>
        <button
          onClick={fetchPastDueUsers}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 font-body text-sm transition-all"
          style={{ background: "rgba(255,255,255,0.06)", color: "#FAF8F5" }}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {error && (
        <div
          className="rounded-xl px-4 py-3 mb-6 flex items-center gap-3"
          style={{ background: "rgba(255,59,48,0.1)", border: "1px solid rgba(255,59,48,0.2)" }}
        >
          <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "#FF3B30" }} />
          <p className="font-body text-sm" style={{ color: "#FF3B30" }}>
            {error}
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div
          className="rounded-xl px-5 py-4"
          style={{ background: "#1C1C1E", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="font-body text-xs uppercase tracking-wider" style={{ color: "#8A8A8E" }}>
            Pagos pendientes
          </p>
          <p
            className="font-display mt-1"
            style={{ fontSize: 32, fontWeight: 800, color: pastDueUsers.length > 0 ? "#FF9500" : "#34C759" }}
          >
            {pastDueUsers.length}
          </p>
        </div>
        <div
          className="rounded-xl px-5 py-4"
          style={{ background: "#1C1C1E", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="font-body text-xs uppercase tracking-wider" style={{ color: "#8A8A8E" }}>
            Cancelados
          </p>
          <p
            className="font-display mt-1"
            style={{ fontSize: 32, fontWeight: 800, color: cancelledUsers.length > 0 ? "#FF3B30" : "#34C759" }}
          >
            {cancelledUsers.length}
          </p>
        </div>
        <div
          className="rounded-xl px-5 py-4"
          style={{ background: "#1C1C1E", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="font-body text-xs uppercase tracking-wider" style={{ color: "#8A8A8E" }}>
            Recuperacion necesaria
          </p>
          <p
            className="font-display mt-1"
            style={{ fontSize: 32, fontWeight: 800, color: "#FAF8F5" }}
          >
            {pastDueUsers.length + cancelledUsers.length}
          </p>
        </div>
      </div>

      {/* Past Due Table */}
      <div className="mb-8">
        <h2
          className="font-display mb-4"
          style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", color: "#FAF8F5" }}
        >
          Pagos pendientes
        </h2>

        {pastDueUsers.length === 0 && !loading ? (
          <div
            className="rounded-xl px-6 py-8 text-center"
            style={{ background: "#1C1C1E", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <p className="font-body text-sm" style={{ color: "#8A8A8E" }}>
              No hay usuarios con pagos pendientes
            </p>
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "#1C1C1E", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th className="px-4 py-3 text-left font-body text-xs uppercase tracking-wider" style={{ color: "#8A8A8E" }}>
                    Usuario
                  </th>
                  <th className="px-4 py-3 text-left font-body text-xs uppercase tracking-wider" style={{ color: "#8A8A8E" }}>
                    Plan
                  </th>
                  <th className="px-4 py-3 text-left font-body text-xs uppercase tracking-wider" style={{ color: "#8A8A8E" }}>
                    Fallo hace
                  </th>
                  <th className="px-4 py-3 text-left font-body text-xs uppercase tracking-wider" style={{ color: "#8A8A8E" }}>
                    Dunning
                  </th>
                  <th className="px-4 py-3 text-left font-body text-xs uppercase tracking-wider" style={{ color: "#8A8A8E" }}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {pastDueUsers.map((user) => {
                  const days = daysSince(user.payment_failed_at);
                  const urgency = days >= 14 ? "#FF3B30" : days >= 7 ? "#FF9500" : "#FFCC00";

                  return (
                    <tr
                      key={user.user_id}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    >
                      <td className="px-4 py-3">
                        <p className="font-body text-sm" style={{ color: "#FAF8F5" }}>
                          {user.user_id.slice(0, 8)}...
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block rounded-md px-2 py-0.5 font-body text-xs"
                          style={{ background: "rgba(199,91,57,0.15)", color: "#C75B39" }}
                        >
                          {TIER_LABELS[user.subscription_tier || ""] || user.subscription_tier || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-display text-sm" style={{ fontWeight: 700, color: urgency }}>
                          {days} dias
                        </span>
                        <p className="font-body text-xs mt-0.5" style={{ color: "#8A8A8E" }}>
                          {formatDate(user.payment_failed_at)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-body text-xs" style={{ color: "#8A8A8E" }}>
                          {DUNNING_LABELS[user.dunning_step] || `Step ${user.dunning_step}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {user.stripe_customer_id && (
                            <a
                              href={`https://dashboard.stripe.com/customers/${user.stripe_customer_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 rounded-md px-2 py-1 font-body text-xs transition-colors"
                              style={{ background: "rgba(255,255,255,0.06)", color: "#8A8A8E" }}
                            >
                              <ExternalLink className="h-3 w-3" />
                              Stripe
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancelled Users Table */}
      {cancelledUsers.length > 0 && (
        <div>
          <h2
            className="font-display mb-4"
            style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", color: "#FAF8F5" }}
          >
            Cancelados
          </h2>
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "#1C1C1E", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th className="px-4 py-3 text-left font-body text-xs uppercase tracking-wider" style={{ color: "#8A8A8E" }}>
                    Usuario
                  </th>
                  <th className="px-4 py-3 text-left font-body text-xs uppercase tracking-wider" style={{ color: "#8A8A8E" }}>
                    Plan
                  </th>
                  <th className="px-4 py-3 text-left font-body text-xs uppercase tracking-wider" style={{ color: "#8A8A8E" }}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {cancelledUsers.map((user) => (
                  <tr
                    key={user.user_id}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <td className="px-4 py-3">
                      <p className="font-body text-sm" style={{ color: "#FAF8F5" }}>
                        {user.user_id.slice(0, 8)}...
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block rounded-md px-2 py-0.5 font-body text-xs"
                        style={{ background: "rgba(255,59,48,0.1)", color: "#FF3B30" }}
                      >
                        {TIER_LABELS[user.subscription_tier || ""] || user.subscription_tier || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.stripe_customer_id && (
                        <a
                          href={`https://dashboard.stripe.com/customers/${user.stripe_customer_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-md px-2 py-1 font-body text-xs transition-colors w-fit"
                          style={{ background: "rgba(255,255,255,0.06)", color: "#8A8A8E" }}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Stripe
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
