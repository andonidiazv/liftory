import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { hapticTick, unlockHaptics } from "@/utils/haptics";
import { useDarkMode } from "@/hooks/useDarkMode";
import { dia, noche } from "@/lib/colors";

interface Props {
  visible: boolean;
  unit: "kg" | "lb";
  initialValue: number;
  onConfirm: (value: number) => void;
  onClose: () => void;
}

/** Sentinel value stored as actual_weight when user selects bodyweight */
export const BODYWEIGHT_SENTINEL = -1;

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

// Quick-jump anchors
const JUMP_VALUES_KG = [20, 40, 60, 80, 100, 120];
const JUMP_VALUES_LB = [45, 95, 135, 185, 225, 315];

type Mode = "wheel" | "numpad" | "bodyweight";

export default function WeightPickerSheet({
  visible, unit, initialValue, onConfirm, onClose,
}: Props) {
  const { isDark } = useDarkMode();
  const t = isDark ? noche : dia;
  const values = useMemo(() => generateValues(unit), [unit]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>();
  const isInitialScroll = useRef(true);
  const selectedIndexRef = useRef(0);

  // Mode: wheel (default), numpad (keyboard input), or bodyweight
  const [mode, setMode] = useState<Mode>("wheel");
  const [numpadValue, setNumpadValue] = useState("");

  const jumpValues = unit === "kg" ? JUMP_VALUES_KG : JUMP_VALUES_LB;

  // Reset mode when sheet opens + unlock haptics
  useEffect(() => {
    if (!visible) return;
    unlockHaptics();
    if (initialValue === BODYWEIGHT_SENTINEL) {
      setMode("bodyweight");
    } else {
      setMode("wheel");
    }
    setNumpadValue("");
  }, [visible, initialValue]);

  // Find closest index for initial value
  useEffect(() => {
    if (!visible || initialValue === BODYWEIGHT_SENTINEL) return;
    const closest = values.reduce((best, v, i) =>
      Math.abs(v - initialValue) < Math.abs(values[best] - initialValue) ? i : best, 0
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

    // Haptic tick on each snap boundary crossing
    if (clampedImmediate !== selectedIndexRef.current) {
      hapticTick();
    }
    selectedIndexRef.current = clampedImmediate;

    scrollTimeout.current = setTimeout(() => {
      if (!scrollRef.current) return;
      const st = scrollRef.current.scrollTop;
      const index = Math.round(st / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, values.length - 1));
      setSelectedIndex(clampedIndex);
      selectedIndexRef.current = clampedIndex;

      scrollRef.current.scrollTo({
        top: clampedIndex * ITEM_HEIGHT,
        behavior: "smooth",
      });
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
        // Snap to closest valid value
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
    if (key === "delete") {
      setNumpadValue((prev) => prev.slice(0, -1));
    } else if (key === ".") {
      if (unit === "lb") return; // no decimals for lb
      if (numpadValue.includes(".")) return;
      setNumpadValue((prev) => prev + ".");
    } else {
      // Max length: 5 chars (e.g. "365.0")
      if (numpadValue.length >= 5) return;
      setNumpadValue((prev) => prev + key);
    }
  };

  const switchToWheel = () => {
    // If numpad had a value, scroll wheel to it
    if (numpadValue) {
      const parsed = parseFloat(numpadValue);
      if (!isNaN(parsed)) {
        const closest = values.reduce((best, v, i) =>
          Math.abs(v - parsed) < Math.abs(values[best] - parsed) ? i : best, 0
        );
        setSelectedIndex(closest);
        selectedIndexRef.current = closest;
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = closest * ITEM_HEIGHT;
          }
        });
      }
    }
    setMode("wheel");
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/40" />

      <div
        className="relative w-full max-w-md rounded-t-2xl overflow-hidden animate-slide-up"
        style={{ background: t.card }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${t.border}` }}>
          <button onClick={onClose} className="font-body text-sm" style={{ color: t.muted }}>
            Cancelar
          </button>
          <span className="font-mono text-xs uppercase tracking-widest" style={{ color: t.muted }}>
            {mode === "bodyweight" ? "BODYWEIGHT" : `PESO (${unit.toUpperCase()})`}
          </span>
          <button onClick={handleConfirm} className="font-body text-sm font-semibold" style={{ color: t.accent }}>
            Listo
          </button>
        </div>

        {/* Mode toggle row: BW chip + numpad toggle */}
        <div className="flex items-center justify-between px-5 py-2" style={{ borderBottom: `1px solid ${t.border}` }}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode(mode === "bodyweight" ? "wheel" : "bodyweight")}
              className="font-mono text-xs uppercase tracking-wider rounded-full px-3 py-1.5 transition-all"
              style={{
                background: mode === "bodyweight" ? t.accentBgStrong : (isDark ? "rgba(138,126,114,0.12)" : "rgba(129,109,102,0.08)"),
                color: mode === "bodyweight" ? t.accent : t.muted,
                fontWeight: mode === "bodyweight" ? 600 : 400,
                border: mode === "bodyweight" ? `1.5px solid ${t.accentBgStrong}` : "1.5px solid transparent",
              }}
            >
              BW
            </button>
          </div>
          {mode !== "bodyweight" && (
            <button
              onClick={() => mode === "numpad" ? switchToWheel() : setMode("numpad")}
              className="font-mono text-xs uppercase tracking-wider rounded-full px-3 py-1.5 transition-all"
              style={{
                background: mode === "numpad" ? t.accentBgStrong : (isDark ? "rgba(138,126,114,0.12)" : "rgba(129,109,102,0.08)"),
                color: mode === "numpad" ? t.accent : t.muted,
                fontWeight: mode === "numpad" ? 600 : 400,
                border: mode === "numpad" ? `1.5px solid ${t.accentBgStrong}` : "1.5px solid transparent",
              }}
            >
              {mode === "numpad" ? (
                <span style={{ fontSize: 13 }}>WHEEL</span>
              ) : (
                <span style={{ fontSize: 13 }}>#</span>
              )}
            </button>
          )}
        </div>

        {/* BODYWEIGHT MODE */}
        {mode === "bodyweight" && (
          <div className="flex flex-col items-center justify-center" style={{ height: CONTAINER_HEIGHT }}>
            <span className="font-mono font-semibold" style={{ fontSize: 48, color: t.accent, letterSpacing: "0.05em" }}>
              BW
            </span>
            <span className="font-body text-muted-foreground mt-2" style={{ fontSize: 13 }}>
              Peso corporal
            </span>
          </div>
        )}

        {/* NUMPAD MODE */}
        {mode === "numpad" && (
          <div style={{ minHeight: CONTAINER_HEIGHT + 48 }}>
            {/* Display */}
            <div className="flex items-center justify-center py-4" style={{ height: 80 }}>
              <span className="font-mono tabular-nums" style={{ fontSize: 40, fontWeight: 600, color: t.text, letterSpacing: "0.02em" }}>
                {numpadValue || "0"}
              </span>
              <span className="font-mono uppercase ml-2" style={{ fontSize: 16, color: t.accent, fontWeight: 600 }}>
                {unit}
              </span>
            </div>

            {/* Numpad grid */}
            <div className="grid grid-cols-3 gap-1 px-6 pb-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", unit === "kg" ? "." : "", "0", "delete"].map((key) => (
                <button
                  key={key || "empty"}
                  onClick={() => key && handleNumpadKey(key)}
                  disabled={!key}
                  className="flex items-center justify-center rounded-xl font-mono transition-colors"
                  style={{
                    height: 52,
                    fontSize: key === "delete" ? 18 : 24,
                    fontWeight: 500,
                    color: key === "delete" ? t.muted : t.text,
                    background: key ? (isDark ? "rgba(255,255,255,0.06)" : "rgba(61,43,36,0.06)") : "transparent",
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
            {/* Quick-jump chips */}
            <div
              className="flex items-center justify-center gap-1.5 px-4 py-2 overflow-x-auto"
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
                        if (scrollRef.current) {
                          scrollRef.current.scrollTop = closest * ITEM_HEIGHT;
                        }
                        setTimeout(() => { isInitialScroll.current = false; }, 150);
                      });
                    }}
                    className="font-mono rounded-full px-2.5 py-1 transition-all shrink-0"
                    style={{
                      fontSize: 12,
                      fontWeight: isActive ? 600 : 400,
                      background: isActive ? t.accentBgStrong : (isDark ? "rgba(138,126,114,0.1)" : "rgba(129,109,102,0.06)"),
                      color: isActive ? t.accent : t.muted,
                      border: isActive ? `1px solid ${t.accentBgStrong}` : "1px solid transparent",
                    }}
                  >
                    {jv}
                  </button>
                );
              })}
            </div>

            {/* Wheel container */}
            <div className="relative" style={{ height: CONTAINER_HEIGHT }}>
              {/* Selection highlight band */}
              <div
                className="absolute left-4 right-4 pointer-events-none rounded-xl"
                style={{
                  top: ITEM_HEIGHT * 2,
                  height: ITEM_HEIGHT,
                  background: t.accentBg,
                  border: `1.5px solid ${t.accentBgStrong}`,
                }}
              />

              {/* Top/bottom fade gradients — reduced intensity for readability */}
              <div
                className="absolute top-0 left-0 right-0 pointer-events-none z-10"
                style={{ height: ITEM_HEIGHT * 1.5, background: `linear-gradient(to bottom, ${t.card} 5%, transparent)` }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
                style={{ height: ITEM_HEIGHT * 1.5, background: `linear-gradient(to top, ${t.card} 5%, transparent)` }}
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
                        // Improved visibility: higher opacity + less aggressive scale
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
                          // Better contrast: darker non-selected color
                          color: isSelected ? t.text : distance === 1 ? t.muted : t.subtle,
                          letterSpacing: "0.02em",
                        }}
                      >
                        {unit === "kg" ? val.toFixed(1) : val}
                      </span>
                      {isSelected && (
                        <span
                          className="font-mono uppercase ml-2"
                          style={{ fontSize: 14, color: t.accent, fontWeight: 600, letterSpacing: "0.1em" }}
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
              style={{ borderTop: `1px solid ${t.border}` }}
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
                  className="rounded-full px-3 py-1.5 font-mono text-sm transition-colors"
                  style={{
                    background: inc > 0 ? t.accentBgStrong : (isDark ? "rgba(138,126,114,0.15)" : "rgba(129,109,102,0.1)"),
                    color: inc > 0 ? t.accent : t.muted,
                    fontSize: 13,
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
