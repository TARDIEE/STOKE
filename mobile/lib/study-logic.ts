// Pure study logic ported from the STOKE web app (lib/study-store.tsx + lib/exams.ts).
// Framework-free: safe to share between Next.js and Expo.

export type Grade = "again" | "hard" | "good" | "easy";
export type ReviewStateName = "new" | "learning" | "review" | "relearning" | "mastered";

export interface Subject {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: number;
}
export interface Chapter {
  id: string;
  subjectId: string;
  name: string;
  description: string;
  notes: string;
  order: number;
  weight: number;
  createdAt: number;
}
export interface Flashcard {
  id: string;
  subjectId: string;
  chapterId: string;
  front: string;
  back: string;
  tags: string[];
  notes: string;
  createdAt: number;
}
export interface ReviewState {
  cardId: string;
  lastReviewedAt: number | null;
  nextReviewAt: number;
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
  correct: number;
  incorrect: number;
  totalReviews: number;
  state: ReviewStateName;
}
export interface ReviewLog {
  id: string;
  cardId: string;
  at: number;
  grade: Grade;
}

export interface StudySession {
  id: string;
  subjectId: string | null;
  chapterId: string | null;
  start: number;
  end: number;
  durationSec: number;
  kind: "focus" | "short" | "long";
  completed: boolean;
  label: "learn" | "reread";
}
export interface PomoSettings {
  focusMin: number;
  shortMin: number;
  longMin: number;
}

export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

export const fmtDur = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h <= 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
};

export const fmtClock = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

/** SM-2-inspired preview intervals (ms from now) for Again/Hard/Good/Easy */
export function previewIntervals(r: ReviewState): Record<Grade, number> {
  const MIN = 60_000,
    H = 3600_000,
    D = 24 * H;
  if (r.state === "new" || r.state === "learning" || r.totalReviews === 0) {
    return { again: 10 * MIN, hard: 1 * D, good: 4 * D, easy: 10 * D };
  }
  const iv = Math.max(1, r.intervalDays);
  return {
    again: 10 * MIN,
    hard: Math.max(1 * D, Math.round(iv * 1.2 * D)),
    good: Math.round((r.reps <= 1 ? 4 : iv * r.ease) * D),
    easy: Math.round((r.reps <= 1 ? 10 : iv * r.ease * 1.3) * D),
  };
}

export function previewLabel(ms: number): string {
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

/** Apply a grade and return the updated ReviewState */
export function applyGrade(r: ReviewState, grade: Grade, now: number): ReviewState {
  const D = 24 * 3600_000,
    MIN = 60_000;
  const prev = previewIntervals(r);
  let ease = r.ease;
  if (grade === "again") {
    return {
      ...r,
      lastReviewedAt: now,
      nextReviewAt: now + 10 * MIN,
      intervalDays: 0,
      lapses: r.lapses + 1,
      incorrect: r.incorrect + 1,
      totalReviews: r.totalReviews + 1,
      reps: 0,
      state: "relearning",
    };
  }
  if (grade === "hard") ease = Math.max(1.3, ease - 0.15);
  if (grade === "good") ease = Math.max(1.3, ease - 0.02);
  if (grade === "easy") ease = Math.min(2.8, ease + 0.15);
  const isNew = r.totalReviews === 0 || r.state === "new" || r.state === "learning";
  let intervalMs: number;
  if (grade === "hard") intervalMs = isNew ? 1 * D : prev.hard;
  else if (grade === "good") intervalMs = isNew ? 4 * D : prev.good;
  else intervalMs = isNew ? 10 * D : prev.easy;
  const intervalDays = Math.max(1, Math.round(intervalMs / D));
  const mastered = intervalDays >= 30 && r.reps + 1 >= 4;
  return {
    ...r,
    lastReviewedAt: now,
    nextReviewAt: now + intervalMs,
    intervalDays,
    ease,
    reps: r.reps + 1,
    correct: r.correct + 1,
    totalReviews: r.totalReviews + 1,
    state: mastered ? "mastered" : "review",
  };
}

export function newReviewState(cardId: string, now: number): ReviewState {
  return {
    cardId,
    lastReviewedAt: null,
    nextReviewAt: now,
    intervalDays: 0,
    ease: 2.5,
    reps: 0,
    lapses: 0,
    correct: 0,
    incorrect: 0,
    totalReviews: 0,
    state: "new",
  };
}
