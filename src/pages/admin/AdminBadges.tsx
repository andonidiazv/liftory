import { useEffect, useState, useMemo, useCallback } from "react";
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
  Plus,
  Copy,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Save,
  X,
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

interface BadgeDefinitionFull {
  id: string;
  slug: string;
  name: string;
  exercise_name: string;
  category: string;
  description: string | null;
  fun_fact: string | null;
  icon_name: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  tiers: TierData[];
}

interface TierData {
  id?: string;
  tier: "longevity" | "excelente" | "elite";
  tier_label: string;
  weight_male: number | null;
  weight_female: number | null;
  reps_male: number;
  reps_female: number;
  color: string;
  sort_order: number;
}

interface BadgeFormData {
  slug: string;
  name: string;
  exercise_name: string;
  category: "compound" | "olympic" | "bodyweight";
  description: string;
  fun_fact: string;
  icon_name: string;
  is_active: boolean;
  tiers: TierData[];
}

type TabStatus = "pending" | "approved" | "rejected";
type AdminView = "claims" | "definitions";

const TIER_DEFAULTS: TierData[] = [
  { tier: "longevity", tier_label: "LONGEVITY STRENGTH", weight_male: null, weight_female: null, reps_male: 5, reps_female: 5, color: "#7A8B5C", sort_order: 1 },
  { tier: "excelente", tier_label: "EXCELENTE", weight_male: null, weight_female: null, reps_male: 5, reps_female: 5, color: "#C75B39", sort_order: 2 },
  { tier: "elite", tier_label: "ELITE", weight_male: null, weight_female: null, reps_male: 5, reps_female: 5, color: "#C9A96E", sort_order: 3 },
];

const CATEGORY_OPTIONS = [
  { value: "compound", label: "Compound" },
  { value: "olympic", label: "Olympic" },
  { value: "bodyweight", label: "Bodyweight" },
];

const EMPTY_FORM: BadgeFormData = {
  slug: "",
  name: "",
  exercise_name: "",
  category: "compound",
  description: "",
  fun_fact: "",
  icon_name: "trophy",
  is_active: true,
  tiers: TIER_DEFAULTS.map((t) => ({ ...t })),
};

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-mono uppercase text-xs mb-3"
      style={{ color: "#8A8A8E", letterSpacing: "0.1em", fontSize: 10 }}
    >
      {children}
    </p>
  );
}

function FormField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label
        className="block font-mono uppercase text-xs mb-1.5"
        style={{ color: "#8A8A8E", letterSpacing: "0.08em", fontSize: 10 }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  value: string | number | null;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg px-3 py-2 font-body text-sm"
      style={{
        background: "rgba(255,255,255,0.05)",
        color: "#FAF8F5",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
      {...rest}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Badge Builder Form                                                 */
/* ------------------------------------------------------------------ */

function BadgeBuilderForm({
  initial,
  exerciseNames,
  onSave,
  onCancel,
  saving,
}: {
  initial: BadgeFormData;
  exerciseNames: string[];
  onSave: (data: BadgeFormData) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<BadgeFormData>(() =>
    JSON.parse(JSON.stringify(initial))
  );

  const update = <K extends keyof BadgeFormData>(k: K, v: BadgeFormData[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const updateTier = (idx: number, field: keyof TierData, val: any) => {
    setForm((prev) => {
      const tiers = prev.tiers.map((t, i) =>
        i === idx ? { ...t, [field]: val } : t
      );
      return { ...prev, tiers };
    });
  };

  // Auto-generate slug from name
  const handleNameChange = (val: string) => {
    update("name", val);
    if (!initial.slug) {
      update("slug", slugify(val));
    }
  };

  const isBodyweight = form.category === "bodyweight";

  return (
    <div
      className="rounded-xl p-6 space-y-6"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Row 1: Name + Slug */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Nombre del badge">
          <Input
            value={form.name}
            onChange={handleNameChange}
            placeholder="FRONT SQUAT CLUB"
          />
        </FormField>
        <FormField label="Slug (URL)">
          <Input
            value={form.slug}
            onChange={(v) => update("slug", v)}
            placeholder="front-squat-club"
          />
        </FormField>
      </div>

      {/* Row 2: Exercise + Category + Icon */}
      <div className="grid grid-cols-3 gap-4">
        <FormField label="Ejercicio">
          <div className="relative">
            <select
              value={form.exercise_name}
              onChange={(e) => update("exercise_name", e.target.value)}
              className="w-full rounded-lg px-3 py-2 font-body text-sm appearance-none cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: form.exercise_name ? "#FAF8F5" : "#8A8A8E",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <option value="">Seleccionar ejercicio...</option>
              {exerciseNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
              style={{ color: "#8A8A8E" }}
            />
          </div>
        </FormField>
        <FormField label="Categoria">
          <div className="relative">
            <select
              value={form.category}
              onChange={(e) =>
                update("category", e.target.value as BadgeFormData["category"])
              }
              className="w-full rounded-lg px-3 py-2 font-body text-sm appearance-none cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "#FAF8F5",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
              style={{ color: "#8A8A8E" }}
            />
          </div>
        </FormField>
        <FormField label="Icono (lucide)">
          <Input
            value={form.icon_name}
            onChange={(v) => update("icon_name", v)}
            placeholder="trophy"
          />
        </FormField>
      </div>

      {/* Row 3: Description + Fun fact */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Descripcion">
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Descripcion corta del badge..."
            rows={2}
            className="w-full rounded-lg px-3 py-2 font-body text-sm resize-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "#FAF8F5",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          />
        </FormField>
        <FormField label="Fun fact">
          <textarea
            value={form.fun_fact}
            onChange={(e) => update("fun_fact", e.target.value)}
            placeholder="Dato interesante..."
            rows={2}
            className="w-full rounded-lg px-3 py-2 font-body text-sm resize-none"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "#FAF8F5",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          />
        </FormField>
      </div>

      {/* Tiers */}
      <div>
        <SectionLabel>Tiers (hombre / mujer)</SectionLabel>
        <div className="space-y-3">
          {form.tiers.map((tier, idx) => (
            <div
              key={tier.tier}
              className="rounded-lg p-4 grid grid-cols-6 gap-3 items-end"
              style={{
                background: "rgba(255,255,255,0.02)",
                borderLeft: `3px solid ${tier.color}`,
              }}
            >
              {/* Tier label */}
              <FormField label="Tier" className="col-span-1">
                <p
                  className="font-body text-sm font-semibold py-2"
                  style={{ color: tier.color }}
                >
                  {tier.tier_label}
                </p>
              </FormField>

              {/* Weight Male */}
              <FormField label="Peso (H) kg">
                <Input
                  type="number"
                  value={isBodyweight ? "" : tier.weight_male}
                  onChange={(v) =>
                    updateTier(
                      idx,
                      "weight_male",
                      v === "" ? null : parseFloat(v)
                    )
                  }
                  placeholder={isBodyweight ? "N/A" : "0"}
                  disabled={isBodyweight}
                />
              </FormField>

              {/* Weight Female */}
              <FormField label="Peso (M) kg">
                <Input
                  type="number"
                  value={isBodyweight ? "" : tier.weight_female}
                  onChange={(v) =>
                    updateTier(
                      idx,
                      "weight_female",
                      v === "" ? null : parseFloat(v)
                    )
                  }
                  placeholder={isBodyweight ? "N/A" : "0"}
                  disabled={isBodyweight}
                />
              </FormField>

              {/* Reps Male */}
              <FormField label="Reps (H)">
                <Input
                  type="number"
                  value={tier.reps_male}
                  onChange={(v) =>
                    updateTier(idx, "reps_male", parseInt(v) || 0)
                  }
                  placeholder="5"
                />
              </FormField>

              {/* Reps Female */}
              <FormField label="Reps (M)">
                <Input
                  type="number"
                  value={tier.reps_female}
                  onChange={(v) =>
                    updateTier(idx, "reps_female", parseInt(v) || 0)
                  }
                  placeholder="5"
                />
              </FormField>

              {/* Color */}
              <FormField label="Color">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={tier.color}
                    onChange={(e) => updateTier(idx, "color", e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border-0"
                    style={{ background: "transparent" }}
                  />
                  <span
                    className="font-mono text-xs"
                    style={{ color: "#8A8A8E", fontSize: 10 }}
                  >
                    {tier.color}
                  </span>
                </div>
              </FormField>
            </div>
          ))}
        </div>
      </div>

      {/* Active toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => update("is_active", !form.is_active)}
          className="relative w-10 h-5 rounded-full transition-colors"
          style={{
            background: form.is_active
              ? "rgba(122,139,92,0.4)"
              : "rgba(255,255,255,0.1)",
          }}
        >
          <span
            className="absolute top-0.5 h-4 w-4 rounded-full transition-all"
            style={{
              background: form.is_active ? "#7A8B5C" : "#8A8A8E",
              left: form.is_active ? 22 : 2,
            }}
          />
        </button>
        <span
          className="font-body text-sm"
          style={{ color: form.is_active ? "#7A8B5C" : "#8A8A8E" }}
        >
          {form.is_active ? "Activo" : "Inactivo"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => onSave(form)}
          disabled={
            saving || !form.name || !form.slug || !form.exercise_name
          }
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 font-body text-sm font-medium transition-colors disabled:opacity-40"
          style={{ background: "rgba(122,139,92,0.2)", color: "#7A8B5C" }}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Guardar badge
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 font-body text-sm font-medium transition-colors"
          style={{ background: "rgba(255,255,255,0.05)", color: "#8A8A8E" }}
        >
          <X className="h-4 w-4" />
          Cancelar
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function AdminBadges() {
  const { user } = useAuth();

  // View toggle
  const [view, setView] = useState<AdminView>("definitions");

  // Claims state
  const [claims, setClaims] = useState<BadgeClaim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [activeTab, setActiveTab] = useState<TabStatus>("pending");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Definitions state
  const [definitions, setDefinitions] = useState<BadgeDefinitionFull[]>([]);
  const [loadingDefs, setLoadingDefs] = useState(true);
  const [exerciseNames, setExerciseNames] = useState<string[]>([]);

  // Builder state
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedDef, setExpandedDef] = useState<string | null>(null);

  /* ---- Fetch exercise names ---- */
  const fetchExerciseNames = useCallback(async () => {
    const { data } = await supabase
      .from("exercises")
      .select("name")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (data) setExerciseNames(data.map((e: any) => e.name));
  }, []);

  /* ---- Fetch claims ---- */
  const fetchClaims = useCallback(async () => {
    setLoadingClaims(true);

    const { data, error } = await (supabase as any)
      .from("user_badges")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error || !data) {
      setLoadingClaims(false);
      return;
    }

    const userIds = [...new Set(data.map((r: any) => r.user_id))];
    const tierIds = [
      ...new Set(data.map((r: any) => r.badge_tier_id).filter(Boolean)),
    ];

    const [profilesRes, tiersRes] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("id, full_name, email")
        .in("id", userIds as string[]),
      tierIds.length > 0
        ? (supabase as any)
            .from("badge_tiers")
            .select("id, tier_label, badge_id")
            .in("id", tierIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profiles = profilesRes.data || [];
    const tiers = tiersRes.data || [];

    const defIds = [
      ...new Set(tiers.map((t: any) => t.badge_id).filter(Boolean)),
    ];
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
        tier_name: tier?.tier_label || "---",
        badge_name: tier
          ? defsMap.get(tier.badge_id) || "---"
          : "---",
      };
    });

    setClaims(enriched);
    setLoadingClaims(false);
  }, []);

  /* ---- Fetch definitions with tiers ---- */
  const fetchDefinitions = useCallback(async () => {
    setLoadingDefs(true);

    const { data: defs, error } = await (supabase as any)
      .from("badge_definitions")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error || !defs) {
      setLoadingDefs(false);
      return;
    }

    const defIds = defs.map((d: any) => d.id);
    let allTiers: any[] = [];
    if (defIds.length > 0) {
      const { data: tiers } = await (supabase as any)
        .from("badge_tiers")
        .select("*")
        .in("badge_id", defIds)
        .order("sort_order", { ascending: true });
      allTiers = tiers || [];
    }

    const tiersByBadge = new Map<string, TierData[]>();
    for (const t of allTiers) {
      const arr = tiersByBadge.get(t.badge_id) || [];
      arr.push(t);
      tiersByBadge.set(t.badge_id, arr);
    }

    const enriched: BadgeDefinitionFull[] = defs.map((d: any) => ({
      ...d,
      tiers: tiersByBadge.get(d.id) || [],
    }));

    setDefinitions(enriched);
    setLoadingDefs(false);
  }, []);

  useEffect(() => {
    fetchClaims();
    fetchDefinitions();
    fetchExerciseNames();
  }, [fetchClaims, fetchDefinitions, fetchExerciseNames]);

  /* ---- Save badge (create or update) ---- */
  const handleSaveBadge = async (form: BadgeFormData) => {
    setSaving(true);
    try {
      if (editingId) {
        // Update existing definition
        const { error: defErr } = await (supabase as any)
          .from("badge_definitions")
          .update({
            slug: form.slug,
            name: form.name,
            exercise_name: form.exercise_name,
            category: form.category,
            description: form.description || null,
            fun_fact: form.fun_fact || null,
            icon_name: form.icon_name || "trophy",
            is_active: form.is_active,
          })
          .eq("id", editingId);

        if (defErr) throw defErr;

        // Update each tier
        for (const tier of form.tiers) {
          if (tier.id) {
            const { error: tierErr } = await (supabase as any)
              .from("badge_tiers")
              .update({
                tier_label: tier.tier_label,
                weight_male: tier.weight_male,
                weight_female: tier.weight_female,
                reps_male: tier.reps_male,
                reps_female: tier.reps_female,
                color: tier.color,
              })
              .eq("id", tier.id);
            if (tierErr) throw tierErr;
          } else {
            // New tier for existing badge
            const { error: tierErr } = await (supabase as any)
              .from("badge_tiers")
              .insert({
                badge_id: editingId,
                tier: tier.tier,
                tier_label: tier.tier_label,
                weight_male: tier.weight_male,
                weight_female: tier.weight_female,
                reps_male: tier.reps_male,
                reps_female: tier.reps_female,
                color: tier.color,
                sort_order: tier.sort_order,
              });
            if (tierErr) throw tierErr;
          }
        }
      } else {
        // Create new definition
        const { data: newDef, error: defErr } = await (supabase as any)
          .from("badge_definitions")
          .insert({
            slug: form.slug,
            name: form.name,
            exercise_name: form.exercise_name,
            category: form.category,
            description: form.description || null,
            fun_fact: form.fun_fact || null,
            icon_name: form.icon_name || "trophy",
            is_active: form.is_active,
            sort_order: definitions.length + 1,
          })
          .select("id")
          .single();

        if (defErr) throw defErr;

        // Create tiers
        const tierInserts = form.tiers.map((t) => ({
          badge_id: newDef.id,
          tier: t.tier,
          tier_label: t.tier_label,
          weight_male: t.weight_male,
          weight_female: t.weight_female,
          reps_male: t.reps_male,
          reps_female: t.reps_female,
          color: t.color,
          sort_order: t.sort_order,
        }));

        const { error: tiersErr } = await (supabase as any)
          .from("badge_tiers")
          .insert(tierInserts);

        if (tiersErr) throw tiersErr;
      }

      // Refresh and close form
      await fetchDefinitions();
      setShowBuilder(false);
      setEditingId(null);
    } catch (err: any) {
      alert(`Error al guardar: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  /* ---- Duplicate badge ---- */
  const handleDuplicate = (def: BadgeDefinitionFull) => {
    setEditingId(null);
    setShowBuilder(true);
    // Pre-fill form with duplicated data
    const form: BadgeFormData = {
      slug: def.slug + "-copy",
      name: def.name + " (copia)",
      exercise_name: "",
      category: def.category as BadgeFormData["category"],
      description: def.description || "",
      fun_fact: def.fun_fact || "",
      icon_name: def.icon_name || "trophy",
      is_active: true,
      tiers: def.tiers.length > 0
        ? def.tiers.map((t) => ({
            tier: t.tier,
            tier_label: t.tier_label,
            weight_male: t.weight_male,
            weight_female: t.weight_female,
            reps_male: t.reps_male,
            reps_female: t.reps_female,
            color: t.color,
            sort_order: t.sort_order,
          }))
        : TIER_DEFAULTS.map((t) => ({ ...t })),
    };
    setDuplicateForm(form);
  };

  const [duplicateForm, setDuplicateForm] = useState<BadgeFormData | null>(null);

  /* ---- Edit badge ---- */
  const handleEdit = (def: BadgeDefinitionFull) => {
    setEditingId(def.id);
    setShowBuilder(true);
    setDuplicateForm(null);
  };

  /* ---- Delete badge ---- */
  const handleDelete = async (defId: string) => {
    if (!window.confirm("Seguro que quieres eliminar este badge y todos sus tiers? Esta accion no se puede deshacer.")) {
      return;
    }
    const { error } = await (supabase as any)
      .from("badge_definitions")
      .delete()
      .eq("id", defId);
    if (error) {
      alert(`Error al eliminar: ${error.message}`);
    } else {
      await fetchDefinitions();
    }
  };

  /* ---- Toggle active ---- */
  const handleToggleActive = async (defId: string, currentActive: boolean) => {
    const { error } = await (supabase as any)
      .from("badge_definitions")
      .update({ is_active: !currentActive })
      .eq("id", defId);
    if (!error) {
      setDefinitions((prev) =>
        prev.map((d) =>
          d.id === defId ? { ...d, is_active: !currentActive } : d
        )
      );
    }
  };

  /* ---- Approve / Reject ---- */
  const handleAction = async (
    claimId: string,
    action: "approved" | "rejected"
  ) => {
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

    if (!error) {
      setClaims((prev) =>
        prev.map((c) =>
          c.id === claimId
            ? {
                ...c,
                status: action,
                review_notes: notes,
                reviewed_by: user.id,
                reviewed_at: now,
                earned_at: action === "approved" ? now : c.earned_at,
              }
            : c
        )
      );
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

  /* ---- Compute form initial data ---- */
  const builderInitial = useMemo<BadgeFormData>(() => {
    if (duplicateForm) return duplicateForm;
    if (editingId) {
      const def = definitions.find((d) => d.id === editingId);
      if (def) {
        return {
          slug: def.slug,
          name: def.name,
          exercise_name: def.exercise_name,
          category: def.category as BadgeFormData["category"],
          description: def.description || "",
          fun_fact: def.fun_fact || "",
          icon_name: def.icon_name || "trophy",
          is_active: def.is_active,
          tiers:
            def.tiers.length > 0
              ? def.tiers.map((t) => ({ ...t }))
              : TIER_DEFAULTS.map((t) => ({ ...t })),
        };
      }
    }
    return { ...EMPTY_FORM, tiers: TIER_DEFAULTS.map((t) => ({ ...t })) };
  }, [editingId, definitions, duplicateForm]);

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

  const viewTabs: { key: AdminView; label: string }[] = [
    { key: "definitions", label: "Badge Builder" },
    { key: "claims", label: `Claims (${counts.total})` },
  ];

  return (
    <div className="space-y-8">
      {/* =============== Header =============== */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="font-display text-xl font-bold"
            style={{ color: "#FAF8F5", letterSpacing: "-0.02em" }}
          >
            Badges
          </h1>
          <p className="font-body text-sm mt-1" style={{ color: "#8A8A8E" }}>
            Crea, edita y revisa badges de LIFTORY
          </p>
        </div>
      </div>

      {/* =============== View Tabs =============== */}
      <div
        className="flex gap-1 rounded-lg p-1"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        {viewTabs.map((tab) => {
          const isActive = view === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className="rounded-md px-4 py-2 font-body text-sm transition-colors"
              style={{
                background: isActive
                  ? "rgba(199,91,57,0.15)"
                  : "transparent",
                color: isActive ? "#C75B39" : "#8A8A8E",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* =============== Stats =============== */}
      <div>
        <SectionLabel>Resumen</SectionLabel>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Definiciones", value: definitions.length, icon: Shield },
            {
              label: "Activos",
              value: definitions.filter((d) => d.is_active).length,
              icon: CheckCircle,
            },
            { label: "Pendientes", value: counts.pending, icon: Clock },
            { label: "Aprobados", value: counts.approved, icon: Award },
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
                  style={{
                    color: "#8A8A8E",
                    letterSpacing: "0.1em",
                    fontSize: 10,
                  }}
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

      {/* =============== BADGE BUILDER VIEW =============== */}
      {view === "definitions" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>Definiciones de badges</SectionLabel>
            {!showBuilder && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setDuplicateForm(null);
                  setShowBuilder(true);
                }}
                className="flex items-center gap-2 rounded-lg px-4 py-2 font-body text-sm font-medium transition-colors"
                style={{
                  background: "rgba(122,139,92,0.2)",
                  color: "#7A8B5C",
                }}
              >
                <Plus className="h-4 w-4" />
                Nuevo badge
              </button>
            )}
          </div>

          {/* Builder form */}
          {showBuilder && (
            <div className="mb-6">
              <SectionLabel>
                {editingId ? "Editar badge" : duplicateForm ? "Duplicar badge" : "Nuevo badge"}
              </SectionLabel>
              <BadgeBuilderForm
                key={editingId || "new"}
                initial={builderInitial}
                exerciseNames={exerciseNames}
                onSave={handleSaveBadge}
                onCancel={() => {
                  setShowBuilder(false);
                  setEditingId(null);
                  setDuplicateForm(null);
                }}
                saving={saving}
              />
            </div>
          )}

          {/* Definitions list */}
          {loadingDefs ? (
            <div className="h-32 rounded-xl bg-white/5 animate-pulse" />
          ) : definitions.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 rounded-xl"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <Shield
                className="h-10 w-10 mb-3"
                style={{ color: "#8A8A8E" }}
              />
              <p className="font-body text-sm" style={{ color: "#8A8A8E" }}>
                No hay badges definidos
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {definitions.map((def) => {
                const isExpanded = expandedDef === def.id;
                return (
                  <div
                    key={def.id}
                    className="rounded-xl overflow-hidden"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {/* Header row */}
                    <div
                      className="flex items-center gap-4 px-4 py-3 cursor-pointer"
                      onClick={() =>
                        setExpandedDef(isExpanded ? null : def.id)
                      }
                    >
                      {/* Status dot */}
                      <div
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{
                          background: def.is_active ? "#7A8B5C" : "#8A8A8E",
                        }}
                      />

                      {/* Name */}
                      <p
                        className="font-body text-sm font-semibold flex-1"
                        style={{ color: "#FAF8F5" }}
                      >
                        {def.name}
                      </p>

                      {/* Exercise */}
                      <p
                        className="font-body text-xs hidden lg:block"
                        style={{ color: "#8A8A8E", maxWidth: 200 }}
                      >
                        {def.exercise_name}
                      </p>

                      {/* Category */}
                      <span
                        className="rounded-full px-2 py-0.5 font-body text-xs hidden md:inline"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          color: "#8A8A8E",
                          fontSize: 11,
                        }}
                      >
                        {def.category}
                      </span>

                      {/* Tier count */}
                      <span
                        className="font-mono text-xs"
                        style={{ color: "#8A8A8E", fontSize: 10 }}
                      >
                        {def.tiers.length} tiers
                      </span>

                      {/* Actions */}
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleEdit(def)}
                          className="p-1.5 rounded-md transition-colors hover:bg-white/5"
                          title="Editar"
                        >
                          <Pencil
                            className="h-3.5 w-3.5"
                            style={{ color: "#8A8A8E" }}
                          />
                        </button>
                        <button
                          onClick={() => handleDuplicate(def)}
                          className="p-1.5 rounded-md transition-colors hover:bg-white/5"
                          title="Duplicar"
                        >
                          <Copy
                            className="h-3.5 w-3.5"
                            style={{ color: "#8A8A8E" }}
                          />
                        </button>
                        <button
                          onClick={() =>
                            handleToggleActive(def.id, def.is_active)
                          }
                          className="p-1.5 rounded-md transition-colors hover:bg-white/5"
                          title={
                            def.is_active ? "Desactivar" : "Activar"
                          }
                        >
                          {def.is_active ? (
                            <CheckCircle
                              className="h-3.5 w-3.5"
                              style={{ color: "#7A8B5C" }}
                            />
                          ) : (
                            <XCircle
                              className="h-3.5 w-3.5"
                              style={{ color: "#8A8A8E" }}
                            />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(def.id)}
                          className="p-1.5 rounded-md transition-colors hover:bg-white/5"
                          title="Eliminar"
                        >
                          <Trash2
                            className="h-3.5 w-3.5"
                            style={{ color: "#EF4444" }}
                          />
                        </button>
                      </div>

                      {/* Expand chevron */}
                      {isExpanded ? (
                        <ChevronUp
                          className="h-4 w-4"
                          style={{ color: "#8A8A8E" }}
                        />
                      ) : (
                        <ChevronDown
                          className="h-4 w-4"
                          style={{ color: "#8A8A8E" }}
                        />
                      )}
                    </div>

                    {/* Expanded tiers */}
                    {isExpanded && (
                      <div
                        className="px-4 pb-4"
                        style={{
                          borderTop: "1px solid rgba(255,255,255,0.04)",
                        }}
                      >
                        {/* Description */}
                        {def.description && (
                          <p
                            className="font-body text-xs mt-3 mb-2"
                            style={{ color: "#8A8A8E" }}
                          >
                            {def.description}
                          </p>
                        )}

                        {/* Tier table */}
                        <table className="w-full mt-3">
                          <thead>
                            <tr>
                              {[
                                "Tier",
                                "Peso (H)",
                                "Peso (M)",
                                "Reps (H)",
                                "Reps (M)",
                                "Color",
                              ].map((h) => (
                                <th
                                  key={h}
                                  className="text-left font-mono uppercase text-xs px-3 py-2"
                                  style={{
                                    color: "#8A8A8E",
                                    letterSpacing: "0.08em",
                                    fontSize: 9,
                                  }}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {def.tiers.map((tier) => (
                              <tr
                                key={tier.id || tier.tier}
                                style={{
                                  borderTop:
                                    "1px solid rgba(255,255,255,0.04)",
                                }}
                              >
                                <td className="px-3 py-2">
                                  <span
                                    className="font-body text-xs font-semibold"
                                    style={{ color: tier.color }}
                                  >
                                    {tier.tier_label}
                                  </span>
                                </td>
                                <td
                                  className="font-mono text-xs px-3 py-2"
                                  style={{ color: "#FAF8F5", fontSize: 12 }}
                                >
                                  {tier.weight_male != null
                                    ? `${tier.weight_male} kg`
                                    : "---"}
                                </td>
                                <td
                                  className="font-mono text-xs px-3 py-2"
                                  style={{ color: "#FAF8F5", fontSize: 12 }}
                                >
                                  {tier.weight_female != null
                                    ? `${tier.weight_female} kg`
                                    : "---"}
                                </td>
                                <td
                                  className="font-mono text-xs px-3 py-2"
                                  style={{ color: "#FAF8F5", fontSize: 12 }}
                                >
                                  {tier.reps_male}
                                </td>
                                <td
                                  className="font-mono text-xs px-3 py-2"
                                  style={{ color: "#FAF8F5", fontSize: 12 }}
                                >
                                  {tier.reps_female}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="h-3 w-3 rounded-full"
                                      style={{ background: tier.color }}
                                    />
                                    <span
                                      className="font-mono text-xs"
                                      style={{
                                        color: "#8A8A8E",
                                        fontSize: 10,
                                      }}
                                    >
                                      {tier.color}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Fun fact */}
                        {def.fun_fact && (
                          <p
                            className="font-body text-xs mt-3 italic"
                            style={{ color: "#C9A96E" }}
                          >
                            {def.fun_fact}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =============== CLAIMS VIEW =============== */}
      {view === "claims" && (
        <div>
          <SectionLabel>Claims de badges</SectionLabel>

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
                    background: isActive
                      ? "rgba(199,91,57,0.15)"
                      : "transparent",
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
              <Award
                className="h-10 w-10 mb-3"
                style={{ color: "#8A8A8E" }}
              />
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
                    {[
                      "Usuario",
                      "Badge",
                      "Tier",
                      "Prueba",
                      "Fecha",
                      ...(activeTab === "pending"
                        ? ["Notas", "Acciones"]
                        : ["Notas"]),
                    ].map((header) => (
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
                    ))}
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

                      {/* Proof */}
                      <td className="px-4 py-3">
                        {claim.proof_url ? (
                          claim.proof_url.includes("badge-videos") ? (
                            <video
                              src={claim.proof_url}
                              className="rounded-lg"
                              style={{
                                width: 160,
                                maxHeight: 120,
                                background: "#0D0C0A",
                              }}
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
                              onClick={() =>
                                handleAction(claim.id, "approved")
                              }
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
                              onClick={() =>
                                handleAction(claim.id, "rejected")
                              }
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
      )}
    </div>
  );
}
