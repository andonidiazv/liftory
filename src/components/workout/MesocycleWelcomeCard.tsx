import { X } from "lucide-react";
import type { MesocycleIntroContent } from "@/lib/mesocycle-content";
import { useDarkMode } from "@/hooks/useDarkMode";
import { dia, noche } from "@/lib/colors";

interface Props {
  content: MesocycleIntroContent;
  onContinue: () => void;
  onSkip: () => void;
}

export default function MesocycleWelcomeCard({ content, onContinue, onSkip }: Props) {
  const { isDark } = useDarkMode();
  const tc = isDark ? noche : dia;

  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-y-auto animate-fade-in">
      <div className="mx-auto max-w-md px-5 pt-14 pb-8">
        {/* Header — subtitle + close X */}
        <div className="flex items-start justify-between mb-8">
          <div
            className="font-mono text-[10px] uppercase tracking-[2px]"
            style={{ color: tc.muted }}
          >
            {content.subtitle}
          </div>
          <button
            onClick={onSkip}
            className="press-scale flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: tc.card }}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" style={{ color: tc.muted }} />
          </button>
        </div>

        {/* Hero */}
        <h1
          className="font-display text-[34px] font-bold leading-tight mb-3"
          style={{ color: tc.text, letterSpacing: "-0.02em" }}
        >
          🔥 {content.title}
        </h1>
        <p className="font-body text-[14px] leading-relaxed mb-10" style={{ color: tc.muted }}>
          {content.heroDescription}
        </p>

        {/* Split overview */}
        <section className="mb-10">
          <h2
            className="font-mono text-[10px] uppercase mb-4"
            style={{ color: tc.accent, letterSpacing: "2px" }}
          >
            Tu split semanal
          </h2>
          <div className="rounded-2xl p-4" style={{ backgroundColor: tc.card, border: `1px solid ${tc.border}` }}>
            <div className="flex flex-col gap-3">
              {content.splitOverview.map((day, i) => (
                <div
                  key={day.day}
                  className="flex items-start gap-3"
                  style={{
                    paddingTop: i > 0 ? 12 : 0,
                    borderTop: i > 0 ? `1px solid ${tc.border}` : "none",
                  }}
                >
                  <span
                    className="font-mono text-[11px] font-semibold w-10 shrink-0 pt-0.5"
                    style={{ color: tc.accent }}
                  >
                    {day.day}
                  </span>
                  <div className="flex-1">
                    <p className="font-display text-[14px] font-semibold" style={{ color: tc.text }}>
                      {day.name}
                    </p>
                    <p className="font-body text-[12px]" style={{ color: tc.muted }}>
                      {day.signature}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Formats new */}
        <section className="mb-10">
          <h2
            className="font-mono text-[10px] uppercase mb-4"
            style={{ color: tc.accent, letterSpacing: "2px" }}
          >
            Formatos nuevos en este meso
          </h2>
          <div className="flex flex-col gap-2.5">
            {content.formats.map((fmt) => (
              <div
                key={fmt.name}
                className="rounded-xl p-4"
                style={{ backgroundColor: tc.card, border: `1px solid ${tc.border}` }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span style={{ fontSize: 18 }}>{fmt.icon}</span>
                  <h3 className="font-display text-[14px] font-bold" style={{ color: tc.text }}>
                    {fmt.name}
                  </h3>
                </div>
                <p className="font-body text-[12px] leading-relaxed" style={{ color: tc.muted }}>
                  {fmt.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Deload note */}
        {content.deloadNote && (
          <section
            className="rounded-xl p-4 mb-10"
            style={{ backgroundColor: tc.accentBg, borderLeft: `3px solid ${tc.accent}` }}
          >
            <h3
              className="font-mono text-[10px] uppercase mb-2"
              style={{ color: tc.accent, letterSpacing: "2px" }}
            >
              📉 Nota sobre DELOAD
            </h3>
            <p className="font-body text-[12px] leading-relaxed" style={{ color: tc.text }}>
              {content.deloadNote}
            </p>
          </section>
        )}

        {/* Programa hint */}
        <div
          className="rounded-xl p-3.5 mb-6 flex items-start gap-3"
          style={{ backgroundColor: tc.card, border: `1px dashed ${tc.border}` }}
        >
          <span style={{ fontSize: 16 }} className="shrink-0 leading-none mt-0.5">
            📖
          </span>
          <p className="font-body text-[12px] leading-relaxed flex-1" style={{ color: tc.muted }}>
            {content.programaHint}
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onContinue}
            className="press-scale w-full rounded-xl py-4 font-display text-[15px] font-semibold"
            style={{ backgroundColor: tc.accent, color: tc.btnText }}
          >
            Empezar primer workout →
          </button>
          <button
            onClick={onSkip}
            className="press-scale w-full rounded-xl py-3.5 font-body text-[13px]"
            style={{ backgroundColor: tc.card, color: tc.muted, border: `1px solid ${tc.border}` }}
          >
            Saltar intro y empezar directo
          </button>
        </div>
      </div>
    </div>
  );
}
