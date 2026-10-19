import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ChevronRight, ArrowLeft, Loader2, Check, Clock, Flame, Layers } from "lucide-react";

export interface MesocycleCard {
  id: string;
  cycle_number: number;
  title: string | null;
  tagline: string | null;
  summary: string | null;
  benefits: string[] | null;
  focus_stats: Record<string, number | string> | null;
  accent: string | null;
  total_weeks: number | null;
}

/** Fixed order so every card reads the same way. */
const EJES: Array<[string, string]> = [
  ["fuerza", "Fuerza"],
  ["hipertrofia", "Hipertrofia"],
  ["skill", "Skill"],
  ["motor", "Motor"],
];

const NIVEL_COLOR: Record<string, string> = {
  BASE: "#7A8B5C",
  INTERMEDIO: "#C4A24E",
  AVANZADO: "#C0392B",
};

const num = (v: unknown, d = 0) => (typeof v === "number" ? v : d);

/**
 * Five slots, filled left to right. The filled count is also printed as a
 * numeral — counting bars at a glance is unreliable, and this card is read
 * on a phone between sets.
 */
function StatRow({ label, value, accent, big = false }: { label: string; value: number; accent: string; big?: boolean }) {
  const h = big ? 7 : 6;
  return (
    <div className="flex items-center gap-3">
      <span
        className="font-mono shrink-0"
        style={{
          fontSize: big ? 10 : 9.5,
          letterSpacing: "1.4px",
          textTransform: "uppercase",
          color: "hsl(var(--muted-foreground))",
          width: big ? 92 : 84,
        }}
      >
        {label}
      </span>
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            style={{
              height: h,
              flex: 1,
              borderRadius: 1,
              background: i <= value ? accent : "hsl(var(--border))",
              opacity: i <= value ? 1 : 0.4,
            }}
          />
        ))}
      </div>
      <span
        className="font-mono shrink-0 text-right"
        style={{ fontSize: big ? 12 : 11, width: 14, color: value >= 4 ? accent : "hsl(var(--muted-foreground))", fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </span>
    </div>
  );
}

function NivelChip({ nivel, big = false }: { nivel: string; big?: boolean }) {
  const c = NIVEL_COLOR[nivel] ?? "#A1A1AA";
  return (
    <span
      className="font-mono inline-flex items-center rounded-full shrink-0"
      style={{
        fontSize: big ? 9.5 : 8.5,
        letterSpacing: "1.8px",
        padding: big ? "5px 12px" : "4px 10px",
        color: c,
        border: `1px solid ${c}`,
        background: `${c}14`,
      }}
    >
      {nivel}
    </span>
  );
}

function Dato({ Icon, valor, label }: { Icon: typeof Clock; valor: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Icon className="h-3 w-3 shrink-0" style={{ color: "hsl(var(--muted-foreground))" }} />
      <span className="font-mono" style={{ fontSize: 11, color: "hsl(var(--foreground))", fontVariantNumeric: "tabular-nums" }}>
        {valor}
      </span>
      <span className="font-mono" style={{ fontSize: 8.5, letterSpacing: "1.2px", color: "hsl(var(--muted-foreground))", textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
  );
}

function Card({ m, onOpen }: { m: MesocycleCard; onOpen: () => void }) {
  const accent = m.accent ?? "#C4A24E";
  const s = m.focus_stats ?? {};
  const nivel = String(s.nivel ?? "—");

  return (
    <button
      onClick={onOpen}
      className="w-full text-left rounded-lg overflow-hidden transition-transform active:scale-[0.985]"
      style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
    >
      <div style={{ height: 2, background: `linear-gradient(90deg, ${accent}, transparent 85%)` }} />

      <div className="px-5 pt-4 pb-4">
        {/* cabecera */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono" style={{ fontSize: 9, letterSpacing: "2.2px", color: accent }}>
                M{m.cycle_number}
              </span>
              <NivelChip nivel={nivel} />
            </div>
            <h3
              className="font-display mt-2"
              style={{ fontSize: 27, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.025em", textTransform: "uppercase" }}
            >
              {m.title ?? `M${m.cycle_number}`}
            </h3>
            {m.tagline && (
              <p className="font-body italic mt-1" style={{ fontSize: 12.5, color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>
                {m.tagline}
              </p>
            )}
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 mt-1" style={{ color: "hsl(var(--muted-foreground))" }} />
        </div>

        {/* datos duros */}
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3.5 pt-3.5"
          style={{ borderTop: "1px solid hsl(var(--border))" }}
        >
          <Dato Icon={Clock} valor={`${num(s.min, 65)}`} label="min" />
          <Dato Icon={Flame} valor={`${num(s.rpe, 8)}`} label="rpe" />
          <Dato Icon={Layers} valor={`${num(s.sets)}`} label="sets/sesión" />
        </div>

        {/* enfoque */}
        <div className="flex flex-col gap-2 mt-3.5">
          {EJES.map(([k, label]) => (
            <StatRow key={k} label={label} value={num(s[k])} accent={accent} />
          ))}
        </div>
      </div>
    </button>
  );
}

function Detail({ m, onBack, userId }: { m: MesocycleCard; onBack: () => void; userId: string }) {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);
  const accent = m.accent ?? "#C4A24E";
  const s = m.focus_stats ?? {};
  const nivel = String(s.nivel ?? "—");

  const start = useCallback(async () => {
    setStarting(true);
    try {
      const { data, error } = await supabase.rpc("start_mesocycle", {
        p_user_id: userId,
        p_mesocycle_id: m.id,
        p_start_date: null,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      toast({
        title: `${m.title ?? `M${m.cycle_number}`} activado`,
        description: row?.first_date
          ? `Arranca el ${new Date(row.first_date + "T00:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}`
          : "Tu programa quedó listo",
      });
      navigate("/home");
    } catch (err: any) {
      toast({ title: "No se pudo activar", description: err.message, variant: "destructive" });
      setStarting(false);
    }
  }, [m, userId, navigate]);

  return (
    <div className="pb-10">
      <button
        onClick={onBack}
        className="flex items-center gap-2 font-mono mb-6"
        style={{ fontSize: 9, letterSpacing: "2px", color: "hsl(var(--muted-foreground))" }}
      >
        <ArrowLeft className="h-3 w-3" /> TODOS LOS MESOCICLOS
      </button>

      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="font-mono" style={{ fontSize: 9, letterSpacing: "2.4px", color: accent }}>
          MESOCICLO {m.cycle_number}
        </span>
        <NivelChip nivel={nivel} big />
      </div>
      <h2
        className="font-display mt-2"
        style={{ fontSize: 40, fontWeight: 800, lineHeight: 0.95, letterSpacing: "-0.03em", textTransform: "uppercase" }}
      >
        {m.title ?? `M${m.cycle_number}`}
      </h2>
      {m.tagline && (
        <p className="font-body italic mt-2" style={{ fontSize: 15, color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>
          {m.tagline}
        </p>
      )}

      {/* tres datos duros en tarjetas */}
      <div className="grid grid-cols-3 gap-2 mt-6">
        {[
          { v: `${num(s.min, 65)}`, u: "min", l: "por sesión" },
          { v: `${num(s.rpe, 8)}`, u: "rpe", l: "promedio" },
          { v: `${num(s.sets)}`, u: "", l: "sets por sesión" },
        ].map((d) => (
          <div
            key={d.l}
            className="rounded-md px-3 py-2.5"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          >
            <p className="font-display" style={{ fontSize: 20, fontWeight: 800, lineHeight: 1, color: "hsl(var(--foreground))" }}>
              {d.v}
              <span className="font-mono" style={{ fontSize: 10, fontWeight: 400, color: "hsl(var(--muted-foreground))", marginLeft: 2 }}>
                {d.u}
              </span>
            </p>
            <p className="font-mono mt-1" style={{ fontSize: 8, letterSpacing: "1.4px", textTransform: "uppercase", color: "hsl(var(--muted-foreground))" }}>
              {d.l}
            </p>
          </div>
        ))}
      </div>

      <p className="font-mono mt-7 mb-3" style={{ fontSize: 9, letterSpacing: "2.2px", color: accent }}>
        EN QUÉ SE ENFOCA
      </p>
      <div className="flex flex-col gap-2.5">
        {EJES.map(([k, label]) => (
          <StatRow key={k} label={label} value={num(s[k])} accent={accent} big />
        ))}
      </div>

      {m.summary && (
        <p className="font-body mt-7" style={{ fontSize: 14.5, lineHeight: 1.65, fontWeight: 300, color: "hsl(var(--foreground))" }}>
          {m.summary}
        </p>
      )}

      {!!m.benefits?.length && (
        <>
          <p className="font-mono mt-8 mb-3" style={{ fontSize: 9, letterSpacing: "2.2px", color: accent }}>
            QUÉ TE DEJA
          </p>
          <ul className="flex flex-col gap-2.5">
            {m.benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-3">
                <span style={{ width: 5, height: 5, borderRadius: 99, background: accent, marginTop: 7, flex: "none" }} />
                <span className="font-body" style={{ fontSize: 13.5, lineHeight: 1.5, fontWeight: 300, color: "hsl(var(--muted-foreground))" }}>
                  {b}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-8 rounded-lg px-4 py-3.5" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
        <p className="font-body" style={{ fontSize: 12.5, lineHeight: 1.5, color: "hsl(var(--muted-foreground))", fontWeight: 300 }}>
          Arranca <strong style={{ color: "hsl(var(--foreground))", fontWeight: 500 }}>hoy mismo</strong> y corre{" "}
          {m.total_weeks ?? 6} semanas. Tus entrenamientos ya registrados no se tocan.
        </p>
      </div>

      <button
        onClick={start}
        disabled={starting}
        className="w-full mt-5 rounded-lg flex items-center justify-center gap-2.5 transition-opacity active:opacity-80 disabled:opacity-50"
        style={{ background: accent, color: "#0A0A0A", padding: "16px 0" }}
      >
        {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        <span className="font-mono" style={{ fontSize: 11, letterSpacing: "2.6px", fontWeight: 500 }}>
          {starting ? "ACTIVANDO" : "COMENZAR"}
        </span>
      </button>
    </div>
  );
}

export default function MesocyclePicker({ mesocycles, userId }: { mesocycles: MesocycleCard[]; userId: string }) {
  const [open, setOpen] = useState<MesocycleCard | null>(null);

  if (open) return <Detail m={open} userId={userId} onBack={() => setOpen(null)} />;

  return (
    <div className="pb-8">
      <p className="font-mono mb-1" style={{ fontSize: 9, letterSpacing: "2.4px", color: "#C4A24E" }}>
        ELIGE TU BLOQUE
      </p>
      <p className="font-body mb-4" style={{ fontSize: 13.5, lineHeight: 1.55, fontWeight: 300, color: "hsl(var(--muted-foreground))" }}>
        Cinco mesociclos, cinco enfoques distintos. Puedes repetir cualquiera — arranca hoy mismo sin tocar lo que ya entrenaste.
      </p>

      {/* leyenda: qué significa el chip de nivel */}
      <div className="flex items-center gap-3 flex-wrap mb-5">
        {(["BASE", "INTERMEDIO", "AVANZADO"] as const).map((n) => (
          <div key={n} className="flex items-center gap-1.5">
            <span style={{ width: 7, height: 7, borderRadius: 99, background: NIVEL_COLOR[n] }} />
            <span className="font-mono" style={{ fontSize: 8.5, letterSpacing: "1.4px", color: "hsl(var(--muted-foreground))" }}>
              {n === "BASE" ? "PEGA SUAVE" : n === "INTERMEDIO" ? "PEGA MEDIO" : "PEGA FUERTE"}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {mesocycles.map((m) => (
          <Card key={m.id} m={m} onOpen={() => setOpen(m)} />
        ))}
      </div>
    </div>
  );
}
