"use client";

import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { useDerived, useStudy } from "@/lib/study-store";
import type { View } from "./shared";

/** Live ticking exam countdown — lives on the dashboard (main page). */
export default function ExamCountdown({ go }: { go: (v: View) => void }) {
  const { data } = useStudy();
  const [, tick] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => tick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  if (!data || !data.user.examDate) return null;
  const ms = Math.max(0, data.user.examDate - Date.now());
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const urgent = d < 7;

  return (
    <div className="card p-5 mt-4 text-center" style={{ borderColor: urgent ? "#EF4444" : "#7C3AED", borderWidth: 2 }}>
      <div className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: urgent ? "#EF4444" : "#7C3AED" }}>
        <span className="inline-flex items-center gap-1">
          <Target size={14} /> {data.user.examName || "Exam"} · {new Date(data.user.examDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </div>
      <div className="flex justify-center gap-2 md:gap-5 mt-3" role="timer" aria-label={`${d} days ${h} hours ${m} minutes left`}>
        <TimeBox n={d} label="days" hot={urgent} />
        <TimeBox n={h} label="hrs" hot={urgent} />
        <TimeBox n={m} label="min" hot={urgent} />
        <TimeBox n={s} label="sec" hot={urgent} />
      </div>
      <p className="text-xs mt-2 font-semibold" style={{ color: urgent ? "#EF4444" : "var(--ink-2)" }}>
        {ms <= 0 ? "Exam day is here. Give it everything." : urgent ? "Final week. Every hour counts — no zero days." : "The clock is ticking. Small steps every day win."}
      </p>
      <GoalBar go={go} />
    </div>
  );
}

/** Daily focus goal progress — minutes studied vs target. */
function GoalBar({ go }: { go: (v: View) => void }) {
  const { data } = useStudy();
  const d = useDerived();
  if (!data) return null;
  const goalMin = Math.max(15, data.user.focusGoal || 120);
  const doneMin = Math.floor(d.todayFocus / 60);
  const pct = Math.min(100, Math.round((doneMin / goalMin) * 100));
  return (
    <button onClick={() => go("pomodoro")} className="w-full text-left mt-3" aria-label={`Daily goal ${doneMin} of ${goalMin} minutes`}>
      <div className="flex justify-between text-xs" style={{ color: "var(--ink-2)" }}>
        <span className="font-bold flex items-center gap-1.5" style={{ color: "var(--ink)" }}><Target size={14} /> Daily goal: {doneMin}/{goalMin} min</span>
        <span>{pct >= 100 ? "Goal smashed!" : `${pct}%`}</span>
      </div>
      <div className="h-2 rounded-full mt-2 overflow-hidden" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full progress-anim" style={{ width: `${pct}%`, background: pct >= 100 ? "#22C55E" : "linear-gradient(90deg,#7C3AED,#A78BFA)" }} />
      </div>
    </button>
  );
}

function TimeBox({ n, label, hot }: { n: number; label: string; hot: boolean }) {
  return (
    <div className={`px-2 md:px-3 py-2 rounded-xl min-w-14 md:min-w-16 ${hot ? "pulse-ring rounded-xl" : ""}`} style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
      <div className="text-xl md:text-3xl font-bold timer-tabular" style={{ color: hot ? "#EF4444" : undefined }}>{String(n).padStart(2, "0")}</div>
      <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-2)" }}>{label}</div>
    </div>
  );
}
