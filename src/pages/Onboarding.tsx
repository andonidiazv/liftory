import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { assignProgram } from "@/lib/assignProgram";
import {
  ChevronLeft,
  ChevronRight,
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
} from "lucide-react";

/* ───────── types ───────── */
type Gender = "male" | "female";
type Experience = "beginner" | "intermediate" | "advanced";
type Objective = "muscle_strength" | "athletic_performance" | "look_feel_better" | "move_better";

/* ───────── constants ───────── */
const TOTAL_STEPS = 9; // 0-8
const PROGRESS_STEPS = 6; // progress bar on steps 1-6

const STORAGE_KEY = "liftory_onboarding";

/* ───────── colors ───────── */
const bg = "#0F0F0F";
const cardBg = "#1A1A1A";
const borderDefault = "#2A2A2A";
const terracotta = "#C75B39";
const cream = "#FAF8F5";
const muted = "#888";
const gold = "#C9A96E";
const olive = "#7A8B5C";
const red = "#D45555";
const purple = "#9B7FCB";
const cyan = "#4ECDC4";

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
/*                 ONBOARDING                  */
/* ════════════════════════════════════════════ */
export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshProfile } = useAuth();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [experience, setExperience] = useState<Experience | null>(null);
  const [objective, setObjective] = useState<Objective | null>(null);

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [assignDone, setAssignDone] = useState(false);
  const [assignError, setAssignError] = useState(false);
  const [programName, setProgramName] = useState("");
  const loadingStart = useRef(0);
  const programStarted = useRef(false);

  /* ── On mount: if user logged in + saved answers → jump to loading ── */
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    const saved = loadAnswers();
    if (saved && !programStarted.current) {
      setName(saved.name);
      setGender(saved.gender);
      setExperience(saved.experience);
      setObjective(saved.objective);
      setStep(7); // loading step
    }
  }, [authLoading, user]);

  /* ── When step=7 and we have user + answers, start program ── */
  useEffect(() => {
    if (step !== 7 || !user || programStarted.current) return;
    const saved = loadAnswers();
    if (!saved) return;
    const g = gender || saved.gender;
    const e = experience || saved.experience;
    const o = objective || saved.objective;
    const n = name || saved.name;
    if (!g || !e || !o) return;
    programStarted.current = true;
    runProgramAssignment(user.id, n, g, e, o);
  }, [step, user, gender, experience, objective, name]);

  /* ── navigation ── */
  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  /* ── step 6 → save to localStorage → go to login ── */
  const handleBuildProgram = () => {
    if (!gender || !experience || !objective) return;
    saveAnswers({ name: name.trim(), gender, experience, objective });
    if (user) { setStep(7); } else { navigate("/login"); }
  };

  /* ── program assignment ── */
  const runProgramAssignment = async (userId: string, userName: string, g: Gender, e: Experience, o: Objective) => {
    const level = determineProgramLevel(e, o);
    const pName = getProgramName(g, level);
    setProgramName(pName);
    loadingStart.current = Date.now();
    setLoadingProgress(0);
    setLoadingMsgIdx(0);
    setAssignDone(false);
    setAssignError(false);

    try {
      await supabase.from("onboarding_answers").upsert({
        user_id: userId, experience_level: e, primary_goal: o,
        training_days: 5, equipment: "full_gym", injuries: [],
        emotional_barriers: [], connected_wearable: null,
        specific_event: null, event_date: null, inbody_data: null,
      }, { onConflict: "user_id" });

      await supabase.from("user_profiles").update({
        full_name: userName, gender: g, onboarding_completed: true,
        training_days_per_week: 5, training_location: "full_gym", experience_level: e,
      }).eq("user_id", userId);

      const result = await assignProgram(userId, g, level);
      if (!result.success) throw new Error("assign failed");
      clearAnswers();
      setAssignDone(true);
    } catch (err) {
      console.error("Onboarding error:", err);
      setAssignError(true);
    }
  };

  /* ── loading timers ── */
  useEffect(() => {
    if (step !== 7 || !loadingStart.current) return;
    const MIN_DURATION = 4000;
    const msgTimer = setInterval(() => { setLoadingMsgIdx((p) => (p < 3 ? p + 1 : p)); }, 1000);
    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - loadingStart.current;
      setLoadingProgress(Math.min((elapsed / MIN_DURATION) * 100, assignDone ? 100 : 90));
    }, 50);
    const checkDone = setInterval(() => {
      if (Date.now() - loadingStart.current >= MIN_DURATION && assignDone && !assignError) {
        clearInterval(checkDone);
        refreshProfile().then(() => navigate("/paywall", { replace: true }));
      }
    }, 200);
    return () => { clearInterval(msgTimer); clearInterval(progressTimer); clearInterval(checkDone); };
  }, [step, assignDone, assignError, navigate, refreshProfile]);

  /* ═══════════════ SHARED COMPONENTS ═══════════════ */

  const renderProgressBar = (currentStep: number) => (
    <div className="px-6 pt-14">
      <div className="flex items-center justify-between mb-2">
        <button onClick={back} className="flex items-center gap-1 font-body transition-colors active:scale-95" style={{ fontSize: 13, color: muted }}>
          <ChevronLeft className="h-4 w-4" /> Atrás
        </button>
        <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.15em", color: muted }}>
          Paso {currentStep} de {PROGRESS_STEPS}
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full" style={{ background: borderDefault }}>
        <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${(currentStep / PROGRESS_STEPS) * 100}%`, background: terracotta }} />
      </div>
    </div>
  );

  const PrimaryButton = ({ label, onClick, disabled, icon }: { label: string; onClick: () => void; disabled?: boolean; icon?: React.ReactNode }) => (
    <button onClick={onClick} disabled={disabled}
      className="press-scale flex w-full items-center justify-center gap-2 font-display font-semibold text-white transition-opacity disabled:opacity-40 active:scale-[0.97]"
      style={{ background: terracotta, borderRadius: 12, height: 52, fontSize: 16 }}>
      {label}
      {icon === undefined ? <ChevronRight className="h-5 w-5" /> : icon}
    </button>
  );

  const SelectionCard = ({ selected, onSelect, borderColor, children, height }: { selected: boolean; onSelect: () => void; borderColor: string; children: React.ReactNode; height?: number }) => (
    <button onClick={onSelect} className="w-full text-left transition-all duration-200 active:scale-[0.98]"
      style={{ background: cardBg, border: selected ? `2px solid ${borderColor}` : `1px solid ${borderDefault}`, borderRadius: 16, padding: 16, minHeight: height }}>
      {children}
    </button>
  );

  /* ════════════ STEP 0: SPLASH ════════════ */
  if (step === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6" style={{ background: bg }}>
        <h1 className="font-display" style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.04em", color: terracotta }}>LIFTORY</h1>
        <p className="mt-3 font-body" style={{ fontSize: 16, color: cream }}>Entrenamiento diseñado por expertos.</p>
        <p className="font-body" style={{ fontSize: 16, color: muted }}>Resultados reales.</p>
        <div className="mt-12 w-full max-w-sm">
          <PrimaryButton label="EMPEZAR" onClick={next} icon={null} />
        </div>
        <button onClick={() => navigate("/login")} className="mt-6 font-body underline" style={{ fontSize: 13, color: muted }}>
          ¿Ya tienes cuenta? Inicia sesión
        </button>
      </div>
    );
  }

  /* ════════════ STEP 1: NOMBRE + PROGRAMA ════════════ */
  if (step === 1) {
    const canContinue = name.trim().length > 0 && gender !== null;
    return (
      <div className="flex min-h-screen flex-col" style={{ background: bg }}>
        {renderProgressBar(1)}
        <div className="flex flex-1 flex-col px-6 pt-8 pb-8">
          <h1 className="font-display font-bold" style={{ fontSize: 24, color: cream }}>¿Cómo te llamas?</h1>
          <input type="text" placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)}
            className="mt-4 w-full font-body outline-none transition-colors focus:border-[#C75B39]"
            style={{ background: cardBg, border: `1px solid ${borderDefault}`, borderRadius: 12, height: 48, padding: "0 16px", fontSize: 16, color: cream }} />

          <h2 className="mt-8 font-display font-bold" style={{ fontSize: 20, color: cream }}>Elige tu programa</h2>

          <div className="mt-4 flex flex-col gap-3">
            <SelectionCard selected={gender === "male"} onSelect={() => setGender("male")} borderColor={terracotta}>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center rounded-2xl shrink-0"
                  style={{ width: 48, height: 48, background: gender === "male" ? "rgba(199,91,57,0.15)" : "rgba(255,255,255,0.05)" }}>
                  <Zap className="h-6 w-6" style={{ color: terracotta }} />
                </div>
                <div>
                  <p className="font-display font-bold uppercase" style={{ fontSize: 16, color: cream, letterSpacing: "0.03em" }}>BUILD HIM</p>
                  <p className="mt-1 font-body" style={{ fontSize: 12, color: muted }}>Más fuerte. Más sólido. Innegociable.</p>
                </div>
              </div>
            </SelectionCard>
            <SelectionCard selected={gender === "female"} onSelect={() => setGender("female")} borderColor={gold}>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center rounded-2xl shrink-0"
                  style={{ width: 48, height: 48, background: gender === "female" ? "rgba(201,169,110,0.15)" : "rgba(255,255,255,0.05)" }}>
                  <Flame className="h-6 w-6" style={{ color: gold }} />
                </div>
                <div>
                  <p className="font-display font-bold uppercase" style={{ fontSize: 16, color: cream, letterSpacing: "0.03em" }}>SCULPT HER</p>
                  <p className="mt-1 font-body" style={{ fontSize: 12, color: muted }}>Fuerte, definida, imparable.</p>
                </div>
              </div>
            </SelectionCard>
          </div>
          <div className="mt-auto pt-8"><PrimaryButton label="SIGUIENTE" onClick={next} disabled={!canContinue} /></div>
        </div>
      </div>
    );
  }

  /* ════════════ STEP 2: EXPERIENCIA ════════════ */
  if (step === 2) {
    const opts = [
      { id: "beginner" as Experience, label: "Menos de 1 año", subtitle: "Estoy construyendo las bases", Icon: Sprout, iconColor: olive, borderColor: olive },
      { id: "intermediate" as Experience, label: "1-3 años", subtitle: "Busco estructura y progresión", Icon: Dumbbell, iconColor: terracotta, borderColor: terracotta },
      { id: "advanced" as Experience, label: "3+ años", subtitle: "Quiero un método que me rete", Icon: Flame, iconColor: red, borderColor: red },
    ];
    return (
      <div className="flex min-h-screen flex-col" style={{ background: bg }}>
        {renderProgressBar(2)}
        <div className="flex flex-1 flex-col px-6 pt-8 pb-8">
          <h1 className="font-display font-bold" style={{ fontSize: 22, color: cream }}>¿Cuánto tiempo llevas entrenando, {name.trim().split(" ")[0]}?</h1>
          <div className="mt-8 flex flex-col gap-3">
            {opts.map((opt) => (
              <SelectionCard key={opt.id} selected={experience === opt.id} onSelect={() => setExperience(opt.id)} borderColor={opt.borderColor}>
                <div className="flex items-center gap-4">
                  <opt.Icon className="h-5 w-5 shrink-0" style={{ color: opt.iconColor }} />
                  <div>
                    <p className="font-display font-bold" style={{ fontSize: 15, color: cream }}>{opt.label}</p>
                    <p className="mt-0.5 font-body" style={{ fontSize: 12, color: muted }}>{opt.subtitle}</p>
                  </div>
                </div>
              </SelectionCard>
            ))}
          </div>
          <div className="mt-auto pt-8"><PrimaryButton label="SIGUIENTE" onClick={next} disabled={!experience} /></div>
        </div>
      </div>
    );
  }

  /* ════════════ STEP 3: OBJETIVO ════════════ */
  if (step === 3) {
    const opts = [
      { id: "muscle_strength" as Objective, label: "Ganar músculo y fuerza", Icon: Target, iconColor: terracotta, borderColor: terracotta },
      { id: "athletic_performance" as Objective, label: "Mejorar mi rendimiento atlético", Icon: Zap, iconColor: terracotta, borderColor: terracotta },
      { id: "look_feel_better" as Objective, label: "Verme y sentirme mejor", Icon: Heart, iconColor: gold, borderColor: gold },
      { id: "move_better" as Objective, label: "Moverme mejor, sin dolor", Icon: Activity, iconColor: olive, borderColor: olive },
    ];
    return (
      <div className="flex min-h-screen flex-col" style={{ background: bg }}>
        {renderProgressBar(3)}
        <div className="flex flex-1 flex-col px-6 pt-8 pb-8">
          <h1 className="font-display font-bold" style={{ fontSize: 22, color: cream }}>¿Qué quieres lograr, {name.trim().split(" ")[0]}?</h1>
          <p className="mt-2 font-body" style={{ fontSize: 14, color: muted }}>Elige tu objetivo principal</p>
          <div className="mt-8 flex flex-col gap-3">
            {opts.map((opt) => (
              <SelectionCard key={opt.id} selected={objective === opt.id} onSelect={() => setObjective(opt.id)} borderColor={opt.borderColor}>
                <div className="flex items-center gap-4">
                  <opt.Icon className="h-5 w-5 shrink-0" style={{ color: opt.iconColor }} />
                  <p className="font-display font-bold" style={{ fontSize: 15, color: cream }}>{opt.label}</p>
                </div>
              </SelectionCard>
            ))}
          </div>
          <div className="mt-auto pt-8"><PrimaryButton label="SIGUIENTE" onClick={next} disabled={!objective} /></div>
        </div>
      </div>
    );
  }

  /* ════════════ STEP 4: EL MÉTODO LIFTORY (blocks) ════════════ */
  if (step === 4) {
    const blocks = [
      { name: "PRIME BLOCK", desc: "Movilidad y activación neuromuscular. Tu cuerpo listo para rendir.", color: terracotta, Icon: Timer, num: "01" },
      { name: "POWER BLOCK", desc: "Potencia y fuerza explosiva. Patrones atléticos de alto rendimiento.", color: terracotta, Icon: TrendingUp, num: "02" },
      { name: "HEAVY BLOCK", desc: "Fuerza máxima y progresión de carga. El núcleo del método.", color: red, Icon: Dumbbell, num: "03" },
      { name: "BUILD BLOCK", desc: "Hipertrofia y volumen muscular. Esculpe con intención.", color: purple, Icon: RotateCcw, num: "04" },
      { name: "ENGINE BLOCK", desc: "Capacidad cardiovascular y conditioning. Resistencia real.", color: cyan, Icon: Activity, num: "05" },
      { name: "RECOVERY BLOCK", desc: "Movilidad activa y longevidad. Entrena hoy, rinde mañana.", color: olive, Icon: RotateCcw, num: "06" },
    ];

    return (
      <div className="flex min-h-screen flex-col" style={{ background: bg }}>
        {renderProgressBar(4)}
        <div className="flex flex-1 flex-col px-6 pt-8 pb-8 overflow-y-auto">
          {/* Header */}
          <div className="text-center">
            <p className="font-mono uppercase" style={{ fontSize: 12, letterSpacing: "0.2em", color: terracotta }}>EL MÉTODO</p>
            <div className="mx-auto mt-2 h-[2px] w-8" style={{ background: terracotta }} />
            <h1 className="mt-4 font-display" style={{ fontSize: 32, fontWeight: 800, color: cream, letterSpacing: "-0.03em" }}>LIFTORY</h1>
            <p className="mt-2 font-body" style={{ fontSize: 14, color: muted }}>Seis bloques. Cada uno con un propósito.</p>
          </div>

          {/* Block cards */}
          <div className="mt-6 flex flex-col gap-2.5">
            {blocks.map((block) => (
              <div key={block.name} className="flex items-center gap-3"
                style={{ background: cardBg, borderRadius: 14, padding: "14px 16px", borderLeft: `3px solid ${block.color}` }}>
                <div className="flex items-center justify-center rounded-xl shrink-0"
                  style={{ width: 40, height: 40, background: `${block.color}20` }}>
                  <block.Icon className="h-[18px] w-[18px]" style={{ color: block.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold uppercase" style={{ fontSize: 13, letterSpacing: "0.04em", color: block.color }}>{block.name}</p>
                  <p className="mt-0.5 font-body" style={{ fontSize: 11, color: muted, lineHeight: 1.4 }}>{block.desc}</p>
                </div>
                <span className="font-mono shrink-0" style={{ fontSize: 14, color: `${block.color}40` }}>{block.num}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-6">
            <PrimaryButton label="Comenzar mi programa" onClick={next} icon={null} />
            <p className="mt-3 text-center font-body" style={{ fontSize: 11, color: muted }}>Diseñado para ti · Ajustado cada semana</p>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════ STEP 5: PERIODIZACIÓN ════════════ */
  if (step === 5) {
    const phases = [
      { name: "Asimilación", desc: "Aprende. Calibra. Establece la base.", weeks: "S1 — S2", dotColor: "#666" },
      { name: "Escalar", desc: "Más peso. Más volumen. Más tú.", weeks: "S3 — S4", dotColor: red },
      { name: "Peak", desc: "Todo apuntó a esta semana.", weeks: "S5", dotColor: "#E8723A" },
      { name: "Recarga", desc: "Sigues. Tu cuerpo asimila el trabajo.", weeks: "S6", dotColor: olive },
    ];

    return (
      <div className="flex min-h-screen flex-col" style={{ background: bg }}>
        {renderProgressBar(5)}
        <div className="flex flex-1 flex-col px-6 pt-8 pb-8 overflow-y-auto">
          {/* Header */}
          <div className="text-center">
            <p className="font-mono uppercase" style={{ fontSize: 12, letterSpacing: "0.2em", color: terracotta }}>PERIODIZACIÓN</p>
            <div className="mx-auto mt-2 h-[2px] w-8" style={{ background: terracotta }} />
            <h1 className="mt-4 font-display font-bold" style={{ fontSize: 24, color: cream, lineHeight: 1.2 }}>
              Cada semana tiene<br />un propósito exacto.
            </h1>
            <p className="mt-2 font-body" style={{ fontSize: 14, color: muted }}>Así se construye un atleta de verdad.</p>
          </div>

          {/* Intensity curve */}
          <div className="mt-6 rounded-2xl p-4" style={{ background: cardBg, border: `1px solid ${borderDefault}` }}>
            <p className="font-mono uppercase text-center" style={{ fontSize: 9, letterSpacing: "0.15em", color: muted }}>
              CURVA DE INTENSIDAD — MESOCICLO 6 SEMANAS
            </p>
            <svg viewBox="0 0 300 120" className="mt-3 w-full" style={{ height: 100 }}>
              {/* Grid lines */}
              <line x1="30" y1="90" x2="280" y2="90" stroke="#2A2A2A" strokeWidth="0.5" />
              {/* Gradient fill */}
              <defs>
                <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={red} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={red} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M50,75 C80,70 110,55 150,40 C180,28 200,18 220,15 C235,20 250,45 265,55 L265,90 L50,90 Z" fill="url(#curveGrad)" />
              <path d="M50,75 C80,70 110,55 150,40 C180,28 200,18 220,15 C235,20 250,45 265,55" fill="none" stroke={red} strokeWidth="2" />
              {/* Peak dot */}
              <circle cx="220" cy="15" r="5" fill={red} />
              {/* Recovery dot */}
              <circle cx="265" cy="55" r="5" fill={olive} />
              {/* Phase labels */}
              <text x="80" y="108" fill={muted} fontSize="7" fontFamily="'DM Mono', monospace" textAnchor="middle">ASIMILACIÓN</text>
              <text x="165" y="108" fill={muted} fontSize="7" fontFamily="'DM Mono', monospace" textAnchor="middle">ESCALAR</text>
              <text x="220" y="108" fill={red} fontSize="7" fontFamily="'DM Mono', monospace" textAnchor="middle">PEAK</text>
              <text x="265" y="108" fill={olive} fontSize="7" fontFamily="'DM Mono', monospace" textAnchor="middle">RECARGA</text>
              {/* Week labels */}
              <text x="50" y="100" fill="#555" fontSize="7" fontFamily="'DM Mono', monospace" textAnchor="middle">S1</text>
              <text x="100" y="100" fill="#555" fontSize="7" fontFamily="'DM Mono', monospace" textAnchor="middle">S2</text>
              <text x="140" y="100" fill="#555" fontSize="7" fontFamily="'DM Mono', monospace" textAnchor="middle">S3</text>
              <text x="180" y="100" fill="#555" fontSize="7" fontFamily="'DM Mono', monospace" textAnchor="middle">S4</text>
              <text x="220" y="100" fill={red} fontSize="7" fontFamily="'DM Mono', monospace" fontWeight="bold" textAnchor="middle">S5 ↑</text>
              <text x="265" y="100" fill={olive} fontSize="7" fontFamily="'DM Mono', monospace" fontWeight="bold" textAnchor="middle">S6 ✦</text>
            </svg>
          </div>

          {/* Phase cards */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {phases.map((p) => (
              <div key={p.name} className="rounded-xl p-2.5" style={{ background: cardBg, border: `1px solid ${borderDefault}` }}>
                <div className="h-2 w-2 rounded-full" style={{ background: p.dotColor }} />
                <p className="mt-2 font-display font-bold" style={{ fontSize: 11, color: p.dotColor === "#666" ? cream : p.dotColor }}>{p.name}</p>
                <p className="mt-1 font-body" style={{ fontSize: 9, color: muted, lineHeight: 1.3 }}>{p.desc}</p>
                <p className="mt-1.5 font-mono" style={{ fontSize: 8, color: p.dotColor === "#666" ? muted : p.dotColor }}>{p.weeks}</p>
              </div>
            ))}
          </div>

          {/* Info cards */}
          <div className="mt-4 flex flex-col gap-2.5">
            <div className="flex items-start gap-3 rounded-xl p-3.5" style={{ background: cardBg, border: `1px solid ${borderDefault}` }}>
              <div className="flex items-center justify-center rounded-xl shrink-0" style={{ width: 36, height: 36, background: "rgba(199,91,57,0.12)" }}>
                <Star className="h-4 w-4" style={{ color: terracotta }} />
              </div>
              <div>
                <p className="font-display font-bold" style={{ fontSize: 13, color: cream }}>Un año completo. Cada semana con una meta.</p>
                <p className="mt-1 font-body" style={{ fontSize: 11, color: muted, lineHeight: 1.4 }}>Mesociclos encadenados en macrociclos anuales. No hay semana perdida.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl p-3.5" style={{ background: cardBg, border: `1px solid ${borderDefault}` }}>
              <div className="flex items-center justify-center rounded-xl shrink-0" style={{ width: 36, height: 36, background: "rgba(199,91,57,0.12)" }}>
                <ArrowRight className="h-4 w-4" style={{ color: terracotta }} />
              </div>
              <div>
                <p className="font-display font-bold" style={{ fontSize: 13, color: cream }}>Progresión wave. Semana a semana.</p>
                <p className="mt-1 font-body" style={{ fontSize: 11, color: muted, lineHeight: 1.4 }}>Pesos e intensidad se ajustan solos según cómo entrenas. El programa aprende contigo.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl p-3.5" style={{ background: cardBg, border: `1px solid rgba(122,139,92,0.3)` }}>
              <div className="flex items-center justify-center rounded-xl shrink-0" style={{ width: 36, height: 36, background: "rgba(122,139,92,0.12)" }}>
                <Clock className="h-4 w-4" style={{ color: olive }} />
              </div>
              <div>
                <p className="font-display font-bold" style={{ fontSize: 13, color: olive }}>S6 no es parar. Es recargar.</p>
                <p className="mt-1 font-body" style={{ fontSize: 11, color: muted, lineHeight: 1.4 }}>Bajar el volumen esta semana es lo que te lleva al 100% en el siguiente ciclo. Es parte del método.</p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <PrimaryButton label="Quiero mi programa" onClick={next} icon={null} />
            <p className="mt-3 text-center font-body" style={{ fontSize: 11, color: muted }}>Tu primer mesociclo comienza hoy</p>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════ STEP 6: PROPUESTA DE VALOR ════════════ */
  if (step === 6) {
    const valueProps = [
      { Icon: Calendar, text: "Mesociclo periodizado de 6 semanas" },
      { Icon: Play, text: "Video demostrativo de cada ejercicio" },
      { Icon: TrendingUp, text: "Progresión inteligente — cada semana sube el desafío" },
      { Icon: Layers, text: "Movilidad, fuerza, hipertrofia y conditioning integrados" },
    ];
    return (
      <div className="flex min-h-screen flex-col" style={{ background: bg }}>
        {renderProgressBar(6)}
        <div className="flex flex-1 flex-col px-6 pt-8 pb-8">
          <h1 className="font-display font-bold" style={{ fontSize: 22, color: cream }}>
            {name.trim().split(" ")[0]}, tu programa incluye:
          </h1>
          <div className="mt-10 flex flex-col gap-5">
            {valueProps.map((vp, i) => (
              <div key={vp.text} className="flex items-start gap-4" style={{ animation: `fadeSlideIn 0.5s ease-out ${i * 0.3}s both` }}>
                <vp.Icon className="mt-0.5 h-[18px] w-[18px] shrink-0" style={{ color: terracotta }} />
                <p className="font-body" style={{ fontSize: 14, color: cream }}>{vp.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-auto pt-8">
            <PrimaryButton label="CONSTRUIR MI PROGRAMA" onClick={handleBuildProgram} icon={null} />
          </div>
        </div>
        <style>{`
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateX(20px); }
            to   { opacity: 1; transform: translateX(0); }
          }
        `}</style>
      </div>
    );
  }

  /* ════════════ STEP 7: LOADING ════════════ */
  if (step === 7) {
    const msgs = ["Analizando tu perfil...", "Seleccionando ejercicios para tu nivel...", "Armando tu mesociclo de 6 semanas...", "¡Listo!"];
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6" style={{ background: bg }}>
        <p className="font-display" style={{ fontSize: 14, color: cream, opacity: 0.3 }}>LIFTORY</p>
        <div className="mt-10 h-[3px] w-[60%] overflow-hidden rounded-full" style={{ background: borderDefault }}>
          <div className="h-full rounded-full transition-all duration-100 ease-linear" style={{ width: `${loadingProgress}%`, background: terracotta }} />
        </div>
        <div className="mt-6 h-6 relative w-72">
          {msgs.map((msg, i) => (
            <p key={i} className="absolute inset-0 text-center font-body transition-opacity duration-500"
              style={{ fontSize: 15, color: i === 3 && loadingMsgIdx === i ? cream : muted,
                fontFamily: i === 3 && loadingMsgIdx === i ? "'Syne', sans-serif" : undefined,
                opacity: i === loadingMsgIdx ? 1 : 0 }}>
              {msg}
            </p>
          ))}
        </div>
        {assignError && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="font-body text-sm" style={{ color: red }}>Hubo un error al generar tu programa.</p>
            <button onClick={() => { programStarted.current = false; setAssignError(false); }}
              className="font-display font-semibold text-white px-6 py-3 rounded-xl active:scale-[0.97] transition-transform"
              style={{ background: terracotta }}>Reintentar</button>
          </div>
        )}
      </div>
    );
  }

  return <div className="min-h-screen" style={{ background: bg }} />;
}
