"use client";

import { useState } from "react";

type Theme = "light" | "dark";

function nextTheme(t: Theme): Theme {
  return t === "light" ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof document !== "undefined" &&
    document.documentElement.dataset.theme === "dark"
      ? "dark"
      : "light",
  );

  const toggle = () => {
    const target = nextTheme(theme);
    document.documentElement.dataset.theme = target;
    try {
      localStorage.setItem("krish-theme", target);
    } catch {
      /* private mode */
    }
    // Let the smooth color cross-fade play, then drop the helper class
    document.documentElement.classList.add("theming");
    window.setTimeout(() => {
      document.documentElement.classList.remove("theming");
    }, 650);
    setTheme(target);
  };

  return (
    <button
      onClick={toggle}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      title={theme === "light" ? "Dark mode" : "Light mode"}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-sm transition-all hover:rotate-12 hover:border-rec hover:text-rec"
    >
      {theme === "light" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )}
    </button>
  );
}
