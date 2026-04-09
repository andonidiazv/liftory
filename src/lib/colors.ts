/** Mallorquina Unificada — Centralized color tokens */

export const dia = {
  bg: "#FAF6F1",
  card: "#FFFFFF",
  text: "#3D2B24",
  muted: "#816D66",
  subtle: "#B5ADA8",
  border: "#EDE8E1",
  accent: "#652F23",
  accentSecondary: "#B19176",
  accentBg: "rgba(101,47,35,0.06)",
  accentBgStrong: "rgba(101,47,35,0.15)",
  btnText: "#FAF6F1",
  shadow: "rgba(61,43,36,0.06)",
  overlay: "rgba(61,43,36,0.4)",
  success: "#7A8B5C",
  destructive: "#C0392B",
  wordmark: "#3D2B24",
} as const;

export const noche = {
  bg: "#0D0B09",
  card: "#1A1714",
  text: "#F0EBE5",
  muted: "#8A7E72",
  subtle: "#4A4744",
  border: "#2A2520",
  accent: "#C4956E",
  accentSecondary: "#652F23",
  accentBg: "rgba(196,149,110,0.08)",
  accentBgStrong: "rgba(196,149,110,0.15)",
  btnText: "#0D0B09",
  shadow: "rgba(0,0,0,0.3)",
  overlay: "rgba(0,0,0,0.6)",
  success: "#7A8B5C",
  destructive: "#C0392B",
  wordmark: "#C4956E",
} as const;

/** Returns the active palette based on dark-mode class */
export function getTheme(): typeof dia {
  if (typeof document !== "undefined" && document.documentElement.classList.contains("dark-mode")) {
    return noche;
  }
  return dia;
}

/** Hook-friendly: check if dark mode is active */
export function isDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark-mode");
}
