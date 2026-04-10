/** VOLT — Centralized color tokens */

export const alta = {
  bg: "#0D0D0F",
  card: "#1A1A1D",
  text: "#FAFAFA",
  muted: "#71717A",
  subtle: "#52525B",
  border: "#27272A",
  accent: "#E63946",
  accentSecondary: "#27272A",
  accentBg: "rgba(230,57,70,0.10)",
  accentBgStrong: "rgba(230,57,70,0.18)",
  btnText: "#FFFFFF",
  shadow: "rgba(230,57,70,0.20)",
  overlay: "rgba(0,0,0,0.6)",
  success: "#7A8B5C",
  destructive: "#C0392B",
  wordmark: "#E63946",
} as const;

export const baja = {
  bg: "#1A1A1D",
  card: "#27272A",
  text: "#E8E8E8",
  muted: "#8A8A8E",
  subtle: "#5A5A5E",
  border: "#38383C",
  accent: "#C0313C",
  accentSecondary: "#38383C",
  accentBg: "rgba(192,49,60,0.10)",
  accentBgStrong: "rgba(192,49,60,0.18)",
  btnText: "#FFFFFF",
  shadow: "rgba(0,0,0,0.3)",
  overlay: "rgba(0,0,0,0.6)",
  success: "#7A8B5C",
  destructive: "#C0392B",
  wordmark: "#C0313C",
} as const;

// Keep backward-compatible aliases
export const dia = alta;
export const noche = baja;

/** Returns the active palette based on dark-mode class */
export function getTheme(): typeof alta {
  if (typeof document !== "undefined" && document.documentElement.classList.contains("dark-mode")) {
    return baja;
  }
  return alta;
}

/** Hook-friendly: check if dark mode is active */
export function isDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark-mode");
}
