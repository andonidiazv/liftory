import { useState, useRef, useEffect, useCallback } from "react";
import { hapticTick, unlockHaptics } from "@/utils/haptics";

interface Props {
  visible: boolean;
  initialValue: number;
  onConfirm: (value: number) => void;
  onClose: () => void;
}

const GOLD = "#C4A24E";
const SHEET_BG = "#15151A";

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
    unlockHaptics();
    const closest = VALUES.reduce((best, v, i) =>
      Math.abs(v - initialValue) < Math.abs(VALUES[best] - initialValue) ? i : best, 0
    );
    setSelectedIndex(closest);
    selectedIndexRef.current = closest;
    isInitialScroll.current = true;
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = closest * ITEM_HEIGHT;
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
    if (clampedImmediate !== selectedIndexRef.current) hapticTick();
    selectedIndexRef.current = clampedImmediate;
    scrollTimeout.current = setTimeout(() => {
      if (!scrollRef.current) return;
      const st = scrollRef.current.scrollTop;
      const index = Math.round(st / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, VALUES.length - 1));
      setSelectedIndex(clampedIndex);
      selectedIndexRef.current = clampedIndex;
      scrollRef.current.scrollTo({ top: clampedIndex * ITEM_HEIGHT, behavior: "smooth" });
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
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)" }} />

      <div
        className="relative w-full max-w-md overflow-hidden"
        style={{
          background: SHEET_BG,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTop: "1px solid hsl(var(--border))",
          animation: "atelierSlideUp 0.25s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-3 mb-2 h-0.5 w-9 rounded-full" style={{ background: "hsl(var(--muted-foreground))", opacity: 0.4 }} />

        <div className="flex items-center justify-between px-6 py-3">
          <button
            onClick={onClose}
            className="press-scale font-mono uppercase"
            style={{ fontSize: 10, letterSpacing: "2.5px", color: "hsl(var(--muted-foreground))" }}
          >
            Cancelar
          </button>
          <span
            className="font-mono uppercase"
            style={{ fontSize: 10, letterSpacing: "3px", color: "hsl(var(--muted-foreground))" }}
          >
            Reps
          </span>
          <button
            onClick={handleConfirm}
            className="press-scale font-mono uppercase"
            style={{ fontSize: 10, letterSpacing: "2.5px", color: GOLD, fontWeight: 600 }}
          >
            Listo
          </button>
        </div>

        <div className="h-px w-full" style={{ background: "hsl(var(--border))", opacity: 0.5 }} />

        {/* Wheel */}
        <div className="relative" style={{ height: CONTAINER_HEIGHT }}>
          <div
            className="absolute left-6 right-6 pointer-events-none"
            style={{
              top: ITEM_HEIGHT * 2,
              height: ITEM_HEIGHT,
              borderTop: `1px solid ${GOLD}`,
              borderBottom: `1px solid ${GOLD}`,
            }}
          />

          <div
            className="absolute top-0 left-0 right-0 pointer-events-none z-10"
            style={{ height: ITEM_HEIGHT * 1.5, background: `linear-gradient(to bottom, ${SHEET_BG} 5%, transparent)` }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
            style={{ height: ITEM_HEIGHT * 1.5, background: `linear-gradient(to top, ${SHEET_BG} 5%, transparent)` }}
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
                    opacity: distance === 0 ? 1 : distance === 1 ? 0.7 : 0.35,
                    transition: "opacity 0.15s",
                  }}
                >
                  <span
                    className="font-display tabular-nums"
                    style={{
                      fontSize: isSelected ? 30 : distance === 1 ? 22 : 20,
                      fontWeight: isSelected ? 400 : 300,
                      color: isSelected ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {val}
                  </span>
                  {isSelected && (
                    <span
                      className="font-mono uppercase ml-2"
                      style={{ fontSize: 10, color: GOLD, fontWeight: 600, letterSpacing: "2px" }}
                    >
                      Reps
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
          className="flex items-center justify-center gap-6 px-5 py-4"
          style={{ borderTop: "1px solid hsl(var(--border))" }}
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
              className="press-scale font-mono tabular-nums"
              style={{
                fontSize: 12,
                color: inc > 0 ? GOLD : "hsl(var(--muted-foreground))",
                fontWeight: 500,
              }}
            >
              {inc > 0 ? `+${inc}` : inc}
            </button>
          ))}
        </div>

        <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
      </div>

      <style>{`
        @keyframes atelierSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
