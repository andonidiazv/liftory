import { useState, useRef, useLayoutEffect } from "react";

/**
 * Coach-note text that clamps to N lines and offers a "Leer más" / "Leer menos"
 * toggle when the content is long enough to be cut off.
 *
 * Why a shared component: we have several spots that render coach copy of
 * varying length (workout-day note, block-level cue, set-level cue, etc.).
 * Hard-clamping with no expand path was hiding content the athlete needed —
 * Andoni reported this on 2026-05-08. Centralizing here means every coach
 * note gets the same UX for free, and future render sites stay consistent.
 *
 * Detection: we measure the actual rendered scrollHeight against the clamped
 * clientHeight on layout. The button only renders when content overflows —
 * short cues stay clean, no spurious "Leer más" on a one-liner.
 */
type Props = {
  text: string | null | undefined;
  /** Number of lines visible while collapsed. Default 2. */
  clampLines?: number;
  /** Tailwind / inline style on the <p>. */
  className?: string;
  style?: React.CSSProperties;
  /** Color of the "Leer más" button. Defaults to text-primary. */
  toggleColor?: string;
  /** Optional leading icon rendered to the left of the text (e.g. a Quote icon). */
  leadingIcon?: React.ReactNode;
};

export default function ExpandableNote({
  text,
  clampLines = 2,
  className,
  style,
  toggleColor,
  leadingIcon,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  // Measure overflow whenever the text or clamp changes.
  useLayoutEffect(() => {
    if (!ref.current || !text) return;
    // While collapsed, the line-clamp is active and we can compare scroll vs client height.
    // Force a measurement assuming the collapsed state regardless of `expanded`.
    const el = ref.current;
    const wasExpanded = el.style.webkitLineClamp === "" || el.style.overflow === "visible";
    if (wasExpanded) {
      // temporarily collapse to measure
      el.style.webkitLineClamp = String(clampLines);
      el.style.overflow = "hidden";
    }
    const isOverflowing = el.scrollHeight > el.clientHeight + 1;
    setOverflows(isOverflowing);
    if (wasExpanded) {
      el.style.webkitLineClamp = "";
      el.style.overflow = "";
    }
  }, [text, clampLines]);

  if (!text) return null;

  const collapsedStyle: React.CSSProperties = expanded
    ? {}
    : {
        display: "-webkit-box",
        WebkitLineClamp: clampLines,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      };

  const content = (
    <p ref={ref} className={className} style={{ ...style, ...collapsedStyle }}>
      {text}
    </p>
  );

  const button = overflows ? (
    <button
      type="button"
      onClick={() => setExpanded((v) => !v)}
      className="font-body font-medium underline-offset-2 hover:underline"
      style={{
        fontSize: 12,
        color: toggleColor ?? "hsl(var(--primary))",
        marginTop: 4,
        // align the button visually with the same indent as the icon if any
        paddingLeft: leadingIcon ? 18 : 0,
      }}
      aria-expanded={expanded}
    >
      {expanded ? "Leer menos" : "Leer más"}
    </button>
  ) : null;

  if (leadingIcon) {
    return (
      <div>
        <div className="flex items-start gap-1.5">
          {leadingIcon}
          <div className="flex-1 min-w-0">{content}</div>
        </div>
        {button}
      </div>
    );
  }

  return (
    <>
      {content}
      {button}
    </>
  );
}
