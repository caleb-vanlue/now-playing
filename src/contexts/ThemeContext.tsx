"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "jellyfin" | "plex";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(t: Theme) {
  if (t === "plex") {
    document.documentElement.setAttribute("data-theme", "plex");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("jellyfin");

  useEffect(() => {
    const stored = localStorage.getItem("now-playing-theme") as Theme | null;
    if (stored === "plex" || stored === "jellyfin") {
      applyTheme(stored);
      setThemeState(stored);
    }
    // Enable transitions after initial theme is applied to avoid flash
    requestAnimationFrame(() => {
      document.documentElement.classList.add("theme-transitions-ready");
    });
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("now-playing-theme", newTheme);
    applyTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
