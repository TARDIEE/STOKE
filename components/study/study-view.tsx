"use client";

import { useState } from "react";
import { fmtDur, useStudy, type Flashcard } from "@/lib/study-store";
import type { View } from "./shared";
import { CardModal } from "./modals";

export function nextLabel(ts: number) {
  const diff = ts - Date.now();
  if (diff <= 0) return "Due now";
  const h = Math.round(diff / 3600000);
  if (h < 1) return `In ${Math.max(1, Math.round(diff / 60000))} min`;
  if (h < 48) return `In ${h}h`;
  return `In ${Math.round(h / 24)}d`;
}

export default function StudyView({ subjectSel, chapterSel, setSubjectSel, setChapterSel, onReview, go, onAddCard, onAddChapter }: {
  subjectSel: string | null; chapterSel: string | null;
  setSubjectSel: (s: string | null) => void; setChapterSel: (c: string | null) => void;
  onReview: (s?: string | null, c?: string | null) => void; go: (v: View) => void;
  onAddCard: (s?: string, c?: string) => void; onAddChapter: (s: string) => void;
}) {
  const { data, pomoStart, deleteChapter } = useStudy();
  const [now] = useState(() => Date.now());
  const subj = data?.subjects.find((s) => s.id === (subjectSel ?? data.subjects[0]?.id)) ?? data?.subjects[0];
  const chapters = data?.chapters.filter((c) => c.subjectId === subj?.id) ?? [];
  const ch = chapters.find((c) => c.id === chapterSel) ?? chapters[0] ?? null;
  if (!data) return null;

  if (!subj) return <EmptyState go={go} />;

  const cards = data.cards.filter((c) => (ch ? c.chapterId === ch.id : c.subjectId === subj.id));
  const due = cards.filter((c) => (data.reviews[c.id]?.nextReviewAt ?? Infinity) <= now).length;
  const studied = data.sessions.filter((s) => (ch ? s.chapterId === ch.id : s.subjectId === subj.id));
  const studySec = studied.reduce((a, s) => a + s.durationSec, 0);
  const progress = cards.length ? Math.round((cards.filter((c) => (data.reviews[c.id]?.totalReviews ?? 0) > 0).length / cards.length) * 100) : 0;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {data.subjects.map((s) => (
          <button key={s.id} onClick={() => { setSubjectSel(s.id); setChapterSel(null); }} className={`px-3 py-1.5 rounded-full text-sm font-medium ${s.id === subj.id ? "text-white" : ""}`} style={s.id === subj.id ? { background: "#7c3aed" } : { border: "1px solid var(--border)" }}>{s.name}</button>
        ))}
      </div>
      <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
        {chapters.map((c) => (
          <button key={c.id} onClick={() => setChapterSel(c.id)} className={`px-3 py-2 rounded-xl text-sm whitespace-nowrap ${ch?.id === c.id ? "nav-active" : ""}`} style={ch?.id !== c.id ? { border: "1px solid var(--border)" } : undefined}>{c.name}</button>
        ))}
        <button onClick={() => onAddChapter(subj.id)} className="px-3 py-2 rounded-xl text-sm whitespace-nowrap" style={{ border: "1px dashed var(--border)" }}>+ Chapter</button>
      </div>

      {!ch ? (
        <div className="card p-8 mt-4 text-center text-sm" style={{ color: "var(--ink-2)" }}>No chapters yet. Add your first chapter to start learning.</div>
      ) : (
        <div className="mt-4">
          <h1 className="text-2xl font-bold">{ch.name}</h1>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>{subj.name} · {ch.description || "Chapter"}</p>
          <div className="card p-4 mt-3">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--ink-2)" }}><span>Progress {progress}%</span><span>{fmtDur(studySec)} · {cards.length} cards · {due} due</span></div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div className="h-full rounded-full progress-anim" style={{ width: `${progress}%`, background: "linear-gradient(90deg,#7C3AED,#A78BFA)" }} />
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button onClick={() => onReview(subj.id, ch.id)} className="btn-primary px-4 py-2 text-sm">Start Review ({due})</button>
              <button onClick={() => { pomoStart("focus", subj.id, ch.id, "learn"); go("pomodoro"); }} className="px-4 py-2 text-sm font-semibold rounded-xl" style={{ border: "1px solid var(--border)" }}>Start 25 min Pomodoro</button>
              <button onClick={() => onAddCard(subj.id, ch.id)} className="px-4 py-2 text-sm font-semibold rounded-xl" style={{ border: "1px solid var(--border)" }}>+ Flashcard</button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mt-3">
            {ch && <NotesEditor key={ch.id} chapterId={ch.id} initialNotes={ch.notes ?? ""} />}
            <section className="card p-4">
              <div className="flex items-center justify-between"><h3 className="font-bold">Flashcards ({cards.length})</h3>
                <button onClick={() => onAddCard(subj.id, ch.id)} className="text-xs font-bold" style={{ color: "#7C3AED" }}>+ Add</button>
              </div>
              <div className="mt-2 flex flex-col gap-2 max-h-64 overflow-auto">
                {cards.slice(0, 20).map((c) => <CardRow key={c.id} card={c} />)}
                {cards.length === 0 && <span className="text-sm" style={{ color: "var(--ink-2)" }}>No flashcards yet.</span>}
              </div>
            </section>
          </div>

          <section className="card p-4 mt-3">
            <h3 className="font-bold">Review schedule</h3>
            <div className="mt-2 flex flex-col gap-1.5 text-sm">
              {cards.slice(0, 8).map((c) => {
                const r = data.reviews[c.id];
                return (
                  <div key={c.id} className="flex gap-2 items-center">
                    <span className="truncate flex-1">{c.front}</span>
                    <span className="text-xs" style={{ color: "var(--ink-2)" }}>{r ? nextLabel(r.nextReviewAt) : ""}</span>
                  </div>
                );
              })}
              {cards.length === 0 && <span className="text-sm" style={{ color: "var(--ink-2)" }}>Scheduled spaced-repetition cards will appear here.</span>}
            </div>
            <button onClick={() => deleteChapter(ch.id)} className="mt-3 text-xs font-semibold" style={{ color: "#EF4444" }}>Delete chapter</button>
          </section>
        </div>
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

function NotesEditor({ chapterId, initialNotes }: { chapterId: string; initialNotes: string }) {
  const { updateChapter } = useStudy();
  const [editNotes, setEditNotes] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  return (
    <section className="card p-4">
      <div className="flex items-center justify-between"><h3 className="font-bold">Learn — Notes</h3>
        <button onClick={() => { if (editNotes) updateChapter(chapterId, { notes }); setEditNotes(!editNotes); }} className="text-xs font-bold" style={{ color: "#7C3AED" }}>{editNotes ? "Save" : "Edit"}</button>
      </div>
      {editNotes ? (
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} className="w-full mt-2 p-2 rounded-lg text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Chapter notes" />
      ) : (
        <p className="text-sm mt-2 whitespace-pre-wrap" style={{ color: "var(--ink-2)" }}>{initialNotes || "No notes yet. Add study material for this chapter."}</p>
      )}
    </section>
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
      <button onClick={() => setEdit(true)} className="text-xs font-bold" style={{ color: "#7C3AED" }} aria-label={`Edit ${card.front}`}>Edit</button>
      <button onClick={() => deleteCard(card.id)} className="text-xs font-bold" style={{ color: "#EF4444" }} aria-label={`Delete ${card.front}`}>✕</button>
    </div>
  );
}
