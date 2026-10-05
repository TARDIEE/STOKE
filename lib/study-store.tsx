"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
  /** learn = new material, reread = 25-min revision of already-read material */
  label: "learn" | "reread";
}
export interface PomoSettings {
  focusMin: number;
  shortMin: number;
  longMin: number;
  sessionsBeforeLong: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  sound: boolean;
  vibration: boolean;
  notifications: boolean;
}
export interface UserState {
  id: string;
  name: string;
  email: string;
  onboarded: boolean;
  focusPreset: string;
  reminders: boolean;
  morning: string;
  evening: string;
  frequency: "daily" | "twice" | "custom";
  theme: "light" | "dark" | "system";
  examId: string;
  examName: string;
  examDate: number;
  /** daily focus goal in minutes */
  focusGoal: number;
  /** country id (see COUNTRIES) — decides which exams are offered */
  country: string;
  hasAiKey: boolean;
  streakMinSessions: number;
}

export type PomoMode = "focus" | "short" | "long";

interface Persisted {
  user: UserState;
  subjects: Subject[];
  chapters: Chapter[];
  cards: Flashcard[];
  reviews: Record<string, ReviewState>;
  logs: ReviewLog[];
  sessions: StudySession[];
  pomo: PomoSettings;
}

const POMO_KEY = "stokestudy.pomo";

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
  const MIN = 60_000, H = 3600_000, D = 24 * H;
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
  const D = 24 * 3600_000, MIN = 60_000;
  const prev = previewIntervals(r);
  let ease = r.ease;
  if (grade === "again") {
    return {
      ...r, lastReviewedAt: now, nextReviewAt: now + 10 * MIN,
      intervalDays: 0, lapses: r.lapses + 1, incorrect: r.incorrect + 1,
      totalReviews: r.totalReviews + 1, reps: 0, state: "relearning",
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
    ...r, lastReviewedAt: now, nextReviewAt: now + intervalMs,
    intervalDays, ease, reps: r.reps + 1, correct: r.correct + 1,
    totalReviews: r.totalReviews + 1,
    state: mastered ? "mastered" : "review",
  };
}

async function api(path: string, init?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new Error("Can't reach the server. Check your connection and reload.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status}).`);
  return body;
}

interface Toast { id: string; title: string; body?: string; }

interface StudyCtx {
  data: Persisted | null;
  authChecked: boolean;
  authError: string | null;
  bootError: string | null;
  refresh: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
  toasts: Toast[];
  pushToast: (t: Omit<Toast, "id">) => void;
  updateUser: (u: Partial<UserState>) => void;
  setOnboarded: () => void;
  addSubject: (name: string, description: string, color: string) => void;
  updateSubject: (id: string, p: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  addChapter: (subjectId: string, name: string, description: string, notes: string) => void;
  updateChapter: (id: string, p: Partial<Chapter>) => void;
  deleteChapter: (id: string) => void;
  addCard: (c: Omit<Flashcard, "id" | "createdAt">) => void;
  addCards: (list: Omit<Flashcard, "id" | "createdAt">[]) => void;
  updateCard: (id: string, p: Partial<Flashcard>) => void;
  deleteCard: (id: string) => void;
  gradeCard: (cardId: string, grade: Grade) => void;
  logSession: (s: Omit<StudySession, "id">) => void;
  updatePomo: (p: Partial<PomoSettings>) => void;
  resetAll: () => void;
  exportData: () => void;
  // pomodoro runtime
  pomoMode: PomoMode;
  pomoRunning: boolean;
  pomoRemaining: number;
  pomoTotal: number;
  pomoCycle: number;
  pomoSubjectId: string | null;
  pomoChapterId: string | null;
  pomoLabel: "learn" | "reread";
  setPomoLabel: (l: "learn" | "reread") => void;
  pomoStart: (mode?: PomoMode, subjectId?: string | null, chapterId?: string | null, label?: "learn" | "reread") => void;
  pomoPause: () => void;
  pomoResume: () => void;
  pomoReset: () => void;
  pomoSkip: () => void;
  setPomoContext: (s: string | null, c: string | null) => void;
}

const Ctx = createContext<StudyCtx | null>(null);

export function useStudy() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStudy outside provider");
  return v;
}

export function playChime() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f;
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g); g.connect(ctx.destination);
      o.start(t); o.stop(t + 0.55);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch { /* no audio */ }
}

export function notify(title: string, body: string, enabled: boolean) {
  if (!enabled) return;
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  } catch { /* ignore */ }
}

export function StudyProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Persisted | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  // pomo runtime
  const [pomoMode, setPomoMode] = useState<PomoMode>("focus");
  const [pomoRunning, setPomoRunning] = useState(false);
  const [targetEnd, setTargetEnd] = useState<number | null>(null);
  const [pomoRemaining, setPomoRemaining] = useState(25 * 60);
  const [pomoTotal, setPomoTotal] = useState(25 * 60);
  const [pomoCycle, setPomoCycle] = useState(1);
  const [pomoSubjectId, setPomoSubjectId] = useState<string | null>(null);
  const [pomoChapterId, setPomoChapterId] = useState<string | null>(null);
  const [pomoLabel, setPomoLabel] = useState<"learn" | "reread">("learn");
  const dataRef = useRef<Persisted | null>(null);
  dataRef.current = data;
  const completingRef = useRef(false);

  const pushToast = useCallback((t: Omit<Toast, "id">) => {
    const id = uid();
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4200);
  }, []);

  const fail = useCallback((err: unknown) => {
    const msg = err instanceof Error ? err.message : "Couldn't reach the server.";
    if (msg === "Not signed in.") setData(null);
    else pushToast({ title: "Couldn't save", body: msg });
  }, [pushToast]);

  const bootstrap = useCallback(async () => {
    const body = await api("/api/bootstrap");
    setData(body as Persisted);
    setAuthError(null);
    return body as Persisted;
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Retry transient failures (cold starts, hiccups) — but a 401 means
    // genuinely signed out, so stop immediately and show the login screen.
    (async () => {
      let lastErr: unknown = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await bootstrap();
          if (!cancelled) setBootError(null);
          return;
        } catch (e) {
          lastErr = e;
          if (e instanceof Error && e.message === "Not signed in.") break;
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        }
      }
      if (!cancelled) {
        if (lastErr instanceof Error && lastErr.message !== "Not signed in.") {
          setBootError(lastErr.message);
        }
        setData(null);
      }
    })().finally(() => {
      if (!cancelled) setAuthChecked(true);
    });
    try {
      const raw = localStorage.getItem(POMO_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && p.targetEnd && p.running) {
          setPomoMode(p.mode || "focus");
          setTargetEnd(p.targetEnd);
          setPomoTotal(p.total || 25 * 60);
          setPomoCycle(p.cycle || 1);
          setPomoSubjectId(p.subjectId ?? null);
          setPomoChapterId(p.chapterId ?? null);
          setPomoRunning(true);
        }
      }
    } catch { /* ignore */ }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (data) {
      try {
        const th = data.user.theme;
        const resolved = th === "system"
          ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
          : th;
        document.documentElement.dataset.theme = resolved;
        localStorage.setItem("stoke-theme", resolved);
      } catch { /* ignore */ }
    }
  }, [data]);

  // persist pomo runtime (timestamp-based, survives navigation/reload)
  useEffect(() => {
    try {
      localStorage.setItem(POMO_KEY, JSON.stringify({
        mode: pomoMode, running: pomoRunning, targetEnd, total: pomoTotal,
        cycle: pomoCycle, subjectId: pomoSubjectId, chapterId: pomoChapterId,
      }));
    } catch { /* ignore */ }
  }, [pomoMode, pomoRunning, targetEnd, pomoTotal, pomoCycle, pomoSubjectId, pomoChapterId]);

  // tick: remaining = targetEnd - now (drift-proof)
  useEffect(() => {
    if (!pomoRunning || !targetEnd) return;
    const iv = setInterval(() => {
      const rem = Math.max(0, Math.round((targetEnd - Date.now()) / 1000));
      setPomoRemaining(rem);
      if (rem <= 0 && !completingRef.current) {
        completingRef.current = true;
        handleComplete();
      }
    }, 250);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomoRunning, targetEnd, pomoMode]);

  // Apply saved pomo lengths to a fresh timer after bootstrap/login.
  // (pomoTotal initializes to 25:00 and previously ignored stored settings
  // until the user edited them, so custom times "didn't apply" on load.)
  useEffect(() => {
    if (pomoRunning || targetEnd || !data) return;
    const total = modeSecs(pomoMode, data);
    setPomoTotal((t) => (t === total ? t : total));
    setPomoRemaining((r) => (r === total ? r : total));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, pomoMode, pomoRunning, targetEnd]);

  const modeSecs = useCallback((m: PomoMode, d: Persisted | null) => {
    if (!d) return 25 * 60;
    if (m === "focus") return d.pomo.focusMin * 60;
    if (m === "short") return d.pomo.shortMin * 60;
    return d.pomo.longMin * 60;
  }, []);

  const persistSession = useCallback((s: StudySession) => {
    api("/api/sessions", {
      method: "POST",
      body: JSON.stringify({
        id: s.id, subjectId: s.subjectId, chapterId: s.chapterId,
        start: s.start, end: s.end, durationSec: s.durationSec,
        kind: s.kind, completed: s.completed, label: s.label,
      }),
    }).catch(fail);
  }, [fail]);

  const handleComplete = useCallback(() => {
    const d = dataRef.current;
    if (!d) { completingRef.current = false; return; }
    const finishedMode = pomoMode;
    if (d.pomo.sound) playChime();
    if (d.pomo.vibration && "vibrate" in navigator) {
      try { navigator.vibrate(200); } catch { /* ignore */ }
    }
    if (finishedMode === "focus") {
      const dur = pomoTotal;
      const now = Date.now();
      const sess: StudySession = {
        id: uid(), subjectId: pomoSubjectId, chapterId: pomoChapterId,
        start: now - dur * 1000, end: now, durationSec: dur, kind: "focus", completed: true,
        label: pomoLabel,
      };
      setData((prev) => prev ? { ...prev, sessions: [sess, ...prev.sessions] } : prev);
      persistSession(sess);
      pushToast({ title: "Focus session complete", body: `Take a ${d.pomo.shortMin}-minute break.` });
      notify("Focus session complete", `Take a ${d.pomo.shortMin}-minute break.`, d.pomo.notifications);
      const atLong = pomoCycle % d.pomo.sessionsBeforeLong === 0;
      const next: PomoMode = atLong ? "long" : "short";
      const total = modeSecs(next, d);
      setPomoMode(next);
      setPomoTotal(total);
      if (d.pomo.autoStartBreaks) {
        const end = Date.now() + total * 1000;
        setTargetEnd(end); setPomoRemaining(total); setPomoRunning(true);
      } else {
        setPomoRunning(false); setTargetEnd(null); setPomoRemaining(total);
      }
      if (atLong) setPomoCycle(1);
      else setPomoCycle((c) => c + 1);
    } else {
      pushToast({ title: "Break over", body: "Ready for your next focus session?" });
      notify("Break over", "Ready for your next focus session?", d.pomo.notifications);
      setPomoMode("focus");
      const total = modeSecs("focus", d);
      setPomoTotal(total);
      if (d.pomo.autoStartFocus) {
        const end = Date.now() + total * 1000;
        setTargetEnd(end); setPomoRemaining(total); setPomoRunning(true);
      } else {
        setPomoRunning(false); setTargetEnd(null); setPomoRemaining(total);
      }
    }
    setTimeout(() => { completingRef.current = false; }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomoMode, pomoTotal, pomoCycle, pomoSubjectId, pomoChapterId, pomoLabel, modeSecs, pushToast, persistSession]);

  const pomoStart = useCallback((mode?: PomoMode, s?: string | null, c?: string | null, label?: "learn" | "reread") => {
    const d = dataRef.current; if (!d) return;
    const m = mode || pomoMode;
    const total = modeSecs(m, d);
    if (typeof s !== "undefined") setPomoSubjectId(s);
    if (typeof c !== "undefined") setPomoChapterId(c);
    if (label) setPomoLabel(label);
    setPomoMode(m); setPomoTotal(total); setPomoRemaining(total);
    setTargetEnd(Date.now() + total * 1000);
    setPomoRunning(true);
  }, [pomoMode, modeSecs]);

  const value: StudyCtx = useMemo(() => ({
    data, authChecked, authError, bootError,
    clearAuthError: () => setAuthError(null),
    refresh: async () => {
      setBootError(null);
      try {
        await bootstrap();
      } catch (e) {
        if (e instanceof Error && e.message !== "Not signed in.") setBootError(e.message);
        throw e;
      }
    },
    register: async (name, email, password) => {
      setAuthError(null);
      try {
        await api("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
        await bootstrap();
      } catch (e) {
        setAuthError(e instanceof Error ? e.message : "Registration failed.");
        throw e;
      }
    },
    login: async (email, password) => {
      setAuthError(null);
      try {
        await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
        await bootstrap();
      } catch (e) {
        setAuthError(e instanceof Error ? e.message : "Login failed.");
        throw e;
      }
    },
    logout: async () => {
      try { await api("/api/auth/session", { method: "DELETE" }); } catch { /* ignore */ }
      // Clear any stale server error, otherwise the error card re-renders
      // instead of the sign-in form and "Back to sign in" looks broken.
      setBootError(null);
      setData(null);
    },
    toasts, pushToast,
    updateUser: (u) => {
      setData((p) => (p ? { ...p, user: { ...p.user, ...u } } : p));
      api("/api/settings", { method: "PATCH", body: JSON.stringify({ user: u }) }).catch(fail);
    },
    setOnboarded: () => {
      setData((p) => (p ? { ...p, user: { ...p.user, onboarded: true } } : p));
      api("/api/settings", { method: "PATCH", body: JSON.stringify({ user: { onboarded: true } }) }).catch(fail);
    },
    addSubject: (name, description, color) => {
      const sub = { id: uid(), name, description, color, createdAt: Date.now() };
      setData((p) => (p ? { ...p, subjects: [...p.subjects, sub] } : p));
      api("/api/subjects", { method: "POST", body: JSON.stringify(sub) }).catch(fail);
    },
    updateSubject: (id, patch) => {
      setData((p) => (p ? { ...p, subjects: p.subjects.map((s) => (s.id === id ? { ...s, ...patch } : s)) } : p));
      api(`/api/subjects/${id}`, { method: "PATCH", body: JSON.stringify(patch) }).catch(fail);
    },
    deleteSubject: (id) => {
      setData((p) => (p ? {
        ...p,
        subjects: p.subjects.filter((s) => s.id !== id),
        chapters: p.chapters.filter((c) => c.subjectId !== id),
        cards: p.cards.filter((c) => c.subjectId !== id),
      } : p));
      api(`/api/subjects/${id}`, { method: "DELETE" }).catch(fail);
    },
    addChapter: (subjectId, name, description, notes) => {
      setData((p) => {
        if (!p) return p;
        const ch = { id: uid(), subjectId, name, description, notes, order: p.chapters.filter((c) => c.subjectId === subjectId).length, weight: 3, createdAt: Date.now() };
        api("/api/chapters", { method: "POST", body: JSON.stringify(ch) }).catch(fail);
        return { ...p, chapters: [...p.chapters, ch] };
      });
    },
    updateChapter: (id, patch) => {
      setData((p) => (p ? { ...p, chapters: p.chapters.map((c) => (c.id === id ? { ...c, ...patch } : c)) } : p));
      api(`/api/chapters/${id}`, { method: "PATCH", body: JSON.stringify(patch) }).catch(fail);
    },
    deleteChapter: (id) => {
      setData((p) => (p ? {
        ...p, chapters: p.chapters.filter((c) => c.id !== id),
        cards: p.cards.filter((c) => c.chapterId !== id),
      } : p));
      api(`/api/chapters/${id}`, { method: "DELETE" }).catch(fail);
    },
    addCard: (c) => {
      const id = uid();
      const card: Flashcard = { ...c, id, createdAt: Date.now() };
      setData((p) => {
        if (!p) return p;
        return {
          ...p, cards: [card, ...p.cards],
          reviews: { ...p.reviews, [id]: { cardId: id, lastReviewedAt: null, nextReviewAt: Date.now(), intervalDays: 0, ease: 2.5, reps: 0, lapses: 0, correct: 0, incorrect: 0, totalReviews: 0, state: "new" } },
        };
      });
      api("/api/cards", { method: "POST", body: JSON.stringify(card) }).catch(fail);
    },
    addCards: (list) => {
      const now = Date.now();
      const cards: Flashcard[] = list.slice(0, 20).map((c) => ({ ...c, id: uid(), createdAt: now }));
      if (!cards.length) return;
      setData((p) => {
        if (!p) return p;
        const reviews = { ...p.reviews };
        for (const card of cards) {
          reviews[card.id] = { cardId: card.id, lastReviewedAt: null, nextReviewAt: now, intervalDays: 0, ease: 2.5, reps: 0, lapses: 0, correct: 0, incorrect: 0, totalReviews: 0, state: "new" };
        }
        return { ...p, cards: [...cards, ...p.cards], reviews };
      });
      // server generates its own ids check; send ours and let INSERT OR IGNORE dedupe
      api("/api/cards/batch", { method: "POST", body: JSON.stringify({ cards }) }).catch(fail);
    },
    updateCard: (id, patch) => {
      setData((p) => (p ? { ...p, cards: p.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) } : p));
      api(`/api/cards/${id}`, { method: "PATCH", body: JSON.stringify(patch) }).catch(fail);
    },
    deleteCard: (id) => {
      setData((p) => {
        if (!p) return p;
        const reviews = { ...p.reviews };
        delete reviews[id];
        return { ...p, cards: p.cards.filter((c) => c.id !== id), reviews, logs: p.logs.filter((l) => l.cardId !== id) };
      });
      api(`/api/cards/${id}`, { method: "DELETE" }).catch(fail);
    },
    gradeCard: (cardId, grade) => {
      const cur = dataRef.current?.reviews[cardId];
      if (!cur) return;
      const now = Date.now();
      const next = applyGrade(cur, grade, now);
      const logId = uid();
      setData((p) => {
        if (!p) return p;
        return {
          ...p,
          reviews: { ...p.reviews, [cardId]: next },
          logs: [{ id: logId, cardId, at: now, grade }, ...p.logs].slice(0, 2000),
        };
      });
      api(`/api/cards/${cardId}/grade`, { method: "POST", body: JSON.stringify({ grade, logId, review: next }) }).catch(fail);
    },
    logSession: (s) => {
      const sess = { ...s, id: uid() };
      setData((p) => (p ? { ...p, sessions: [sess, ...p.sessions] } : p));
      persistSession(sess);
    },
    updatePomo: (patch) => {
      setData((p) => (p ? { ...p, pomo: { ...p.pomo, ...patch } } : p));
      api("/api/settings", { method: "PATCH", body: JSON.stringify({ pomo: patch }) }).catch(fail);
      if (!pomoRunning) {
        const d = dataRef.current;
        if (d) {
          const merged = { ...d.pomo, ...patch };
          const total = pomoMode === "focus" ? merged.focusMin * 60 : pomoMode === "short" ? merged.shortMin * 60 : merged.longMin * 60;
          setPomoTotal(total); setPomoRemaining(total);
        }
      }
    },
    resetAll: () => {
      api("/api/reset", { method: "POST" })
        .then(() => bootstrap())
        .then(() => pushToast({ title: "Study data reset" }))
        .catch(fail);
    },
    exportData: () => {
      try {
        const blob = new Blob([JSON.stringify(dataRef.current, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "stoke-study-export.json"; a.click();
        URL.revokeObjectURL(url);
      } catch { /* ignore */ }
    },
    pomoMode, pomoRunning, pomoRemaining, pomoTotal, pomoCycle, pomoSubjectId, pomoChapterId,
    pomoLabel, setPomoLabel,
    pomoStart,
    pomoPause: () => {
      if (targetEnd) {
        setPomoRemaining(Math.max(0, Math.round((targetEnd - Date.now()) / 1000)));
        setPomoRunning(false);
      }
    },
    pomoResume: () => {
      setTargetEnd(Date.now() + pomoRemaining * 1000);
      setPomoRunning(true);
    },
    pomoReset: () => { setPomoRunning(false); setTargetEnd(null); setPomoRemaining(pomoTotal); },
    pomoSkip: () => {
      if (pomoMode === "focus") {
        const elapsed = pomoTotal - pomoRemaining;
        if (elapsed >= 60) {
          const now = Date.now();
          const sess: StudySession = { id: uid(), subjectId: pomoSubjectId, chapterId: pomoChapterId, start: now - elapsed * 1000, end: now, durationSec: elapsed, kind: "focus", completed: false, label: pomoLabel };
          setData((p) => (p ? { ...p, sessions: [sess, ...p.sessions] } : p));
          persistSession(sess);
        }
      }
      completingRef.current = true;
      handleComplete();
    },
    setPomoContext: (s, c) => { setPomoSubjectId(s); setPomoChapterId(c); },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [data, authChecked, authError, bootError, toasts, pushToast, fail, bootstrap, persistSession, pomoMode, pomoRunning, pomoRemaining, pomoTotal, pomoCycle, pomoSubjectId, pomoChapterId, pomoLabel, targetEnd, pomoStart, handleComplete]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ---------- derived selectors ---------- */

export function useDerived() {
  const { data } = useStudy();
  return useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const t0 = startOfToday.getTime();
    const dayAfter = t0 + 2 * 24 * 3600_000;
    const states = Object.values(data?.reviews ?? {});
    const dueToday = states.filter((r) => r.nextReviewAt <= now).length;
    const overdue = states.filter((r) => r.nextReviewAt < t0).length;
    const dueTomorrow = states.filter((r) => r.nextReviewAt > now && r.nextReviewAt < dayAfter).length;
    const upcoming = states.filter((r) => r.nextReviewAt >= dayAfter).length;
    const mastered = states.filter((r) => r.state === "mastered").length;
    const sessions = data?.sessions ?? [];
    const logs = data?.logs ?? [];
    const cards = data?.cards ?? [];
    const subjects = data?.subjects ?? [];
    const chapters = data?.chapters ?? [];
    const todaySessions = sessions.filter((s) => s.start >= t0 && s.kind === "focus");
    const todayFocus = todaySessions.reduce((a, s) => a + s.durationSec, 0);
    const todayPomos = todaySessions.filter((s) => s.completed).length;
    const todayReviews = logs.filter((l) => l.at >= t0).length;

    // streak: consecutive days (ending today or yesterday) with activity
    const activeDays = new Set<string>();
    sessions.forEach((s) => { if (s.completed) activeDays.add(dayKey(s.start)); });
    logs.forEach((l) => activeDays.add(dayKey(l.at)));
    let streak = 0;
    const cursor = new Date(); cursor.setHours(0, 0, 0, 0);
    if (!activeDays.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
    while (activeDays.has(dayKey(cursor.getTime()))) { streak++; cursor.setDate(cursor.getDate() - 1); }

    // longest streak
    const sorted = [...activeDays].sort();
    let longest = 0, run = 0, prev = "";
    for (const k of sorted) {
      if (!prev) run = 1;
      else {
        const dd = (new Date(k + "T12:00:00").getTime() - new Date(prev + "T12:00:00").getTime()) / 86400000;
        run = dd === 1 ? run + 1 : 1;
      }
      longest = Math.max(longest, run);
      prev = k;
    }

    const weekAgo = now - 7 * 86400000;
    const weekFocus = sessions.filter((s) => s.start >= weekAgo && s.kind === "focus").reduce((a, s) => a + s.durationSec, 0);
    const monthFocus = sessions.filter((s) => s.start >= now - 30 * 86400000 && s.kind === "focus").reduce((a, s) => a + s.durationSec, 0);
    const retention = logs.length
      ? Math.round((logs.filter((l) => l.grade !== "again").length / logs.length) * 100)
      : 0;

    const reviews = data?.reviews ?? {};
    const dueCards = cards
      .filter((c) => (reviews[c.id]?.nextReviewAt ?? Infinity) <= now)
      .sort((a, b) => (reviews[a.id]?.nextReviewAt ?? 0) - (reviews[b.id]?.nextReviewAt ?? 0));

    // per-subject plan
    const plan = subjects.map((s) => {
      const chIds = new Set(chapters.filter((c) => c.subjectId === s.id).map((c) => c.id));
      const sc = cards.filter((c) => c.subjectId === s.id || chIds.has(c.chapterId));
      const due = sc.filter((c) => (reviews[c.id]?.nextReviewAt ?? Infinity) <= now).length;
      return { subject: s, due, total: sc.length };
    }).sort((a, b) => b.due - a.due);

    return {
      now, t0, tomorrow: t0 + 24 * 3600_000, dueToday, overdue, dueTomorrow, upcoming, mastered,
      todayFocus, todayPomos, todayReviews, streak, longest,
      totalDays: activeDays.size, weekFocus, monthFocus, retention, dueCards, plan,
      totalCards: cards.length,
    };
  }, [data]);
}

export function requestNotificationPermission() {
  try {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  } catch { /* ignore */ }
}
