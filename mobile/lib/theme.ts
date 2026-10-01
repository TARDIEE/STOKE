// Design tokens ported from the STOKE web app (app/globals.css).
// Single source of truth for colors, so light/dark matches web exactly.

export interface Palette {
  bg: string;
  card: string;
  border: string;
  ink: string;
  ink2: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryBg: string;
  success: string;
  warning: string;
  danger: string;
}

export const Light: Palette = {
  bg: "#f7f5f1",
  card: "#ffffff",
  border: "#e9e4da",
  ink: "#18181b",
  ink2: "#71717a",
  primary: "#7c3aed",
  primaryDark: "#5b21b6",
  primaryLight: "#a78bfa",
  primaryBg: "#f5f3ff",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
};

export const Dark: Palette = {
  bg: "#0f0a1f",
  card: "#171130",
  border: "#2a2148",
  ink: "#f4f2ff",
  ink2: "#a9a3c7",
  primary: "#a78bfa",
  primaryDark: "#7c3aed",
  primaryLight: "#c4b5fd",
  primaryBg: "#221a45",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
};

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/** "Due now" / "In 3h" / "In 2d" — ported from study-view nextLabel. */
export function nextLabel(ts: number) {
  const diff = ts - Date.now();
  if (diff <= 0) return "Due now";
  const h = Math.round(diff / 3600000);
  if (h < 1) return `In ${Math.max(1, Math.round(diff / 60000))} min`;
  if (h < 48) return `In ${h}h`;
  return `In ${Math.round(h / 24)}d`;
}

export function urgency(n: number): { label: string; color: string } {
  if (n >= 10) return { label: "Overdue", color: "#EF4444" };
  if (n >= 4) return { label: "Due today", color: "#7C3AED" };
  return { label: "Due soon", color: "#F59E0B" };
}
