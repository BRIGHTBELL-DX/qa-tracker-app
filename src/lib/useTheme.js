import { useEffect, useState } from "react";

export function useTheme() {
  const [mode, setMode] = useState(() => {
    const stored = localStorage.getItem("qa-theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode);
    localStorage.setItem("qa-theme", mode);
  }, [mode]);
  return [mode, () => setMode((m) => (m === "dark" ? "light" : "dark"))];
}
