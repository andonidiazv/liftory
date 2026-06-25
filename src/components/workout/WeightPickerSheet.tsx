import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { hapticTick, unlockHaptics } from "@/utils/haptics";

interface Props {
  visible: boolean;
  unit: "kg" | "lb";
  initialValue: number;
  onConfirm: (value: number) => void;
  onClose: () => void;
}

/** Sentinel value stored as actual_weight when user selects bodyweight */
export const BODYWEIGHT_SENTINEL = -1;

const GOLD = "#C4A24E";
const SHEET_BG = "#15151A";

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

const JUMP_VALUES_KG = [20, 40, 60, 80, 100, 120];
const JUMP_VALUES_LB = [45, 95, 135, 185, 225, 315];

type Mode = "wheel" | "numpad" | "bodyweight";

export default function WeightPickerSheet({
  visible, unit, initialValue, onConfirm, onClose,
}: Props) {
  const values = useMemo(() => generateValues(unit), [unit]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>();
  const isInitialScroll = useRef(true);
  const selectedIndexRef = useRef(0);

  const [mode, setMode] = useState<Mode>("wheel");
  const [numpadValue, setNumpadValue] = useState("");

  const jumpValues = unit === "kg" ? JUMP_VALUES_KG : JUMP_VALUES_LB;

  useEffect(() => {
    if (!visible) return;
    unlockHaptics();
    if (initialValue === BODYWEIGHT_SENTINEL) setMode("bodyweight");
    else setMode("wheel");
    setNumpadValue("");
  }, [visible, initialValue]);

  useEffect(() => {
    if (!visible || initialValue === BODYWEIGHT_SENTINEL) return;
    const closest = values.reduce((best, v, i) =>
      Math.abs(v - initialValue) < Math.abs(values[best] - initialValue) ? i : best, 0
    );
    setSelectedIndex(closest);
    selectedIndexRef.current = closest;
    isInitialScroll.current = true;
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = closest * ITEM_HEIGHT;
      setTimeout(() => { isInitialScroll.current = false; }, 150);
    });
  }, [visible, initialValue, values]);

  const scrollToIndex = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, values.length - 1));
    setSelectedIndex(clamped);
    selectedIndexRef.current = clamped;
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: "smooth" });
    }
  }, [values.length]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current || isInitialScroll.current) return;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    const scrollTop = scrollRef.current.scrollTop;
    const immediateIndex = Math.round(scrollTop / ITEM_HEIGHT);
    const clampedImmediate = Math.max(0, Math.min(immediateIndex, values.length - 1));
    if (clampedImmediate !== selectedIndexRef.current) hapticTick();
    selectedIndexRef.current = clampedImmediate;
    scrollTimeout.current = setTimeout(() => {
      if (!scrollRef.current) return;
      const st = scrollRef.current.scrollTop;
      const index = Math.round(st / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
      setSelectedIndex(clampedIndex);
      selectedIndexRef.current = clampedIndex;
      scrollRef.current.scrollTo({ top: clampedIndex * ITEM_HEIGHT, behavior: "smooth" });
    }, 80);
  }, [values.length]);

  const handleConfirm = () => {
    if (mode === "bodyweight") {
      onConfirm(BODYWEIGHT_SENTINEL);
      onClose();
      return;
    }
    if (mode === "numpad") {
      const parsed = parseFloat(numpadValue);
      if (!isNaN(parsed) && parsed >= 0) {
        const closest = values.reduce((best, v, i) =>
          Math.abs(v - parsed) < Math.abs(values[best] - parsed) ? i : best, 0
        );
        onConfirm(values[closest]);
      }
      onClose();
      return;
    }
    const idx = selectedIndexRef.current;
    onConfirm(values[idx]);
    onClose();
  };

  const handleNumpadKey = (key: string) => {
    hapticTick();
    if (key === "delete") setNumpadValue((prev) => prev.slice(0, -1));
    else if (key === ".") {
      if (unit === "lb") return;
      if (numpadValue.includes(".")) return;
      setNumpadValue((prev) => prev + ".");
    } else {
      if (numpadValue.length >= 5) return;
      setNumpadValue((prev) => prev + key);
    }
  };

  const switchToWheel = () => {
    if (numpadValue) {
      const parsed = parseFloat(numpadValue);
      if (!isNaN(parsed)) {
        const closest = values.reduce((best, v, i) =>
          Math.abs(v - parsed) < Math.abs(values[best] - parsed) ? i : best, 0
        );
        setSelectedIndex(closest);
        selectedIndexRef.current = closest;
        requestAnimationFrame(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = closest * ITEM_HEIGHT;
        });
      }
    }
    setMode("wheel");
  };

  if (!visible) return null;

  const headerLabel = mode === "bodyweight" ? "Bodyweight" : `Peso · ${unit}`;

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
        {/* Drag handle */}
        <div className="mx-auto mt-3 mb-2 h-0.5 w-9 rounded-full" style={{ background: "hsl(var(--muted-foreground))", opacity: 0.4 }} />

        {/* Header */}
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
            {headerLabel}
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

        {/* Mode toggle row */}
        <div className="flex items-center justify-between px-6 py-3">
          <button
            onClick={() => setMode(mode === "bodyweight" ? "wheel" : "bodyweight")}
            className="press-scale font-mono uppercase flex items-center gap-1.5"
            style={{
              fontSize: 10,
              letterSpacing: "2.5px",
              color: mode === "bodyweight" ? GOLD : "hsl(var(--muted-foreground))",
              fontWeight: mode === "bodyweight" ? 600 : 400,
            }}
          >
            BW
            {mode === "bodyweight" && (
              <span style={{ display: "block", height: 1, width: 12, background: GOLD }} />
            )}
          </button>
          {mode !== "bodyweight" && (
            <button
              onClick={() => mode === "numpad" ? switchToWheel() : setMode("numpad")}
              className="press-scale font-mono uppercase flex items-center gap-1.5"
              style={{
                fontSize: 10,
                letterSpacing: "2.5px",
                color: mode === "numpad" ? GOLD : "hsl(var(--muted-foreground))",
                fontWeight: mode === "numpad" ? 600 : 400,
              }}
            >
              {mode === "numpad" ? "Wheel" : "Numpad"}
              {mode === "numpad" && (
                <span style={{ display: "block", height: 1, width: 12, background: GOLD }} />
              )}
            </button>
          )}
        </div>

        <div className="h-px w-full" style={{ background: "hsl(var(--border))", opacity: 0.5 }} />

        {/* BODYWEIGHT MODE */}
        {mode === "bodyweight" && (
          <div className="flex flex-col items-center justify-center" style={{ height: CONTAINER_HEIGHT }}>
            <span
              className="font-display"
              style={{ fontWeight: 300, fontSize: 56, color: GOLD, letterSpacing: "-0.04em", lineHeight: 1 }}
            >
              BW
            </span>
            <span
              className="font-body italic"
              style={{ fontWeight: 300, fontSize: 13, color: "hsl(var(--muted-foreground))", marginTop: 12 }}
            >
              Peso corporal
            </span>
          </div>
        )}

        {/* NUMPAD MODE */}
        {mode === "numpad" && (
          <div style={{ minHeight: CONTAINER_HEIGHT + 48 }}>
            <div className="flex items-baseline justify-center py-5" style={{ height: 80 }}>
              <span
                className="font-display tabular-nums"
                style={{ fontSize: 44, fontWeight: 300, color: "hsl(var(--foreground))", letterSpacing: "-0.04em", lineHeight: 1 }}
              >
                {numpadValue || "0"}
              </span>
              <span
                className="font-mono uppercase ml-2"
                style={{ fontSize: 11, letterSpacing: "2px", color: GOLD, fontWeight: 600 }}
              >
                {unit}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-0 px-4 pb-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", unit === "kg" ? "." : "", "0", "delete"].map((key) => (
                <button
                  key={key || "empty"}
                  onClick={() => key && handleNumpadKey(key)}
                  disabled={!key}
                  className="press-scale flex items-center justify-center font-display tabular-nums"
                  style={{
                    height: 56,
                    fontSize: key === "delete" ? 18 : 24,
                    fontWeight: 300,
                    color: key === "delete" ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))",
                    background: "transparent",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {key === "delete" ? "⌫" : key}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* WHEEL MODE */}
        {mode === "wheel" && (
          <>
            {/* Quick-jump anchors — text-only hairlines */}
            <div
              className="flex items-center justify-center gap-4 px-4 py-3 overflow-x-auto"
              style={{ scrollbarWidth: "none" }}
            >
              {jumpValues.map((jv) => {
                const currentVal = values[selectedIndex] ?? 0;
                const isActive = Math.abs(currentVal - jv) < (unit === "kg" ? 0.5 : 1);
                return (
                  <button
                    key={jv}
                    onClick={() => {
                      const closest = values.reduce((best, v, i) =>
                        Math.abs(v - jv) < Math.abs(values[best] - jv) ? i : best, 0
                      );
                      isInitialScroll.current = true;
                      setSelectedIndex(closest);
                      selectedIndexRef.current = closest;
                      requestAnimationFrame(() => {
                        if (scrollRef.current) scrollRef.current.scrollTop = closest * ITEM_HEIGHT;
                        setTimeout(() => { isInitialScroll.current = false; }, 150);
                      });
                    }}
                    className="press-scale font-mono tabular-nums shrink-0 flex flex-col items-center gap-1"
                    style={{
                      fontSize: 12,
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? GOLD : "hsl(var(--muted-foreground))",
                    }}
                  >
                    <span>{jv}</span>
                    <span
                      style={{
                        height: 1,
                        width: 16,
                        background: isActive ? GOLD : "transparent",
                      }}
                    />
                  </button>
                );
              })}
            </div>

            {/* Wheel container */}
            <div className="relative" style={{ height: CONTAINER_HEIGHT }}>
              {/* Selection highlight band — gold hairlines top + bottom */}
              <div
                className="absolute left-6 right-6 pointer-events-none"
                style={{
                  top: ITEM_HEIGHT * 2,
                  height: ITEM_HEIGHT,
                  borderTop: `1px solid ${GOLD}`,
                  borderBottom: `1px solid ${GOLD}`,
                }}
              />

              {/* Top/bottom fade gradients */}
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
                        {unit === "kg" ? val.toFixed(1) : val}
                      </span>
                      {isSelected && (
                        <span
                          className="font-mono uppercase ml-2"
                          style={{ fontSize: 10, color: GOLD, fontWeight: 600, letterSpacing: "2px" }}
                        >
                          {unit}
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
              {(unit === "kg" ? [-5, -2.5, 2.5, 5] : [-10, -5, 5, 10]).map((inc) => (
                <button
                  key={inc}
                  onClick={() => {
                    const currentVal = values[selectedIndexRef.current] ?? 0;
                    const newVal = currentVal + inc;
                    const closest = values.reduce((best, v, i) =>
                      Math.abs(v - newVal) < Math.abs(values[best] - newVal) ? i : best, 0
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
          </>
        )}

        {/* Safe area padding */}
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
