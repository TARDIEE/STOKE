"use client";

import { useEffect, useState } from "react";
import { dayKey, useDerived, useStudy } from "@/lib/study-store";
import { useNow, type View } from "./study/shared";
import AuthScreen from "./study/auth-screen";
import Dashboard from "./study/dashboard";
import PlanView from "./study/plan-view";
import { AppLogo } from "./study/logo";
import StudyView from "./study/study-view";
import ReviewsView from "./study/reviews-view";
import PomodoroView from "./study/pomodoro-view";
import SubjectsView from "./study/subjects-view";
import CalendarView from "./study/calendar-view";
import StatsView from "./study/stats-view";
import SettingsView from "./study/settings-view";
import {
  CardModal, ChapterModal, Onboarding, QuickAdd, SearchOverlay, SubjectModal,
} from "./study/modals";

const NAV: { id: View; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "◧" },
  { id: "plan", label: "Today's Plan", icon: "✓" },
  { id: "study", label: "Study", icon: "◫" },
  { id: "reviews", label: "Review", icon: "↻" },
  { id: "pomodoro", label: "Pomodoro", icon: "◷" },
  { id: "subjects", label: "Subjects", icon: "▤" },
  { id: "calendar", label: "Calendar", icon: "▦" },
  { id: "stats", label: "Statistics", icon: "▥" },
  { id: "settings", label: "Settings", icon: "⚙" },
];
const MOBILE_NAV: View[] = ["dashboard", "study", "reviews", "pomodoro", "settings"];

export default function StudyApp() {
  const { data, toasts, pushToast, authChecked, logout, setPomoLabel, pomoStart } = useStudy();
  const d = useDerived();
  useNow();
  const [view, setView] = useState<View>("dashboard");
  const [subjectSel, setSubjectSel] = useState<string | null>(null);
  const [chapterSel, setChapterSel] = useState<string | null>(null);
  const [quickAdd, setQuickAdd] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cardModal, setCardModal] = useState<{ open: boolean; editId?: string; subjectId?: string; chapterId?: string }>({ open: false });
  const [subjectModal, setSubjectModal] = useState(false);
  const [chapterModal, setChapterModal] = useState<string | null>(null);
  const [reviewQueue, setReviewQueue] = useState<string[]>([]);
  const [reviewPos, setReviewPos] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<string | null>(null);
  const [onboardStep, setOnboardStep] = useState(0);

  const remindersOn = data?.user.reminders ?? false;
  const dueToday = d.dueToday;
  const notifOn = data?.pomo.notifications ?? false;

  // review due reminders (in-app + browser)
  useEffect(() => {
    if (!remindersOn) return;
    const key = "stokestudy.lastRemind";
    const today = dayKey(Date.now());
    try {
      if (localStorage.getItem(key) === today) return;
      if (dueToday > 0) {
        const t = setTimeout(() => {
          pushToast({ title: `Time to review — ${dueToday} cards waiting`, body: "Review at the right time. Remember for longer." });
          try {
            if ("Notification" in window && Notification.permission === "granted" && notifOn) {
              new Notification("Time to review", { body: `${dueToday} cards are waiting for you.` });
            }
          } catch { /* ignore */ }
          try { localStorage.setItem(key, today); } catch { /* ignore */ }
        }, 4000);
        return () => clearTimeout(t);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remindersOn]);

  if (!authChecked) {
    return (
      <div className="min-h-screen grid place-items-center" style={{ background: "var(--bg)" }}>
        <div className="text-sm" style={{ color: "var(--ink-2)" }}>Loading Stoke…</div>
      </div>
    );
  }

  if (!data) return <AuthScreen />;

  const startReview = (subjectId?: string | null, chapterId?: string | null) => {
    const now = Date.now();
    let cards = data.cards.filter((c) => (data.reviews[c.id]?.nextReviewAt ?? Infinity) <= now);
    if (chapterId) cards = cards.filter((c) => c.chapterId === chapterId);
    else if (subjectId) cards = cards.filter((c) => c.subjectId === subjectId);
    if (!cards.length && (subjectId || chapterId)) {
      // fall back to all cards in scope (practice mode)
      cards = data.cards.filter((c) => (chapterId ? c.chapterId === chapterId : c.subjectId === subjectId));
    }
    // "Again" cards should not loop immediately: sort by nextReviewAt, stable
    cards.sort((a, b) => (data.reviews[a.id]?.nextReviewAt ?? 0) - (data.reviews[b.id]?.nextReviewAt ?? 0));
    if (!cards.length) {
      pushToast({ title: "You're all caught up", body: "Nothing needs reviewing right now." });
      return;
    }
    setReviewQueue(cards.map((c) => c.id));
    setReviewPos(0);
    setShowAnswer(false);
    setReviewFilter(chapterId ?? subjectId ?? null);
    setView("reviews");
  };

  const openSubject = (id: string) => { setSubjectSel(id); setChapterSel(null); setView("subjects"); };
  const openChapter = (sid: string, cid: string) => { setSubjectSel(sid); setChapterSel(cid); setView("study"); };

  /** Start a 25-min re-read Pomodoro: revise what was already read. */
  const startReRead = (subjectId?: string | null, chapterId?: string | null) => {
    setPomoLabel("reread");
    pomoStart("focus", subjectId ?? null, chapterId ?? null, "reread");
    setView("pomodoro");
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Sidebar desktop */}
      <aside className="desktop-only fixed left-0 top-0 bottom-0 w-60 p-4 flex flex-col gap-1 z-20" style={{ background: "var(--card)", borderRight: "1px solid var(--border)" }}>
        <Brand />
        <GlobalSearchButton onClick={() => setSearchOpen(true)} />
        <nav className="mt-2 flex flex-col gap-1" aria-label="Main">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => { setView(n.id); setChapterSel(null); }}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-left ${view === n.id ? "nav-active" : ""}`}
              style={view !== n.id ? { color: "var(--ink-2)" } : undefined}
              aria-current={view === n.id ? "page" : undefined}>
              <span className="w-5 text-center">{n.icon}</span>{n.label}
              {n.id === "reviews" && d.dueToday > 0 && (
                <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "#7c3aed" }}>{d.dueToday}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="mt-auto">
          <StreakMini />
          <button onClick={() => setQuickAdd(true)} className="btn-primary w-full mt-3 py-2.5 text-sm">+ Add</button>
          <button onClick={() => logout()} className="w-full mt-2 py-2 text-xs font-semibold rounded-xl" style={{ border: "1px solid var(--border)", color: "var(--ink-2)" }}>Sign out ({data.user.name})</button>
        </div>
      </aside>

      {/* Content */}
      <div className="md:pl-60 pb-24 md:pb-10">
        <Topbar
          onSearch={() => setSearchOpen(true)}
          onAdd={() => setQuickAdd(true)}
          setView={setView}
        />
        <main className="max-w-5xl mx-auto px-4 md:px-8 pt-4 page-enter" key={view + (chapterSel || "") + (subjectSel || "")}>
          {view === "dashboard" && <Dashboard onReview={startReview} go={setView} openSubject={openSubject} />}
          {view === "plan" && <PlanView onReview={startReview} go={setView} />}
          {view === "study" && <StudyView subjectSel={subjectSel} chapterSel={chapterSel} setSubjectSel={setSubjectSel} setChapterSel={setChapterSel} onReview={startReview} go={setView} onAddCard={(s, c) => setCardModal({ open: true, subjectId: s, chapterId: c })} onAddChapter={setChapterModal} />}
          {view === "reviews" && <ReviewsView queue={reviewQueue} pos={reviewPos} setPos={setReviewPos} setQueue={setReviewQueue} showAnswer={showAnswer} setShowAnswer={setShowAnswer} filter={reviewFilter} onStartAll={() => startReview()} onGoStudy={() => setView("study")} onReRead={startReRead} />}
          {view === "pomodoro" && <PomodoroView go={setView} />}
          {view === "subjects" && <SubjectsView selected={subjectSel} onSelect={setSubjectSel} onOpenChapter={openChapter} onAddSubject={() => setSubjectModal(true)} onAddChapter={setChapterModal} onAddCard={(s, c) => setCardModal({ open: true, subjectId: s, chapterId: c })} />}
          {view === "calendar" && <CalendarView onOpenChapter={openChapter} onReview={startReview} onReRead={startReRead} />}
          {view === "stats" && <StatsView />}
          {view === "settings" && <SettingsView onAddSubject={() => setSubjectModal(true)} />}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="mobile-only fixed bottom-0 left-0 right-0 z-20 flex justify-around px-2 py-2" style={{ background: "var(--card)", borderTop: "1px solid var(--border)" }} aria-label="Mobile">
        {MOBILE_NAV.map((id) => {
          const n = NAV.find((x) => x.id === id)!;
          return (
            <button key={id} onClick={() => setView(id)} className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px] ${view === id ? "nav-active" : ""}`} style={view !== id ? { color: "var(--ink-2)" } : undefined}>
              <span className="text-lg leading-none">{n.icon}</span>{n.label === "Dashboard" ? "Home" : n.label === "Study" ? "Study" : n.label === "Review" ? "Review" : n.label === "Pomodoro" ? "Focus" : "More"}
            </button>
          );
        })}
        <button onClick={() => setView("stats")} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px]" style={{ color: "var(--ink-2)" }}>
          <span className="text-lg leading-none">▥</span>More
        </button>
      </nav>

      {/* Toasts */}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="card toast-in px-4 py-3 max-w-xs">
            <div className="text-sm font-semibold">{t.title}</div>
            {t.body && <div className="text-xs mt-0.5" style={{ color: "var(--ink-2)" }}>{t.body}</div>}
          </div>
        ))}
      </div>

      {quickAdd && <QuickAdd close={() => setQuickAdd(false)} onSubject={() => { setQuickAdd(false); setSubjectModal(true); }} onChapter={() => { setQuickAdd(false); setView("subjects"); }} onCard={() => { setQuickAdd(false); setCardModal({ open: true }); }} go={setView} />}
      {searchOpen && <SearchOverlay close={() => setSearchOpen(false)} openSubject={openSubject} openChapter={openChapter} goReview={(id) => { setReviewQueue([id]); setReviewPos(0); setShowAnswer(false); setView("reviews"); }} />}
      {cardModal.open && <CardModal editId={cardModal.editId} subjectId={cardModal.subjectId} chapterId={cardModal.chapterId} close={() => setCardModal({ open: false })} />}
      {subjectModal && <SubjectModal close={() => setSubjectModal(false)} />}
      {chapterModal && <ChapterModal subjectId={chapterModal} close={() => setChapterModal(null)} />}
      {!data.user.onboarded && <Onboarding step={onboardStep} setStep={setOnboardStep} />}
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2 py-3">
      <AppLogo size={38} />
      <div>
        <div className="font-bold leading-none">Stoke</div>
        <div className="text-[11px]" style={{ color: "var(--ink-2)" }}>Study command center</div>
      </div>
    </div>
  );
}

function GlobalSearchButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-2" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--ink-2)" }}>
      <span>⌕</span> Search… <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded" style={{ border: "1px solid var(--border)" }}>⌘K</kbd>
    </button>
  );
}

function Topbar({ onSearch, onAdd, setView }: { onSearch: () => void; onAdd: () => void; setView: (v: View) => void }) {
  const { data } = useStudy();
  const d = useDerived();
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); onSearch(); }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onSearch]);
  return (
    <header className="sticky top-0 z-10 px-4 md:px-8 py-3 flex items-center gap-3" style={{ background: "color-mix(in srgb, var(--bg) 88%, transparent)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--border)" }}>
      <div className="md:hidden font-bold">Stoke</div>
      <div className="hidden md:block text-sm" style={{ color: "var(--ink-2)" }}>
        {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <span className="hidden sm:inline-flex text-xs font-semibold px-2.5 py-1 rounded-full" style={d.streak >= 2 ? { background: "var(--primary-bg)", color: "#6D28D9" } : { border: "1px solid var(--border)", color: "var(--ink-2)" }}>
          {d.streak >= 2 ? `🔥 ${d.streak} day streak` : "Study 2 days to start a streak"}
        </span>
        <button onClick={onSearch} className="md:hidden px-3 py-2 rounded-xl text-sm" style={{ border: "1px solid var(--border)" }} aria-label="Search">⌕</button>
        <button onClick={onAdd} className="btn-primary px-4 py-2 text-sm">+ Add</button>
        <button onClick={() => setView("settings")} className="w-9 h-9 rounded-full grid place-items-center text-sm font-bold text-white" style={{ background: "#7c3aed" }} aria-label="Profile">
          {(data?.user.name || "S").slice(0, 1).toUpperCase()}
        </button>
      </div>
    </header>
  );
}

function StreakMini() {
  const d = useDerived();
  const on = d.streak >= 2;
  return (
    <div className="card p-3 mt-2">
      <div className="text-sm font-bold">{on ? `🔥 ${d.streak} day streak` : "🔥 Start your streak"}</div>
      <div className="text-[11px]" style={{ color: "var(--ink-2)" }}>{on ? `Longest ${d.longest} · ${d.totalDays} study days` : "Study 2 days in a row to ignite it"}</div>
      <div className="flex gap-1 mt-2" aria-hidden>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-6 flex-1 rounded" style={{ background: on && i < Math.min(7, d.streak) ? "#7c3aed" : "var(--border)" }} />
        ))}
      </div>
    </div>
  );
}
