"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { fmtDur, useDerived, useStudy } from "@/lib/study-store";
import { SessionRow, greeting, type View } from "./shared";
import ExamCountdown from "./exam-countdown";

export default function Dashboard({ onReview, go, onOpenChapter }: {
  onReview: (s?: string | null, c?: string | null) => void;
  go: (v: View) => void;
  onOpenChapter: (subjectId: string, chapterId: string) => void;
}) {
  const { data } = useStudy();
  const d = useDerived();
  if (!data) return null;
  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{greeting()}, {data.user.name || "Student"}</h1>
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ml-auto" style={d.streak >= 2 ? { background: "var(--primary-bg)", color: "#6D28D9" } : { border: "1px solid var(--border)", color: "var(--ink-2)" }}>
          <Flame size={13} className="inline -mt-0.5" /> {d.streak >= 2 ? `${d.streak} day streak` : "0"}
        </span>
      </div>
      <ExamCountdown go={go} />

      <DoToday onReview={onReview} onOpenChapter={onOpenChapter} go={go} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        <StatCard label="Reviews Due" value={String(d.dueToday)} sub={d.overdue ? `${d.overdue} overdue` : "Due today"} action={() => onReview()} actionLabel="Start Review" />
        <StatCard label="Study Time" value={fmtDur(d.todayFocus)} sub="today" action={() => go("pomodoro")} actionLabel="Focus" />
        <StatCard label="Streak" value={d.streak >= 2 ? `${d.streak} days` : "—"} sub={d.streak >= 2 ? `longest ${d.longest}` : "study 2 days in a row"} action={() => go("profile")} actionLabel="Details" />
        <StatCard label="Pomodoros" value={String(d.todayPomos)} sub="completed today" action={() => go("pomodoro")} actionLabel="Start" />
      </div>

      <div className="card p-5 mt-4">
        <h3 className="font-bold">Recent Activity</h3>
        <div className="mt-2 text-sm flex flex-col gap-2">
          {data.sessions.slice(0, 4).map((s) => (
            <SessionRow key={s.id} sid={s.subjectId} cid={s.chapterId} text={`${fmtDur(s.durationSec)} · ${s.completed ? "Completed" : "Interrupted"}`} date={s.start} label={s.label} />
          ))}
          {data.sessions.length === 0 && <span style={{ color: "var(--ink-2)" }}>Your focus time will appear here after your first session.</span>}
        </div>
      </div>
    </div>
  );
}

interface DoTodayTask {
  id: string;
  kind: "review" | "learn" | "preview" | "custom";
  quadrant: "q1" | "q2" | "q3" | "q4";
  refId: string;
  refSubject: string;
  title: string;
  detail: string;
  status: "open" | "done";
}

/** The Plan's "Do today" zone, surfaced on the home page. */
function DoToday({ onReview, onOpenChapter, go }: {
  onReview: (s?: string | null, c?: string | null) => void;
  onOpenChapter: (subjectId: string, chapterId: string) => void;
  go: (v: View) => void;
}) {
  const [tasks, setTasks] = useState<DoTodayTask[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/plan")
      .then((r) => r.json())
      .then((b) => {
        const items = Array.isArray(b.items) ? b.items : [];
        const open = items.filter((i: DoTodayTask) => i.quadrant === "q2" && i.status === "open");
        setOpenCount(open.length);
        setTasks(open.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const toggle = async (it: DoTodayTask) => {
    setTasks((prev) => prev.filter((x) => x.id !== it.id));
    setOpenCount((n) => Math.max(0, n - 1));
    try {
      await fetch(`/api/plan/${it.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "done" }) });
    } catch { /* keep optimistic */ }
  };

  const start = (it: DoTodayTask) => {
    if (it.kind === "custom") { toggle(it); return; }
    if (it.kind === "learn" && it.refId) { onOpenChapter(it.refSubject || "", it.refId); return; }
    onReview(it.refSubject || null, it.refId || null);
  };

  if (!loaded) return null;
  if (tasks.length === 0) return null;

  return (
    <div className="card p-5 mt-4 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-lg">Do today · {openCount} left</h2>
        <button onClick={() => go("plan")} className="text-xs font-bold shrink-0" style={{ color: "#7C3AED" }}>Open plan →</button>
      </div>
      <p className="text-xs mt-0.5" style={{ color: "var(--ink-2)" }}>Due today & new learning</p>
      <div className="mt-3 flex flex-col gap-2">
        {tasks.map((it) => (
          <div key={it.id} className="p-3 rounded-xl flex items-center gap-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <button onClick={() => toggle(it)} role="checkbox" aria-checked={false} aria-label={`Mark ${it.title} done`}
              className="w-5 h-5 rounded-lg grid place-items-center shrink-0 transition-transform active:scale-90"
              style={{ background: "transparent", border: "2px solid var(--ink-2)" }}>
              {""}
            </button>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">{it.title}</div>
              {it.detail && <div className="text-xs truncate" style={{ color: "var(--ink-2)" }}>{it.detail}</div>}
            </div>
            <button onClick={() => start(it)} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white shrink-0 active:scale-95" style={{ background: "#7c3aed" }}>
              {it.kind === "custom" ? "Done" : it.kind === "learn" ? "Learn →" : it.kind === "preview" ? "Preview →" : "Review →"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, action, actionLabel }: { label: string; value: string; sub: string; action: () => void; actionLabel: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium" style={{ color: "var(--ink-2)" }}>{label}</div>
      <div className="text-2xl font-bold mt-1 timer-tabular">{value}</div>
      <div className="text-[11px]" style={{ color: "var(--ink-2)" }}>{sub}</div>
      <button onClick={action} className="mt-2 text-xs font-bold" style={{ color: "#7C3AED" }}>{actionLabel} →</button>
    </div>
  );
}

