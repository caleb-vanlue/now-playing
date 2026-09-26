"use client";

import React, { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

type Theme = "jellyfin" | "plex";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = "now-playing-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);
const listeners = new Set<() => void>();

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

function setTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage may be unavailable (private mode); the theme still applies for this session
  }
  applyTheme(theme);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// The inline init script in layout.tsx sets data-theme before hydration,
// so the DOM is the source of truth
function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "plex" ? "plex" : "jellyfin";
}

function getServerSnapshot(): Theme {
  return "jellyfin";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    // Enable transitions after initial theme is applied to avoid flash
    requestAnimationFrame(() => {
      document.documentElement.classList.add("theme-transitions-ready");
    });
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
