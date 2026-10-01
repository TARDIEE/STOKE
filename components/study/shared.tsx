"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useStudy } from "@/lib/study-store";

export type View =
  | "dashboard"
  | "plan"
  | "study"
  | "reviews"
  | "pomodoro"
  | "subjects"
  | "stats"
  | "profile";

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function useNow(step = 30000) {
  const [, setT] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setT((t) => t + 1), step);
    return () => clearInterval(iv);
  }, [step]);
}

export function Dot({ color }: { color: string }) {
  return <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />;
}

export function SessionRow({ sid, cid, text, date, label }: { sid: string | null; cid: string | null; text: string; date: number; label?: "learn" | "reread" }) {
  const { data } = useStudy();
  if (!data) return null;
  const s = data.subjects.find((x) => x.id === sid);
  const c = data.chapters.find((x) => x.id === cid);
  return (
    <div className="flex items-center gap-2">
      {s && <Dot color={s.color} />}
      <span className="font-medium">{s?.name ?? "General"}{c ? <span style={{ color: "var(--ink-2)" }}> · {c.name}</span> : null}</span>
      {label === "reread" && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "#F59E0B1a", color: "#F59E0B" }}>Re-read</span>}
      <span className="ml-auto text-xs" style={{ color: "var(--ink-2)" }}>{text} · {new Date(date).toLocaleDateString()}</span>
    </div>
  );
}

export function Empty({ title, body, action, actionLabel }: { title: string; body: string; action?: () => void; actionLabel?: string }) {
  return (
    <div className="py-8 text-center">
      <div className="font-semibold">{title}</div>
      <div className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>{body}</div>
      {action && <button onClick={action} className="btn-primary px-4 py-2 text-sm mt-3">{actionLabel}</button>}
    </div>
  );
}

export function Urgency({ n }: { n: number }) {
  const label = n >= 10 ? "Overdue" : n >= 4 ? "Due today" : "Due soon";
  const color = n >= 10 ? "#EF4444" : n >= 4 ? "#7C3AED" : "#F59E0B";
  return <span className="ml-1 text-[11px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: color + "1a", color }}>{label}</span>;
}

export function MiniStat({ n, label }: { n: number; label: string }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl font-bold timer-tabular">{n}</div>
      <div className="text-xs" style={{ color: "var(--ink-2)" }}>{label}</div>
    </div>
  );
}

export function NumField({ label, value, set }: { label: string; value: number; set: (v: number) => void }) {
  return (
    <label className="text-xs font-medium flex flex-col gap-1">{label}
      <input type="number" min={1} max={180} value={value} onChange={(e) => set(Math.max(1, Math.min(180, Number(e.target.value) || 1)))}
        className="px-2 py-1.5 rounded-lg text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} />
    </label>
  );
}

export function Toggle({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <button onClick={() => set(!on)} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ border: "1px solid var(--border)" }} role="switch" aria-checked={on}>
      <span>{label}</span>
      <span className="w-9 h-5 rounded-full relative" style={{ background: on ? "#7C3AED" : "var(--border)" }}>
        <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white" style={{ left: on ? 18 : 2 }} />
      </span>
    </button>
  );
}

export function Modal({ children, close, label }: { children: ReactNode; close: () => void; label: string }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [close]);
  return (
    <div className="fixed inset-0 z-40 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={label}>
      <div className="absolute inset-0" style={{ background: "rgba(15,10,31,.45)" }} onClick={close} />
      <div className="card relative w-full max-w-md p-5 fade-in max-h-[90vh] overflow-auto">{children}</div>
    </div>
  );
}
