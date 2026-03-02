import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Lightbulb, Lock, Sparkles, Check, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface InsightTemplate {
  id: string;
  title: string;
  category: string;
  description_template: string;
  price_cents: number;
  min_data_days: number;
  requires_wearable: boolean;
  is_active: boolean;
}

interface UnlockedInsight {
  id: string;
  insight_id: string;
  generated_content: string;
  unlocked_at: string;
  insight: InsightTemplate;
}

export default function Insights() {
  const navigate = useNavigate();
  const { user, isPremium } = useAuth();
  const [templates, setTemplates] = useState<InsightTemplate[]>([]);
  const [unlocked, setUnlocked] = useState<UnlockedInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [tRes, uRes] = await Promise.all([
      supabase.from("insights").select("*").eq("is_active", true),
      supabase.from("insights_unlocked").select("*, insight:insights(*)").eq("user_id", user.id),
    ]);
    setTemplates((tRes.data as InsightTemplate[]) || []);
    setUnlocked((uRes.data as unknown as UnlockedInsight[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const unlockedIds = new Set(unlocked.map((u) => u.insight_id));

  const unlockedInsights = unlocked;
  const motivational = templates.filter((t) => t.category === "motivational" && !unlockedIds.has(t.id));
  const lockedAnalytical = templates.filter((t) => t.category === "analytical" && !unlockedIds.has(t.id));

  const handleUnlock = (insightId: string) => {
    if (!isPremium()) {
      navigate("/paywall");
      return;
    }
    setConfirmId(insightId);
  };

  const handleConfirm = async () => {
    if (!user || !confirmId) return;
    setUnlocking(true);
    const { error } = await supabase.from("insights_unlocked").insert({
      user_id: user.id,
      insight_id: confirmId,
      generated_content:
        "Contenido de ejemplo: Tu pecho está 16% más débil que tu espalda. Aquí hay un plan de 4 semanas para equilibrarlo. [Este contenido será generado por IA en producción]",
      unlocked_at: new Date().toISOString(),
    });
    setUnlocking(false);
    setConfirmId(null);
    if (error) {
      toast({ title: "Error al desbloquear", variant: "destructive" });
    } else {
      toast({ title: "Insight desbloqueado" });
      load();
    }
  };

  const confirmInsight = templates.find((t) => t.id === confirmId);

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <span className="text-muted-foreground text-sm font-body">Cargando insights...</span>
        </div>
      </Layout>
    );
  }

  const isEmpty = templates.length === 0;

  return (
    <Layout>
      <div className="px-5 pt-14 pb-8 stagger-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Lightbulb className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-foreground" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em" }}>
              Insights
            </h1>
            <p className="font-body text-xs text-muted-foreground">Análisis personalizados de tu entrenamiento</p>
          </div>
        </div>

        {isEmpty ? (
          <div className="mt-16 flex flex-col items-center text-center px-6">
            <Sparkles className="h-10 w-10 text-muted-foreground/40 mb-4" />
            <p className="text-sm text-muted-foreground font-body leading-relaxed">
              Los insights de IA se están preparando. Pronto tendrás análisis personalizados de tu entrenamiento.
            </p>
          </div>
        ) : (
          <>
            {/* ═══ DESBLOQUEADOS ═══ */}
            {unlockedInsights.length > 0 && (
              <div className="mt-8">
                <span className="eyebrow-label">DESBLOQUEADOS</span>
                <div className="mt-4 space-y-4">
                  {unlockedInsights.map((u) => (
                    <div
                      key={u.id}
                      className="card-fbb card-accent-gold"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{ background: "hsl(var(--gold) / 0.15)", color: "hsl(var(--gold))" }}
                        >
                          <Check className="h-3 w-3" />
                          Desbloqueado
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono-num">
                          {format(new Date(u.unlocked_at), "d MMM yyyy", { locale: es })}
                        </span>
                      </div>
                      <h3 className="font-display text-foreground" style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>
                        {u.insight?.title || "Insight"}
                      </h3>
                      <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground">
                        {u.generated_content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ MOTIVACIONALES ═══ */}
            {motivational.length > 0 && (
              <div className="mt-8">
                <span className="eyebrow-label">INSIGHTS MOTIVACIONALES</span>
                <div className="mt-4 space-y-3">
                  {motivational.map((m) => (
                    <div
                      key={m.id}
                      className="card-fbb"
                      style={{ borderLeft: "3px solid hsl(var(--success))" }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{ background: "hsl(var(--success) / 0.15)", color: "hsl(var(--success))" }}
                        >
                          <Sparkles className="h-3 w-3" />
                          Motivacional
                        </span>
                      </div>
                      <h3 className="font-display text-foreground" style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>
                        {m.title}
                      </h3>
                      <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground">
                        {m.description_template}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ ANALÍTICOS BLOQUEADOS ═══ */}
            {lockedAnalytical.length > 0 && (
              <div className="mt-8">
                <span className="eyebrow-label">INSIGHTS ANALÍTICOS</span>
                <div className="mt-4 space-y-4">
                  {lockedAnalytical.map((insight) => (
                    <div
                      key={insight.id}
                      className="rounded-xl p-5 overflow-hidden relative bg-card"
                      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-label-tech text-primary uppercase">
                          {insight.category}
                        </span>
                        <span className="font-mono-num text-xs text-muted-foreground">
                          ${(insight.price_cents / 100).toFixed(2)} USD
                        </span>
                      </div>
                      <h3 className="font-display text-foreground" style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>
                        {insight.title}
                      </h3>

                      {/* Preview with blur fade */}
                      <div className="relative mt-2">
                        <p className="font-body text-sm leading-relaxed text-muted-foreground line-clamp-2">
                          {insight.description_template}
                        </p>
                        <div
                          className="absolute bottom-0 left-0 right-0 h-8"
                          style={{ background: "linear-gradient(to top, hsl(var(--card)), transparent)" }}
                        />
                      </div>

                      <button
                        onClick={() => handleUnlock(insight.id)}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 font-body text-sm font-semibold text-primary border-[1.5px] border-primary bg-transparent press-scale transition-colors hover:bg-primary/5"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        Desbloquear — ${(insight.price_cents / 100).toFixed(2)} USD
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmId && confirmInsight && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setConfirmId(null)}>
          <div className="absolute inset-0 bg-foreground/50" />
          <div
            className="relative mx-6 w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-foreground text-center" style={{ fontSize: 17, fontWeight: 700 }}>
              ¿Desbloquear '{confirmInsight.title}'?
            </h3>
            <p className="mt-2 text-center text-sm text-muted-foreground font-body">
              Se cobrarán ${(confirmInsight.price_cents / 100).toFixed(2)} USD
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 rounded-xl bg-secondary py-3 font-body text-sm font-semibold text-foreground press-scale"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={unlocking}
                className="flex-1 rounded-xl bg-primary py-3 font-body text-sm font-semibold text-primary-foreground press-scale disabled:opacity-50"
              >
                {unlocking ? "Procesando..." : "Desbloquear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
