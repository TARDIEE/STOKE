"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Pencil, RotateCcw, X } from "lucide-react";
import { fmtDur } from "@/lib/study-store";
import type { View } from "./shared";

// Local copies of the planner's zone metadata (the engine itself lives server-side
// in lib/server/plan.ts — never import server modules into client components).
type Quadrant = "q1" | "q2" | "q3" | "q4";
interface PlanItem {
  id: string;
  kind: "review" | "learn" | "preview" | "custom";
  refId: string;
  refSubject: string;
  title: string;
  detail: string;
  note: string;
  quadrant: Quadrant;
  status: "open" | "done";
  source: "auto" | "custom";
  count: number;
  completedAt: number | null;
}
const QUADRANT_META: Record<Quadrant, { title: string; sub: string }> = {
  q1: { title: "Do now", sub: "Overdue & missed — most important" },
  q2: { title: "Do today", sub: "Due today & new learning" },
  q3: { title: "Quick / soon", sub: "Short relearns & tomorrow's preview" },
  q4: { title: "Later", sub: "Upcoming — stays until due" },
};
interface Tomorrow { title: string; count: number; }
interface Studied { tasksDone: number; reviewsDone: number; focusSec: number; pomodoros: number; }

const QUADRANTS: Quadrant[] = ["q1", "q2", "q3", "q4"];
const QUAD_STYLE: Record<Quadrant, { border: string; badge: string; color: string }> = {
  q1: { border: "#EF4444", badge: "#EF44441a", color: "#EF4444" },
  q2: { border: "#7C3AED", badge: "var(--primary-bg)", color: "#6D28D9" },
  q3: { border: "#F59E0B", badge: "#F59E0B1a", color: "#F59E0B" },
  q4: { border: "#71717A", badge: "var(--bg)", color: "var(--ink-2)" },
};

export default function PlanView({ onReview, go, onOpenChapter, onOpenCalendar }: {
  onReview: (s?: string | null, c?: string | null) => void;
  go: (v: View) => void;
  onOpenChapter: (subjectId: string, chapterId: string) => void;
  onOpenCalendar: () => void;
}) {
  const [items, setItems] = useState<PlanItem[]>([]);
  const [tomorrow, setTomorrow] = useState<Tomorrow[]>([]);
  const [studied, setStudied] = useState<Studied | null>(null);
  const [loading, setLoading] = useState(true);
  const [custom, setCustom] = useState("");
  const [customQ, setCustomQ] = useState<Quadrant>("q2");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNote, setEditNote] = useState("");

  const tomorrowKey = () => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  };

  const saveEdit = async (it: PlanItem) => {
    const title = editTitle.trim();
    if (!title) return;
    const note = editNote.trim();
    setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, title, note, source: "custom" as const } : x)));
    setEditingId(null);
    try {
      await fetch(`/api/plan/${it.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, note }) });
    } catch {
      load();
    }
  };

  const moveToTomorrow = async (it: PlanItem) => {
    setItems((prev) => prev.filter((x) => x.id !== it.id));
    try {
      await fetch(`/api/plan/${it.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ day: tomorrowKey() }) });
    } catch {
      load();
    }
  };

  const load = useCallback(async (regen = false) => {
    setLoading(true);
    try {
      const res = await fetch(regen ? "/api/plan/regenerate" : "/api/plan", { method: regen ? "POST" : "GET" });
      if (!res.ok) throw new Error();
      const body = await res.json();
      setItems(body.items);
      setTomorrow(body.tomorrow);
      setStudied(body.studied);
    } catch { /* offline — keep current */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (it: PlanItem) => {
    const status = it.status === "done" ? "open" : "done";
    setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, status } : x)));
    try {
      await fetch(`/api/plan/${it.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const res = await fetch("/api/plan");
      if (res.ok) {
        const body = await res.json();
        setStudied(body.studied);
      }
    } catch { /* keep optimistic */ }
  };

  const remove = async (it: PlanItem) => {
    setItems((prev) => prev.filter((x) => x.id !== it.id));
    try { await fetch(`/api/plan/${it.id}`, { method: "DELETE" }); } catch { /* ignore */ }
  };

  const addCustom = async () => {
    const title = custom.trim();
    if (!title) return;
    setCustom("");
    try {
      await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, quadrant: customQ }) });
      load();
    } catch { /* ignore */ }
  };

  const startTask = (it: PlanItem) => {
    if (it.kind === "custom") { toggle(it); return; }
    if (it.kind === "learn" && it.refId) { onOpenChapter(it.refSubject || "", it.refId); return; }
    onReview(it.refSubject || null, it.refId || null);
  };

  const openCount = items.filter((i) => i.status === "open").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent p-6 rounded-2xl border border-purple-500/20 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold mb-2">
            ✨ Intelligent Study Planner
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Today&apos;s Plan</h1>
          <p className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>
            Auto-built from your spaced-repetition schedule — max 8 tasks in 4 prioritized zones.
          </p>
        </div>
        <button onClick={() => load(true)} className="btn-primary px-5 py-2.5 text-sm font-bold shadow-md inline-flex items-center gap-2 transition-transform hover:scale-105 active:scale-95" disabled={loading}>
          {loading ? "Adjusting…" : <><RotateCcw size={15} /> Auto-adjust Plan</>}
        </button>
      </div>

      {studied && (
        <div className="card p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs shadow-sm" style={{ color: "var(--ink-2)" }}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs"></span>
            <span><b className="text-sm" style={{ color: "var(--ink)" }}>{studied.tasksDone}</b> tasks completed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-2xs"></span>
            <span><b className="text-sm" style={{ color: "var(--ink)" }}>{studied.reviewsDone}</b> cards reviewed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-2xs"></span>
            <span><b className="text-sm" style={{ color: "var(--ink)" }}>{fmtDur(studied.focusSec)}</b> focus time</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-2xs"></span>
            <span><b className="text-sm" style={{ color: "var(--ink)" }}>{studied.pomodoros}</b> pomodoros</span>
          </div>
          <div className="ml-auto px-3 py-1 rounded-full font-bold text-xs" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--ink)" }}>
            {items.length > 0 ? `${openCount} left of ${items.length}` : "All clear 🎉"}
          </div>
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="card p-8 mt-4 text-center text-sm shadow-sm animate-pulse" style={{ color: "var(--ink-2)" }}>Building your intelligent plan…</div>
      ) : items.length === 0 ? (
        <div className="card p-10 mt-4 text-center space-y-3 shadow-sm">
          <div className="text-lg font-bold">Nothing scheduled — enjoy the clear day!</div>
          <div className="text-sm max-w-sm mx-auto" style={{ color: "var(--ink-2)" }}>Add a custom task below or start learning something new.</div>
          <div className="flex justify-center gap-3 pt-2 flex-wrap">
            <button onClick={() => go("subjects")} className="btn-primary px-5 py-2.5 text-sm font-bold">Browse subjects</button>
            <button onClick={onOpenCalendar} className="px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors hover:bg-secondary/80" style={{ border: "1px solid var(--border)" }}>Open calendar</button>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          {QUADRANTS.map((q) => {
            const meta = QUADRANT_META[q];
            const st = QUAD_STYLE[q];
            const list = items.filter((i) => i.quadrant === q);
            if (list.length === 0) return null;
            return (
              <section key={q} className="card p-5 min-w-0 shadow-sm transition-all hover:shadow-md" style={{ borderTop: `4px solid ${st.border}` }} aria-label={meta.title}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full shadow-2xs" style={{ background: st.badge, color: st.color }}>
                    {meta.title} · {list.filter((i) => i.status === "open").length}
                  </span>
                  <span className="text-xs font-medium" style={{ color: "var(--ink-2)" }}>{meta.sub}</span>
                </div>
                <div className="mt-3.5 flex flex-col gap-2.5">
                  {list.map((it) => (
                    <div key={it.id} className="p-3.5 rounded-xl flex flex-wrap items-start gap-x-3 gap-y-2.5 transition-all shadow-2xs" style={{ background: "var(--bg)", border: "1px solid var(--border)", opacity: it.status === "done" ? 0.6 : 1 }}>
                      <button onClick={() => toggle(it)} role="checkbox" aria-checked={it.status === "done"} aria-label={`Mark ${it.title} ${it.status === "done" ? "open" : "done"}`}
                        className="w-5 h-5 mt-0.5 rounded-lg grid place-items-center text-white shrink-0 transition-transform active:scale-90"
                        style={{ background: it.status === "done" ? "#22C55E" : "transparent", border: it.status === "done" ? "none" : "2px solid var(--ink-2)" }}>
                        {it.status === "done" ? <Check size={13} strokeWidth={3.5} /> : ""}
                      </button>
                      <div className="min-w-0 flex-1 basis-40">
                        <div className={`text-sm font-semibold tracking-tight ${it.status === "done" ? "line-through text-muted-foreground" : ""}`} style={it.status === "done" ? { color: "var(--ink-2)" } : undefined}>{it.title}</div>
                        {it.detail && <div className="text-xs mt-0.5" style={{ color: "var(--ink-2)" }}>{it.detail}</div>}
                        {it.note && <div className="text-xs font-semibold mt-1 px-2.5 py-0.5 rounded-md inline-block" style={{ background: st.badge, color: st.color }}>{it.note}</div>}
                        {editingId === it.id && (
                          <div className="mt-3 flex flex-col gap-2 p-3 rounded-xl bg-card border shadow-inner" style={{ borderColor: "var(--border)", background: "var(--card)" }}>
                            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Task title"
                              className="w-full px-3 py-2 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500" style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--ink)" }} aria-label="Edit task title" />
                            <input value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Note (optional)"
                              className="w-full px-3 py-2 rounded-lg text-xs outline-none focus:ring-2 focus:ring-purple-500" style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--ink)" }} aria-label="Edit task note" />
                            <div className="flex gap-2 pt-1">
                              <button onClick={() => saveEdit(it)} className="btn-primary px-3.5 py-1.5 text-xs font-bold">Save Changes</button>
                              <button onClick={() => setEditingId(null)} className="px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors hover:bg-secondary" style={{ border: "1px solid var(--border)" }}>Cancel</button>
                            </div>
                            <p className="text-[11px] italic" style={{ color: "var(--ink-2)" }}>Edited tasks become custom — auto-adjust will preserve them.</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap basis-full sm:basis-auto justify-end">
                        {it.status === "open" && it.kind !== "custom" && (
                          <button onClick={() => startTask(it)} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white shrink-0 shadow-xs transition-transform active:scale-95" style={{ background: "#7c3aed" }}>
                            {it.kind === "learn" ? "Learn →" : it.kind === "preview" ? "Preview →" : "Review →"}
                          </button>
                        )}
                        {it.status === "open" && (
                          <button onClick={() => moveToTomorrow(it)} className="text-xs font-bold px-2.5 py-1.5 rounded-lg shrink-0 transition-colors hover:bg-secondary/80" style={{ border: "1px solid var(--border)", color: "var(--ink-2)" }}>
                            Tomorrow
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (editingId === it.id) setEditingId(null);
                            else { setEditTitle(it.title); setEditNote(it.note); setEditingId(it.id); }
                          }}
                          className="p-1.5 rounded-lg shrink-0 transition-colors hover:bg-secondary/80" style={{ color: "var(--ink-2)" }}
                          aria-label={`Edit ${it.title}`}
                        >
                          <Pencil size={14} />
                        </button>
                        {it.source === "custom" && (
                          <button onClick={() => remove(it)} className="p-1.5 rounded-lg shrink-0 transition-colors hover:bg-red-500/10" style={{ color: "#EF4444" }} aria-label={`Delete ${it.title}`}><X size={15} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div className="card p-5 shadow-sm">
          <h3 className="font-bold text-sm mb-2.5 flex items-center gap-2"><span>➕</span> Add Custom Task</h3>
          <div className="flex flex-col sm:flex-row gap-2.5 mt-2">
            <input value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addCustom(); }}
              placeholder="e.g. Revise organic chemistry reactions" className="w-full sm:flex-1 px-3.5 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500" style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--ink)" }} aria-label="New task" />
            <select value={customQ} onChange={(e) => setCustomQ(e.target.value as Quadrant)} className="w-full sm:w-auto px-3 py-2.5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500" style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--ink)" }} aria-label="Task zone">
              {QUADRANTS.map((q) => <option key={q} value={q}>{QUADRANT_META[q].title}</option>)}
            </select>
            <button onClick={addCustom} className="w-full sm:w-auto btn-primary px-5 py-2.5 text-sm font-bold shadow-xs active:scale-95">Add Task</button>
          </div>
        </div>
        <div className="card p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm mb-1 flex items-center gap-2"><span>⏳</span> Parked for Tomorrow</h3>
            <p className="text-xs mb-3" style={{ color: "var(--ink-2)" }}>Parked items stay here until due — the smart planner automatically pulls them in when ready.</p>
            <div className="flex flex-col gap-2 text-sm">
              {tomorrow.slice(0, 4).map((t, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/30" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <span className="font-medium truncate pr-2">{t.title}</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: "var(--border)", color: "var(--ink-2)" }}>{t.count} cards</span>
                </div>
              ))}
              {tomorrow.length === 0 && <span className="text-xs py-2 italic text-center" style={{ color: "var(--ink-2)" }}>Nothing coming due tomorrow. You&apos;re fully caught up!</span>}
            </div>
          </div>
          <button onClick={() => go("pomodoro")} className="text-xs font-bold mt-4 inline-flex items-center gap-1 self-start transition-transform hover:translate-x-1" style={{ color: "#7C3AED" }}>
            Bank focus time with Pomodoro timer →
          </button>
        </div>
      </div>
    </div>
  );
}
