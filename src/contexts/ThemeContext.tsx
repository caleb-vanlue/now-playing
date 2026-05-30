"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "jellyfin" | "plex";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(t: Theme) {
  const bg = t === "plex" ? "#141414" : "#0d1117";
  document.documentElement.style.background = bg;
  if (t === "plex") {
    document.documentElement.setAttribute("data-theme", "plex");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  // Remove + recreate forces Safari to observe the DOM mutation and repaint the toolbar
  document.querySelector('meta[name="theme-color"]')?.remove();
  const meta = document.createElement("meta");
  meta.setAttribute("name", "theme-color");
  meta.setAttribute("content", bg);
  document.head.appendChild(meta);
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
