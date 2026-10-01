"use client";

import { useMemo, useState } from "react";
import { BookOpen, Check, FlaskConical, History, Link2 } from "lucide-react";
import { Modal } from "./shared";
import { useStudy } from "@/lib/study-store";
import { genericGuide, getTopicGuide, parseItemTitle, pyqLinks, researchLinks } from "@/lib/topic-guides";
/**
 * Subtopic detail: what to learn today, which question types prove mastery,
 * where to practice (PYQ archives) and research — then a mastery gate:
 * the task can only be marked done once every checklist is ticked and the
 * student confirms they can solve these types independently.
 */
export default function TopicGuideModal({ title, initialLearned, initialSolved, onProgress, onMastered, onDefer, close }: {
  title: string;
  initialLearned: number[];
  initialSolved: number[];
  onProgress: (learned: number[], solved: number[]) => void;
  onMastered: () => void;
  onDefer?: () => void;
  close: () => void;
}) {
  const parsed = useMemo(() => parseItemTitle(title), [title]);
  const { data } = useStudy();
  const examId = data?.user.examId ?? "";
  const guide = useMemo(
    () => getTopicGuide(parsed.chapter, parsed.topic) ?? genericGuide(parsed.chapter, parsed.topic),
    [parsed]
  );
  // Practice + research links always follow the student's own exam, so a CEE
  // student gets CEE-suffixed videos and never IOE/JEE links, and vice versa.
  const pyq = useMemo(
    () => pyqLinks(parsed.topic ?? parsed.chapter, examId),
    [parsed, examId]
  );
  const research = useMemo(
    () => researchLinks(parsed.topic ?? parsed.chapter, parsed.subject, examId),
    [parsed, examId]
  );
  // Checklist progress is server-saved per subtopic: ticks from yesterday
  // are already on, so only unticked work carries forward.
  const [learned, setLearned] = useState<Set<number>>(new Set(initialLearned));
  const [solved, setSolved] = useState<Set<number>>(new Set(initialSolved));

  const flip = (which: "learned" | "solved", i: number) => {
    if (which === "learned") {
      const next = new Set(learned);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      setLearned(next);
      onProgress([...next], [...solved]);
    } else {
      const next = new Set(solved);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      setSolved(next);
      onProgress([...learned], [...next]);
    }
  };

  const resetChecks = () => {
    setLearned(new Set());
    setSolved(new Set());
    onProgress([], []);
  };

  const ready = learned.size === guide.whatToLearn.length && solved.size === guide.questionTypes.length;

  return (
    <Modal close={close} label={`Study guide: ${parsed.topic ?? parsed.chapter}`}>
      <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#7C3AED" }}>
        {parsed.subject}{parsed.chapter ? ` · ${parsed.chapter}` : ""}
      </div>
      <h3 className="font-bold text-lg mt-0.5">{parsed.topic ?? parsed.chapter}</h3>

      <div className="mt-3">
        <div className="text-xs font-bold flex items-center gap-1.5">
          <BookOpen size={13} /> What to learn today ({learned.size}/{guide.whatToLearn.length})
        </div>
        <div className="mt-1.5 flex flex-col gap-1.5">
          {guide.whatToLearn.map((w, i) => (
            <button
              key={i}
              onClick={() => flip("learned", i)}
              role="checkbox"
              aria-checked={learned.has(i)}
              className="text-left text-sm p-2 rounded-lg flex items-start gap-2"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", opacity: learned.has(i) ? 0.75 : 1 }}
            >
              <span
                className="w-4 h-4 mt-0.5 rounded grid place-items-center text-white shrink-0"
                style={{ background: learned.has(i) ? "#22C55E" : "transparent", border: learned.has(i) ? "none" : "1.5px solid var(--ink-2)" }}
              >
                {learned.has(i) ? <Check size={10} strokeWidth={3.5} /> : ""}
              </span>
              <span className={learned.has(i) ? "line-through" : ""}>{w}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-xs font-bold flex items-center gap-1.5">
          <FlaskConical size={13} /> Question types to master ({solved.size}/{guide.questionTypes.length})
        </div>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-2)" }}>
          Only move ahead once you can solve each of these on your own.
        </p>
        <div className="mt-1.5 flex flex-col gap-1.5">
          {guide.questionTypes.map((q, i) => (
            <button
              key={i}
              onClick={() => flip("solved", i)}
              role="checkbox"
              aria-checked={solved.has(i)}
              className="text-left text-sm p-2 rounded-lg flex items-start gap-2"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", opacity: solved.has(i) ? 0.75 : 1 }}
            >
              <span
                className="w-4 h-4 mt-0.5 rounded grid place-items-center text-white shrink-0"
                style={{ background: solved.has(i) ? "#7C3AED" : "transparent", border: solved.has(i) ? "none" : "1.5px solid var(--ink-2)" }}
              >
                {solved.has(i) ? <Check size={10} strokeWidth={3.5} /> : ""}
              </span>
              <span className={solved.has(i) ? "line-through" : ""}>{q}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-xs font-bold flex items-center gap-1.5">
          <History size={13} /> Practice & previous-year questions
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {pyq.map((l) => (
            <a key={l.url + l.label} href={l.url} target="_blank" rel="noreferrer" className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: "var(--primary-bg)", color: "#6D28D9" }}>
              {l.label} ↗
            </a>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-xs font-bold flex items-center gap-1.5">
          <Link2 size={13} /> Research this topic
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {research.map((l) => (
            <a key={l.url + l.label} href={l.url} target="_blank" rel="noreferrer" className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ border: "1px solid var(--border)", color: "var(--ink)" }}>
              {l.label} ↗
            </a>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        {onDefer && (
          <button onClick={onDefer} className="flex-1 py-2.5 text-sm font-semibold rounded-xl" style={{ border: "1px solid var(--border)" }}>
            Continue tomorrow
          </button>
        )}
        <button
          onClick={onMastered}
          disabled={!ready}
          className="flex-1 py-2.5 text-sm font-bold rounded-xl text-white disabled:opacity-40"
          style={{ background: "#7c3aed" }}
          title={ready ? "Mark this concept mastered" : "Tick every checklist first"}
        >
          {ready ? "Mastered — move ahead ✓" : `Mastered (${learned.size + solved.size}/${guide.whatToLearn.length + guide.questionTypes.length})`}
        </button>
      </div>
      {(learned.size > 0 || solved.size > 0) && (
        <button
          onClick={() => {
            setLearned(new Set());
            setSolved(new Set());
            onProgress([], []);
          }}
          className="w-full text-center text-[11px] font-semibold mt-2"
          style={{ color: "var(--ink-2)" }}
        >
          Reset checks — start this concept over
        </button>
      )}
    </Modal>
  );
}
