import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import { ThemeProvider } from "./app/ThemeProvider";
import { applyTheme, readTheme, systemTheme } from "./lib/theme";
import "./styles/styles.css";
import "./styles/readability.css";
import "./styles/studio.css";

applyTheme(readTheme() ?? systemTheme());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
