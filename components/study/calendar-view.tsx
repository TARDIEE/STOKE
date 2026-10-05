"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { dayKey, fmtDur, useStudy } from "@/lib/study-store";
import { SessionRow } from "./shared";
import Celebrate from "./celebrate";
import TopicGuideModal from "./topic-guide-modal";
import { parseItemTitle, progressKey } from "@/lib/topic-guides";

interface SchedItem {
  id: string; day: string; kind: "learn" | "review" | "revision";
  chapterId: string; subjectId: string; title: string;
  status: "open" | "done"; completedAt: number | null;
}
interface ExamInfo { id: string; name: string; date: number; daysLeft: number; }
interface ExamOpt { id: string; name: string; region: string; tagline: string; typicalMonth: string; subjects: string[]; chapters: number; hours: number; country: string; level: string; grade: number | null; }
interface CalData {
  exam: ExamInfo | null;
  serverNow: number;
  month: string;
  plan: Record<string, SchedItem[]>;
  perDay: Record<string, { sec: number; pomos: number; reviews: number }>;
  missed: number;
  totalPlanned: number;
  totalDone: number;
}

export default function CalendarView({ onOpenChapter, onReview, onReRead }: { onOpenChapter: (s: string, c: string) => void; onReview: (s?: string | null, c?: string | null) => void; onReRead: (s?: string | null, c?: string | null) => void }) {
  const { data, pushToast } = useStudy();
  const [cursor, setCursor] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [selDay, setSelDay] = useState<string | null>(null);
  const [cal, setCal] = useState<CalData | null>(null);
  const monthParam = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/schedule?month=${monthParam}`);
      if (res.ok) setCal(await res.json());
    } catch { /* ignore */ }
  }, [monthParam]);

  useEffect(() => { load(); }, [load]);

  const cells: (Date | null)[] = useMemo(() => {
    const y = cursor.getFullYear(), mo = cursor.getMonth();
    const first = new Date(y, mo, 1).getDay();
    const days = new Date(y, mo + 1, 0).getDate();
    const arr: (Date | null)[] = Array(first).fill(null);
    for (let i = 1; i <= days; i++) arr.push(new Date(y, mo, i));
    return arr;
  }, [cursor]);

  const maxSec = Math.max(1, ...Object.values(cal?.perDay ?? {}).map((v) => v.sec));
  const selPlan = selDay ? cal?.plan[selDay] ?? [] : [];
  const selStat = selDay ? cal?.perDay[selDay] : null;
  const selSessions = selDay && data ? data.sessions.filter((s) => dayKey(s.start) === selDay) : [];
  const exam = cal?.exam ?? (data && data.user.examDate ? { id: data.user.examId, name: data.user.examName, date: data.user.examDate, daysLeft: 0 } : null);

  const toggleSched = async (it: SchedItem) => {
    const status = it.status === "done" ? "open" : "done";
    setCal((prev) => {
      if (!prev) return prev;
      const plan = { ...prev.plan };
      plan[it.day] = (plan[it.day] ?? []).map((x) => (x.id === it.id ? { ...x, status } : x));
      return { ...prev, plan, totalDone: prev.totalDone + (status === "done" ? 1 : -1) };
    });
    try {
      await fetch(`/api/schedule/${it.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    } catch { /* keep optimistic */ }
  };

  const reschedule = async () => {
    try {
      const res = await fetch("/api/schedule/reschedule", { method: "POST" });
      const body = await res.json();
      pushToast({ title: body.moved ? `${body.moved} missed plan${body.moved > 1 ? "s" : ""} pushed forward` : "Nothing missed — calendar is on track" });
      load();
    } catch { /* ignore */ }
  };

  const rebuild = async () => {
    if (!confirm("Rebuild the whole chapter plan from your syllabus and deadline? Completed items stay done.")) return;
    try {
      await fetch("/api/schedule/rebuild", { method: "POST" });
      pushToast({ title: "Chapter plan rebuilt" });
      load();
    } catch { /* ignore */ }
  };

  const loadSyllabus = async () => {
    const examId = data?.user.examId;
    if (!examId || examId === "custom") return;
    if (!confirm("Replace your current subjects with the official exam syllabus? Your study history is kept.")) return;
    try {
      const res = await fetch("/api/syllabus/load", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ examId }) });
      const body = await res.json();
      pushToast({ title: `Syllabus loaded: ${body.subjects} subjects, ${body.chapters} chapters` });
      window.location.reload();
    } catch { /* ignore */ }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Calendar</h1>
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>Your chapter plan, day by day, counting down to the exam.</p>

      {!exam && <ExamSetup onSaved={load} />}

      {exam && (cal?.missed ?? 0) > 0 && (
        <div className="card p-4 mt-3 flex items-center gap-3 fade-in" style={{ borderColor: "#EF4444" }}>
          <div className="text-sm flex-1">
            <b>{cal!.missed} plan item{cal!.missed > 1 ? "s" : ""} missed.</b>
            <span style={{ color: "var(--ink-2)" }}> Push them forward and the calendar re-deals them from tomorrow.</span>
          </div>
          <button onClick={reschedule} className="btn-primary px-4 py-2 text-sm shrink-0">Push missed forward</button>
        </div>
      )}

      <div className="card p-4 mt-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="px-3 py-1 rounded-lg" style={{ border: "1px solid var(--border)" }} aria-label="Previous month">←</button>
            <div className="font-bold">{cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</div>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="px-3 py-1 rounded-lg" style={{ border: "1px solid var(--border)" }} aria-label="Next month">→</button>
          </div>
          {exam && (
            <div className="flex gap-2">
              <button onClick={loadSyllabus} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ border: "1px solid var(--border)" }}>Load {exam.name} syllabus</button>
              <button onClick={rebuild} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "var(--primary-bg)", color: "#6D28D9" }}>Rebuild plan</button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-7 gap-1.5 mt-3 text-center text-[11px]" style={{ color: "var(--ink-2)" }}>
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5 mt-1">
          {cells.map((dt, i) => {
            if (!dt) return <div key={i} />;
            const k = dayKey(dt.getTime());
            const v = cal?.perDay[k];
            const dayPlan = cal?.plan[k] ?? [];
            const open = dayPlan.filter((x) => x.status === "open").length;
            const done = dayPlan.length - open;
            const intensity = v ? Math.min(1, v.sec / maxSec) : 0;
            const bg = intensity === 0 ? "var(--bg)" : `rgba(124,58,237,${0.15 + intensity * 0.75})`;
            const isToday = k === dayKey(Date.now());
            const isPast = k < dayKey(Date.now()) && open > 0;
            return (
              <button key={i} onClick={() => setSelDay(k)}
                className="rounded-lg p-1 min-h-16 text-left overflow-hidden" style={{ background: bg, border: isToday ? "2px solid #7C3AED" : isPast ? "2px solid #EF4444" : selDay === k ? "2px solid #A78BFA" : "1px solid var(--border)" }}
                aria-label={`${dt.toLocaleDateString()} ${dayPlan.length ? `${dayPlan.length} planned` : "nothing planned"}${v ? `, ${fmtDur(v.sec)} studied` : ""}`}>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold" style={{ color: intensity > 0.5 ? "#fff" : undefined }}>{dt.getDate()}</span>
                  {dayPlan.length > 0 && <span className="text-[9px] font-bold ml-auto" style={{ color: done === dayPlan.length ? "#22C55E" : intensity > 0.5 ? "#fff" : "var(--ink-2)" }}>{done}/{dayPlan.length}</span>}
                </div>
                <div className="mt-0.5 flex flex-col gap-0.5">
                  {dayPlan.slice(0, 2).map((p) => (
                    <span key={p.id} className="block text-[9px] leading-tight truncate px-1 py-px rounded" style={{
                      background: p.status === "done" ? "#22C55E22" : p.kind !== "learn" ? "#A78BFA22" : "color-mix(in srgb, var(--card) 85%, transparent)",
                      color: p.status === "done" ? "#16A34A" : intensity > 0.4 ? "#fff" : "var(--ink)",
                      textDecoration: p.status === "done" ? "line-through" : "none",
                    }}>{p.kind === "learn" ? null : <RotateCcw size={11} className="inline -mt-0.5" />}{shortTitle(p.title)}</span>
                  ))}
                  {dayPlan.length > 2 && <span className="text-[9px] font-bold" style={{ color: "var(--ink-2)" }}>+{dayPlan.length - 2} more</span>}
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] mt-2" style={{ color: "var(--ink-2)" }}>Red border = missed plan · purple fill = study time logged.</p>
      </div>

      {selDay && (
        <DayTab
          day={selDay}
          items={selPlan}
          stat={selStat ?? undefined}
          sessions={selSessions}
          onClose={() => setSelDay(null)}
          onToggle={toggleSched}
          onChanged={load}
          onOpenChapter={onOpenChapter}
          onReview={onReview}
          onReRead={onReRead}
        />
      )}
    </div>
  );
}

/** Day tab: the day's to-do list with a battery that fills part by part. */
function DayTab({ day, items, stat, sessions, onClose, onToggle, onChanged, onOpenChapter, onReview, onReRead }: {
  day: string;
  items: SchedItem[];
  stat: { sec: number; pomos: number; reviews: number } | undefined;
  sessions: { id: string; subjectId: string | null; chapterId: string | null; durationSec: number; completed: boolean; start: number; label?: "learn" | "reread" }[];
  onClose: () => void;
  onToggle: (it: SchedItem) => void;
  onChanged: () => void;
  onOpenChapter: (s: string, c: string) => void;
  onReview: (s?: string | null, c?: string | null) => void;
  onReRead: (s?: string | null, c?: string | null) => void;
}) {
  const { data, pushToast, addCards } = useStudy();
  const [future, setFuture] = useState<SchedItem[]>([]);
  const [pick, setPick] = useState("");
  const [celebrated, setCelebrated] = useState(false);
  const [questions, setQuestions] = useState<{ id: string; chapterId: string; subjectId: string; chapter: string; front: string; back: string }[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiTried, setAiTried] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [guideFor, setGuideFor] = useState<SchedItem | null>(null);
  // Per-subtopic checklist progress (server-saved): ticks persist across days.
  const [progress, setProgress] = useState<Record<string, { learned: number[]; solved: number[] }>>({});

  useEffect(() => {
    fetch("/api/topic-progress")
      .then((r) => r.json())
      .then((b) => {
        if (b.progress) setProgress(b.progress);
      })
      .catch(() => {});
  }, [day]);

  const saveProgress = (key: string, learned: number[], solved: number[]) => {
    setProgress((prev) => ({ ...prev, [key]: { learned, solved } }));
    fetch("/api/topic-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, learned, solved }),
    }).catch(() => {});
  };

  const progressOf = (title: string) => {
    const parsed = parseItemTitle(title);
    const key = progressKey(parsed.chapter, parsed.topic);
    return { key, entry: progress[key] };
  };
  const done = items.filter((i) => i.status === "done").length;
  const full = items.length > 0 && done === items.length;
  const isToday = day === dayKey(Date.now());

  useEffect(() => {
    if (!full) setCelebrated(false);
  }, [full]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  useEffect(() => {
    setAiTried(false);
    setQuestions([]);
    setRevealed(new Set());
    fetch(`/api/ai/questions?day=${day}`)
      .then((r) => r.json())
      .then((b) => {
        if (Array.isArray(b.questions)) setQuestions(b.questions);
        // Fresh questions every day: auto-generate once when today opens empty.
        if (day === dayKey(Date.now()) && (!b.questions || b.questions.length === 0) && b.aiReady) {
          setAiTried(true);
          setAiBusy(true);
          fetch("/api/ai/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ day }) })
            .then((r) => r.json())
            .then((g) => { if (Array.isArray(g.questions) && g.questions.length) setQuestions(g.questions); })
            .catch(() => {})
            .finally(() => setAiBusy(false));
        } else {
          setAiTried(true);
        }
      })
      .catch(() => setAiTried(true));
  }, [day]);

  useEffect(() => {
    fetch("/api/schedule?all=1")
      .then((r) => r.json())
      .then((b) => {
        const all = (Object.values((b.plan ?? {}) as Record<string, SchedItem[]>).flat() as SchedItem[]);
        setFuture(all.filter((x) => x.kind === "learn" && x.status === "open" && x.day > day).slice(0, 30));
      })
      .catch(() => {});
  }, [day, items.length]);

  const deferToTomorrow = async (it: SchedItem) => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    const day = dayKey(t.getTime());
    try {
      await fetch("/api/schedule/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: it.id, day }),
      });
      pushToast({ title: "Moved to tomorrow", body: "No pressure — it will wait for you there." });
      onChanged();
    } catch {
      pushToast({ title: "Couldn't move it — try again" });
    }
  };

  const moveHere = async () => {
    if (!pick) return;
    const res = await fetch("/api/schedule/move", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: pick, day }) });
    if (res.ok) {
      pushToast({ title: "Chapter moved here", body: "Removed from its far day — reviews shifted with it." });
      setPick("");
      onChanged();
    }
  };

  const regenQuestions = async () => {
    setAiBusy(true);
    try {
      const res = await fetch("/api/ai/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ day }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Generation failed.");
      setQuestions(Array.isArray(body.questions) ? body.questions : []);
      if (body.note) pushToast({ title: body.note });
      else pushToast({ title: "Fresh questions generated for this day" });
    } catch (e) {
      pushToast({ title: "Couldn't generate questions", body: e instanceof Error ? e.message : undefined });
    }
    setAiBusy(false);
  };

  const saveQuestionsAsCards = () => {
    if (!questions.length) return;
    addCards(questions.map((q) => ({
      subjectId: q.subjectId, chapterId: q.chapterId, front: q.front, back: q.back, tags: ["ai-daily"], notes: "",
    })));
    pushToast({ title: `${questions.length} questions saved as flashcards`, body: "They enter spaced repetition from today." });
  };

  const toggleReveal = (id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-40 p-4" role="dialog" aria-modal="true" aria-label={`Plan for ${day}`}>
      <div className="absolute inset-0" style={{ background: "rgba(15,10,31,.45)" }} onClick={onClose} />
      <div className="card relative max-w-lg mx-auto mt-6 md:mt-14 p-5 fade-in max-h-[85vh] overflow-auto">
        {full && !celebrated && <Celebrate title="Day complete — battery full!" onDone={() => setCelebrated(true)} />}
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-lg">{new Date(day + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</h3>
          <button onClick={onClose} className="ml-auto px-2.5 py-1 rounded-lg text-sm font-bold" style={{ border: "1px solid var(--border)" }} aria-label="Close day tab"><X size={14} /></button>
        </div>
        {stat && <div className="text-xs mt-1" style={{ color: "var(--ink-2)" }}>{fmtDur(stat.sec)} studied · {stat.pomos} pomodoros · {stat.reviews} reviews</div>}

        <div className="mt-3">
          <div className="text-xs font-bold mb-1.5" style={{ color: "var(--ink-2)" }}>
            {full ? "🔋 Day complete — battery full!" : items.length ? "🔋 Filling up as you finish…" : "No tasks this day yet."}
          </div>
          <Battery total={items.length} done={done} />
        </div>

        <div className="mt-3 flex flex-col gap-1.5">
          {items.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm p-2.5 rounded-xl" style={{ border: "1px solid var(--border)", background: p.status === "done" ? "#22C55E11" : "var(--bg)" }}>
              <button onClick={() => onToggle(p)} role="checkbox" aria-checked={p.status === "done"} aria-label={`Mark ${p.title} done`}
                className="w-5 h-5 rounded-md grid place-items-center text-xs font-bold text-white shrink-0"
                style={{ background: p.status === "done" ? "#22C55E" : "transparent", border: p.status === "done" ? "none" : "1.5px solid var(--ink-2)" }}>
                {p.status === "done" ? <Check size={12} strokeWidth={3.5} /> : ""}
              </button>
              <button onClick={() => setGuideFor(p)} className="min-w-0 flex-1 basis-40 text-left" aria-label={`Study guide: ${p.title}`}>
                <div className={`font-medium underline decoration-dotted underline-offset-2 ${p.status === "done" ? "line-through" : ""}`}>{p.title}</div>
                <div className="text-[11px]" style={{ color: "var(--ink-2)" }}>{p.kind === "learn" ? "Learn" : p.kind === "review" ? "Spaced review" : "Revision"} · tap for guide</div>
              </button>
              {(() => {
                const { entry } = progressOf(p.title);
                const n = (entry?.learned.length ?? 0) + (entry?.solved.length ?? 0);
                if (!entry || n === 0 || p.status === "done") return null;
                return (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "var(--primary-bg)", color: "#6D28D9" }}>
                    {n} ✓ kept
                  </span>
                );
              })()}
              <div className="flex items-center gap-1.5 flex-wrap basis-full sm:basis-auto">
                {p.status === "open" && (
                  <button onClick={() => deferToTomorrow(p)} className="text-xs font-bold px-2.5 py-1 rounded-lg shrink-0" style={{ border: "1px solid var(--border)", color: "var(--ink-2)" }}>Tomorrow</button>
                )}
                {p.chapterId && data && (
                  <button onClick={() => { const ch = data.chapters.find((c) => c.id === p.chapterId); if (ch) onOpenChapter(ch.subjectId, ch.id); }} className="text-xs font-bold shrink-0" style={{ color: "#7C3AED" }}>Open</button>
                )}
                {p.status === "open" && p.kind === "review" && (
                  <button onClick={() => onReview(p.subjectId || null, p.chapterId || null)} className="text-xs font-bold px-2.5 py-1 rounded-lg text-white shrink-0" style={{ background: "#7c3aed" }}>Review cards</button>
                )}
                {p.status === "open" && p.kind !== "learn" && (
                  <button onClick={() => onReRead(p.subjectId || null, p.chapterId || null)} className="text-xs font-bold px-2.5 py-1 rounded-lg shrink-0" style={{ background: "#F59E0B22", color: "#F59E0B" }}>Re-read 25m</button>
                )}
              </div>
            </div>
          ))}
          {items.length === 0 && <div className="text-xs" style={{ color: "var(--ink-2)" }}>Nothing planned — pull a chapter in below.</div>}
        </div>

        <div className="mt-3 p-3 rounded-xl" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          <div className="text-xs font-bold">+ Pull a chapter into this day</div>
          <div className="text-[11px]" style={{ color: "var(--ink-2)" }}>It moves here and leaves its far day — spaced reviews follow it.</div>
          <div className="flex gap-2 mt-2">
            <select value={pick} onChange={(e) => setPick(e.target.value)} className="flex-1 min-w-0 px-2 py-2 rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--card)" }} aria-label="Chapter to move here">
              <option value="">Choose a future chapter…</option>
              {future.map((f) => <option key={f.id} value={f.id}>{f.title} ({f.day.slice(5)})</option>)}
            </select>
            <button onClick={moveHere} disabled={!pick} className="btn-primary px-4 py-2 text-sm shrink-0 disabled:opacity-50">Move</button>
          </div>
        </div>

        <div className="mt-3 p-3 rounded-xl" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <div className="text-xs font-bold flex-1">✨ AI questions for this day</div>
            {data?.user.isPremium ? (
              <button onClick={regenQuestions} disabled={aiBusy} className="text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0 disabled:opacity-50" style={{ background: "var(--primary-bg)", color: "#6D28D9" }}>
                {aiBusy ? "Writing…" : questions.length ? <span className="inline-flex items-center gap-1"><RotateCcw size={13} /> New set</span> : "Generate"}
              </button>
            ) : (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0" style={{ background: "var(--primary-bg)", color: "#6D28D9" }}>Premium</span>
            )}
          </div>
          <div className="text-[11px]" style={{ color: "var(--ink-2)" }}>
            {aiBusy && questions.length === 0 ? "Writing fresh questions from today's chapters…" : "Made fresh from this day's chapters — never yesterday's set."}
          </div>
          {questions.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5">
              {questions.map((q) => (
                <button key={q.id} onClick={() => toggleReveal(q.id)} className="text-left p-2 rounded-lg text-sm" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
                  <span className="font-medium">{q.front}</span>
                  {q.chapter && <span className="block text-[10px] font-bold mt-0.5" style={{ color: "#7C3AED" }}>{q.chapter}</span>}
                  {revealed.has(q.id)
                    ? <span className="block text-xs mt-1 fade-in" style={{ color: "var(--ink-2)" }}>{q.back}</span>
                    : <span className="block text-[11px] mt-0.5 font-bold" style={{ color: "var(--ink-2)" }}>Tap to reveal answer</span>}
                </button>
              ))}
              <button onClick={saveQuestionsAsCards} className="text-xs font-bold self-start" style={{ color: "#7C3AED" }}>+ Save all as flashcards</button>
            </div>
          )}
          {!aiBusy && questions.length === 0 && aiTried && (
            <div className="text-[11px] mt-1" style={{ color: "var(--ink-2)" }}>
              {isToday ? "No chapters left to question today — or AI isn't set up (Settings → AI)." : "Hit Generate for a fresh set for this day."}
            </div>
          )}
        </div>

        {sessions.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-bold mb-1" style={{ color: "var(--ink-2)" }}>Sessions logged</div>
            <div className="flex flex-col gap-1.5 text-sm">
              {sessions.slice(0, 10).map((x) => <SessionRow key={x.id} sid={x.subjectId} cid={x.chapterId} text={`${fmtDur(x.durationSec)} · ${x.completed ? "Completed" : "Interrupted"}`} date={x.start} label={x.label} />)}
            </div>
          </div>
        )}

        {guideFor && (
          <TopicGuideModal
            key={guideFor.id}
            title={guideFor.title}
            initialLearned={progressOf(guideFor.title).entry?.learned ?? []}
            initialSolved={progressOf(guideFor.title).entry?.solved ?? []}
            onProgress={(learned, solved) => saveProgress(progressOf(guideFor.title).key, learned, solved)}
            close={() => setGuideFor(null)}
            onMastered={() => {
              onToggle(guideFor);
              setGuideFor(null);
            }}
            onDefer={() => {
              deferToTomorrow(guideFor);
              setGuideFor(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

/** Battery meter — fills segment by segment as tasks complete. */
function Battery({ total, done }: { total: number; done: number }) {
  if (!total) return <div className="text-xs" style={{ color: "var(--ink-2)" }}>Empty day.</div>;
  return (
    <div className="flex items-center gap-1.5" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total} aria-label={`${done} of ${total} tasks done`}>
      <div className="flex-1 flex gap-1 p-1.5 rounded-xl" style={{ border: "2px solid var(--ink-2)" }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="h-5 flex-1 rounded-md progress-anim" style={{ background: i < done ? "linear-gradient(180deg,#A78BFA,#7C3AED)" : "var(--border)" }} />
        ))}
      </div>
      <div className="w-1.5 h-7 rounded-r-md shrink-0" style={{ background: "var(--ink-2)" }} />
      <span className="text-xs font-bold shrink-0 timer-tabular">{done}/{total}</span>
    </div>
  );
}

function shortTitle(t: string) {
  return t.replace(/^(Learn|Review):\s*/, "").split("·").pop()?.trim() ?? t;
}

/** Live ticking deadline countdown — days, hours, minutes, seconds. */

function ExamSetup({ onSaved }: { onSaved: () => void }) {
  const { data, updateUser, pushToast } = useStudy();
  const [exams, setExams] = useState<ExamOpt[]>([]);
  const [countries, setCountries] = useState<{ id: string; name: string; flag: string }[]>([]);
  const [picked, setPicked] = useState("");
  const [date, setDate] = useState("");
  useEffect(() => {
    fetch("/api/exams").then((r) => r.json()).then((b) => {
      setExams(b.exams ?? []);
      if (Array.isArray(b.countries)) setCountries(b.countries);
    }).catch(() => {});
  }, []);
  const userCountry = data?.user.country ?? "";
  const visible = userCountry ? exams.filter((e) => e.country === userCountry) : exams;
  const save = async (withSyllabus: boolean) => {
    if (!picked) { pushToast({ title: "Pick the exam you're preparing for" }); return; }
    const ts = date ? new Date(date + "T00:00:00").getTime() : 0;
    if (!ts || ts <= Date.now()) { pushToast({ title: "Pick a future exam date" }); return; }
    const exam = exams.find((e) => e.id === picked);
    updateUser({ examId: picked, examName: exam?.name ?? picked, examDate: ts });
    if (withSyllabus && picked !== "custom") {
      if (!confirm(`Load the ${exam?.name} syllabus (${exam?.chapters} chapters)? Your current subjects will be replaced.`)) { onSaved(); return; }
      try {
        await fetch("/api/syllabus/load", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ examId: picked }) });
        pushToast({ title: "Syllabus loaded — chapter plan building" });
        window.location.reload();
        return;
      } catch { /* ignore */ }
    }
    try { await fetch("/api/schedule/rebuild", { method: "POST" }); } catch { /* ignore */ }
    onSaved();
  };
  return (
    <div className="card p-5 mt-4">
      <h3 className="font-bold">What are you preparing for?</h3>
      <p className="text-xs mt-1" style={{ color: "var(--ink-2)" }}>Stoke plans your chapters against the deadline and counts down every second.</p>
      <div className="flex items-center gap-2 mt-2 text-xs">
        <span style={{ color: "var(--ink-2)" }}>Showing exams for</span>
        <select
          value={userCountry}
          onChange={(e) => updateUser({ country: e.target.value })}
          className="px-2 py-1.5 rounded-lg text-xs font-bold"
          style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
          aria-label="Country"
        >
          <option value="">All countries</option>
          {countries.map((c) => <option key={c.id} value={c.id}>{c.flag} {c.name}</option>)}
        </select>
      </div>
      <div className="grid sm:grid-cols-2 gap-2 mt-3">
        {visible.map((e) => (
          <button key={e.id} onClick={() => setPicked(e.id)} className="p-3 rounded-xl text-left" style={{ border: picked === e.id ? "2px solid #7C3AED" : "1px solid var(--border)" }}>
            <div className="font-bold text-sm">{e.name}</div>
            <div className="text-[11px]" style={{ color: "var(--ink-2)" }}>{e.region} · {e.tagline}</div>
            <div className="text-[11px] mt-1" style={{ color: "var(--ink-2)" }}>{e.grade ? `Class ${e.grade} · ` : ""}{e.subjects.join(" · ")} — {e.chapters} chapters (~{e.hours}h)</div>
          </button>
        ))}
        <button onClick={() => setPicked("custom")} className="p-3 rounded-xl text-left" style={{ border: picked === "custom" ? "2px solid #7C3AED" : "1px solid var(--border)" }}>
          <div className="font-bold text-sm">Custom / Other exam</div>
          <div className="text-[11px]" style={{ color: "var(--ink-2)" }}>Just set a deadline for your current subjects</div>
        </button>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-2 rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Exam date" />
        <button onClick={() => save(false)} className="px-4 py-2 text-sm font-semibold rounded-xl" style={{ border: "1px solid var(--border)" }}>Set deadline</button>
        <button onClick={() => save(true)} className="btn-primary px-4 py-2 text-sm">Set + load syllabus</button>
      </div>
    </div>
  );
}
