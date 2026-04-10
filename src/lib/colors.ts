/** FORGED Camino C — Centralized color tokens */

export const alta = {
  bg: "#08080A",
  card: "#1A1A1E",
  text: "#E8E8E8",
  muted: "#858589",
  subtle: "#5A5A5E",
  border: "#2A2A2E",
  accent: "#D4FF00",
  accentSecondary: "#333338",
  accentBg: "rgba(212,255,0,0.08)",
  accentBgStrong: "rgba(212,255,0,0.15)",
  btnText: "#08080A",
  shadow: "rgba(212,255,0,0.15)",
  overlay: "rgba(0,0,0,0.6)",
  success: "#7A8B5C",
  destructive: "#C0392B",
  wordmark: "#D4FF00",
} as const;

export const baja = {
  bg: "#2C2C30",
  card: "#38383C",
  text: "#E8E8E8",
  muted: "#8A8A8E",
  subtle: "#5A5A5E",
  border: "#44444A",
  accent: "#B8D940",
  accentSecondary: "#44444A",
  accentBg: "rgba(184,217,64,0.10)",
  accentBgStrong: "rgba(184,217,64,0.15)",
  btnText: "#1A1A1E",
  shadow: "rgba(0,0,0,0.3)",
  overlay: "rgba(0,0,0,0.6)",
  success: "#7A8B5C",
  destructive: "#C0392B",
  wordmark: "#B8D940",
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
