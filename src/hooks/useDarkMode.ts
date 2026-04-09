import { useState, useEffect } from "react";

const STORAGE_KEY = "liftory-dark-mode";

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "true";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark-mode");
    } else {
      root.classList.remove("dark-mode");
    }
    localStorage.setItem(STORAGE_KEY, String(isDark));
  }, [isDark]);

  // Initialize on mount (for pages that don't call the hook)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      document.documentElement.classList.add("dark-mode");
    }
  }, []);

  const toggle = () => setIsDark((prev) => !prev);

  return { isDark, toggle };
}
