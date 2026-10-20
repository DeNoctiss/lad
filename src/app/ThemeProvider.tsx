import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { applyTheme, readTheme, systemTheme, THEME_KEY } from "../lib/theme";
import type { Theme } from "../lib/theme";

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<Theme | null>(readTheme);
  const [system, setSystem] = useState(systemTheme);
  const theme = preference ?? system;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onMedia = () => setSystem(media.matches ? "dark" : "light");
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_KEY || event.key === null)
        setPreference(readTheme());
    };
    media.addEventListener("change", onMedia);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onMedia);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    applyTheme(next);
    setPreference(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // A blocked storage must not prevent changing the current appearance.
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("ThemeProvider is missing");
  return context;
}
