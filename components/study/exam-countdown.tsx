"use client";

import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { useStudy } from "@/lib/study-store";

/** Live ticking exam countdown — lives on the dashboard (main page). */
export default function ExamCountdown() {
  const { data } = useStudy();
  const [, tick] = useState(0);
  const [totals, setTotals] = useState({ planned: 0, done: 0 });

  useEffect(() => {
    const iv = setInterval(() => tick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    fetch("/api/schedule?all=1")
      .then((r) => r.json())
      .then((b) => {
        const items = Object.values((b.plan ?? {}) as Record<string, { status: string }[]>).flat();
        setTotals({ planned: items.length, done: items.filter((i) => i.status === "done").length });
      })
      .catch(() => {});
  }, []);

  if (!data || !data.user.examDate) return null;
  const ms = Math.max(0, data.user.examDate - Date.now());
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const urgent = d < 7;
  const pct = totals.planned ? Math.round((totals.done / totals.planned) * 100) : 0;

  return (
    <div className="card p-5 mt-4 text-center" style={{ borderColor: urgent ? "#EF4444" : "#7C3AED", borderWidth: 2 }}>
      <div className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: urgent ? "#EF4444" : "#7C3AED" }}>
        <span className="inline-flex items-center gap-1">
          <Target size={14} /> {data.user.examName || "Exam"} · {new Date(data.user.examDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </div>
      <div className="flex justify-center gap-3 md:gap-5 mt-3" role="timer" aria-label={`${d} days ${h} hours ${m} minutes left`}>
        <TimeBox n={d} label="days" hot={urgent} />
        <TimeBox n={h} label="hrs" hot={urgent} />
        <TimeBox n={m} label="min" hot={urgent} />
        <TimeBox n={s} label="sec" hot={urgent} />
      </div>
      <p className="text-xs mt-2 font-semibold" style={{ color: urgent ? "#EF4444" : "var(--ink-2)" }}>
        {ms <= 0 ? "Exam day is here. Give it everything." : urgent ? "Final week. Every hour counts — no zero days." : "The clock is ticking. Small steps every day win."}
      </p>
      <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: "var(--border)" }}>
        <div className="h-full progress-anim" style={{ width: `${pct}%`, background: urgent ? "#EF4444" : "linear-gradient(90deg,#7C3AED,#A78BFA)" }} />
      </div>
      <div className="text-[11px] mt-1" style={{ color: "var(--ink-2)" }}>Syllabus plan: {totals.done}/{totals.planned} done ({pct}%)</div>
    </div>
  );
}

function TimeBox({ n, label, hot }: { n: number; label: string; hot: boolean }) {
  return (
    <div className={`px-3 py-2 rounded-xl min-w-16 ${hot ? "pulse-ring rounded-xl" : ""}`} style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
      <div className="text-2xl md:text-3xl font-bold timer-tabular" style={{ color: hot ? "#EF4444" : undefined }}>{String(n).padStart(2, "0")}</div>
      <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-2)" }}>{label}</div>
    </div>
  );
}
