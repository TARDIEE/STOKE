// Offline-first store for the Stoke mobile app.
// Same domain shape as the web Persisted state (lib/study-store.tsx),
// persisted to AsyncStorage. Server sync (/api/*) can layer on later.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  applyGrade,
  dayKey,
  newReviewState,
  uid,
  type Chapter,
  type Flashcard,
  type Grade,
  type PomoSettings,
  type ReviewLog,
  type ReviewState,
  type StudySession,
  type Subject,
} from "./study-logic";

export interface UserState {
  name: string;
  focusGoal: number;
  examName: string;
  examDate: number;
  theme: "light" | "dark";
}

export interface CustomTask {
  id: string;
  title: string;
  quadrant: "q1" | "q2" | "q3" | "q4";
  status: "open" | "done";
}

export interface LocalData {
  user: UserState;
  subjects: Subject[];
  chapters: Chapter[];
  cards: Flashcard[];
  reviews: Record<string, ReviewState>;
  logs: ReviewLog[];
  sessions: StudySession[];
  pomo: PomoSettings;
  tasks: CustomTask[];
}

const KEY = "stoke-mobile.v1";

function empty(): LocalData {
  return {
    user: { name: "", focusGoal: 120, examName: "", examDate: 0, theme: "light" },
    subjects: [],
    chapters: [],
    cards: [],
    reviews: {},
    logs: [],
    sessions: [],
    pomo: { focusMin: 25, shortMin: 5, longMin: 15 },
    tasks: [],
  };
}

export interface ReviewFilter {
  subjectId: string | null;
  chapterId: string | null;
}

interface StoreCtx extends LocalData {
  ready: boolean;
  reviewFilter: ReviewFilter;
  setReviewFilter: (f: ReviewFilter) => void;
  selectedSubject: string | null;
  setSelectedSubject: (id: string | null) => void;
  updateUser: (u: Partial<UserState>) => void;
  addSubject: (name: string, color?: string) => void;
  deleteSubject: (id: string) => void;
  addChapter: (subjectId: string, name: string) => void;
  updateChapter: (id: string, patch: Partial<Chapter>) => void;
  deleteChapter: (id: string) => void;
  addCard: (subjectId: string, chapterId: string, front: string, back: string) => void;
  updateCard: (id: string, patch: Partial<Flashcard>) => void;
  deleteCard: (id: string) => void;
  gradeCard: (cardId: string, grade: Grade) => void;
  logSession: (s: Omit<StudySession, "id">) => void;
  updatePomo: (p: Partial<PomoSettings>) => void;
  addTask: (title: string, quadrant: CustomTask["quadrant"]) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  resetAll: () => void;
}

const Ctx = createContext<StoreCtx | null>(null);

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside provider");
  return v;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<LocalData>(empty);
  const [ready, setReady] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>({ subjectId: null, chapterId: null });
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) setData({ ...empty(), ...JSON.parse(raw) });
      } catch {
        // corrupted cache -> start fresh
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => {});
  }, [data, ready]);

  const updateUser = useCallback((u: Partial<UserState>) => {
    setData((p) => ({ ...p, user: { ...p.user, ...u } }));
  }, []);

  const addSubject = useCallback((name: string, color = "#7C3AED") => {
    const sub: Subject = { id: uid(), name, description: "", color, createdAt: Date.now() };
    setData((p) => ({ ...p, subjects: [...p.subjects, sub] }));
  }, []);

  const deleteSubject = useCallback((id: string) => {
    setData((p) => ({
      ...p,
      subjects: p.subjects.filter((s) => s.id !== id),
      chapters: p.chapters.filter((c) => c.subjectId !== id),
      cards: p.cards.filter((c) => c.subjectId !== id),
    }));
  }, []);

  const addChapter = useCallback((subjectId: string, name: string) => {
    setData((p) => ({
      ...p,
      chapters: [
        ...p.chapters,
        {
          id: uid(),
          subjectId,
          name,
          description: "",
          notes: "",
          order: p.chapters.filter((c) => c.subjectId === subjectId).length,
          weight: 3,
          createdAt: Date.now(),
        },
      ],
    }));
  }, []);

  const updateChapter = useCallback((id: string, patch: Partial<Chapter>) => {
    setData((p) => ({ ...p, chapters: p.chapters.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }, []);

  const deleteChapter = useCallback((id: string) => {
    setData((p) => ({
      ...p,
      chapters: p.chapters.filter((c) => c.id !== id),
      cards: p.cards.filter((c) => c.chapterId !== id),
    }));
  }, []);

  const addCard = useCallback((subjectId: string, chapterId: string, front: string, back: string) => {
    const id = uid();
    const now = Date.now();
    const card: Flashcard = { id, subjectId, chapterId, front, back, tags: [], notes: "", createdAt: now };
    setData((p) => ({ ...p, cards: [card, ...p.cards], reviews: { ...p.reviews, [id]: newReviewState(id, now) } }));
  }, []);

  const updateCard = useCallback((id: string, patch: Partial<Flashcard>) => {
    setData((p) => ({ ...p, cards: p.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }, []);

  const deleteCard = useCallback((id: string) => {
    setData((p) => {
      const reviews = { ...p.reviews };
      delete reviews[id];
      return { ...p, cards: p.cards.filter((c) => c.id !== id), reviews, logs: p.logs.filter((l) => l.cardId !== id) };
    });
  }, []);

  const gradeCard = useCallback((cardId: string, grade: Grade) => {
    setData((p) => {
      const cur = p.reviews[cardId];
      if (!cur) return p;
      const now = Date.now();
      return {
        ...p,
        reviews: { ...p.reviews, [cardId]: applyGrade(cur, grade, now) },
        logs: [{ id: uid(), cardId, at: now, grade }, ...p.logs].slice(0, 2000),
      };
    });
  }, []);

  const logSession = useCallback((s: Omit<StudySession, "id">) => {
    setData((p) => ({ ...p, sessions: [{ ...s, id: uid() }, ...p.sessions] }));
  }, []);

  const updatePomo = useCallback((patch: Partial<PomoSettings>) => {
    setData((p) => ({ ...p, pomo: { ...p.pomo, ...patch } }));
  }, []);

  const addTask = useCallback((title: string, quadrant: CustomTask["quadrant"]) => {
    setData((p) => ({ ...p, tasks: [...p.tasks, { id: uid(), title, quadrant, status: "open" }] }));
  }, []);

  const toggleTask = useCallback((id: string) => {
    setData((p) => ({
      ...p,
      tasks: p.tasks.map((t) => (t.id === id ? { ...t, status: t.status === "done" ? "open" : "done" } : t)),
    }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setData((p) => ({ ...p, tasks: p.tasks.filter((t) => t.id !== id) }));
  }, []);

  const resetAll = useCallback(() => setData(empty()), []);

  const value = useMemo<StoreCtx>(
    () => ({
      ...data,
      ready,
      reviewFilter,
      setReviewFilter,
      selectedSubject,
      setSelectedSubject,
      updateUser,
      addSubject,
      deleteSubject,
      addChapter,
      updateChapter,
      deleteChapter,
      addCard,
      updateCard,
      deleteCard,
      gradeCard,
      logSession,
      updatePomo,
      addTask,
      toggleTask,
      deleteTask,
      resetAll,
    }),
    [
      data, ready, reviewFilter, selectedSubject, updateUser, addSubject, deleteSubject,
      addChapter, updateChapter, deleteChapter, addCard, updateCard, deleteCard,
      gradeCard, logSession, updatePomo, addTask, toggleTask, deleteTask, resetAll,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Derived selectors — ported from web useDerived (lib/study-store.tsx). */
export function useDerived() {
  const { subjects, chapters, cards, reviews, logs, sessions } = useStore();
  return useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const t0 = startOfToday.getTime();
    const dayAfter = t0 + 2 * 24 * 3600_000;
    const states = Object.values(reviews);
    const dueToday = states.filter((r) => r.nextReviewAt <= now).length;
    const overdue = states.filter((r) => r.nextReviewAt < t0).length;
    const dueTomorrow = states.filter((r) => r.nextReviewAt > now && r.nextReviewAt < dayAfter).length;
    const upcoming = states.filter((r) => r.nextReviewAt >= dayAfter).length;
    const mastered = states.filter((r) => r.state === "mastered").length;
    const todaySessions = sessions.filter((s) => s.start >= t0 && s.kind === "focus");
    const todayFocus = todaySessions.reduce((a, s) => a + s.durationSec, 0);
    const todayPomos = todaySessions.filter((s) => s.completed).length;
    const todayReviews = logs.filter((l) => l.at >= t0).length;

    const activeDays = new Set<string>();
    sessions.forEach((s) => {
      if (s.completed) activeDays.add(dayKey(s.start));
    });
    logs.forEach((l) => activeDays.add(dayKey(l.at)));
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    if (!activeDays.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
    while (activeDays.has(dayKey(cursor.getTime()))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    const sorted = [...activeDays].sort();
    let longest = 0,
      run = 0,
      prev = "";
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
    const retention = logs.length ? Math.round((logs.filter((l) => l.grade !== "again").length / logs.length) * 100) : 0;

    const dueCards = cards
      .filter((c) => (reviews[c.id]?.nextReviewAt ?? Infinity) <= now)
      .sort((a, b) => (reviews[a.id]?.nextReviewAt ?? 0) - (reviews[b.id]?.nextReviewAt ?? 0));

    const plan = subjects
      .map((s) => {
        const chIds = new Set(chapters.filter((c) => c.subjectId === s.id).map((c) => c.id));
        const sc = cards.filter((c) => c.subjectId === s.id || chIds.has(c.chapterId));
        const due = sc.filter((c) => (reviews[c.id]?.nextReviewAt ?? Infinity) <= now).length;
        return { subject: s, due, total: sc.length };
      })
      .sort((a, b) => b.due - a.due);

    return {
      now, t0, dueToday, overdue, dueTomorrow, upcoming, mastered,
      todayFocus, todayPomos, todayReviews, streak, longest,
      totalDays: activeDays.size, weekFocus, monthFocus, retention, dueCards, plan,
      totalCards: cards.length,
    };
  }, [subjects, chapters, cards, reviews, logs, sessions]);
}
