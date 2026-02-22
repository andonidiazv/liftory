import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { todayWorkout, sessionBlocks, user } from "@/data/workout";
import {
  ChevronDown,
  ChevronRight,
  Sun,
  Zap,
  HeartPulse,
  Leaf,
} from "lucide-react";
import Layout from "@/components/Layout";

const iconMap: Record<string, React.ElementType> = {
  Sun,
  Zap,
  HeartPulse,
  Leaf,
};

export default function Briefing() {
  const navigate = useNavigate();
  const { startWorkout } = useApp();
  const [expanded, setExpanded] = useState<string[]>([]);

  const toggleBlock = (id: string) => {
    setExpanded((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const handleStart = () => {
    startWorkout();
    navigate("/workout", { replace: true });
  };

  const cycleProgress = ((user.week - 1) * 4 + 4) / (user.totalWeeks * 4); // day 4 of week 3 out of 6 weeks

  return (
    <Layout>
      <div className="animate-fade-up px-5 pt-14 pb-32">
        {/* Cycle progress */}
        <div className="flex items-center justify-between">
          <p className="font-display text-sm font-semibold text-foreground">
            Día 4 de 24
          </p>
          <p className="text-xs text-muted-foreground">
            Semana {user.week} de {user.totalWeeks}
          </p>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${cycleProgress * 100}%` }}
          />
        </div>

        {/* Day title */}
        <h1 className="mt-6 text-hero text-foreground">
          {todayWorkout.name}
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Construye pecho y hombros
        </p>

        {/* Why today card */}
        <div className="mt-6 rounded-2xl bg-secondary p-5">
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            Llevas 2 días de pull y pierna. Hoy activamos la cadena anterior con
            énfasis en tempo excéntrico para maximizar tensión mecánica en pecho.
            Tu recovery Whoop está en {user.recovery}% — intensidad completa.
          </p>
        </div>

        {/* Session info */}
        <p className="mt-6 text-xs text-muted-foreground">
          Sesión completa · 55-65 min · 4 bloques
        </p>

        {/* Blocks */}
        <div className="mt-3 flex flex-col gap-3">
          {sessionBlocks.map((block) => {
            const Icon = iconMap[block.icon] || Zap;
            const isExpanded = expanded.includes(block.id);

            return (
              <button
                key={block.id}
                onClick={() => toggleBlock(block.id)}
                className="press-scale w-full text-left rounded-2xl bg-card transition-all duration-300"
                style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
              >
                <div className="flex overflow-hidden rounded-2xl">
                  <div
                    className="w-1 shrink-0 rounded-l-2xl"
                    style={{ backgroundColor: block.accentColor }}
                  />
                  <div className="flex-1 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-xl"
                          style={{ backgroundColor: `${block.accentColor}15` }}
                        >
                          <Icon
                            className="h-4.5 w-4.5"
                            style={{ color: block.accentColor }}
                          />
                        </div>
                        <div>
                          <p className="font-display text-sm font-bold text-foreground tracking-wide">
                            {block.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {block.exercises.length} ejercicios · {block.estimatedTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {block.format && (
                          <span
                            className="rounded-lg px-2 py-1 text-[10px] font-bold tracking-wider"
                            style={{
                              backgroundColor: `${block.accentColor}15`,
                              color: block.accentColor,
                            }}
                          >
                            {block.format}
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 flex flex-col gap-2 animate-fade-up">
                        {block.exercises.map((ex, i) => (
                          <div
                            key={i}
                            className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${
                              block.type === "cooldown" ? "bg-secondary/50" : "bg-secondary"
                            }`}
                          >
                            <span className="text-sm font-medium text-foreground truncate">
                              {ex.name}
                            </span>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              {ex.duration ? (
                                <span className="font-mono text-xs text-muted-foreground">
                                  {ex.duration}
                                </span>
                              ) : (
                                <>
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {ex.sets && `${ex.sets}×`}{ex.reps}
                                  </span>
                                  {ex.weight && (
                                    <span className="font-mono text-xs text-foreground font-medium">
                                      {ex.weight}
                                    </span>
                                  )}
                                </>
                              )}
                              {ex.tempo && (
                                <span className="font-mono text-[10px] text-primary">
                                  {ex.tempo}
                                </span>
                              )}
                              {ex.rpe && (
                                <span
                                  className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                                  style={{
                                    backgroundColor: `${block.accentColor}15`,
                                    color: block.accentColor,
                                  }}
                                >
                                  RPE {ex.rpe}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-20 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent px-5 pb-4 pt-4 z-40">
        <button
          onClick={handleStart}
          className="press-scale flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-display text-lg font-bold text-primary-foreground glow-primary"
        >
          COMENZAR SESIÓN
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </Layout>
  );
}
