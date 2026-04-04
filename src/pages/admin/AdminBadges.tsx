import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  Award,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  ExternalLink,
  Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BadgeClaim {
  id: string;
  user_id: string;
  badge_tier_id: string;
  status: "pending" | "approved" | "rejected";
  proof_url: string | null;
  review_notes: string | null;
  reviewed_by: string | null;
  earned_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  // joined fields
  user_name: string;
  user_email: string;
  badge_name: string;
  tier_name: string;
}

interface BadgeDefinition {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  created_at: string;
  tier_count: number;
}

type TabStatus = "pending" | "approved" | "rejected";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminBadges() {
  const { user } = useAuth();

  // Claims state
  const [claims, setClaims] = useState<BadgeClaim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [activeTab, setActiveTab] = useState<TabStatus>("pending");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Definitions state
  const [definitions, setDefinitions] = useState<BadgeDefinition[]>([]);
  const [loadingDefs, setLoadingDefs] = useState(true);

  /* ---- Fetch claims ---- */
  const fetchClaims = async () => {
    setLoadingClaims(true);

    const { data, error } = await (supabase as any)
      .from("user_badges")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error || !data) {
      console.error("Error fetching badge claims:", error);
      setLoadingClaims(false);
      return;
    }

    // Gather unique IDs for joins
    const userIds = [...new Set(data.map((r: any) => r.user_id))];
    const tierIds = [...new Set(data.map((r: any) => r.badge_tier_id).filter(Boolean))];

    const [profilesRes, tiersRes] = await Promise.all([
      supabase.from("user_profiles").select("id, full_name, email").in("id", userIds as string[]),
      tierIds.length > 0
        ? (supabase as any).from("badge_tiers").select("id, name, badge_definition_id").in("id", tierIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profiles = profilesRes.data || [];
    const tiers = tiersRes.data || [];

    // Get badge definition names for tiers
    const defIds = [...new Set(tiers.map((t: any) => t.badge_definition_id).filter(Boolean))];
    let defsMap = new Map<string, string>();
    if (defIds.length > 0) {
      const { data: defs } = await (supabase as any)
        .from("badge_definitions")
        .select("id, name")
        .in("id", defIds);
      defsMap = new Map((defs || []).map((d: any) => [d.id, d.name]));
    }

    const profileMap = new Map(profiles.map((p: any) => [p.id, p]));
    const tierMap = new Map(tiers.map((t: any) => [t.id, t]));

    const enriched: BadgeClaim[] = data.map((r: any) => {
      const profile = profileMap.get(r.user_id) as any;
      const tier = tierMap.get(r.badge_tier_id) as any;
      return {
        ...r,
        user_name: profile?.full_name || "---",
        user_email: profile?.email || "---",
        tier_name: tier?.name || "---",
        badge_name: tier ? (defsMap.get(tier.badge_definition_id) || "---") : "---",
      };
    });

    setClaims(enriched);
    setLoadingClaims(false);
  };

  /* ---- Fetch definitions ---- */
  const fetchDefinitions = async () => {
    setLoadingDefs(true);

    const { data: defs, error } = await (supabase as any)
      .from("badge_definitions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !defs) {
      console.error("Error fetching badge definitions:", error);
      setLoadingDefs(false);
      return;
    }

    // Count tiers per definition
    const defIds = defs.map((d: any) => d.id);
    let tierCounts = new Map<string, number>();
    if (defIds.length > 0) {
      const { data: tiers } = await (supabase as any)
        .from("badge_tiers")
        .select("id, badge_definition_id")
        .in("badge_definition_id", defIds);

      for (const t of tiers || []) {
        tierCounts.set(t.badge_definition_id, (tierCounts.get(t.badge_definition_id) || 0) + 1);
      }
    }

    const enriched: BadgeDefinition[] = defs.map((d: any) => ({
      ...d,
      tier_count: tierCounts.get(d.id) || 0,
    }));

    setDefinitions(enriched);
    setLoadingDefs(false);
  };

  useEffect(() => {
    fetchClaims();
    fetchDefinitions();
  }, []);

  /* ---- Approve / Reject ---- */
  const handleAction = async (claimId: string, action: "approved" | "rejected") => {
    if (!user) return;
    setProcessingId(claimId);

    const notes = reviewNotes[claimId] || null;
    const now = new Date().toISOString();

    const updatePayload: Record<string, any> = {
      status: action,
      review_notes: notes,
      reviewed_by: user.id,
      reviewed_at: now,
    };

    if (action === "approved") {
      updatePayload.earned_at = now;
    }

    const { error } = await (supabase as any)
      .from("user_badges")
      .update(updatePayload)
      .eq("id", claimId);

    if (error) {
      console.error("Error updating badge claim:", error);
    } else {
      // Update local state
      setClaims((prev) =>
        prev.map((c) =>
          c.id === claimId
            ? { ...c, status: action, review_notes: notes, reviewed_by: user.id, reviewed_at: now, earned_at: action === "approved" ? now : c.earned_at }
            : c
        )
      );
      // Clear notes for this claim
      setReviewNotes((prev) => {
        const next = { ...prev };
        delete next[claimId];
        return next;
      });
    }

    setProcessingId(null);
  };

  /* ---- Derived data ---- */
  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    for (const c of claims) {
      if (c.status === "pending") pending++;
      else if (c.status === "approved") approved++;
      else if (c.status === "rejected") rejected++;
    }
    return { pending, approved, rejected, total: claims.length };
  }, [claims]);

  const filteredClaims = useMemo(
    () => claims.filter((c) => c.status === activeTab),
    [claims, activeTab]
  );

  /* ---- Loading skeleton ---- */
  if (loadingClaims && loadingDefs) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded bg-white/5 animate-pulse" />
        <div className="h-64 rounded-xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  /* ---- Tabs config ---- */
  const tabs: { key: TabStatus; label: string; count: number }[] = [
    { key: "pending", label: "Pendientes", count: counts.pending },
    { key: "approved", label: "Aprobados", count: counts.approved },
    { key: "rejected", label: "Rechazados", count: counts.rejected },
  ];

  return (
    <div className="space-y-8">
      {/* =============== Header =============== */}
      <div>
        <h1
          className="font-display text-xl font-bold"
          style={{ color: "#FAF8F5", letterSpacing: "-0.02em" }}
        >
          Badges
        </h1>
        <p className="font-body text-sm mt-1" style={{ color: "#8A8A8E" }}>
          Revisa claims de badges y definiciones de LIFTORY
        </p>
      </div>

      {/* =============== Section 2: Badge Stats =============== */}
      <div>
        <p
          className="font-mono uppercase text-xs mb-3"
          style={{ color: "#8A8A8E", letterSpacing: "0.1em", fontSize: 10 }}
        >
          Resumen
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Definiciones", value: definitions.length, icon: Shield },
            { label: "Total claims", value: counts.total, icon: Award },
            { label: "Pendientes", value: counts.pending, icon: Clock },
            { label: "Aprobados", value: counts.approved, icon: CheckCircle },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-xl p-4"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4" style={{ color: "#8A8A8E" }} />
                <p
                  className="font-mono uppercase text-xs"
                  style={{ color: "#8A8A8E", letterSpacing: "0.1em", fontSize: 10 }}
                >
                  {label}
                </p>
              </div>
              <p
                className="font-display text-2xl font-bold"
                style={{ color: "#FAF8F5" }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* =============== Section 1: Claims Review Queue =============== */}
      <div>
        <p
          className="font-mono uppercase text-xs mb-3"
          style={{ color: "#8A8A8E", letterSpacing: "0.1em", fontSize: 10 }}
        >
          Claims de badges
        </p>

        {/* Tabs */}
        <div
          className="flex gap-1 rounded-lg p-1 mb-4"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-2 rounded-md px-4 py-2 font-body text-sm transition-colors"
                style={{
                  background: isActive ? "rgba(199,91,57,0.15)" : "transparent",
                  color: isActive ? "#C75B39" : "#8A8A8E",
                }}
              >
                {tab.label}
                <span
                  className="font-mono text-xs rounded-full px-1.5 py-0.5"
                  style={{
                    background: isActive
                      ? "rgba(199,91,57,0.2)"
                      : "rgba(255,255,255,0.05)",
                    color: isActive ? "#C75B39" : "#8A8A8E",
                    fontSize: 10,
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Claims list */}
        {loadingClaims ? (
          <div className="h-48 rounded-xl bg-white/5 animate-pulse" />
        ) : filteredClaims.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 rounded-xl"
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            <Award className="h-10 w-10 mb-3" style={{ color: "#8A8A8E" }} />
            <p className="font-body text-sm" style={{ color: "#8A8A8E" }}>
              No hay claims{" "}
              {activeTab === "pending"
                ? "pendientes"
                : activeTab === "approved"
                  ? "aprobados"
                  : "rechazados"}
            </p>
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <table className="w-full text-left">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                  {["Usuario", "Badge", "Tier", "Prueba", "Fecha", ...(activeTab === "pending" ? ["Notas", "Acciones"] : ["Notas"])].map(
                    (header) => (
                      <th
                        key={header}
                        className="font-mono uppercase text-xs px-4 py-3"
                        style={{
                          color: "#8A8A8E",
                          letterSpacing: "0.1em",
                          fontSize: 10,
                        }}
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredClaims.map((claim) => (
                  <tr
                    key={claim.id}
                    style={{
                      borderTop: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    {/* User */}
                    <td className="px-4 py-3">
                      <p
                        className="font-body text-sm"
                        style={{ color: "#FAF8F5" }}
                      >
                        {claim.user_name}
                      </p>
                      <p
                        className="font-mono text-xs"
                        style={{ color: "#8A8A8E", fontSize: 10 }}
                      >
                        {claim.user_email}
                      </p>
                    </td>

                    {/* Badge name */}
                    <td
                      className="font-body text-sm px-4 py-3"
                      style={{ color: "#FAF8F5" }}
                    >
                      {claim.badge_name}
                    </td>

                    {/* Tier */}
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2 py-0.5 font-body text-xs"
                        style={{
                          background: "rgba(199,91,57,0.1)",
                          color: "#C75B39",
                          fontSize: 11,
                        }}
                      >
                        {claim.tier_name}
                      </span>
                    </td>

                    {/* Proof — inline video player */}
                    <td className="px-4 py-3">
                      {claim.proof_url ? (
                        claim.proof_url.includes("badge-videos") ? (
                          <video
                            src={claim.proof_url}
                            className="rounded-lg"
                            style={{ width: 160, maxHeight: 120, background: "#0D0C0A" }}
                            controls
                            playsInline
                            muted
                            preload="metadata"
                          />
                        ) : (
                          <a
                            href={claim.proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-body text-xs transition-colors"
                            style={{ color: "#C75B39" }}
                          >
                            Ver prueba
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )
                      ) : (
                        <span
                          className="font-body text-xs"
                          style={{ color: "#8A8A8E" }}
                        >
                          ---
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td
                      className="font-body text-sm px-4 py-3 whitespace-nowrap"
                      style={{ color: "#FAF8F5" }}
                    >
                      {formatDate(claim.created_at)}
                    </td>

                    {/* Review notes */}
                    <td className="px-4 py-3">
                      {activeTab === "pending" ? (
                        <textarea
                          value={reviewNotes[claim.id] || ""}
                          onChange={(e) =>
                            setReviewNotes((prev) => ({
                              ...prev,
                              [claim.id]: e.target.value,
                            }))
                          }
                          placeholder="Notas (opcional)"
                          rows={2}
                          className="w-full rounded-lg px-3 py-2 font-body text-xs resize-none"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            color: "#FAF8F5",
                            border: "1px solid rgba(255,255,255,0.1)",
                            minWidth: 160,
                          }}
                        />
                      ) : (
                        <span
                          className="font-body text-xs"
                          style={{ color: "#8A8A8E" }}
                        >
                          {claim.review_notes || "---"}
                        </span>
                      )}
                    </td>

                    {/* Actions (only for pending) */}
                    {activeTab === "pending" && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAction(claim.id, "approved")}
                            disabled={processingId === claim.id}
                            className="flex items-center gap-1 rounded-lg px-3 py-1.5 font-body text-xs font-medium transition-colors disabled:opacity-40"
                            style={{
                              background: "rgba(34,197,94,0.15)",
                              color: "#22C55E",
                            }}
                          >
                            {processingId === claim.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleAction(claim.id, "rejected")}
                            disabled={processingId === claim.id}
                            className="flex items-center gap-1 rounded-lg px-3 py-1.5 font-body text-xs font-medium transition-colors disabled:opacity-40"
                            style={{
                              background: "rgba(239,68,68,0.15)",
                              color: "#EF4444",
                            }}
                          >
                            {processingId === claim.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            Rechazar
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =============== Section 2b: Badge Definitions List =============== */}
      <div>
        <p
          className="font-mono uppercase text-xs mb-3"
          style={{ color: "#8A8A8E", letterSpacing: "0.1em", fontSize: 10 }}
        >
          Definiciones de badges
        </p>

        {loadingDefs ? (
          <div className="h-32 rounded-xl bg-white/5 animate-pulse" />
        ) : definitions.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 rounded-xl"
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            <Shield className="h-10 w-10 mb-3" style={{ color: "#8A8A8E" }} />
            <p className="font-body text-sm" style={{ color: "#8A8A8E" }}>
              No hay badges definidos
            </p>
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <table className="w-full text-left">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                  {["Nombre", "Categoria", "Tiers", "Creado"].map((h) => (
                    <th
                      key={h}
                      className="font-mono uppercase text-xs px-4 py-3"
                      style={{
                        color: "#8A8A8E",
                        letterSpacing: "0.1em",
                        fontSize: 10,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {definitions.map((def) => (
                  <tr
                    key={def.id}
                    style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <td className="px-4 py-3">
                      <p
                        className="font-body text-sm"
                        style={{ color: "#FAF8F5" }}
                      >
                        {def.name}
                      </p>
                      {def.description && (
                        <p
                          className="font-body text-xs mt-0.5"
                          style={{ color: "#8A8A8E" }}
                        >
                          {def.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-full px-2 py-0.5 font-body text-xs"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          color: "#8A8A8E",
                          fontSize: 11,
                        }}
                      >
                        {def.category || "---"}
                      </span>
                    </td>
                    <td
                      className="font-display text-sm font-bold px-4 py-3"
                      style={{ color: "#FAF8F5" }}
                    >
                      {def.tier_count}
                    </td>
                    <td
                      className="font-body text-sm px-4 py-3 whitespace-nowrap"
                      style={{ color: "#FAF8F5" }}
                    >
                      {formatDate(def.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
