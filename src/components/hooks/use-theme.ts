"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const THEME_KEY = "theme";
const THEME_SWITCHING_CLASS = "theme-switching";

function applyTheme(theme: Theme, disableTransitions = false) {
  const root = document.documentElement;

  if (disableTransitions) {
    root.classList.add(THEME_SWITCHING_CLASS);
  }

  root.setAttribute("data-theme", theme);

  if (disableTransitions) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        root.classList.remove(THEME_SWITCHING_CLASS);
      });
    });
  }
}

export function useTheme(defaultTheme: Theme = "light") {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_KEY) as Theme | null;
    const nextTheme = savedTheme ?? defaultTheme;
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, [defaultTheme]);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme, true);
    window.localStorage.setItem(THEME_KEY, nextTheme);
  };

  return { theme, toggleTheme };
}
