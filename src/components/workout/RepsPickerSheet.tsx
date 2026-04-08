import { useState, useRef, useEffect, useCallback } from "react";

interface Props {
  visible: boolean;
  initialValue: number;
  onConfirm: (value: number) => void;
  onClose: () => void;
}

function generateValues(): number[] {
  const vals: number[] = [];
  for (let i = 1; i <= 100; i++) vals.push(i);
  return vals;
}

const ITEM_HEIGHT = 48;
const VISIBLE_COUNT = 5;
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;
const VALUES = generateValues();

export default function RepsPickerSheet({ visible, initialValue, onConfirm, onClose }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>();
  const isInitialScroll = useRef(true);
  const selectedIndexRef = useRef(0);

  useEffect(() => {
    if (!visible) return;
    const closest = VALUES.reduce((best, v, i) =>
      Math.abs(v - initialValue) < Math.abs(VALUES[best] - initialValue) ? i : best, 0
    );
    setSelectedIndex(closest);
    selectedIndexRef.current = closest;
    isInitialScroll.current = true;

    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = closest * ITEM_HEIGHT;
      }
      setTimeout(() => { isInitialScroll.current = false; }, 150);
    });
  }, [visible, initialValue]);

  const scrollToIndex = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, VALUES.length - 1));
    setSelectedIndex(clamped);
    selectedIndexRef.current = clamped;
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: "smooth" });
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current || isInitialScroll.current) return;

    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

    const scrollTop = scrollRef.current.scrollTop;
    const immediateIndex = Math.round(scrollTop / ITEM_HEIGHT);
    const clampedImmediate = Math.max(0, Math.min(immediateIndex, VALUES.length - 1));
    selectedIndexRef.current = clampedImmediate;

    scrollTimeout.current = setTimeout(() => {
      if (!scrollRef.current) return;
      const st = scrollRef.current.scrollTop;
      const index = Math.round(st / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, VALUES.length - 1));
      setSelectedIndex(clampedIndex);
      selectedIndexRef.current = clampedIndex;

      scrollRef.current.scrollTo({
        top: clampedIndex * ITEM_HEIGHT,
        behavior: "smooth",
      });
    }, 80);
  }, []);

  const handleConfirm = () => {
    const idx = selectedIndexRef.current;
    onConfirm(VALUES[idx]);
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/40" />

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
            REPS
          </span>
          <button onClick={handleConfirm} className="font-body text-sm font-semibold" style={{ color: "#C75B39" }}>
            Listo
          </button>
        </div>

        {/* Wheel */}
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

          {/* Top/bottom fade gradients — reduced intensity for readability */}
          <div
            className="absolute top-0 left-0 right-0 pointer-events-none z-10"
            style={{ height: ITEM_HEIGHT * 1.5, background: "linear-gradient(to bottom, #FAF8F5 5%, transparent)" }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
            style={{ height: ITEM_HEIGHT * 1.5, background: "linear-gradient(to top, #FAF8F5 5%, transparent)" }}
          />

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
            <div style={{ height: ITEM_HEIGHT * 2 }} />

            {VALUES.map((val, i) => {
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
                    opacity: distance === 0 ? 1 : distance === 1 ? 0.75 : 0.45,
                    transform: `scale(${distance === 0 ? 1 : distance === 1 ? 0.92 : 0.84})`,
                    transition: "opacity 0.15s, transform 0.15s",
                  }}
                >
                  <span
                    className="font-mono tabular-nums"
                    style={{
                      fontSize: isSelected ? 32 : distance === 1 ? 24 : 22,
                      fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? "#1C1C1E" : distance === 1 ? "#6B6560" : "#9A9590",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {val}
                  </span>
                  {isSelected && (
                    <span
                      className="font-mono uppercase ml-2"
                      style={{ fontSize: 14, color: "#C75B39", fontWeight: 600, letterSpacing: "0.1em" }}
                    >
                      REPS
                    </span>
                  )}
                </div>
              );
            })}

            <div style={{ height: ITEM_HEIGHT * 2 }} />
          </div>
        </div>

        {/* Quick increment buttons */}
        <div
          className="flex items-center justify-center gap-2 px-5 py-3"
          style={{ borderTop: "1px solid #E0DCD7" }}
        >
          {[-5, -2, -1, 1, 2, 5].map((inc) => (
            <button
              key={inc}
              onClick={() => {
                const currentVal = VALUES[selectedIndexRef.current] ?? 1;
                const newVal = currentVal + inc;
                const closest = VALUES.reduce((best, v, i) =>
                  Math.abs(v - newVal) < Math.abs(VALUES[best] - newVal) ? i : best, 0
                );
                scrollToIndex(closest);
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
