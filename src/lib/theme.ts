export type Theme = "light" | "dark";
export const THEME_KEY = "lad-theme-v1";

export function parseTheme(value: string | null): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}

export function readTheme(): Theme | null {
  try {
    return parseTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return null;
  }
}

export function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#121925" : "#f3f5f9");
}
