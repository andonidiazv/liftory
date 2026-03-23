import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Plus, Pencil, Trash2, X, Loader2, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

interface InsightRow {
  id: string;
  title: string;
  category: string;
  description_template: string;
  price_cents: number;
  min_data_days: number;
  requires_wearable: boolean;
  is_active: boolean;
}

const emptyForm: Omit<InsightRow, "id"> & { id?: string } = {
  title: "", category: "analytical", description_template: "",
  price_cents: 200, min_data_days: 7, requires_wearable: false, is_active: true,
};

export default function AdminInsights() {
  const { user: adminUser } = useAuth();
  const [insights, setInsights] = useState<InsightRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<InsightRow | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("insights").select("*").order("title", { ascending: true });
    setInsights((data as InsightRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => { setForm({ ...emptyForm }); setModalOpen(true); };
  const openEdit = (i: InsightRow) => { setForm({ ...i }); setModalOpen(true); };

  const handleSave = async () => {
    if (!form.title.trim() || !form.description_template.trim()) {
      toast({ title: "Error", description: "Título y template son obligatorios.", variant: "destructive" }); return;
    }
    setSaving(true);
    const payload = {
      title: form.title, category: form.category,
      description_template: form.description_template,
      price_cents: form.price_cents, min_data_days: form.min_data_days,
      requires_wearable: form.requires_wearable, is_active: form.is_active,
    };
    try {
      if (form.id) {
        const { error } = await supabase.from("insights").update(payload).eq("id", form.id);
        if (error) throw error;
        await supabase.from("audit_log").insert({ admin_user_id: adminUser!.id, action_type: "content_updated", target_table: "insights", target_id: form.id, new_values: payload as Record<string, unknown> });
        toast({ title: "Insight actualizado" });
      } else {
        const { error } = await supabase.from("insights").insert(payload);
        if (error) throw error;
        toast({ title: "Insight creado" });
      }
      setModalOpen(false); fetch();
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (i: InsightRow) => {
    await supabase.from("insights").delete().eq("id", i.id);
    await supabase.from("audit_log").insert({ admin_user_id: adminUser!.id, action_type: "content_deleted", target_table: "insights", target_id: i.id, old_values: i as unknown as Record<string, unknown> });
    toast({ title: "Insight eliminado" });
    setConfirmDelete(null); fetch();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-hero" style={{ color: "#FAF8F5" }}>Insights</h1>
        <button onClick={openCreate} className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-body font-medium" style={{ background: "#B8622F", color: "#FAF8F5" }}>
          <Plus className="h-4 w-4" /> Nuevo insight
        </button>
      </div>

      {loading ? (
        <div className="mt-6 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" style={{ background: "#1C1C1E" }} />)}</div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl" style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.08)" }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(250,248,245,0.06)" }}>
                {["Título", "Categoría", "Precio", "Mín días", "Wearable", "Estado", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-label-tech text-muted-foreground font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {insights.map((ins) => (
                <tr key={ins.id} style={{ borderBottom: "1px solid rgba(250,248,245,0.04)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(250,248,245,0.03)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td className="px-4 py-3 text-[13px] font-body" style={{ color: "#FAF8F5" }}>{ins.title}</td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground capitalize">{ins.category}</td>
                  <td className="px-4 py-3 text-[13px] font-mono text-muted-foreground">${(ins.price_cents / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-[13px] font-mono text-muted-foreground">{ins.min_data_days}</td>
                  <td className="px-4 py-3 text-[13px] text-muted-foreground">{ins.requires_wearable ? "Sí" : "No"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: ins.is_active ? "rgba(122,139,92,0.15)" : "rgba(138,138,142,0.15)", color: ins.is_active ? "#7A8B5C" : "#8A8A8E" }}>
                      {ins.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(ins)} className="rounded p-1.5 hover:bg-white/5"><Pencil className="h-3.5 w-3.5" style={{ color: "#8A8A8E" }} /></button>
                      <button onClick={() => setConfirmDelete(ins)} className="rounded p-1.5 hover:bg-white/5"><Trash2 className="h-3.5 w-3.5" style={{ color: "#C0392B" }} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {insights.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">No hay insights.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-[560px] rounded-xl" style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.08)" }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(250,248,245,0.06)" }}>
              <h2 className="font-display text-lg font-semibold" style={{ color: "#FAF8F5" }}>{form.id ? "Editar insight" : "Nuevo insight"}</h2>
              <button onClick={() => setModalOpen(false)} className="rounded-lg p-1.5 hover:bg-white/5"><X className="h-5 w-5" style={{ color: "#8A8A8E" }} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <Field label="Título *" value={form.title} onChange={(v) => setForm((p) => ({ ...p, title: v }))} />
              <div>
                <label className="text-label-tech text-muted-foreground">Categoría</label>
                <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm font-body" style={{ background: "#0D0C0A", border: "1px solid rgba(250,248,245,0.08)", color: "#FAF8F5", outline: "none" }}>
                  <option value="analytical">Analytical</option>
                  <option value="motivational">Motivational</option>
                </select>
              </div>
              <div>
                <label className="text-label-tech text-muted-foreground">Description template *</label>
                <textarea value={form.description_template} onChange={(e) => setForm((p) => ({ ...p, description_template: e.target.value }))} rows={4} className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm font-body resize-none" style={{ background: "#0D0C0A", border: "1px solid rgba(250,248,245,0.08)", color: "#FAF8F5", outline: "none" }} placeholder="Tu {muscle_group} progresa {pct}% más rápido..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-label-tech text-muted-foreground">Precio (cents)</label>
                  <input type="number" value={form.price_cents} onChange={(e) => setForm((p) => ({ ...p, price_cents: parseInt(e.target.value) || 0 }))} className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm font-mono" style={{ background: "#0D0C0A", border: "1px solid rgba(250,248,245,0.08)", color: "#FAF8F5", outline: "none" }} />
                  <span className="text-xs text-muted-foreground font-mono mt-1">${(form.price_cents / 100).toFixed(2)} USD</span>
                </div>
                <div>
                  <label className="text-label-tech text-muted-foreground">Mín días datos</label>
                  <input type="number" value={form.min_data_days} onChange={(e) => setForm((p) => ({ ...p, min_data_days: parseInt(e.target.value) || 0 }))} className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm font-mono" style={{ background: "#0D0C0A", border: "1px solid rgba(250,248,245,0.08)", color: "#FAF8F5", outline: "none" }} />
                </div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm font-body text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={form.requires_wearable} onChange={(e) => setForm((p) => ({ ...p, requires_wearable: e.target.checked }))} className="accent-primary" /> Requiere wearable
                </label>
                <label className="flex items-center gap-2 text-sm font-body text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} className="accent-primary" /> Activo
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: "1px solid rgba(250,248,245,0.06)" }}>
              <button onClick={() => setModalOpen(false)} className="rounded-lg px-4 py-2.5 text-sm font-body font-medium" style={{ background: "rgba(250,248,245,0.06)", color: "#FAF8F5" }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-body font-medium" style={{ background: "#B8622F", color: "#FAF8F5", opacity: saving ? 0.7 : 1 }}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-[380px] rounded-xl p-6" style={{ background: "#1C1C1E", border: "1px solid rgba(250,248,245,0.08)" }}>
            <div className="flex items-center gap-3 mb-4"><AlertTriangle className="h-5 w-5 text-warning" /><h3 className="font-display text-base font-semibold" style={{ color: "#FAF8F5" }}>Eliminar insight</h3></div>
            <p className="text-sm text-muted-foreground font-body mb-6">¿Eliminar "{confirmDelete.title}"? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-lg py-2.5 text-sm font-body font-medium" style={{ background: "rgba(250,248,245,0.06)", color: "#FAF8F5" }}>Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 rounded-lg py-2.5 text-sm font-body font-medium" style={{ background: "#C0392B", color: "#FAF8F5" }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-label-tech text-muted-foreground">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg px-3 py-2.5 text-sm font-body" style={{ background: "#0D0C0A", border: "1px solid rgba(250,248,245,0.08)", color: "#FAF8F5", outline: "none" }} />
    </div>
  );
}
