import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Plus, Pencil, X, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

interface AIRule {
  id: string;
  rule_key: string;
  rule_category: string;
  description: string | null;
  value: any;
  is_active: boolean;
}

const CATEGORIES = ["progressive_overload", "periodization", "exercise_selection", "recovery", "notification"];
const categoryLabels: Record<string, string> = {
  progressive_overload: "PROGRESSIVE OVERLOAD",
  periodization: "PERIODIZATION",
  exercise_selection: "EXERCISE SELECTION",
  recovery: "RECOVERY",
  notification: "NOTIFICATION",
};

export default function AdminAIRules() {
  const { user: adminUser } = useAuth();
  const [rules, setRules] = useState<AIRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<{ id?: string; rule_key: string; rule_category: string; description: string; jsonStr: string; is_active: boolean }>({
    rule_key: "", rule_category: "progressive_overload", description: "", jsonStr: "{}", is_active: true,
  });
  const [originalRule, setOriginalRule] = useState<AIRule | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("ai_rules").select("*").order("rule_category", { ascending: true });
    setRules((data as AIRule[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const openCreate = () => {
    setIsNew(true);
    setOriginalRule(null);
    setForm({ rule_key: "", rule_category: "progressive_overload", description: "", jsonStr: "{\n  \n}", is_active: true });
    setJsonError(null);
    setModalOpen(true);
  };

  const openEdit = (r: AIRule) => {
    setIsNew(false);
    setOriginalRule(r);
    setForm({
      id: r.id, rule_key: r.rule_key, rule_category: r.rule_category,
      description: r.description || "", jsonStr: JSON.stringify(r.value, null, 2), is_active: r.is_active,
    });
    setJsonError(null);
    setModalOpen(true);
  };

  const validateJson = (s: string) => {
    try { JSON.parse(s); setJsonError(null); return true; }
    catch (e: any) { setJsonError(e.message); return false; }
  };

  const handleSave = async () => {
    if (!form.rule_key.trim()) { toast({ title: "Error", description: "Rule key es obligatorio.", variant: "destructive" }); return; }
    if (!validateJson(form.jsonStr)) { toast({ title: "Error", description: "JSON inválido.", variant: "destructive" }); return; }

    setSaving(true);
    const parsedValue = JSON.parse(form.jsonStr);
    try {
      if (isNew) {
        const { error } = await supabase.from("ai_rules").insert({
          rule_key: form.rule_key, rule_category: form.rule_category,
          description: form.description || null, value: parsedValue, is_active: form.is_active,
        } as any);
        if (error) throw error;
        toast({ title: "Regla creada" });
      } else {
        const { error } = await supabase.from("ai_rules").update({
          description: form.description || null, value: parsedValue, is_active: form.is_active,
        }).eq("id", form.id!);
        if (error) throw error;
        await supabase.from("audit_log").insert({
          admin_user_id: adminUser!.id, action_type: "ai_rule_changed", target_table: "ai_rules", target_id: form.id!,
          old_values: { description: originalRule?.description, value: originalRule?.value, is_active: originalRule?.is_active },
          new_values: { description: form.description, value: parsedValue, is_active: form.is_active },
        } as any);
        toast({ title: "Regla actualizada" });
      }
      setModalOpen(false); fetchRules();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  // Group by category
  const grouped = CATEGORIES.map((cat) => ({
    category: cat,
    label: categoryLabels[cat] || cat.toUpperCase(),
    rules: rules.filter((r) => r.rule_category === cat),
  })).filter((g) => g.rules.length > 0);

  // Ungrouped
  const knownCats = new Set(CATEGORIES);
  const ungrouped = rules.filter((r) => !knownCats.has(r.rule_category));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-hero" style={{ color: "#FAF8F5" }}>Reglas de IA</h1>
          <p className="mt-1 text-sm text-muted-foreground font-body">{rules.length} reglas configuradas</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-body font-medium" style={{ background: "#B8622F", color: "#FAF8F5" }}>
          <Plus className="h-4 w-4" /> Nueva regla
        </button>
      </div>

      {loading ? (
        <div className="mt-6 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" style={{ background: "#1C1C1E" }} />)}</div>
      ) : rules.length === 0 ? (
        <div className="mt-10 text-center text-sm text-muted-foreground">No hay reglas configuradas. Crea la primera.</div>
      ) : (
        <div className="mt-6 space-y-6">
          {grouped.map((g) => (
            <div key={g.category}>
              <span className="eyebrow-label">{g.label}</span>
              <div className="mt-3 overflow-hidden rounded-xl" style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.08)" }}>
                {g.rules.map((r, i) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between px-4 py-3 transition-colors cursor-pointer"
                    style={{ borderBottom: i < g.rules.length - 1 ? "1px solid rgba(250,248,245,0.04)" : "none" }}
                    onClick={() => openEdit(r)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(250,248,245,0.03)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[13px]" style={{ color: "#FAF8F5" }}>{r.rule_key}</span>
                        <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: r.is_active ? "rgba(122,139,92,0.15)" : "rgba(138,138,142,0.15)", color: r.is_active ? "#7A8B5C" : "#8A8A8E" }}>
                          {r.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      {r.description && <p className="mt-1 text-xs text-muted-foreground truncate max-w-[500px]">{r.description}</p>}
                    </div>
                    <Pencil className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#8A8A8E" }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {ungrouped.length > 0 && (
            <div>
              <span className="eyebrow-label">OTRAS</span>
              <div className="mt-3 overflow-hidden rounded-xl" style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.08)" }}>
                {ungrouped.map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => openEdit(r)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(250,248,245,0.03)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <span className="font-mono text-[13px]" style={{ color: "#FAF8F5" }}>{r.rule_key}</span>
                    <Pencil className="h-3.5 w-3.5" style={{ color: "#8A8A8E" }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-[640px] max-h-[90vh] overflow-y-auto rounded-xl" style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.08)" }}>
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4" style={{ background: "#1C1C1E", borderBottom: "1px solid rgba(250,248,245,0.06)" }}>
              <h2 className="font-display text-lg font-semibold" style={{ color: "#FAF8F5" }}>{isNew ? "Nueva regla" : "Editar regla"}</h2>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 hover:bg-white/5"><X className="h-5 w-5" style={{ color: "#8A8A8E" }} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-label-tech text-muted-foreground">Rule key {!isNew && "(readonly)"}</label>
                <input value={form.rule_key} onChange={(e) => isNew && setForm((p) => ({ ...p, rule_key: e.target.value }))} readOnly={!isNew}
                  className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm font-mono" style={{ background: "#0D0C0A", border: "1px solid rgba(250,248,245,0.08)", color: isNew ? "#FAF8F5" : "#8A8A8E", outline: "none" }} />
              </div>
              {isNew && (
                <div>
                  <label className="text-label-tech text-muted-foreground">Categoría</label>
                  <select value={form.rule_category} onChange={(e) => setForm((p) => ({ ...p, rule_category: e.target.value }))} className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm font-body" style={{ background: "#0D0C0A", border: "1px solid rgba(250,248,245,0.08)", color: "#FAF8F5", outline: "none" }}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabels[c]}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-label-tech text-muted-foreground">Descripción</label>
                <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm font-body resize-none" style={{ background: "#0D0C0A", border: "1px solid rgba(250,248,245,0.08)", color: "#FAF8F5", outline: "none" }} />
              </div>
              <div>
                <label className="text-label-tech text-muted-foreground">Valor (JSON)</label>
                <textarea
                  value={form.jsonStr}
                  onChange={(e) => { setForm((p) => ({ ...p, jsonStr: e.target.value })); validateJson(e.target.value); }}
                  rows={10}
                  className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm font-mono resize-none"
                  style={{ background: "#0D0C0A", border: `1px solid ${jsonError ? "#C0392B" : "rgba(250,248,245,0.08)"}`, color: "#FAF8F5", outline: "none", lineHeight: 1.6 }}
                />
                {jsonError && <p className="mt-1 text-xs" style={{ color: "#C0392B" }}>{jsonError}</p>}
                {!jsonError && form.jsonStr.trim() && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer">Preview parseado</summary>
                    <pre className="mt-1 rounded-lg p-3 text-xs font-mono overflow-auto max-h-[200px]" style={{ background: "#0D0C0A", color: "#7A8B5C" }}>
                      {JSON.stringify(JSON.parse(form.jsonStr), null, 2)}
                    </pre>
                  </details>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm font-body text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} className="accent-primary" /> Activa
              </label>
            </div>
            <div className="sticky bottom-0 flex justify-end gap-3 px-6 py-4" style={{ background: "#1C1C1E", borderTop: "1px solid rgba(250,248,245,0.06)" }}>
              <button onClick={() => setModalOpen(false)} className="rounded-lg px-4 py-2.5 text-sm font-body font-medium" style={{ background: "rgba(250,248,245,0.06)", color: "#FAF8F5" }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving || !!jsonError} className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-body font-medium" style={{ background: "#B8622F", color: "#FAF8F5", opacity: saving || jsonError ? 0.5 : 1 }}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
