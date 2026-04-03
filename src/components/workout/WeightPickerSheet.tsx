import { useState, useRef, useEffect, useCallback, useMemo } from "react";

interface Props {
  visible: boolean;
  unit: "kg" | "lb";
  initialValue: number;
  onConfirm: (value: number) => void;
  onClose: () => void;
}

// kg: 0–365 in 0.5 steps | lb: 0–800 in 1 step
function generateValues(unit: "kg" | "lb"): number[] {
  const vals: number[] = [];
  if (unit === "kg") {
    for (let i = 0; i <= 730; i++) vals.push(i * 0.5);
  } else {
    for (let i = 0; i <= 800; i++) vals.push(i);
  }
  return vals;
}

const ITEM_HEIGHT = 48;
const VISIBLE_COUNT = 5;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;

export default function WeightPickerSheet({ visible, unit, initialValue, onConfirm, onClose }: Props) {
  const values = useMemo(() => generateValues(unit), [unit]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>();
  const isInitialScroll = useRef(true);
  // Keep a ref that always has the latest selectedIndex for confirm
  const selectedIndexRef = useRef(0);

  // Find closest index for initial value
  useEffect(() => {
    if (!visible) return;
    const closest = values.reduce((best, v, i) =>
      Math.abs(v - initialValue) < Math.abs(values[best] - initialValue) ? i : best, 0
    );
    setSelectedIndex(closest);
    selectedIndexRef.current = closest;
    isInitialScroll.current = true;

    // Scroll to position after mount
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        const top = closest * ITEM_HEIGHT;
        scrollRef.current.scrollTop = top;
      }
      // Allow onScroll to work after initial positioning
      setTimeout(() => { isInitialScroll.current = false; }, 150);
    });
  }, [visible, initialValue, values]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current || isInitialScroll.current) return;

    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

    // Immediately update the ref for accurate confirm
    const scrollTop = scrollRef.current.scrollTop;
    const immediateIndex = Math.round(scrollTop / ITEM_HEIGHT);
    const clampedImmediate = Math.max(0, Math.min(immediateIndex, values.length - 1));
    selectedIndexRef.current = clampedImmediate;

    scrollTimeout.current = setTimeout(() => {
      if (!scrollRef.current) return;
      const st = scrollRef.current.scrollTop;
      const index = Math.round(st / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
      setSelectedIndex(clampedIndex);
      selectedIndexRef.current = clampedIndex;

      // Snap to exact position
      scrollRef.current.scrollTo({
        top: clampedIndex * ITEM_HEIGHT,
        behavior: "smooth",
      });
    }, 80);
  }, [values.length]);

  const handleConfirm = () => {
    // Use the ref for the most up-to-date index
    const idx = selectedIndexRef.current;
    onConfirm(values[idx]);
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/40" />

      {/* Sheet */}
      <div
        className="relative w-full max-w-md rounded-t-2xl overflow-hidden animate-slide-up"
        style={{ background: "#FAF8F5" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid #E0DCD7" }}>
          <button onClick={onClose} className="font-body text-sm text-muted-foreground">
            Cancelar
          </button>
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            PESO ({unit.toUpperCase()})
          </span>
          <button onClick={handleConfirm} className="font-body text-sm font-semibold" style={{ color: "#C75B39" }}>
            Listo
          </button>
        </div>

        {/* Wheel container */}
        <div className="relative" style={{ height: CONTAINER_HEIGHT }}>
          {/* Selection highlight band */}
          <div
            className="absolute left-4 right-4 pointer-events-none rounded-xl"
            style={{
              top: ITEM_HEIGHT * 2,
              height: ITEM_HEIGHT,
              background: "rgba(199,91,57,0.08)",
              border: "1.5px solid rgba(199,91,57,0.2)",
            }}
          />

          {/* Top/bottom fade gradients */}
          <div
            className="absolute top-0 left-0 right-0 pointer-events-none z-10"
            style={{ height: ITEM_HEIGHT * 2, background: "linear-gradient(to bottom, #FAF8F5 10%, transparent)" }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
            style={{ height: ITEM_HEIGHT * 2, background: "linear-gradient(to top, #FAF8F5 10%, transparent)" }}
          />

          {/* Scrollable list */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="h-full overflow-y-scroll"
            style={{
              scrollSnapType: "y mandatory",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {/* Top padding (2 empty slots) */}
            <div style={{ height: ITEM_HEIGHT * 2 }} />

            {values.map((val, i) => {
              const isSelected = i === selectedIndex;
              const distance = Math.abs(i - selectedIndex);

              return (
                <div
                  key={i}
                  style={{
                    height: ITEM_HEIGHT,
                    scrollSnapAlign: "start",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: distance === 0 ? 1 : distance === 1 ? 0.5 : 0.25,
                    transform: `scale(${distance === 0 ? 1 : distance === 1 ? 0.9 : 0.8})`,
                    transition: "opacity 0.15s, transform 0.15s",
                  }}
                >
                  <span
                    className="font-mono tabular-nums"
                    style={{
                      fontSize: isSelected ? 32 : 22,
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? "#1C1C1E" : "#B0ACA7",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {unit === "kg" ? val.toFixed(1) : val}
                  </span>
                  {isSelected && (
                    <span
                      className="font-mono uppercase ml-2"
                      style={{ fontSize: 14, color: "#C75B39", fontWeight: 600, letterSpacing: "0.1em" }}
                    >
                      {unit}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Bottom padding (2 empty slots) */}
            <div style={{ height: ITEM_HEIGHT * 2 }} />
          </div>
        </div>

        {/* Quick increment buttons */}
        <div
          className="flex items-center justify-center gap-2 px-5 py-3"
          style={{ borderTop: "1px solid #E0DCD7" }}
        >
          {(unit === "kg" ? [-5, -2.5, 2.5, 5] : [-10, -5, 5, 10]).map((inc) => (
            <button
              key={inc}
              onClick={() => {
                const currentVal = values[selectedIndexRef.current] ?? 0;
                const newVal = currentVal + inc;
                const closest = values.reduce((best, v, i) =>
                  Math.abs(v - newVal) < Math.abs(values[best] - newVal) ? i : best, 0
                );
                setSelectedIndex(closest);
                selectedIndexRef.current = closest;
                if (scrollRef.current) {
                  scrollRef.current.scrollTo({ top: closest * ITEM_HEIGHT, behavior: "smooth" });
                }
              }}
              className="rounded-full px-3 py-1.5 font-mono text-sm transition-colors"
              style={{
                background: inc > 0 ? "rgba(199,91,57,0.1)" : "rgba(136,136,136,0.1)",
                color: inc > 0 ? "#C75B39" : "#888",
                fontSize: 13,
              }}
            >
              {inc > 0 ? `+${inc}` : inc}
            </button>
          ))}
        </div>

        {/* Safe area padding */}
        <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
      </div>

      <style>{`
        .animate-slide-up {
          animation: slideUp 0.25s ease-out;
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
