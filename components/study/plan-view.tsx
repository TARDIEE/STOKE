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
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Today&apos;s Plan</h1>
          <p className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>
            Auto-built from your spaced-repetition schedule — max 8 tasks in 4 zones.
          </p>
        </div>
        <button onClick={() => load(true)} className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-1.5" disabled={loading}>
          {loading ? "Adjusting…" : <><RotateCcw size={14} /> Auto-adjust</>}
        </button>
      </div>

      {studied && (
        <div className="card p-3 mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs" style={{ color: "var(--ink-2)" }}>
          <span><b style={{ color: "var(--ink)" }}>{studied.tasksDone}</b> tasks done</span>
          <span><b style={{ color: "var(--ink)" }}>{studied.reviewsDone}</b> cards reviewed</span>
          <span><b style={{ color: "var(--ink)" }}>{fmtDur(studied.focusSec)}</b> focused</span>
          <span><b style={{ color: "var(--ink)" }}>{studied.pomodoros}</b> pomodoros</span>
          <span className="ml-auto">{items.length > 0 ? `${openCount} left of ${items.length}` : "All clear"}</span>
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="card p-8 mt-4 text-center text-sm" style={{ color: "var(--ink-2)" }}>Building your plan…</div>
      ) : items.length === 0 ? (
        <div className="card p-8 mt-4 text-center">
          <div className="font-semibold">Nothing scheduled — enjoy the clear day.</div>
          <div className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>Add a custom task below or start learning something new.</div>
          <div className="flex justify-center gap-2 mt-4 flex-wrap">
            <button onClick={() => go("subjects")} className="btn-primary px-4 py-2 text-sm">Browse subjects</button>
            <button onClick={onOpenCalendar} className="px-4 py-2 text-sm font-semibold rounded-xl" style={{ border: "1px solid var(--border)" }}>Open calendar</button>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3 mt-4">
          {QUADRANTS.map((q) => {
            const meta = QUADRANT_META[q];
            const st = QUAD_STYLE[q];
            const list = items.filter((i) => i.quadrant === q);
            if (list.length === 0) return null;
            return (
              <section key={q} className="card p-4" style={{ borderTop: `3px solid ${st.border}` }} aria-label={meta.title}>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.badge, color: st.color }}>{meta.title}</span>
                  <span className="text-[11px]" style={{ color: "var(--ink-2)" }}>{meta.sub}</span>
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  {list.map((it) => (
                    <div key={it.id} className="p-2.5 rounded-xl flex flex-wrap items-start gap-x-2.5 gap-y-2" style={{ background: "var(--bg)", border: "1px solid var(--border)", opacity: it.status === "done" ? 0.65 : 1 }}>
                      <button onClick={() => toggle(it)} role="checkbox" aria-checked={it.status === "done"} aria-label={`Mark ${it.title} ${it.status === "done" ? "open" : "done"}`}
                        className="w-5 h-5 mt-0.5 rounded-md grid place-items-center text-white shrink-0"
                        style={{ background: it.status === "done" ? "#22C55E" : "transparent", border: it.status === "done" ? "none" : "1.5px solid var(--ink-2)" }}>
                        {it.status === "done" ? <Check size={12} strokeWidth={3.5} /> : ""}
                      </button>
                      <div className="min-w-0 flex-1 basis-40">
                        <div className={`text-sm font-semibold ${it.status === "done" ? "line-through" : ""}`}>{it.title}</div>
                        {it.detail && <div className="text-xs" style={{ color: "var(--ink-2)" }}>{it.detail}</div>}
                        {it.note && <div className="text-[11px] font-bold mt-0.5" style={{ color: st.color }}>{it.note}</div>}
                        {editingId === it.id && (
                          <div className="mt-2 flex flex-col gap-1.5">
                            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Task title"
                              className="w-full px-2.5 py-1.5 rounded-lg text-sm" style={{ border: "1px solid var(--border)", background: "var(--card)" }} aria-label="Edit task title" />
                            <input value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Note (optional)"
                              className="w-full px-2.5 py-1.5 rounded-lg text-xs" style={{ border: "1px solid var(--border)", background: "var(--card)" }} aria-label="Edit task note" />
                            <div className="flex gap-1.5">
                              <button onClick={() => saveEdit(it)} className="btn-primary px-3 py-1 text-xs">Save</button>
                              <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs font-semibold rounded-lg" style={{ border: "1px solid var(--border)" }}>Cancel</button>
                            </div>
                            <p className="text-[11px]" style={{ color: "var(--ink-2)" }}>Edited tasks become yours — auto-adjust never deletes them.</p>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap basis-full sm:basis-auto">
                        {it.status === "open" && it.kind !== "custom" && (
                          <button onClick={() => startTask(it)} className="text-xs font-bold px-2.5 py-1.5 rounded-lg text-white shrink-0" style={{ background: "#7c3aed" }}>
                            {it.kind === "learn" ? "Learn" : it.kind === "preview" ? "Peek" : "Start"}
                          </button>
                        )}
                        {it.status === "open" && (
                          <button onClick={() => moveToTomorrow(it)} className="text-xs font-bold px-2.5 py-1.5 rounded-lg shrink-0" style={{ border: "1px solid var(--border)", color: "var(--ink-2)" }}>
                            Tomorrow
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (editingId === it.id) setEditingId(null);
                            else { setEditTitle(it.title); setEditNote(it.note); setEditingId(it.id); }
                          }}
                          className="p-1.5 rounded-lg shrink-0" style={{ color: "var(--ink-2)" }}
                          aria-label={`Edit ${it.title}`}
                        >
                          <Pencil size={13} />
                        </button>
                        {it.source === "custom" && (
                          <button onClick={() => remove(it)} className="shrink-0" style={{ color: "#EF4444" }} aria-label={`Delete ${it.title}`}><X size={14} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                  {list.length === 0 && <div className="text-xs py-2" style={{ color: "var(--ink-2)" }}>Zone clear.</div>}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3 mt-3">
        <div className="card p-4">
          <h3 className="font-bold text-sm">+ Add your own task</h3>
          <div className="flex gap-2 mt-2">
            <input value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addCustom(); }}
              placeholder="e.g. Revise chemistry notes" className="flex-1 px-3 py-2 rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="New task" />
            <select value={customQ} onChange={(e) => setCustomQ(e.target.value as Quadrant)} className="px-2 py-2 rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Task zone">
              {QUADRANTS.map((q) => <option key={q} value={q}>{QUADRANT_META[q].title}</option>)}
            </select>
            <button onClick={addCustom} className="btn-primary px-4 py-2 text-sm">Add</button>
          </div>
        </div>
        <div className="card p-4">
          <h3 className="font-bold text-sm">Keep for tomorrow</h3>
          <p className="text-[11px]" style={{ color: "var(--ink-2)" }}>Parked until due — the planner will pull these in automatically.</p>
          <div className="mt-2 flex flex-col gap-1.5 text-sm">
            {tomorrow.slice(0, 5).map((t, i) => (
              <div key={i} className="flex gap-2"><span className="flex-1 truncate">{t.title}</span><span className="text-xs shrink-0" style={{ color: "var(--ink-2)" }}>{t.count} cards</span></div>
            ))}
            {tomorrow.length === 0 && <span className="text-xs" style={{ color: "var(--ink-2)" }}>Nothing coming due tomorrow.</span>}
          </div>
          <button onClick={() => go("pomodoro")} className="text-xs font-bold mt-2" style={{ color: "#7C3AED" }}>Bank focus time now →</button>
        </div>
      </div>
    </div>
  );
}
