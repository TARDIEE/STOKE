"use client";

import { useState } from "react";
import { BookOpen, Shapes, X } from "lucide-react";
import { fmtDur, useStudy, type Flashcard } from "@/lib/study-store";
import type { View } from "./shared";
import { CardModal } from "./modals";
import SubjectsView from "./subjects-view";

export function nextLabel(ts: number) {
  const diff = ts - Date.now();
  if (diff <= 0) return "Due now";
  const h = Math.round(diff / 3600000);
  if (h < 1) return `In ${Math.max(1, Math.round(diff / 60000))} min`;
  if (h < 48) return `In ${h}h`;
  return `In ${Math.round(h / 24)}d`;
}

export default function StudyView({ subjectSel, chapterSel, setSubjectSel, setChapterSel, onReview, go, onOpenChapter, onAddSubject, onAddCard, onAddChapter }: {
  subjectSel: string | null; chapterSel: string | null;
  setSubjectSel: (s: string | null) => void; setChapterSel: (c: string | null) => void;
  onReview: (s?: string | null, c?: string | null) => void; go: (v: View) => void;
  onOpenChapter: (sid: string, cid: string) => void;
  onAddSubject: () => void;
  onAddCard: (s?: string, c?: string) => void; onAddChapter: (s: string) => void;
}) {
  const { data, pomoStart, updateChapter, deleteChapter } = useStudy();
  const [editNotes, setEditNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [notesFor, setNotesFor] = useState<string | null>(null);
  const [mode, setMode] = useState<"learn" | "manage">("learn");
  if (!data) return null;
  const subj = data.subjects.find((s) => s.id === (subjectSel ?? data.subjects[0]?.id)) ?? data.subjects[0];
  const chapters = data.chapters.filter((c) => c.subjectId === subj?.id);
  const ch = chapters.find((c) => c.id === chapterSel) ?? chapters[0] ?? null;
  if (ch && notesFor !== ch.id) { setNotesFor(ch.id); setNotes(ch.notes ?? ""); setEditNotes(false); }

  if (!subj) return <EmptyState go={go} />;

  const cards = data.cards.filter((c) => (ch ? c.chapterId === ch.id : c.subjectId === subj.id));
  const now = Date.now();
  const due = cards.filter((c) => (data.reviews[c.id]?.nextReviewAt ?? Infinity) <= now).length;
  const studied = data.sessions.filter((s) => (ch ? s.chapterId === ch.id : s.subjectId === subj.id));
  const studySec = studied.reduce((a, s) => a + s.durationSec, 0);
  const progress = cards.length ? Math.round((cards.filter((c) => (data.reviews[c.id]?.totalReviews ?? 0) > 0).length / cards.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="inline-flex p-1 rounded-full" style={{ background: "var(--card)", border: "1px solid var(--border)" }} role="tablist" aria-label="Study or manage">
        <button
          role="tab" aria-selected={mode === "learn"} onClick={() => setMode("learn")}
          className={`px-4 py-1.5 rounded-full text-sm font-bold inline-flex items-center gap-1.5 ${mode === "learn" ? "text-white" : ""}`}
          style={mode === "learn" ? { background: "#7c3aed" } : { color: "var(--ink-2)" }}
        >
          <BookOpen size={14} /> Study
        </button>
        <button
          role="tab" aria-selected={mode === "manage"} onClick={() => setMode("manage")}
          className={`px-4 py-1.5 rounded-full text-sm font-bold inline-flex items-center gap-1.5 ${mode === "manage" ? "text-white" : ""}`}
          style={mode === "manage" ? { background: "#7c3aed" } : { color: "var(--ink-2)" }}
        >
          <Shapes size={14} /> Manage
        </button>
      </div>
      {mode === "manage" ? (
        <SubjectsView
          selected={subjectSel}
          onSelect={(id) => { setSubjectSel(id); setChapterSel(null); }}
          onOpenChapter={onOpenChapter}
          onAddSubject={onAddSubject}
          onAddChapter={onAddChapter}
          onAddCard={onAddCard}
        />
      ) : (
      <>
      <div className="flex flex-wrap gap-2.5 pb-2 border-b border-border/40">
        {data.subjects.map((s) => (
          <button key={s.id} onClick={() => { setSubjectSel(s.id); setChapterSel(null); }} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-2xs ${s.id === subj.id ? "text-white shadow-md scale-102" : "hover:bg-secondary/80"}`} style={s.id === subj.id ? { background: "#7c3aed" } : { border: "1px solid var(--border)", color: "var(--ink)" }}>{s.name}</button>
        ))}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {chapters.map((c) => (
          <button key={c.id} onClick={() => setChapterSel(c.id)} className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all shadow-2xs ${ch?.id === c.id ? "bg-purple-500 text-white shadow-sm" : "hover:bg-secondary/60"}`} style={ch?.id !== c.id ? { border: "1px solid var(--border)", color: "var(--ink)" } : { background: "#7c3aed" }}>{c.name}</button>
        ))}
        <button onClick={() => onAddChapter(subj.id)} className="px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors hover:bg-purple-500/10" style={{ border: "1px dashed var(--border)", color: "#7c3aed" }}>+ Chapter</button>
      </div>

      {!ch ? (
        <div className="card p-12 text-center text-sm shadow-sm" style={{ color: "var(--ink-2)" }}>No chapters yet. Add your first chapter to start learning.</div>
      ) : (
        <div className="space-y-4">
          <div className="card p-6 shadow-sm bg-gradient-to-br from-card to-card/50">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{ch.name}</h1>
                <p className="text-sm mt-1 font-medium" style={{ color: "var(--ink-2)" }}>{subj.name} · {ch.description || "Chapter Overview"}</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                {progress}% Mastered
              </span>
            </div>

            <div className="mt-5 space-y-2">
              <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs font-semibold" style={{ color: "var(--ink-2)" }}>
                <span>Progress</span>
                <span>{fmtDur(studySec)} studied · {cards.length} cards · <b className="text-purple-600 dark:text-purple-400">{due} due</b></span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden bg-secondary shadow-inner" style={{ background: "var(--border)" }}>
                <div className="h-full rounded-full progress-anim transition-all duration-500" style={{ width: `${progress}%`, background: "linear-gradient(90deg,#7C3AED,#A78BFA)" }} />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 mt-6">
              <button onClick={() => onReview(subj.id, ch.id)} className="w-full sm:w-auto btn-primary px-5 py-3 text-sm font-bold shadow-md inline-flex items-center justify-center gap-2 active:scale-95">
                🚀 Start Review ({due})
              </button>
              <button onClick={() => { pomoStart("focus", subj.id, ch.id, "learn"); go("pomodoro"); }} className="w-full sm:w-auto px-5 py-3 text-sm font-bold rounded-xl transition-colors hover:bg-secondary/80 shadow-2xs inline-flex items-center justify-center" style={{ border: "1px solid var(--border)" }}>
                ⏱️ Start 25m Pomodoro
              </button>
              <button onClick={() => onAddCard(subj.id, ch.id)} className="w-full sm:w-auto px-5 py-3 text-sm font-bold rounded-xl transition-colors hover:bg-secondary/80 shadow-2xs inline-flex items-center justify-center" style={{ border: "1px solid var(--border)" }}>
                ➕ Add Flashcard
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <section className="card p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-extrabold text-base flex items-center gap-2"><span>📖</span> Learn & Notes</h3>
                  <button onClick={() => { if (editNotes) updateChapter(ch.id, { notes }); setEditNotes(!editNotes); }} className="text-xs font-bold px-3 py-1 rounded-lg transition-colors hover:bg-purple-500/10" style={{ color: "#7C3AED" }}>
                    {editNotes ? "Save Notes" : "Edit Notes"}
                  </button>
                </div>
                {editNotes ? (
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={7} className="w-full p-3 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500 shadow-inner" style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--ink)" }} aria-label="Chapter notes" />
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words p-3 rounded-xl" style={{ color: "var(--ink-2)", background: "var(--bg)", border: "1px solid var(--border)" }}>{ch.notes || "No notes yet. Click 'Edit Notes' to add study material for this chapter."}</p>
                )}
              </div>
            </section>

            <section className="card p-5 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-extrabold text-base flex items-center gap-2"><span>📇</span> Flashcards ({cards.length})</h3>
                <button onClick={() => onAddCard(subj.id, ch.id)} className="text-xs font-bold px-3 py-1 rounded-lg transition-colors hover:bg-purple-500/10" style={{ color: "#7C3AED" }}>+ Add Card</button>
              </div>
              <div className="flex flex-col gap-2.5 max-h-72 overflow-auto pr-1">
                {cards.slice(0, 20).map((c) => <CardRow key={c.id} card={c} />)}
                {cards.length === 0 && (
                  <div className="py-8 text-center text-sm" style={{ color: "var(--ink-2)" }}>No flashcards yet. Create your first card to begin spaced repetition!</div>
                )}
              </div>
            </section>
          </div>

          <section className="card p-5 shadow-sm">
            <h3 className="font-extrabold text-base mb-3 flex items-center gap-2"><span>📅</span> Review Schedule</h3>
            <div className="flex flex-col gap-2 text-sm">
              {cards.slice(0, 8).map((c) => {
                const r = data.reviews[c.id];
                return (
                  <div key={c.id} className="flex gap-3 items-center p-2.5 rounded-xl transition-colors hover:bg-secondary/30" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                    <span className="font-medium truncate flex-1 min-w-0">{c.front}</span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md shrink-0" style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--ink-2)" }}>{r ? nextLabel(r.nextReviewAt) : "New"}</span>
                  </div>
                );
              })}
              {cards.length === 0 && <span className="text-sm italic py-2 text-center" style={{ color: "var(--ink-2)" }}>Scheduled spaced-repetition cards will appear here.</span>}
            </div>
            <div className="mt-4 pt-3 border-t border-border/40 flex justify-end">
              <button onClick={() => deleteChapter(ch.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors hover:bg-red-500/10" style={{ color: "#EF4444" }}>Delete Chapter</button>
            </div>
          </section>
        </div>
      )}
      </>
      )}
    </div>
  );
}

function EmptyState({ go }: { go: (v: View) => void }) {
  return (
    <div className="card p-8 mt-4 text-center">
      <div className="font-semibold">No subjects yet.</div>
      <div className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>Create your first subject and start building your study system.</div>
      <button onClick={() => go("subjects")} className="btn-primary px-4 py-2 text-sm mt-3">+ Create Subject</button>
    </div>
  );
}

function CardRow({ card }: { card: Flashcard }) {
  const { data, deleteCard } = useStudy();
  const [edit, setEdit] = useState(false);
  if (edit) return <CardModal editId={card.id} close={() => setEdit(false)} inline />;
  if (!data) return null;
  const r = data.reviews[card.id];
  return (
    <div className="p-2.5 rounded-xl text-sm flex gap-2 items-start" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{card.front}</div>
        <div className="text-xs truncate" style={{ color: "var(--ink-2)" }}>{card.back} {r ? `· ${nextLabel(r.nextReviewAt)}` : ""}</div>
      </div>
      <button onClick={() => setEdit(true)} className="text-xs font-bold shrink-0" style={{ color: "#7C3AED" }} aria-label={`Edit ${card.front}`}>Edit</button>
      <button onClick={() => deleteCard(card.id)} className="shrink-0" style={{ color: "#EF4444" }} aria-label={`Delete ${card.front}`}><X size={14} /></button>
    </div>
  );
}
