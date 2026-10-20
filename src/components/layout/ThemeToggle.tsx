import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../app/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const label =
    theme === "light" ? "Включить тёмную тему" : "Включить светлую тему";
  return (
    <button
      type="button"
      className="btn theme-toggle"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      aria-pressed={theme === "dark"}
    >
      {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
      <span>{theme === "light" ? "Тёмная" : "Светлая"}</span>
    </button>
  );
}
