import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Camera, LogOut, Trash2, Crown,
  AlertTriangle, Clock, Edit2, Check, X, Dumbbell, Target,
  Calendar, MapPin, Shield,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface OnboardingData {
  experience_level: string;
  primary_goal: string;
  training_days: number;
  equipment: string;
  injuries: string[];
  emotional_barriers: string[];
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile, isPremium } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(profile?.full_name || "");
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("onboarding_answers")
      .select("experience_level, primary_goal, training_days, equipment, injuries, emotional_barriers")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setOnboarding(data as OnboardingData);
      });
  }, [user]);

  useEffect(() => {
    setNameValue(profile?.full_name || "");
  }, [profile?.full_name]);

  const handleSaveName = async () => {
    if (!user || !nameValue.trim()) return;
    await supabase.from("user_profiles").update({ full_name: nameValue.trim() }).eq("user_id", user.id);
    await refreshProfile();
    setEditingName(false);
    toast({ title: "Nombre actualizado" });
  };

  const handleToggleUnit = async () => {
    if (!user || !profile) return;
    const newUnit = profile.weight_unit === "kg" ? "lb" : "kg";
    await supabase.from("user_profiles").update({ weight_unit: newUnit }).eq("user_id", user.id);
    await refreshProfile();
    toast({ title: `Unidad cambiada a ${newUnit}` });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Imagen demasiado grande", description: "Máximo 2MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("user-avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (uploadErr) {
      toast({ title: "Error al subir imagen", variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("user-avatars").getPublicUrl(path);
    await supabase.from("user_profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
    await refreshProfile();
    setUploading(false);
    toast({ title: "Foto actualizada" });
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    await supabase.from("user_profiles").update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq("user_id", user.id);
    await signOut();
    navigate("/", { replace: true });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const displayName = profile?.full_name || "Usuario";
  const subscriptionStatus = profile?.subscription_status || "inactive";

  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    active: { label: "Premium", color: "hsl(var(--success))", icon: Crown },
    expired: { label: "Expirado", color: "hsl(var(--destructive))", icon: AlertTriangle },
    cancelled: { label: "Cancelado", color: "hsl(var(--muted-foreground))", icon: X },
    inactive: { label: "Inactivo", color: "hsl(var(--muted-foreground))", icon: Clock },
  };

  const statusInfo = statusConfig[subscriptionStatus] || statusConfig.inactive;

  const goalLabels: Record<string, string> = {
    hypertrophy: "Hipertrofia", strength: "Fuerza", fat_loss: "Pérdida de grasa",
    endurance: "Resistencia", athletic: "Rendimiento atlético", general: "Fitness general",
  };

  const equipmentLabels: Record<string, string> = {
    full_gym: "Gimnasio completo", home_basic: "Casa básico", home_advanced: "Casa avanzado",
    minimal: "Mínimo", bodyweight: "Peso corporal",
  };

  return (
    <Layout>
      <div className="animate-fade-up px-5 pt-14 pb-32">
        {/* Header — Avatar + Name */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative flex h-20 w-20 items-center justify-center rounded-full bg-secondary overflow-hidden press-scale"
            disabled={uploading}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-3xl font-bold text-primary">{displayName[0]}</span>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-foreground/30 opacity-0 hover:opacity-100 transition-opacity">
              <Camera className="h-5 w-5 text-background" />
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} />
          </button>

          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  className="w-full rounded-lg bg-secondary px-3 py-1.5 text-sm font-body text-foreground outline-none ring-1 ring-border focus:ring-primary"
                  autoFocus
                />
                <button onClick={handleSaveName} className="text-primary"><Check className="h-5 w-5" /></button>
                <button onClick={() => { setEditingName(false); setNameValue(profile?.full_name || ""); }} className="text-muted-foreground"><X className="h-5 w-5" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="font-display text-[22px] font-bold text-foreground" style={{ letterSpacing: "-0.03em" }}>{displayName}</h1>
                <button onClick={() => setEditingName(true)} className="text-muted-foreground hover:text-foreground"><Edit2 className="h-4 w-4" /></button>
              </div>
            )}
            <p className="text-xs text-muted-foreground font-body mt-0.5">{user?.email}</p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ background: `${statusInfo.color}20`, color: statusInfo.color }}
              >
                <statusInfo.icon className="h-3 w-3" />
                {statusInfo.label}
              </span>
              <span className="text-xs text-muted-foreground font-body">
                {profile?.weight_unit || "kg"}
              </span>
            </div>
          </div>
        </div>

        {/* Weight unit toggle */}
        <div className="mt-6 card-fbb flex items-center justify-between">
          <div>
            <p className="text-sm font-body font-medium text-foreground">Unidad de peso</p>
            <p className="text-xs text-muted-foreground">Cambia entre kilogramos y libras</p>
          </div>
          <button
            onClick={handleToggleUnit}
            className="rounded-lg px-4 py-2 text-sm font-medium text-primary bg-primary/10 press-scale"
          >
            {profile?.weight_unit === "kg" ? "Cambiar a lb" : "Cambiar a kg"}
          </button>
        </div>

        {/* ═══ SUSCRIPCIÓN ═══ */}
        <div className="mt-8">
          <span className="eyebrow-label">TU SUSCRIPCIÓN</span>
          <div className="mt-3 card-fbb">
            <div className="flex items-center gap-3">
              <statusInfo.icon className="h-5 w-5" style={{ color: statusInfo.color }} />
              <div className="flex-1">
                <p className="text-sm font-body font-medium text-foreground">
                  {isPremium() ? `Plan ${profile?.subscription_tier || "Premium"}` : statusInfo.label}
                </p>
                {isPremium() && profile?.current_period_end && (
                  <p className="text-xs text-muted-foreground">
                    Renueva el {format(new Date(profile.current_period_end), "d MMM yyyy", { locale: es })}
                  </p>
                )}
                {!isPremium() && (
                  <p className="text-xs text-destructive">Tu suscripción no está activa</p>
                )}
              </div>
            </div>
            {isPremium() && (
              <p className="mt-3 text-xs text-muted-foreground font-body">
                Para gestionar tu suscripción, contacta a soporte o accede desde el email de confirmación de Stripe.
              </p>
            )}
            {!isPremium() && (
              <button
                onClick={() => navigate("/paywall")}
                className="mt-3 w-full rounded-xl bg-primary py-3 text-sm font-body font-semibold text-primary-foreground press-scale"
              >
                Suscribirse
              </button>
            )}
          </div>
        </div>

        {/* ═══ TU ENTRENAMIENTO ═══ */}
        <div className="mt-8">
          <span className="eyebrow-label">TU ENTRENAMIENTO</span>
          <div className="mt-3 space-y-2">
            <InfoRow icon={Shield} label="Nivel" value={onboarding?.experience_level || profile?.experience_level || "—"} />
            <InfoRow icon={Target} label="Objetivo" value={goalLabels[onboarding?.primary_goal || ""] || onboarding?.primary_goal || "—"} />
            <InfoRow icon={Calendar} label="Días/semana" value={String(onboarding?.training_days || profile?.training_days_per_week || "—")} />
            <InfoRow icon={Dumbbell} label="Equipo" value={equipmentLabels[onboarding?.equipment || ""] || onboarding?.equipment || "—"} />
            {onboarding?.injuries && onboarding.injuries.length > 0 && (
              <div className="card-fbb">
                <p className="text-label-tech text-muted-foreground mb-2">LESIONES</p>
                <div className="flex flex-wrap gap-1.5">
                  {onboarding.injuries.map((i) => (
                    <span key={i} className="pill text-xs">{i.replace(/_/g, " ")}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ CERRAR SESIÓN ═══ */}
        <button
          onClick={handleSignOut}
          className="press-scale mt-8 flex w-full items-center gap-4 rounded-xl p-4 text-left transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-5 w-5 text-destructive" />
          <span className="flex-1 text-sm font-body font-medium text-destructive">Cerrar sesión</span>
        </button>

        {/* ═══ ELIMINAR CUENTA ═══ */}
        <button
          onClick={() => setShowDeleteModal(true)}
          className="press-scale mt-2 flex w-full items-center gap-4 rounded-xl p-4 text-left transition-colors hover:bg-destructive/10"
        >
          <Trash2 className="h-5 w-5 text-destructive/60" />
          <span className="flex-1 text-sm font-body font-normal text-destructive/60">Eliminar cuenta</span>
        </button>

        {/* Footer */}
        <div className="flex flex-col items-center py-8">
          <span className="font-display" style={{ fontSize: 11, fontWeight: 800, letterSpacing: "-0.04em", color: "hsl(var(--muted-foreground))", textAlign: "center" }}>
            LIFTORY v1.0
          </span>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 px-6" onClick={() => setShowDeleteModal(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <h3 className="font-display text-lg font-bold text-foreground">¿Eliminar cuenta?</h3>
            </div>
            <p className="text-sm text-muted-foreground font-body mb-6">
              Esta acción es irreversible. Tus datos se borrarán en 30 días.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-xl bg-secondary py-3 text-sm font-body font-medium text-foreground press-scale"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 rounded-xl bg-destructive py-3 text-sm font-body font-semibold text-destructive-foreground press-scale"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-card p-4" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground font-body w-24">{label}</span>
      <span className="text-sm font-body font-medium text-foreground capitalize">{value}</span>
    </div>
  );
}
