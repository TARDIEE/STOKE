"use client";

import { fmtDur, useStudy } from "@/lib/study-store";
import { Dot, Empty } from "./shared";

export default function SubjectsView({ selected, onSelect, onOpenChapter, onAddSubject, onAddChapter, onAddCard }: {
  selected: string | null; onSelect: (s: string) => void; onOpenChapter: (s: string, c: string) => void;
  onAddSubject: () => void; onAddChapter: (s: string) => void; onAddCard: (s: string, c?: string) => void;
}) {
  const { data, deleteSubject } = useStudy();
  if (!data) return null;
  const sel = data.subjects.find((s) => s.id === selected) ?? data.subjects[0];
  const chapters = sel ? data.chapters.filter((c) => c.subjectId === sel.id) : [];
  return (
    <div>
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Subjects</h1><p className="text-sm" style={{ color: "var(--ink-2)" }}>Organise chapters, cards and study time.</p></div>
        <button onClick={onAddSubject} className="btn-primary px-4 py-2 text-sm">+ Subject</button>
      </div>
      {data.subjects.length === 0 ? (
        <div className="card p-8 mt-4"><Empty title="No subjects yet." body="Create your first subject and start building your study system." action={onAddSubject} actionLabel="+ Create Subject" /></div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            {data.subjects.map((s) => {
              const chs = data.chapters.filter((c) => c.subjectId === s.id);
              const cards = data.cards.filter((c) => c.subjectId === s.id);
              const done = cards.filter((c) => (data.reviews[c.id]?.totalReviews ?? 0) > 0).length;
              const pct = cards.length ? Math.round((done / cards.length) * 100) : 0;
              return (
                <button key={s.id} onClick={() => onSelect(s.id)} className="card p-4 text-left" style={sel?.id === s.id ? { borderColor: "#7C3AED", borderWidth: 2 } : undefined}>
                  <div className="flex items-center gap-2"><Dot color={s.color} /><span className="font-bold">{s.name}</span>
                    <span className="ml-auto text-xs" style={{ color: "var(--ink-2)" }}>{chs.length} chapters</span></div>
                  <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: "var(--border)" }}>
                    <div className="h-full progress-anim" style={{ width: `${pct}%`, background: s.color }} />
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--ink-2)" }}>{pct}% complete · {cards.length} cards</div>
                </button>
              );
            })}
          </div>
          {sel && (
            <div className="card p-5 mt-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-bold text-lg">{sel.name}</h2>
                <div className="flex gap-2">
                  <button onClick={() => onAddChapter(sel.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "var(--primary-bg)", color: "#6D28D9" }}>+ Chapter</button>
                  <button onClick={() => onAddCard(sel.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "var(--primary-bg)", color: "#6D28D9" }}>+ Card</button>
                  <button onClick={() => deleteSubject(sel.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg" style={{ color: "#EF4444", border: "1px solid var(--border)" }}>Delete</button>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {chapters.map((c) => {
                  const cards = data.cards.filter((x) => x.chapterId === c.id);
                  const due = cards.filter((x) => (data.reviews[x.id]?.nextReviewAt ?? Infinity) <= Date.now()).length;
                  const done = cards.filter((x) => (data.reviews[x.id]?.totalReviews ?? 0) > 0).length;
                  const pct = cards.length ? Math.round((done / cards.length) * 100) : 0;
                  const secs = data.sessions.filter((x) => x.chapterId === c.id).reduce((a, x) => a + x.durationSec, 0);
                  return (
                    <div key={c.id} className="p-3 rounded-xl flex items-center gap-3" style={{ border: "1px solid var(--border)" }}>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm">{c.name}</div>
                        <div className="text-xs" style={{ color: "var(--ink-2)" }}>{pct}% · {fmtDur(secs)} · {cards.length} cards · {due} due</div>
                        <div className="h-1 rounded-full mt-1 overflow-hidden" style={{ background: "var(--border)" }}>
                          <div className="h-full" style={{ width: `${pct}%`, background: "#7c3aed" }} />
                        </div>
                      </div>
                      <button onClick={() => onOpenChapter(sel.id, c.id)} className="text-xs font-bold px-3 py-1.5 rounded-lg text-white shrink-0" style={{ background: "#7c3aed" }}>Study Chapter</button>
                    </div>
                  );
                })}
                {chapters.length === 0 && <span className="text-sm" style={{ color: "var(--ink-2)" }}>No chapters yet.</span>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
