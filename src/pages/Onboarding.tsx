import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { assignProgram } from "@/lib/assignProgram";
import {
  ChevronLeft,
  Zap,
  Flame,
  Sprout,
  Dumbbell,
  Target,
  Heart,
  Activity,
  Calendar,
  Play,
  TrendingUp,
  Layers,
  Timer,
  RotateCcw,
  Star,
  ArrowRight,
  Clock,
  Eye,
  EyeOff,
  Crown,
  Gem,
} from "lucide-react";

/* ───────── types ───────── */
type Gender = "male" | "female";
type Experience = "beginner" | "intermediate" | "advanced";
type Objective = "muscle_strength" | "athletic_performance" | "look_feel_better" | "move_better";

/* ───────── constants ───────── */
const TOTAL_STEPS = 12;
const PROGRESS_STEPS = 7;
const STORAGE_KEY = "liftory_onboarding";

/** VIP beta invites — these users skip paywall and get full access */
const VIP_EMAILS = new Set([
  "victor.vega.0495@gmail.com",
]);

/* ───────── palette (strict: cream + charcoal only) ───────── */
const cream = "#FAF8F5";
const charcoal = "#1C1C1E";

/* ───────── theme system ───────── */
type Theme = {
  bg: string; text: string; textMuted: string; textSubtle: string;
  cardBg: string; border: string; btnBg: string; btnText: string;
  inputBg: string; inputBorder: string; inputText: string;
  accent: string; accentMuted: string;
};

const darkTheme: Theme = {
  bg: "#0F0F0F", text: cream, textMuted: "#A09D98", textSubtle: "#666",
  cardBg: "#1A1A1A", border: "#2A2A2A", btnBg: cream, btnText: charcoal,
  inputBg: "#1A1A1A", inputBorder: "#2A2A2A", inputText: cream,
  accent: cream, accentMuted: "rgba(250,248,245,0.08)",
};

const lightTheme: Theme = {
  bg: cream, text: charcoal, textMuted: "#8A8580", textSubtle: "#B0ACA7",
  cardBg: "#FFFFFF", border: "#E0DCD7", btnBg: charcoal, btnText: cream,
  inputBg: "#FFFFFF", inputBorder: "#E0DCD7", inputText: charcoal,
  accent: charcoal, accentMuted: "rgba(28,28,30,0.06)",
};

/* ───────── global animations ───────── */
const globalAnimations = `
  @keyframes splashFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes splashRevealSmooth { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeSlideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
  .splash-fade-in { opacity: 0; animation: splashFadeIn 0.9s ease-out forwards; }
  .splash-reveal { opacity: 0; animation: splashRevealSmooth 1.8s cubic-bezier(0.16, 1, 0.3, 1) 0.5s forwards; }
  .anim-in { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
  .anim-in-d1 { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.08s both; }
  .anim-in-d2 { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.16s both; }
  .anim-in-d3 { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.24s both; }
  .anim-in-d4 { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.32s both; }
  .anim-in-d5 { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.40s both; }
  .anim-in-d6 { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.48s both; }
  .anim-in-d7 { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.56s both; }
`;

/* ───────── helpers ───────── */
function determineProgramLevel(exp: Experience, obj: Objective): "advanced" | "intermediate" {
  if (exp === "beginner") return "intermediate";
  if (exp === "advanced") return "advanced";
  if (obj === "muscle_strength" || obj === "athletic_performance") return "advanced";
  return "intermediate";
}

function getProgramName(gender: Gender, level: "advanced" | "intermediate"): string {
  if (gender === "male" && level === "advanced") return "BUILD HIM ELITE";
  if (gender === "male" && level === "intermediate") return "BUILD HIM FOUNDATION";
  if (gender === "female" && level === "advanced") return "SCULPT HER ELITE";
  return "SCULPT HER FOUNDATION";
}

function saveAnswers(data: { name: string; gender: Gender; experience: Experience; objective: Objective }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function loadAnswers(): { name: string; gender: Gender; experience: Experience; objective: Objective } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.name && parsed.gender && parsed.experience && parsed.objective) return parsed;
    return null;
  } catch { return null; }
}
function clearAnswers() { localStorage.removeItem(STORAGE_KEY); }

/* ════════════════════════════════════════════ */
export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signUp, signInWithGoogle, refreshProfile } = useAuth();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [objective, setObjective] = useState<Objective | null>(null);

  const [lastName, setLastName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [assignDone, setAssignDone] = useState(false);
  const [assignError, setAssignError] = useState(false);
  const [programName, setProgramName] = useState("");
  const [joinMode, setJoinMode] = useState<"live" | "fresh">("live");
  const [mesocycleInfo, setMesocycleInfo] = useState<{ currentWeek: number; totalWeeks: number; weeksLeft: number; todayDay: string; endDate: string } | null>(null);
  const [isVip, setIsVip] = useState(false);
  const loadingStart = useRef(0);
  const programStarted = useRef(false);

  const t: Theme = lightTheme;

  /* Icon box: charcoal bg + cream icon for contrast */
  const iconBox = (size: number, rounded = "rounded-2xl") =>
    `flex items-center justify-center ${rounded} shrink-0`;
  const iconBoxStyle = (size: number): React.CSSProperties => ({
    width: size, height: size, background: charcoal,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    // Detect VIP from auth email (covers Google OAuth return)
    if (user.email && VIP_EMAILS.has(user.email.toLowerCase())) setIsVip(true);
    const saved = loadAnswers();
    if (saved && !programStarted.current) {
      setName(saved.name); setGender(saved.gender);
      setExperience(saved.experience); setObjective(saved.objective);
      setStep(10);
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (step !== 10 || !user || programStarted.current) return;
    const saved = loadAnswers();
    if (!saved) return;
    const g = gender || saved.gender; const e = experience || saved.experience;
    const o = objective || saved.objective; const n = name || saved.name;
    if (!g || !e || !o) return;
    programStarted.current = true;
    runProgramAssignment(user.id, n, g, e, o);
  }, [step, user, gender, experience, objective, name]);

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handleBuildProgram = () => {
    if (!gender || !experience || !objective) return;
    saveAnswers({ name: `${name.trim()} ${lastName.trim()}`.trim(), gender, experience, objective });
    // Fetch mesocycle info for the Live vs S1 choice screen
    const level = determineProgramLevel(experience, objective);
    const pName = getProgramName(gender, level);
    setProgramName(pName);
    fetchMesocycleInfo(pName);
    setStep(8);
  };

  const fetchMesocycleInfo = async (pName: string) => {
    try {
      const { data: mc } = await supabase
        .from("mesocycles")
        .select("cycle_start_date, cycle_end_date, total_weeks")
        .eq("program_name", pName)
        .eq("status", "live")
        .single();
      if (!mc) { setMesocycleInfo(null); return; }
      const start = new Date(mc.cycle_start_date + "T12:00:00");
      const end = new Date(mc.cycle_end_date + "T12:00:00");
      const now = new Date();
      const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / 86400000);
      const currentWeek = Math.min(Math.floor(daysSinceStart / 7) + 1, mc.total_weeks);
      const weeksLeft = mc.total_weeks - currentWeek;
      const endFmt = end.toLocaleDateString("es-MX", { day: "numeric", month: "long" });
      // Determine today's training day name
      const dayOfWeek = now.getDay(); // 0=Sun
      const dayNames = ["Descanso", "Día 1", "Día 2", "Día 3", "Día 4", "Día 5", "Día 6"];
      const todayDay = dayNames[dayOfWeek] || "Descanso";
      setMesocycleInfo({ currentWeek, totalWeeks: mc.total_weeks, weeksLeft, todayDay, endDate: endFmt });
    } catch { setMesocycleInfo(null); }
  };

  const handleOnboardingSignup = async () => {
    setSignupError("");
    const trimmedEmail = signupEmail.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { setSignupError("Ingresa un email válido."); return; }
    if (signupPassword.length < 8) { setSignupError("La contraseña debe tener al menos 8 caracteres."); return; }
    setSignupLoading(true);
    try {
      const fullName = `${name.trim()} ${lastName.trim()}`.trim();
      const { data, error } = await signUp(trimmedEmail, signupPassword, fullName);
      if (error) { setSignupError(error.message); setSignupLoading(false); return; }
      if (VIP_EMAILS.has(trimmedEmail.toLowerCase())) setIsVip(true);
      if (data.session && data.user) { setStep(10); }
      else if (data.user && !data.session) { setSignupError("Revisa tu correo para confirmar tu cuenta antes de continuar."); }
    } catch { setSignupError("Error al crear la cuenta. Intenta de nuevo."); }
    setSignupLoading(false);
  };

  const handleOnboardingGoogle = async () => {
    setGoogleLoading(true); setSignupError("");
    const { error } = await signInWithGoogle();
    if (error) { setSignupError(error.message); setGoogleLoading(false); }
  };

  const runProgramAssignment = async (userId: string, userName: string, g: Gender, e: Experience, o: Objective) => {
    const level = determineProgramLevel(e, o);
    setProgramName(getProgramName(g, level));
    loadingStart.current = Date.now();
    setLoadingProgress(0); setLoadingMsgIdx(0); setAssignDone(false); setAssignError(false);
    try {
      await supabase.from("onboarding_answers").upsert({
        user_id: userId, experience_level: e, primary_goal: o,
        training_days: 5, equipment: "full_gym", injuries: [],
        emotional_barriers: [], connected_wearable: null,
        specific_event: null, event_date: null, inbody_data: null,
      }, { onConflict: "user_id" });
      // Check VIP directly from auth email (avoids state race condition)
      const userEmail = (await supabase.auth.getUser()).data.user?.email?.toLowerCase() ?? "";
      const vip = VIP_EMAILS.has(userEmail);
      if (vip) setIsVip(true);

      const profileUpdate: Record<string, unknown> = {
        full_name: userName, gender: g, onboarding_completed: true,
        training_days_per_week: 5, training_location: "full_gym", experience_level: e,
      };
      // VIP: grant full active access without payment
      if (vip) {
        profileUpdate.subscription_status = "active";
        profileUpdate.subscription_tier = "vip_beta";
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        profileUpdate.current_period_end = oneYearFromNow.toISOString();
      }
      await supabase.from("user_profiles").update(profileUpdate).eq("user_id", userId);
      const result = await assignProgram(userId, g, level, joinMode);
      if (!result.success) throw new Error("assign failed");
      clearAnswers(); setAssignDone(true);
    } catch { setAssignError(true); }
  };

  useEffect(() => {
    if (step !== 10 || !loadingStart.current) return;
    const MIN_DURATION = 4000;
    const msgTimer = setInterval(() => { setLoadingMsgIdx((p) => (p < 3 ? p + 1 : p)); }, 1000);
    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - loadingStart.current;
      setLoadingProgress(Math.min((elapsed / MIN_DURATION) * 100, assignDone ? 100 : 90));
    }, 50);
    const checkDone = setInterval(() => {
      if (Date.now() - loadingStart.current >= MIN_DURATION && assignDone && !assignError) {
        clearInterval(checkDone);
        if (isVip) {
          // VIP: show welcome screen before entering
          refreshProfile().then(() => setStep(11));
        } else {
          refreshProfile().then(() => navigate("/paywall", { replace: true }));
        }
      }
    }, 200);
    return () => { clearInterval(msgTimer); clearInterval(progressTimer); clearInterval(checkDone); };
  }, [step, assignDone, assignError, navigate, refreshProfile, isVip]);

  /* ═══════════ SHARED ═══════════ */

  const renderProgressBar = (currentStep: number) => (
    <div className="px-6 pt-14 anim-in">
      <div className="flex items-center justify-between mb-2">
        <button onClick={back} className="flex items-center gap-1 font-body active:scale-95" style={{ fontSize: 13, color: t.textMuted }}>
          <ChevronLeft className="h-4 w-4" /> Atrás
        </button>
        <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.15em", color: t.textMuted }}>
          Paso {currentStep} de {PROGRESS_STEPS}
        </span>
      </div>
      <div className="h-[2px] w-full overflow-hidden rounded-full" style={{ background: t.border }}>
        <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${(currentStep / PROGRESS_STEPS) * 100}%`, background: t.accent }} />
      </div>
    </div>
  );

  const PillButton = ({ label, onClick, disabled, className: cls }: { label: string; onClick: () => void; disabled?: boolean; className?: string }) => (
    <button onClick={onClick} disabled={disabled}
      className={`press-scale flex w-full items-center justify-center font-body font-medium disabled:opacity-40 active:scale-[0.98] transition-transform ${cls || ""}`}
      style={{ background: t.btnBg, color: t.btnText, borderRadius: 50, height: 50, fontSize: 14, letterSpacing: "0.08em" }}>
      {label}
    </button>
  );

  const SelectionCard = ({ selected, onSelect, children, className: cls }: { selected: boolean; onSelect: () => void; children: React.ReactNode; className?: string }) => (
    <button onClick={onSelect} className={`w-full text-left transition-all duration-200 active:scale-[0.98] ${cls || ""}`}
      style={{ background: t.cardBg, border: selected ? `2px solid ${t.accent}` : `1px solid ${t.border}`, borderRadius: 16, padding: 16 }}>
      {children}
    </button>
  );

  const inputStyles: React.CSSProperties = {
    background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText,
    borderRadius: 12, height: 48, padding: "0 16px", fontSize: 16, width: "100%",
    outline: "none", fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.2s",
  };

  /* ════════════ STEP 0: SPLASH ════════════ */
  if (step === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6" style={{ background: cream }}>
        <h1 className="font-display splash-fade-in" style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.04em", color: charcoal, animationDelay: "0s" }}>LIFTORY</h1>
        <p className="mt-3 font-body splash-reveal" style={{ fontSize: 14, color: "#8A8580", letterSpacing: "0.04em" }}>The Wellness Community</p>
        <div className="mt-14 w-full max-w-sm splash-fade-in" style={{ animationDelay: "2s" }}>
          <button onClick={next}
            className="press-scale flex w-full items-center justify-center font-body font-medium active:scale-[0.98] transition-transform"
            style={{ background: charcoal, color: cream, borderRadius: 50, height: 50, fontSize: 14, letterSpacing: "0.08em" }}>
            LET'S GO
          </button>
        </div>
        <button onClick={() => navigate("/login")} className="mt-6 font-body underline splash-fade-in" style={{ fontSize: 13, color: "#A09D98", animationDelay: "2.4s" }}>
          ¿Ya tienes cuenta? Inicia sesión
        </button>
        <style>{globalAnimations}</style>
      </div>
    );
  }

  /* ════════════ STEP 1: NOMBRE ════════════ */
  if (step === 1) {
    return (
      <div className="flex min-h-screen flex-col" style={{ background: t.bg }}>
        {renderProgressBar(1)}
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8">
          <h1 className="font-display font-bold text-center anim-in" style={{ fontSize: 24, color: t.text }}>¿Cómo te llamas?</h1>
          <input type="text" placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)}
            className="mt-6 w-full max-w-sm font-body outline-none text-center anim-in-d1" style={inputStyles}
            onKeyDown={(e) => e.key === "Enter" && name.trim().length > 0 && next()} />
          <div className="mt-10 w-full max-w-sm anim-in-d2"><PillButton label="SIGUIENTE" onClick={next} disabled={name.trim().length === 0} /></div>
        </div>
        <style>{globalAnimations}</style>
      </div>
    );
  }

  /* ════════════ STEP 2: PROGRAMA ════════════ */
  if (step === 2) {
    return (
      <div className="flex min-h-screen flex-col" style={{ background: t.bg }}>
        {renderProgressBar(2)}
        <div className="flex flex-1 flex-col items-center px-6 pt-10 pb-8">
          <h1 className="font-display font-bold text-center anim-in" style={{ fontSize: 24, color: t.text }}>Elige tu programa</h1>
          <p className="mt-2 font-body text-center anim-in-d1" style={{ fontSize: 14, color: t.textMuted }}>Selecciona el que mejor te represente</p>
          <div className="mt-8 w-full max-w-sm flex flex-col gap-3">
            <SelectionCard selected={gender === "male"} onSelect={() => setGender("male")} className="anim-in-d2">
              <div className="flex items-center gap-4">
                <div className={iconBox(48)} style={iconBoxStyle(48)}>
                  <Crown className="h-6 w-6" style={{ color: cream }} />
                </div>
                <div>
                  <p className="font-display font-bold uppercase" style={{ fontSize: 16, color: t.text, letterSpacing: "0.03em" }}>BUILD HIM</p>
                  <p className="mt-1 font-body" style={{ fontSize: 12, color: t.textMuted }}>Más fuerte. Más sólido. Innegociable.</p>
                </div>
              </div>
            </SelectionCard>
            <SelectionCard selected={gender === "female"} onSelect={() => setGender("female")} className="anim-in-d3">
              <div className="flex items-center gap-4">
                <div className={iconBox(48)} style={iconBoxStyle(48)}>
                  <Gem className="h-6 w-6" style={{ color: cream }} />
                </div>
                <div>
                  <p className="font-display font-bold uppercase" style={{ fontSize: 16, color: t.text, letterSpacing: "0.03em" }}>SCULPT HER</p>
                  <p className="mt-1 font-body" style={{ fontSize: 12, color: t.textMuted }}>Fuerte, definida, imparable.</p>
                </div>
              </div>
            </SelectionCard>
          </div>
          <div className="mt-auto pt-8 w-full max-w-sm anim-in-d4"><PillButton label="SIGUIENTE" onClick={next} disabled={!gender} /></div>
        </div>
        <style>{globalAnimations}</style>
      </div>
    );
  }

  /* ════════════ STEP 3: EXPERIENCIA ════════════ */
  if (step === 3) {
    const opts = [
      { id: "beginner" as Experience, label: "Menos de 1 año", subtitle: "Estoy construyendo las bases", Icon: Sprout },
      { id: "intermediate" as Experience, label: "1-3 años", subtitle: "Busco estructura y progresión", Icon: Dumbbell },
      { id: "advanced" as Experience, label: "3+ años", subtitle: "Quiero un método que me rete", Icon: Flame },
    ];
    return (
      <div className="flex min-h-screen flex-col" style={{ background: t.bg }}>
        {renderProgressBar(3)}
        <div className="flex flex-1 flex-col px-6 pt-8 pb-8">
          <h1 className="font-display font-bold anim-in" style={{ fontSize: 22, color: t.text }}>¿Cuánto tiempo llevas entrenando, {name.trim().split(" ")[0]}?</h1>
          <div className="mt-8 flex flex-col gap-3">
            {opts.map((opt, i) => (
              <SelectionCard key={opt.id} selected={experience === opt.id} onSelect={() => setExperience(opt.id)} className={`anim-in-d${i + 1}`}>
                <div className="flex items-center gap-4">
                  <div className={iconBox(40, "rounded-xl")} style={iconBoxStyle(40)}>
                    <opt.Icon className="h-5 w-5" style={{ color: cream }} />
                  </div>
                  <div>
                    <p className="font-display font-bold" style={{ fontSize: 15, color: t.text }}>{opt.label}</p>
                    <p className="mt-0.5 font-body" style={{ fontSize: 12, color: t.textMuted }}>{opt.subtitle}</p>
                  </div>
                </div>
              </SelectionCard>
            ))}
          </div>
          <div className="mt-auto pt-8 anim-in-d4"><PillButton label="SIGUIENTE" onClick={next} disabled={!experience} /></div>
        </div>
        <style>{globalAnimations}</style>
      </div>
    );
  }

  /* ════════════ STEP 4: OBJETIVO ════════════ */
  if (step === 4) {
    const opts = [
      { id: "muscle_strength" as Objective, label: "Ganar músculo y fuerza", Icon: Target },
      { id: "athletic_performance" as Objective, label: "Mejorar mi rendimiento atlético", Icon: Zap },
      { id: "look_feel_better" as Objective, label: "Verme y sentirme mejor", Icon: Heart },
      { id: "move_better" as Objective, label: "Moverme mejor, sin dolor", Icon: Activity },
    ];
    return (
      <div className="flex min-h-screen flex-col" style={{ background: t.bg }}>
        {renderProgressBar(4)}
        <div className="flex flex-1 flex-col px-6 pt-8 pb-8">
          <h1 className="font-display font-bold anim-in" style={{ fontSize: 22, color: t.text }}>¿Qué quieres lograr, {name.trim().split(" ")[0]}?</h1>
          <p className="mt-2 font-body anim-in-d1" style={{ fontSize: 14, color: t.textMuted }}>Elige tu objetivo principal</p>
          <div className="mt-8 flex flex-col gap-3">
            {opts.map((opt, i) => (
              <SelectionCard key={opt.id} selected={objective === opt.id} onSelect={() => setObjective(opt.id)} className={`anim-in-d${i + 1}`}>
                <div className="flex items-center gap-4">
                  <div className={iconBox(40, "rounded-xl")} style={iconBoxStyle(40)}>
                    <opt.Icon className="h-5 w-5" style={{ color: cream }} />
                  </div>
                  <p className="font-display font-bold" style={{ fontSize: 15, color: t.text }}>{opt.label}</p>
                </div>
              </SelectionCard>
            ))}
          </div>
          <div className="mt-auto pt-8 anim-in-d5"><PillButton label="SIGUIENTE" onClick={next} disabled={!objective} /></div>
        </div>
        <style>{globalAnimations}</style>
      </div>
    );
  }

  /* ════════════ STEP 5: THE METHOD ════════════ */
  if (step === 5) {
    const pillars = [
      { name: "Prime", desc: "Movilidad y activación neuromuscular.", Icon: Timer, num: "01" },
      { name: "Power", desc: "Potencia y fuerza explosiva.", Icon: TrendingUp, num: "02" },
      { name: "Heavy", desc: "Fuerza máxima y progresión de carga.", Icon: Dumbbell, num: "03" },
      { name: "Build", desc: "Hipertrofia y volumen muscular.", Icon: RotateCcw, num: "04" },
      { name: "Engine", desc: "Conditioning y capacidad cardiovascular.", Icon: Activity, num: "05" },
      { name: "Recovery", desc: "Movilidad activa y longevidad.", Icon: RotateCcw, num: "06" },
    ];

    return (
      <div className="flex min-h-screen flex-col" style={{ background: t.bg }}>
        {renderProgressBar(5)}
        <div className="flex flex-1 flex-col px-6 pt-8 pb-8 overflow-y-auto">
          <div className="text-center anim-in">
            <p className="font-display" style={{ fontSize: 14, fontWeight: 800, color: t.textMuted, letterSpacing: "-0.03em" }}>LIFTORY</p>
            <div className="mx-auto mt-2 h-[2px] w-8" style={{ background: t.border }} />
            <h1 className="mt-4 font-mono uppercase" style={{ fontSize: 28, fontWeight: 700, color: t.text, letterSpacing: "0.08em" }}>THE METHOD</h1>
            <p className="mt-3 font-body" style={{ fontSize: 14, color: t.textMuted }}>
              Seis pilares para construir un cuerpo <span style={{ color: t.text }}>fuerte, móvil y resiliente</span> — hoy y a largo plazo.
            </p>
            <p className="mt-2 font-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.2em", color: t.textSubtle }}>SIX PILLARS</p>
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            {pillars.map((p, i) => (
              <div key={p.name} className={`flex items-center gap-3 anim-in-d${i + 1}`}
                style={{ background: t.cardBg, borderRadius: 14, padding: "14px 16px", border: `1px solid ${t.border}` }}>
                <div className={iconBox(40, "rounded-xl")} style={iconBoxStyle(40)}>
                  <p.Icon className="h-[18px] w-[18px]" style={{ color: cream }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold" style={{ fontSize: 15, color: t.text }}>{p.name}</p>
                  <p className="mt-0.5 font-body" style={{ fontSize: 11, color: t.textMuted, lineHeight: 1.4 }}>{p.desc}</p>
                </div>
                <span className="font-mono shrink-0" style={{ fontSize: 14, color: t.textSubtle }}>{p.num}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-6 anim-in-d7">
            <PillButton label="I'M READY" onClick={next} />
            <p className="mt-3 text-center font-body" style={{ fontSize: 11, color: t.textMuted }}>Diseñado para ti · Ajustado cada semana</p>
          </div>
        </div>
        <style>{globalAnimations}</style>
      </div>
    );
  }

  /* ════════════ STEP 6: PERIODIZACIÓN ════════════ */
  if (step === 6) {
    const phases = [
      { name: "Base", desc: "Aprende. Calibra. Establece tus pesos.", weeks: "S1 — S2", accent: false },
      { name: "Acumulación", desc: "Más volumen. Más rondas. Más trabajo.", weeks: "S3", accent: false },
      { name: "Intensificación", desc: "Menos reps. Más peso. Más fuerza.", weeks: "S4", accent: true },
      { name: "Peak", desc: "Todo apuntó a esta semana. Da todo.", weeks: "S5", accent: true },
      { name: "Deload", desc: "Tu cuerpo asimila el trabajo.", weeks: "S6", accent: false },
    ];

    return (
      <div className="flex min-h-screen flex-col" style={{ background: t.bg }}>
        {renderProgressBar(6)}
        <div className="flex flex-1 flex-col px-6 pt-8 pb-8 overflow-y-auto">
          <div className="text-center anim-in">
            <p className="font-mono uppercase" style={{ fontSize: 12, letterSpacing: "0.2em", color: t.accent }}>PERIODIZACIÓN</p>
            <div className="mx-auto mt-2 h-[2px] w-8" style={{ background: t.accent }} />
            <h1 className="mt-4 font-display font-bold" style={{ fontSize: 24, color: t.text, lineHeight: 1.2 }}>
              Cada semana tiene<br />un propósito exacto.
            </h1>
            <p className="mt-2 font-body" style={{ fontSize: 14, color: t.textMuted }}>Así se construye un atleta de verdad.</p>
          </div>

          <div className="mt-6 rounded-2xl p-4 anim-in-d1" style={{ background: t.cardBg, border: `1px solid ${t.border}` }}>
            <p className="font-mono uppercase text-center" style={{ fontSize: 9, letterSpacing: "0.15em", color: t.textMuted }}>
              CURVA DE INTENSIDAD — MESOCICLO 6 SEMANAS
            </p>
            <svg viewBox="0 0 300 120" className="mt-3 w-full" style={{ height: 100 }}>
              <line x1="30" y1="90" x2="280" y2="90" stroke={t.border} strokeWidth="0.5" />
              <defs>
                <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={t.accent} stopOpacity="0.2" />
                  <stop offset="100%" stopColor={t.accent} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M50,75 C80,70 110,55 150,40 C180,28 200,18 220,15 C235,20 250,45 265,55 L265,90 L50,90 Z" fill="url(#curveGrad)" />
              <path d="M50,75 C80,70 110,55 150,40 C180,28 200,18 220,15 C235,20 250,45 265,55" fill="none" stroke={t.accent} strokeWidth="2" />
              <circle cx="220" cy="15" r="5" fill={t.accent} />
              <circle cx="265" cy="55" r="4" fill={t.textMuted} />
              <text x="75" y="108" fill={t.textSubtle} fontSize="6" fontFamily="'DM Mono', monospace" textAnchor="middle">BASE</text>
              <text x="140" y="108" fill={t.textSubtle} fontSize="6" fontFamily="'DM Mono', monospace" textAnchor="middle">ACUMULACIÓN</text>
              <text x="185" y="108" fill={t.accent} fontSize="6" fontFamily="'DM Mono', monospace" textAnchor="middle">INTENSIF.</text>
              <text x="220" y="108" fill={t.accent} fontSize="6" fontFamily="'DM Mono', monospace" textAnchor="middle">PEAK</text>
              <text x="265" y="108" fill={t.textMuted} fontSize="6" fontFamily="'DM Mono', monospace" textAnchor="middle">DELOAD</text>
              <text x="50" y="100" fill={t.textSubtle} fontSize="7" fontFamily="'DM Mono', monospace" textAnchor="middle">S1</text>
              <text x="100" y="100" fill={t.textSubtle} fontSize="7" fontFamily="'DM Mono', monospace" textAnchor="middle">S2</text>
              <text x="140" y="100" fill={t.textSubtle} fontSize="7" fontFamily="'DM Mono', monospace" textAnchor="middle">S3</text>
              <text x="180" y="100" fill={t.textSubtle} fontSize="7" fontFamily="'DM Mono', monospace" textAnchor="middle">S4</text>
              <text x="220" y="100" fill={t.accent} fontSize="7" fontFamily="'DM Mono', monospace" fontWeight="bold" textAnchor="middle">S5</text>
              <text x="265" y="100" fill={t.textMuted} fontSize="7" fontFamily="'DM Mono', monospace" textAnchor="middle">S6</text>
            </svg>
          </div>

          <div className="mt-4 grid grid-cols-5 gap-1.5 anim-in-d2">
            {phases.map((p) => (
              <div key={p.name} className="rounded-xl p-2.5" style={{ background: t.cardBg, border: `1px solid ${t.border}` }}>
                <div className="h-2 w-2 rounded-full" style={{ background: p.accent ? t.accent : t.textMuted }} />
                <p className="mt-2 font-display font-bold" style={{ fontSize: 11, color: p.accent ? t.accent : t.text }}>{p.name}</p>
                <p className="mt-1 font-body" style={{ fontSize: 9, color: t.textMuted, lineHeight: 1.3 }}>{p.desc}</p>
                <p className="mt-1.5 font-mono" style={{ fontSize: 8, color: p.accent ? t.accent : t.textMuted }}>{p.weeks}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            <div className="flex items-start gap-3 rounded-xl p-3.5 anim-in-d3" style={{ background: t.cardBg, border: `1px solid ${t.border}` }}>
              <div className={iconBox(36, "rounded-xl")} style={iconBoxStyle(36)}>
                <Star className="h-4 w-4" style={{ color: cream }} />
              </div>
              <div>
                <p className="font-display font-bold" style={{ fontSize: 13, color: t.text }}>Un año completo. Cada semana con una meta.</p>
                <p className="mt-1 font-body" style={{ fontSize: 11, color: t.textMuted, lineHeight: 1.4 }}>Mesociclos encadenados en macrociclos anuales. No hay semana perdida.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl p-3.5 anim-in-d4" style={{ background: t.cardBg, border: `1px solid ${t.border}` }}>
              <div className={iconBox(36, "rounded-xl")} style={iconBoxStyle(36)}>
                <ArrowRight className="h-4 w-4" style={{ color: cream }} />
              </div>
              <div>
                <p className="font-display font-bold" style={{ fontSize: 13, color: t.text }}>Progresión wave. Semana a semana.</p>
                <p className="mt-1 font-body" style={{ fontSize: 11, color: t.textMuted, lineHeight: 1.4 }}>Pesos e intensidad se ajustan solos según cómo entrenas. El programa aprende contigo.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl p-3.5 anim-in-d5" style={{ background: t.cardBg, border: `1px solid ${t.border}` }}>
              <div className={iconBox(36, "rounded-xl")} style={iconBoxStyle(36)}>
                <Clock className="h-4 w-4" style={{ color: cream }} />
              </div>
              <div>
                <p className="font-display font-bold" style={{ fontSize: 13, color: t.text }}>S6 no es parar. Es recargar.</p>
                <p className="mt-1 font-body" style={{ fontSize: 11, color: t.textMuted, lineHeight: 1.4 }}>Bajar el volumen esta semana es lo que te lleva al 100% en el siguiente ciclo.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 anim-in-d6">
            <PillButton label="Quiero mi programa" onClick={next} />
            <p className="mt-3 text-center font-body" style={{ fontSize: 11, color: t.textMuted }}>Tu primer mesociclo comienza hoy</p>
          </div>
        </div>
        <style>{globalAnimations}</style>
      </div>
    );
  }

  /* ════════════ STEP 7: PROPUESTA DE VALOR ════════════ */
  if (step === 7) {
    const valueProps = [
      { Icon: Calendar, text: "Mesociclo periodizado de 6 semanas" },
      { Icon: Play, text: "Video demostrativo de cada ejercicio" },
      { Icon: TrendingUp, text: "Progresión inteligente — cada semana sube el desafío" },
      { Icon: Layers, text: "Movilidad, fuerza, hipertrofia y conditioning integrados" },
    ];
    return (
      <div className="flex min-h-screen flex-col" style={{ background: t.bg }}>
        {renderProgressBar(7)}
        <div className="flex flex-1 flex-col px-6 pt-8 pb-8">
          <h1 className="font-display font-bold anim-in" style={{ fontSize: 22, color: t.text }}>
            {name.trim().split(" ")[0]}, tu programa incluye:
          </h1>
          <div className="mt-10 flex flex-col gap-5">
            {valueProps.map((vp, i) => (
              <div key={vp.text} className={`flex items-start gap-4 anim-in-d${i + 1}`}>
                <div className={iconBox(36, "rounded-xl")} style={iconBoxStyle(36)}>
                  <vp.Icon className="h-[16px] w-[16px]" style={{ color: cream }} />
                </div>
                <p className="font-body pt-2" style={{ fontSize: 14, color: t.text }}>{vp.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-auto pt-8 anim-in-d5"><PillButton label="CONSTRUIR MI PROGRAMA" onClick={handleBuildProgram} /></div>
        </div>
        <style>{globalAnimations}</style>
      </div>
    );
  }

  /* ════════════ STEP 8: LIVE vs S1 CHOICE ════════════ */
  if (step === 8) {
    const showRecommendWait = mesocycleInfo && mesocycleInfo.weeksLeft <= 0;
    const handleJoinChoice = (mode: "live" | "fresh") => {
      setJoinMode(mode);
      if (user) { setStep(10); } else { setStep(9); }
    };

    return (
      <div className="flex min-h-screen flex-col" style={{ background: t.bg }}>
        <div className="px-6 pt-14 anim-in">
          <button onClick={() => setStep(7)} className="flex items-center gap-1 font-body active:scale-95" style={{ fontSize: 13, color: t.textMuted }}>
            <ChevronLeft className="h-4 w-4" /> Atrás
          </button>
        </div>
        <div className="flex flex-1 flex-col px-6 pt-6 pb-8">
          <h1 className="font-display font-bold anim-in" style={{ fontSize: 22, color: t.text }}>
            ¿Cómo quieres empezar?
          </h1>
          <p className="mt-2 font-body anim-in-d1" style={{ fontSize: 14, color: t.textMuted }}>
            Tu programa: <span style={{ color: t.text, fontWeight: 600 }}>{programName}</span>
          </p>

          <div className="mt-8 flex flex-col gap-4">
            {/* LIVE option */}
            <button
              onClick={() => handleJoinChoice("live")}
              className="w-full text-left transition-all duration-200 active:scale-[0.98] anim-in-d2"
              style={{
                background: t.cardBg,
                border: `2px solid ${t.accent}`,
                borderRadius: 16,
                padding: "20px 18px",
              }}
            >
              <div className="flex items-center gap-3">
                <div className={iconBox(44, "rounded-xl")} style={iconBoxStyle(44)}>
                  <Zap className="h-5 w-5" style={{ color: cream }} />
                </div>
                <div className="flex-1">
                  <p className="font-display font-bold uppercase" style={{ fontSize: 15, color: t.text, letterSpacing: "0.03em" }}>
                    Unirse al ciclo live
                  </p>
                  {mesocycleInfo ? (
                    <div className="mt-1.5 space-y-0.5">
                      <p className="font-body" style={{ fontSize: 12, color: t.textMuted }}>
                        El grupo va en <span style={{ color: t.text, fontWeight: 600 }}>Semana {mesocycleInfo.currentWeek} de {mesocycleInfo.totalWeeks}</span>
                      </p>
                      <p className="font-body" style={{ fontSize: 12, color: t.textMuted }}>
                        {mesocycleInfo.weeksLeft > 0
                          ? `Quedan ${mesocycleInfo.weeksLeft} semana${mesocycleInfo.weeksLeft > 1 ? "s" : ""} del ciclo`
                          : "Última semana del ciclo"}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 font-body" style={{ fontSize: 12, color: t.textMuted }}>
                      Te unes donde va el grupo y entrenas lo mismo que todos.
                    </p>
                  )}
                </div>
                <ArrowRight className="h-5 w-5 shrink-0" style={{ color: t.textMuted }} />
              </div>
            </button>

            {/* FRESH / S1 option */}
            <button
              onClick={() => handleJoinChoice("fresh")}
              className="w-full text-left transition-all duration-200 active:scale-[0.98] anim-in-d3"
              style={{
                background: t.cardBg,
                border: `1px solid ${t.border}`,
                borderRadius: 16,
                padding: "20px 18px",
              }}
            >
              <div className="flex items-center gap-3">
                <div className={iconBox(44, "rounded-xl")} style={iconBoxStyle(44)}>
                  <Play className="h-5 w-5" style={{ color: cream }} />
                </div>
                <div className="flex-1">
                  <p className="font-display font-bold uppercase" style={{ fontSize: 15, color: t.text, letterSpacing: "0.03em" }}>
                    Empezar desde Semana 1
                  </p>
                  <p className="mt-1 font-body" style={{ fontSize: 12, color: t.textMuted }}>
                    Comienzas el programa desde el inicio con tu propio calendario personal.
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0" style={{ color: t.textMuted }} />
              </div>
            </button>
          </div>

          {showRecommendWait && (
            <div className="mt-4 rounded-xl p-3.5 anim-in-d4" style={{ background: "rgba(201,169,110,0.08)", border: "1px solid rgba(201,169,110,0.2)" }}>
              <p className="font-body text-center" style={{ fontSize: 12, color: "#C9A96E" }}>
                El ciclo actual termina el {mesocycleInfo?.endDate}. Te recomendamos <span style={{ fontWeight: 600 }}>empezar desde S1</span> para aprovechar el siguiente ciclo completo.
              </p>
            </div>
          )}
        </div>
        <style>{globalAnimations}</style>
      </div>
    );
  }

  /* ════════════ STEP 9: CREAR CUENTA (dark theme) ════════════ */
  if (step === 9) {
    const s = lightTheme;
    const signupInput: React.CSSProperties = {
      background: s.inputBg, border: `1px solid ${s.inputBorder}`, color: s.inputText,
      borderRadius: 12, height: 48, padding: "0 16px", fontSize: 16, width: "100%",
      outline: "none", fontFamily: "'DM Sans', sans-serif", transition: "border-color 0.2s",
    };
    return (
      <div className="flex min-h-screen flex-col items-center px-6 py-12 overflow-y-auto" style={{ background: s.bg }}>
        <h1 className="font-display anim-in" style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em", color: s.text }}>LIFTORY</h1>
        <p className="mt-2 font-body anim-in-d1" style={{ fontSize: 14, color: s.textMuted }}>Tu programa está listo.</p>
        <h2 className="mt-8 font-display font-bold text-center anim-in-d2" style={{ fontSize: 22, color: s.text }}>Crea tu cuenta para comenzar</h2>

        <div className="mt-8 w-full max-w-sm flex flex-col gap-4 anim-in-d3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block font-mono uppercase mb-1.5" style={{ fontSize: 10, letterSpacing: "0.15em", color: s.textMuted }}>Nombre</label>
              <input type="text" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} className="font-body outline-none" style={signupInput} />
            </div>
            <div className="flex-1">
              <label className="block font-mono uppercase mb-1.5" style={{ fontSize: 10, letterSpacing: "0.15em", color: s.textMuted }}>Apellidos</label>
              <input type="text" placeholder="Apellidos" value={lastName} onChange={(e) => setLastName(e.target.value)} className="font-body outline-none" style={signupInput} />
            </div>
          </div>
          <div>
            <label className="block font-mono uppercase mb-1.5" style={{ fontSize: 10, letterSpacing: "0.15em", color: s.textMuted }}>Email</label>
            <input type="email" placeholder="tu@email.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className="font-body outline-none" style={signupInput} />
          </div>
          <div>
            <label className="block font-mono uppercase mb-1.5" style={{ fontSize: 10, letterSpacing: "0.15em", color: s.textMuted }}>Contraseña</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} placeholder="Mínimo 8 caracteres" value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)} className="font-body outline-none"
                style={{ ...signupInput, paddingRight: 48 }} onKeyDown={(e) => e.key === "Enter" && handleOnboardingSignup()} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: s.textMuted }}>
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {signupError && <p className="text-center font-body text-xs" style={{ color: "#E74C3C" }}>{signupError}</p>}

          <button onClick={handleOnboardingSignup} disabled={signupLoading}
            className="press-scale w-full font-body font-medium disabled:opacity-50 active:scale-[0.98] transition-transform"
            style={{ background: charcoal, color: cream, borderRadius: 50, height: 50, fontSize: 14, letterSpacing: "0.08em" }}>
            {signupLoading ? "Creando cuenta..." : "Crear cuenta"}
          </button>

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px" style={{ background: s.border }} />
            <span className="font-body text-xs" style={{ color: s.textSubtle }}>o</span>
            <div className="flex-1 h-px" style={{ background: s.border }} />
          </div>

          <button onClick={handleOnboardingGoogle} disabled={googleLoading}
            className="press-scale flex w-full items-center justify-center gap-3 font-body text-sm font-medium disabled:opacity-60 active:scale-[0.98]"
            style={{ background: "transparent", border: `1px solid ${s.border}`, color: s.text, borderRadius: 50, height: 48 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58z" fill="#EA4335"/>
            </svg>
            {googleLoading ? "Conectando..." : "Continuar con Google"}
          </button>
        </div>

        <button onClick={() => setStep(8)} className="mt-8 font-body underline active:scale-[0.97] transition-transform" style={{ fontSize: 13, color: s.textMuted }}>
          ← Atrás
        </button>
        <style>{globalAnimations}</style>
      </div>
    );
  }

  /* ════════════ STEP 10: LOADING (dark theme) ════════════ */
  if (step === 10) {
    const d = darkTheme;
    const msgs = ["Analizando tu perfil...", "Seleccionando ejercicios para tu nivel...", "Armando tu mesociclo de 6 semanas...", "¡Listo!"];
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6" style={{ background: d.bg }}>
        <p className="font-display anim-in" style={{ fontSize: 14, color: d.text, opacity: 0.3 }}>LIFTORY</p>
        <div className="mt-10 h-[3px] w-[60%] overflow-hidden rounded-full anim-in-d1" style={{ background: d.border }}>
          <div className="h-full rounded-full transition-all duration-100 ease-linear" style={{ width: `${loadingProgress}%`, background: "#C75B39" }} />
        </div>
        <div className="mt-6 h-6 relative w-72 anim-in-d2">
          {msgs.map((msg, i) => (
            <p key={i} className="absolute inset-0 text-center font-body transition-opacity duration-500"
              style={{ fontSize: 15, color: i === 3 && loadingMsgIdx === i ? d.text : d.textMuted,
                fontFamily: i === 3 && loadingMsgIdx === i ? "'Syne', sans-serif" : undefined,
                opacity: i === loadingMsgIdx ? 1 : 0 }}>{msg}</p>
          ))}
        </div>
        {assignError && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="font-body text-sm" style={{ color: "#E74C3C" }}>Hubo un error al generar tu programa.</p>
            <button onClick={() => { programStarted.current = false; setAssignError(false); }}
              className="font-body font-medium px-6 py-3 active:scale-[0.97] transition-transform"
              style={{ background: "#C75B39", color: "#FFFFFF", borderRadius: 50 }}>Reintentar</button>
          </div>
        )}
        <style>{globalAnimations}</style>
      </div>
    );
  }

  /* ═══════════ STEP 11: VIP WELCOME ═══════════ */
  if (step === 11) {
    const d = darkTheme;
    const firstName = name.split(" ")[0] || "Atleta";
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6" style={{ background: d.bg }}>
        <style>{globalAnimations}</style>

        {/* Crown icon */}
        <div
          className="flex items-center justify-center rounded-full anim-in"
          style={{ width: 80, height: 80, background: "rgba(201,169,110,0.12)", border: "1px solid rgba(201,169,110,0.25)" }}
        >
          <Crown className="w-9 h-9" style={{ color: "#C9A96E" }} />
        </div>

        {/* LIFTORY wordmark */}
        <p
          className="mt-6 anim-in-d1"
          style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: "-0.03em", color: d.text, opacity: 0.3 }}
        >
          LIFTORY
        </p>

        {/* VIP title */}
        <h1
          className="mt-4 text-center anim-in-d2"
          style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 28, letterSpacing: "-0.02em", color: "#C9A96E", lineHeight: 1.2 }}
        >
          ACCESO VIP
        </h1>

        {/* Personalized welcome */}
        <p className="mt-3 text-center font-body anim-in-d3" style={{ fontSize: 16, color: d.text, lineHeight: 1.5 }}>
          Bienvenido, {firstName}.
        </p>

        <p className="mt-2 text-center font-body anim-in-d4" style={{ fontSize: 14, color: d.textMuted, lineHeight: 1.6, maxWidth: 300 }}>
          Tienes acceso completo a LIFTORY como miembro de nuestro grupo de beta testers exclusivo. Sin restricciones, sin cobros.
        </p>

        {/* Program pill */}
        <div
          className="mt-6 flex items-center gap-2 px-4 py-2.5 rounded-xl anim-in-d5"
          style={{ background: "rgba(199,91,57,0.1)", border: "1px solid rgba(199,91,57,0.2)" }}
        >
          <Gem className="w-4 h-4" style={{ color: "#C75B39" }} />
          <span className="font-mono text-xs tracking-wider" style={{ color: "#C75B39" }}>{programName || "TU PROGRAMA"}</span>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate("/home", { replace: true })}
          className="mt-10 flex items-center gap-2 font-body font-medium px-8 py-3.5 active:scale-[0.97] transition-transform anim-in-d6"
          style={{ background: "#C9A96E", color: "#0F0F0F", borderRadius: 50, fontSize: 15, letterSpacing: "0.05em" }}
        >
          Comenzar a entrenar
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Subtle VIP badge */}
        <p className="mt-8 font-mono anim-in-d7" style={{ fontSize: 10, letterSpacing: "0.2em", color: d.textSubtle }}>
          VIP BETA ACCESS
        </p>
      </div>
    );
  }

  return <div className="min-h-screen" style={{ background: t.bg }} />;
}
