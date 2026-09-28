"use client";

import { useEffect, useState } from "react";
import {
  previewIntervals, previewLabel, useDerived, useStudy,
  type Flashcard, type Grade,
} from "@/lib/study-store";
import { MiniStat } from "./shared";
import Celebrate from "./celebrate";

export default function ReviewsView({ queue, pos, setPos, setQueue, showAnswer, setShowAnswer, filter, onStartAll, onGoStudy, onReRead }: {
  queue: string[]; pos: number; setPos: (n: number) => void; setQueue: (q: string[]) => void;
  showAnswer: boolean; setShowAnswer: (b: boolean) => void; filter: string | null;
  onStartAll: () => void; onGoStudy: () => void; onReRead: (s?: string | null, c?: string | null) => void;
}) {
  const { data, gradeCard, pushToast } = useStudy();
  const d = useDerived();
  const [done, setDone] = useState(0);
  const [celebrated, setCelebrated] = useState(false);
  const card: Flashcard | undefined = queue.length && data ? data.cards.find((c) => c.id === queue[Math.min(pos, queue.length - 1)]) : undefined;
  const review = card && data ? data.reviews[card.id] : undefined;
  const finished = !card && done > 0;

  useEffect(() => {
    if (!finished) setCelebrated(false);
  }, [finished]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (!card) return;
      if (e.code === "Space" && !showAnswer) { e.preventDefault(); setShowAnswer(true); }
      if (showAnswer && ["1", "2", "3", "4"].includes(e.key)) {
        const g: Grade[] = ["again", "hard", "good", "easy"];
        answer(g[Number(e.key) - 1]);
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id, showAnswer, pos, queue]);

  const answer = (g: Grade) => {
    if (!card || !review) return;
    const iv = previewIntervals(review);
    gradeCard(card.id, g);
    setDone((x) => x + 1);
    pushToast({ title: g === "again" ? "Review again in 10 min" : `Review scheduled ${g === "hard" ? "soon" : g === "good" ? "in a few days" : "later"}`, body: `Next: ${previewLabel(iv[g])}` });
    setShowAnswer(false);
    if (g === "again") {
      // re-queue at end, not immediately (prevents instant repeat)
      const rest = queue.filter((_, i) => i !== pos);
      setQueue([...rest, card.id]);
    } else {
      const rest = queue.filter((_, i) => i !== pos);
      setQueue(rest);
      if (pos >= rest.length) setPos(0);
    }
  };

  if (!data) return null;

  // Weak spots: most-missed cards (incorrect answers), hardest first.
  const weak = data.cards
    .filter((c) => (data.reviews[c.id]?.incorrect ?? 0) > 0)
    .sort((a, b) => (data.reviews[b.id]?.incorrect ?? 0) - (data.reviews[a.id]?.incorrect ?? 0))
    .slice(0, 5);

  // 7-day review forecast from scheduled review dates.
  const t0 = d.t0;
  const forecast = Array.from({ length: 7 }, (_, i) => {
    const s = t0 + i * 86400000;
    const n = Object.values(data.reviews).filter((r) => r.nextReviewAt >= s && r.nextReviewAt < s + 86400000).length;
    return { label: new Date(s).toLocaleDateString(undefined, { weekday: "narrow" }), n };
  });
  const maxF = Math.max(1, ...forecast.map((f) => f.n));

  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold">Spaced Repetition</h1>
      <p className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>Review at the right time. Remember for longer.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <MiniStat n={d.dueToday} label="Reviews today" />
        <MiniStat n={d.dueTomorrow} label="Due tomorrow" />
        <MiniStat n={d.upcoming} label="Upcoming" />
        <MiniStat n={d.mastered} label="Mastered" />
      </div>

      {!card ? (
        <div className="card p-6 mt-4">
          {finished && !celebrated && <Celebrate title="Review session cleared!" onDone={() => setCelebrated(true)} />}
          {d.dueToday === 0 && done === 0 ? (
            <div className="py-8 text-center">
              <div className="font-semibold">You&apos;re all caught up.</div>
              <div className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>Nothing needs reviewing right now. Flashcards live in Study — this space is only for reviews.</div>
              <button onClick={onGoStudy} className="btn-primary px-4 py-2 text-sm mt-3">Go to Study</button>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="font-bold text-lg">{finished ? `${done} cards reviewed — session complete!` : `${d.dueToday} cards ready`}</div>
              <p className="text-sm" style={{ color: "var(--ink-2)" }}>
                {finished ? `Retention this session is on track. Lock it in with a re-read.` : "Press Start to begin your review session."}
              </p>
              {!finished && <button onClick={onStartAll} className="btn-primary px-6 py-2.5 text-sm mt-3">Start Review</button>}
              {finished && (
                <div className="flex justify-center gap-2 mt-3">
                  <button onClick={() => onReRead()} className="btn-primary px-5 py-2.5 text-sm">Re-read 25 min Pomodoro</button>
                  <button onClick={onGoStudy} className="px-5 py-2.5 text-sm font-semibold rounded-xl" style={{ border: "1px solid var(--border)" }}>Study</button>
                </div>
              )}
            </div>
          )}
          {done > 0 && <p className="text-center text-xs mt-2" style={{ color: "var(--ink-2)" }}>{done} graded this session · retention {d.retention}%</p>}
        </div>
      ) : (
        <div className="card p-5 md:p-8 mt-4 max-w-2xl mx-auto">
          <div className="flex items-center justify-between text-xs" style={{ color: "var(--ink-2)" }}>
            <span>Card {pos + 1} of {queue.length}{filter ? " · filtered" : ""}</span>
            <span>{done} done</span>
          </div>
          <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: "var(--border)" }}>
            <div className="h-full progress-anim" style={{ width: `${(done / Math.max(1, done + queue.length)) * 100}%`, background: "#7c3aed" }} />
          </div>
          <ReviewCard key={card.id} card={card} showAnswer={showAnswer} />
          {!showAnswer ? (
            <button onClick={() => setShowAnswer(true)} className="btn-primary w-full py-3 text-sm mt-5" autoFocus>Show Answer (Space)</button>
          ) : (
            <div>
              <div className="grid grid-cols-4 gap-2 mt-5">
                {(["again", "hard", "good", "easy"] as Grade[]).map((g, i) => {
                  const iv = review ? previewIntervals(review)[g] : 0;
                  const colors: Record<Grade, string> = { again: "#EF4444", hard: "#F59E0B", good: "#7C3AED", easy: "#22C55E" };
                  return (
                    <button key={g} onClick={() => answer(g)} className="rounded-xl py-2.5 px-1 text-sm font-bold capitalize" style={{ border: `1.5px solid ${colors[g]}`, color: colors[g] }}>
                      {g}<span className="block text-[11px] font-medium opacity-80">{i + 1} · {previewLabel(iv)}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-center mt-2" style={{ color: "var(--ink-2)" }}>Keys 1–4 to grade · Again re-queues to the end, never immediately.</p>
            </div>
          )}
        </div>
      )}

      {!card && (
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <div className="card p-4">
            <h3 className="font-bold text-sm">🎯 Weak spots</h3>
            <p className="text-[11px]" style={{ color: "var(--ink-2)" }}>Cards you miss most — extra reps fix them fastest.</p>
            <div className="mt-2 flex flex-col gap-1.5">
              {weak.map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-sm p-2 rounded-xl" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                  <span className="flex-1 truncate">{c.front}</span>
                  <span className="text-[11px] font-bold shrink-0" style={{ color: "#EF4444" }}>{data.reviews[c.id]?.incorrect} misses</span>
                  <button onClick={() => { setQueue([c.id, ...queue.filter((q) => q !== c.id)]); setPos(0); setShowAnswer(false); }} className="text-[11px] font-bold shrink-0" style={{ color: "#7C3AED" }}>Practice</button>
                </div>
              ))}
              {weak.length === 0 && <span className="text-xs" style={{ color: "var(--ink-2)" }}>No weak spots yet — miss a card and it lands here.</span>}
            </div>
          </div>
          <div className="card p-4">
            <h3 className="font-bold text-sm">📅 Coming up — next 7 days</h3>
            <div className="flex items-end gap-2 h-24 mt-3" role="img" aria-label="Review forecast">
              {forecast.map((f, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-lg" style={{ height: `${Math.max(4, (f.n / maxF) * 80)}px`, background: i === 0 ? "#7C3AED" : "#A78BFA" }} title={`${f.n} due`} />
                  <span className="text-[10px]" style={{ color: "var(--ink-2)" }}>{f.label}</span>
                </div>
              ))}
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--ink-2)" }}>Reviews land automatically via spaced repetition.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewCard({ card, showAnswer }: { card: Flashcard; showAnswer: boolean }) {
  const { data } = useStudy();
  if (!data) return null;
  const subj = data.subjects.find((s) => s.id === card.subjectId);
  return (
    <div className="mt-5">
      <div className="flex gap-1.5 flex-wrap">
        {subj && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--primary-bg)", color: "#6D28D9" }}>{subj.name}</span>}
        {card.tags.map((t) => <span key={t} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--ink-2)" }}>{t}</span>)}
      </div>
      <div className="flip-scene mt-3">
        <div className={`flip-inner ${showAnswer ? "flipped" : ""} card p-6 md:p-8 min-h-44 grid place-items-center text-center`} style={{ boxShadow: "none" }}>
          {!showAnswer ? (
            <div className="flip-face"><div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-2)" }}>Question</div>
              <div className="text-lg md:text-xl font-semibold mt-2">{card.front}</div></div>
          ) : (
            <div className="flip-face flip-back absolute inset-0 p-6 md:p-8 grid place-items-center">
              <div><div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-2)" }}>Answer</div>
                <div className="text-base md:text-lg mt-2">{card.back}</div>
                {card.notes && <div className="text-xs mt-2" style={{ color: "var(--ink-2)" }}>{card.notes}</div>}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
