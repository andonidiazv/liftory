import { useState } from "react";
import { ArrowLeft, X, ChevronDown, ChevronUp } from "lucide-react";
import type {
  MesocycleManualContent,
  DetailedFormat,
  MesoPurpose,
  ReadingGuide,
  FAQItem,
} from "@/lib/mesocycle-content";
import { useDarkMode } from "@/hooks/useDarkMode";
import { dia, noche } from "@/lib/colors";

interface Props {
  content: MesocycleManualContent;
  onClose: () => void;
}

export default function MesocycleManual({ content, onClose }: Props) {
  const { isDark } = useDarkMode();
  const tc = isDark ? noche : dia;

  // Track which format is expanded — open the first by default for discoverability
  const [expanded, setExpanded] = useState<string | null>(content.formats[0]?.name ?? null);

  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-y-auto animate-fade-in">
      <div className="mx-auto max-w-md px-5 pt-14 pb-8">
        {/* Header — back arrow + close X */}
        <div className="flex items-start justify-between mb-8">
          <button
            onClick={onClose}
            className="press-scale flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: tc.card }}
            aria-label="Volver"
          >
            <ArrowLeft className="h-4 w-4" style={{ color: tc.muted }} />
          </button>
          <button
            onClick={onClose}
            className="press-scale flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ backgroundColor: tc.card }}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" style={{ color: tc.muted }} />
          </button>
        </div>

        {/* Hero */}
        <div
          className="font-mono text-[10px] uppercase tracking-[2px] mb-3"
          style={{ color: tc.muted }}
        >
          {content.subtitle}
        </div>
        <h1
          className="font-display text-[34px] font-bold leading-tight mb-4"
          style={{ color: tc.text, letterSpacing: "-0.02em" }}
        >
          📖 {content.title}
        </h1>
        <p className="font-body text-[13px] leading-relaxed mb-8" style={{ color: tc.muted }}>
          {content.intro}
        </p>

        {/* Section 1 — Purpose (inline, always visible) */}
        <PurposeSection purpose={content.purpose} tc={tc} />

        {/* Section 2 — Reading guide (inline, always visible) */}
        <ReadingGuideSection guide={content.readingGuide} tc={tc} />

        {/* Section 3 — Formats accordion */}
        <section className="mb-8">
          <h2
            className="font-mono text-[10px] uppercase mb-4"
            style={{ color: tc.accent, letterSpacing: "2px" }}
          >
            Formatos en este meso
          </h2>
          <div className="flex flex-col gap-3">
            {content.formats.map((fmt) => (
              <FormatAccordion
                key={fmt.name}
                fmt={fmt}
                isOpen={expanded === fmt.name}
                onToggle={() => setExpanded(expanded === fmt.name ? null : fmt.name)}
                tc={tc}
              />
            ))}
          </div>
        </section>

        {/* Section 4 — FAQ accordion */}
        <FAQSection items={content.faq} tc={tc} />

        {/* Close CTA */}
        <button
          onClick={onClose}
          className="press-scale w-full rounded-xl py-3.5 font-body text-[13px]"
          style={{ backgroundColor: tc.card, color: tc.muted, border: `1px solid ${tc.border}` }}
        >
          Cerrar manual
        </button>
      </div>
    </div>
  );
}

interface AccordionProps {
  fmt: DetailedFormat;
  isOpen: boolean;
  onToggle: () => void;
  tc: typeof dia;
}

function FormatAccordion({ fmt, isOpen, onToggle, tc }: AccordionProps) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        backgroundColor: tc.card,
        border: `1px solid ${isOpen ? tc.accent : tc.border}`,
      }}
    >
      {/* Header — always visible */}
      <button
        onClick={onToggle}
        className="press-scale w-full flex items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span style={{ fontSize: 22 }} className="shrink-0 leading-none">
            {fmt.icon}
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-[15px] font-bold mb-0.5" style={{ color: tc.text }}>
              {fmt.name}
            </h3>
            <p className="font-body text-[11px]" style={{ color: tc.muted }}>
              {fmt.tagline}
            </p>
          </div>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 shrink-0" style={{ color: tc.muted }} />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0" style={{ color: tc.muted }} />
        )}
      </button>

      {/* Body — expanded */}
      {isOpen && (
        <div
          className="px-4 pb-4 pt-1 flex flex-col gap-4 animate-fade-in"
          style={{ borderTop: `1px solid ${tc.border}` }}
        >
          {/* What is it */}
          <Section label="¿Qué es?" tc={tc}>
            <p className="font-body text-[13px] leading-relaxed" style={{ color: tc.text }}>
              {fmt.whatIsIt}
            </p>
          </Section>

          {/* Example walkthrough */}
          <Section label="Ejemplo paso a paso" tc={tc}>
            <p
              className="font-mono text-[11px] mb-3 px-3 py-2 rounded-lg"
              style={{
                color: tc.accent,
                backgroundColor: tc.accentBg,
                border: `1px solid ${tc.accentBgStrong}`,
              }}
            >
              {fmt.exampleTitle}
            </p>
            <ol className="flex flex-col gap-2 pl-0">
              {fmt.walkthrough.map((step, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span
                    className="font-mono text-[10px] font-bold shrink-0 flex h-5 w-5 items-center justify-center rounded-full mt-0.5"
                    style={{ backgroundColor: tc.accentBgStrong, color: tc.accent }}
                  >
                    {i + 1}
                  </span>
                  <p
                    className="font-body text-[13px] leading-relaxed flex-1"
                    style={{ color: tc.text }}
                  >
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </Section>

          {/* Scoring */}
          <Section label="Cómo se mide" tc={tc}>
            <p className="font-body text-[13px] leading-relaxed" style={{ color: tc.text }}>
              {fmt.scoring}
            </p>
          </Section>

          {/* Why it works */}
          <Section label="Por qué funciona" tc={tc}>
            <p className="font-body text-[13px] leading-relaxed" style={{ color: tc.muted }}>
              {fmt.whyItWorks}
            </p>
          </Section>

          {/* Top tip */}
          <div
            className="rounded-xl p-3"
            style={{ backgroundColor: tc.accentBg, borderLeft: `3px solid ${tc.accent}` }}
          >
            <div
              className="font-mono text-[10px] uppercase mb-1.5"
              style={{ color: tc.accent, letterSpacing: "2px" }}
            >
              💡 Tip clave
            </div>
            <p className="font-body text-[13px] leading-relaxed" style={{ color: tc.text }}>
              {fmt.topTip}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  label,
  tc,
  children,
}: {
  label: string;
  tc: typeof dia;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="font-mono text-[9px] uppercase mb-2"
        style={{ color: tc.muted, letterSpacing: "2px" }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION 1 — Purpose / Why M2
// ─────────────────────────────────────────────
function PurposeSection({ purpose, tc }: { purpose: MesoPurpose; tc: typeof dia }) {
  return (
    <section className="mb-8">
      <h2
        className="font-mono text-[10px] uppercase mb-4"
        style={{ color: tc.accent, letterSpacing: "2px" }}
      >
        🎯 Por qué M2
      </h2>

      {/* Philosophy paragraph */}
      <div
        className="rounded-2xl p-4 mb-4"
        style={{ backgroundColor: tc.card, border: `1px solid ${tc.border}` }}
      >
        <p className="font-body text-[13px] leading-relaxed" style={{ color: tc.text }}>
          {purpose.philosophy}
        </p>
      </div>

      {/* Progression steps */}
      <div
        className="font-mono text-[9px] uppercase mb-3"
        style={{ color: tc.muted, letterSpacing: "2px" }}
      >
        La progresión
      </div>
      <div className="flex flex-col gap-2.5">
        {purpose.progression.map((step) => (
          <div
            key={step.meso}
            className="rounded-xl p-3.5"
            style={{
              backgroundColor: step.isCurrent ? tc.accentBg : tc.card,
              border: `1px solid ${step.isCurrent ? tc.accent : tc.border}`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="font-mono text-[10px] font-bold px-2 py-0.5 rounded"
                style={{
                  backgroundColor: step.isCurrent ? tc.accent : tc.accentBgStrong,
                  color: step.isCurrent ? tc.btnText : tc.accent,
                }}
              >
                {step.meso}
              </span>
              <span
                className="font-mono text-[10px] uppercase"
                style={{ color: tc.muted, letterSpacing: "1.5px" }}
              >
                {step.phase}
              </span>
              {step.isCurrent && (
                <span
                  className="font-mono text-[9px] ml-auto"
                  style={{ color: tc.accent, letterSpacing: "1px" }}
                >
                  ← AQUÍ
                </span>
              )}
            </div>
            <p className="font-body text-[12px] leading-relaxed" style={{ color: tc.text }}>
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// SECTION 2 — Reading guide (RPE / RIR / descriptors / rest)
// ─────────────────────────────────────────────
function ReadingGuideSection({ guide, tc }: { guide: ReadingGuide; tc: typeof dia }) {
  return (
    <section className="mb-8">
      <h2
        className="font-mono text-[10px] uppercase mb-4"
        style={{ color: tc.accent, letterSpacing: "2px" }}
      >
        📊 Cómo leer tu workout
      </h2>

      {/* RPE / RIR scale */}
      <div
        className="rounded-2xl p-4 mb-3"
        style={{ backgroundColor: tc.card, border: `1px solid ${tc.border}` }}
      >
        <div
          className="font-mono text-[10px] uppercase mb-2"
          style={{ color: tc.text, letterSpacing: "1.5px" }}
        >
          RPE / RIR
        </div>
        <p className="font-body text-[12px] leading-relaxed mb-3" style={{ color: tc.muted }}>
          {guide.rpeIntro}
        </p>
        <div className="flex flex-col gap-1.5">
          {guide.rpeScale.map((lvl) => (
            <div
              key={lvl.score}
              className="flex items-start gap-3 py-1.5"
              style={{ borderTop: `1px solid ${tc.border}` }}
            >
              <span
                className="font-mono text-[11px] font-bold w-12 shrink-0"
                style={{ color: tc.accent }}
              >
                RPE {lvl.score}
              </span>
              <span
                className="font-mono text-[10px] w-12 shrink-0 pt-0.5"
                style={{ color: tc.muted }}
              >
                {lvl.rir}
              </span>
              <span className="font-body text-[12px] flex-1" style={{ color: tc.text }}>
                {lvl.description}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Qualitative descriptors */}
      <div
        className="rounded-2xl p-4 mb-3"
        style={{ backgroundColor: tc.card, border: `1px solid ${tc.border}` }}
      >
        <div
          className="font-mono text-[10px] uppercase mb-2"
          style={{ color: tc.text, letterSpacing: "1.5px" }}
        >
          Descriptores cualitativos
        </div>
        <p className="font-body text-[12px] leading-relaxed mb-3" style={{ color: tc.muted }}>
          {guide.descriptorsIntro}
        </p>
        <div className="flex flex-col gap-2.5">
          {guide.qualitativeDescriptors.map((d) => (
            <div key={d.name}>
              <div
                className="font-display text-[12px] font-bold mb-1"
                style={{ color: tc.accent }}
              >
                {d.name}
              </div>
              <p className="font-body text-[12px] leading-relaxed" style={{ color: tc.text }}>
                {d.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Rest by block */}
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: tc.card, border: `1px solid ${tc.border}` }}
      >
        <div
          className="font-mono text-[10px] uppercase mb-2"
          style={{ color: tc.text, letterSpacing: "1.5px" }}
        >
          Descanso por bloque
        </div>
        <p className="font-body text-[12px] leading-relaxed mb-3" style={{ color: tc.muted }}>
          {guide.restIntro}
        </p>
        <div className="flex flex-col gap-3">
          {guide.restByBlock.map((r) => (
            <div
              key={r.blockType}
              className="pt-2.5"
              style={{ borderTop: `1px solid ${tc.border}` }}
            >
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span
                  className="font-display text-[12px] font-bold flex-1"
                  style={{ color: tc.text }}
                >
                  {r.blockType}
                </span>
                <span
                  className="font-mono text-[11px] shrink-0"
                  style={{ color: tc.accent }}
                >
                  {r.duration}
                </span>
              </div>
              <p className="font-body text-[11px] leading-relaxed" style={{ color: tc.muted }}>
                {r.note}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// SECTION 4 — FAQ accordion
// ─────────────────────────────────────────────
function FAQSection({ items, tc }: { items: FAQItem[]; tc: typeof dia }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section className="mb-8">
      <h2
        className="font-mono text-[10px] uppercase mb-4"
        style={{ color: tc.accent, letterSpacing: "2px" }}
      >
        💬 FAQ del atleta
      </h2>
      <div className="flex flex-col gap-2.5">
        {items.map((item, i) => {
          const isOpen = openIdx === i;
          return (
            <div
              key={i}
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: tc.card,
                border: `1px solid ${isOpen ? tc.accent : tc.border}`,
              }}
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : i)}
                className="press-scale w-full flex items-start gap-3 p-3.5 text-left"
              >
                <span
                  className="font-mono text-[11px] font-bold shrink-0"
                  style={{ color: tc.accent }}
                >
                  Q{i + 1}
                </span>
                <p
                  className="font-display text-[13px] font-semibold leading-snug flex-1"
                  style={{ color: tc.text }}
                >
                  {item.question}
                </p>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 shrink-0 mt-0.5" style={{ color: tc.muted }} />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 mt-0.5" style={{ color: tc.muted }} />
                )}
              </button>
              {isOpen && (
                <div
                  className="px-3.5 pb-3.5 pt-1 animate-fade-in"
                  style={{ borderTop: `1px solid ${tc.border}` }}
                >
                  <p
                    className="font-body text-[13px] leading-relaxed pt-2.5"
                    style={{ color: tc.text }}
                  >
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
