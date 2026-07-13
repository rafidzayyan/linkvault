"use client";

import { useCallback, useEffect, useState } from "react";
import { loadTheme, saveTheme } from "./storage";

export function useTheme() {
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(loadTheme());
    setMounted(true);
  }, []);

  const apply = useCallback((t: "light" | "dark") => {
    document.documentElement.classList.toggle("dark", t === "dark");
    saveTheme(t);
    setThemeState(t);
  }, []);

  const toggle = useCallback(() => {
    apply(theme === "dark" ? "light" : "dark");
  }, [theme, apply]);

  return { theme, toggle, mounted };
}
