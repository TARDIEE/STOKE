"use client";

import { Play, Target } from "lucide-react";
import { fmtDur, useDerived, useStudy } from "@/lib/study-store";
import { Dot, Empty, SessionRow, Urgency, greeting, type View } from "./shared";
import ExamCountdown from "./exam-countdown";

export default function Dashboard({ onReview, go, openSubject }: {
  onReview: (s?: string | null, c?: string | null) => void;
  go: (v: View) => void;
  openSubject: (id: string) => void;
}) {
  const { data } = useStudy();
  const d = useDerived();
  if (!data) return null;
  // The single most overdue concept — today's starting point, one concept only.
  const firstDue = d.dueCards[0];
  const firstDueChapter = firstDue ? data.chapters.find((c) => c.id === firstDue.chapterId) : null;
  const firstDueSubject = firstDue ? data.subjects.find((s) => s.id === firstDue.subjectId) : null;
  const rec = d.overdue > 0
    ? `Start with ${d.overdue} overdue card${d.overdue > 1 ? "s" : ""}.`
    : d.dueToday > 0 ? `${d.dueToday} review${d.dueToday > 1 ? "s" : ""} due today — clear them first.` : "You're caught up. Bank some focus time.";
  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{greeting()}, {data.user.name || "Student"}</h1>
      <p className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>Let&apos;s make today&apos;s study session count. {rec}</p>
      <ExamCountdown />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        <StatCard label="Reviews Due" value={String(d.dueToday)} sub={d.overdue ? `${d.overdue} overdue` : "Due today"} action={() => onReview()} actionLabel="Start Review" />
        <StatCard label="Study Time" value={fmtDur(d.todayFocus)} sub="today" action={() => go("pomodoro")} actionLabel="Focus" />
        <StatCard label="Streak" value={d.streak >= 2 ? `${d.streak} days` : "—"} sub={d.streak >= 2 ? `longest ${d.longest}` : "study 2 days in a row"} action={() => go("stats")} actionLabel="Details" />
        <StatCard label="Pomodoros" value={String(d.todayPomos)} sub="completed today" action={() => go("pomodoro")} actionLabel="Start" />
      </div>
      <GoalBar go={go} />

      <div className="card p-5 mt-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Today&apos;s Study Plan</h2>
          <button onClick={() => onReview()} className="btn-primary px-4 py-2 text-sm">Start Review</button>
        </div>
        <button onClick={() => go("plan")} className="text-xs font-bold mt-1" style={{ color: "#7C3AED" }}>Open the auto-adjusted 4-zone to-do list →</button>
        {firstDue && (
          <button onClick={() => onReview(firstDue.subjectId)} className="w-full text-left p-3 rounded-xl mt-3 flex items-center gap-3 text-white" style={{ background: "linear-gradient(135deg,#7C3AED,#5B21B6)" }}>
            <span className="w-9 h-9 rounded-full grid place-items-center shrink-0" style={{ background: "rgba(255,255,255,.2)" }}>
              <Play size={16} className="ml-0.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-widest opacity-80">Start with this one concept</span>
              <span className="block font-bold truncate">{firstDueSubject?.name}{firstDueChapter ? ` — ${firstDueChapter.name}` : ""}</span>
            </span>
          </button>
        )}
        {d.plan.filter((p) => p.due > 0).length === 0 ? (
          <Empty title="You're all caught up." body="Nothing needs reviewing right now." action={() => go("subjects")} actionLabel="Browse subjects" />
        ) : (
          <div className="mt-3 divide-y" style={{ borderColor: "var(--border)" }}>
            {d.plan.filter((p) => p.due > 0).slice(0, 5).map(({ subject, due }) => {
              const ch = data.chapters.find((c) => c.subjectId === subject.id);
              return (
                <div key={subject.id} className="py-3 flex items-center gap-3">
                  <Dot color={subject.color} />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">{subject.name}{ch ? <span style={{ color: "var(--ink-2)", fontWeight: 400 }}> · {ch.name}</span> : null}</div>
                    <div className="text-xs" style={{ color: "var(--ink-2)" }}>{due} reviews <Urgency n={due} /></div>
                  </div>
                  <button onClick={() => onReview(subject.id)} className="ml-auto text-sm font-semibold px-3 py-1.5 rounded-lg" style={{ background: "var(--primary-bg)", color: "#6D28D9" }}>Start Review</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-3 mt-4">
        <div className="card p-5">
          <h3 className="font-bold">Continue Studying</h3>
          <div className="flex flex-wrap gap-2 mt-3">
            {data.subjects.slice(0, 6).map((s) => (
              <button key={s.id} onClick={() => openSubject(s.id)} className="px-3 py-2 rounded-xl text-sm font-medium" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                {s.name}
              </button>
            ))}
            {data.subjects.length === 0 && <span className="text-sm" style={{ color: "var(--ink-2)" }}>No subjects yet.</span>}
          </div>
          <button onClick={() => go("pomodoro")} className="btn-primary w-full mt-4 py-2.5 text-sm">Start 25 min Pomodoro</button>
        </div>
        <div className="card p-5">
          <h3 className="font-bold">Recent Activity</h3>
          <div className="mt-2 text-sm flex flex-col gap-2">
            {data.sessions.slice(0, 4).map((s) => (
              <SessionRow key={s.id} sid={s.subjectId} cid={s.chapterId} text={`${fmtDur(s.durationSec)} · ${s.completed ? "Completed" : "Interrupted"}`} date={s.start} label={s.label} />
            ))}
            {data.sessions.length === 0 && <span style={{ color: "var(--ink-2)" }}>Your focus time will appear here after your first session.</span>}
          </div>
        </div>
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

/** Daily focus goal progress — minutes studied vs target. */
function GoalBar({ go }: { go: (v: View) => void }) {
  const { data } = useStudy();
  const d = useDerived();
  if (!data) return null;
  const goalMin = Math.max(15, data.user.focusGoal || 120);
  const doneMin = Math.floor(d.todayFocus / 60);
  const pct = Math.min(100, Math.round((doneMin / goalMin) * 100));
  return (
    <button onClick={() => go("pomodoro")} className="card p-4 mt-3 w-full text-left" aria-label={`Daily goal ${doneMin} of ${goalMin} minutes`}>
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

