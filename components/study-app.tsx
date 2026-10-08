"use client";

import { useEffect, useState } from "react";
import {
  BarChart3, BookOpen, ChevronLeft, Flame, LayoutDashboard, ListChecks,
  RotateCcw, Search, Shapes, Timer, TriangleAlert, UserRound,
  type LucideIcon,
} from "lucide-react";
import { dayKey, useDerived, useStudy } from "@/lib/study-store";
import { useNow, type View } from "./study/shared";
import AuthScreen from "./study/auth-screen";
import Dashboard from "./study/dashboard";
import PlanView from "./study/plan-view";
import { AppLogo } from "./study/logo";
import StudyView from "./study/study-view";
import ReviewsPage, { type ReviewTab } from "./study/review-calendar";
import PomodoroView from "./study/pomodoro-view";
import SubjectsView from "./study/subjects-view";
import StatsView from "./study/stats-view";
import ProfileView from "./study/profile-view";
import {
  CardModal, ChapterModal, Onboarding, QuickAdd, SearchOverlay, SubjectModal,
} from "./study/modals";

const NAV: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "plan", label: "Today's Plan", icon: ListChecks },
  { id: "study", label: "Study", icon: BookOpen },
  { id: "reviews", label: "Review", icon: RotateCcw },
  { id: "pomodoro", label: "Pomodoro", icon: Timer },
  { id: "subjects", label: "Subjects", icon: Shapes },
  { id: "stats", label: "Statistics", icon: BarChart3 },
  { id: "profile", label: "Profile", icon: UserRound },
];
const MOBILE_NAV: View[] = ["dashboard", "plan", "study", "reviews", "pomodoro"];
const VIEW_IDS: View[] = ["dashboard", "plan", "study", "reviews", "pomodoro", "subjects", "stats", "profile"];

function hashFor(view: View, tab: ReviewTab, subjectId: string | null, chapterId: string | null) {
  if (view === "reviews") return tab === "calendar" ? "#/reviews/calendar" : "#/reviews";
  if (view === "study") return subjectId ? (chapterId ? `#/study/${subjectId}/${chapterId}` : `#/study/${subjectId}`) : "#/study";
  if (view === "subjects") return subjectId ? `#/subjects/${subjectId}` : "#/subjects";
  return `#/${view}`;
}

const SHEET_NAMES = ["quickadd", "search", "card", "subject", "chapter"];

function parseHash(): { view: View; tab: ReviewTab; subjectId: string | null; chapterId: string | null; sheet: string | null } | null {
  const [path, suffix] = window.location.hash.split("~");
  const m = path.match(/^#\/([a-z]+)(?:\/([^/]+))?(?:\/([^/]+))?$/);
  if (!m) return null;
  const view = m[1] as View;
  if (!VIEW_IDS.includes(view)) return null;
  return {
    view,
    tab: view === "reviews" && m[2] === "calendar" ? "calendar" : "review",
    subjectId: view === "study" || view === "subjects" ? (m[2] ?? null) : null,
    chapterId: view === "study" ? (m[3] ?? null) : null,
    sheet: suffix && SHEET_NAMES.includes(suffix) ? suffix : null,
  };
}

export default function StudyApp() {
  const { data, toasts, pushToast, authChecked, bootError, refresh, logout, setPomoLabel, pomoStart } = useStudy();
  const d = useDerived();
  useNow();
  const [view, setView] = useState<View>("dashboard");
  const [subjectSel, setSubjectSel] = useState<string | null>(null);
  const [chapterSel, setChapterSel] = useState<string | null>(null);
  // One unified popup state so the OS back button closes popups first
  // (WhatsApp-style), instead of jumping sections underneath them.
  const [sheet, setSheet] = useState<
    | null
    | { name: "quickadd" }
    | { name: "search" }
    | { name: "card"; editId?: string; subjectId?: string; chapterId?: string }
    | { name: "subject" }
    | { name: "chapter"; subjectId: string }
  >(null);
  const [reviewQueue, setReviewQueue] = useState<string[]>([]);
  const [reviewPos, setReviewPos] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<string | null>(null);
  const [reviewTab, setReviewTab] = useState<ReviewTab>("review");
  const [onboardStep, setOnboardStep] = useState(0);

  // Section history: record every section AND popup in browser history so the
  // OS back button walks back through everything (WhatsApp-style) instead of
  // exiting the app. Popups get a `~name` suffix entry and close first.
  const sheetName = sheet?.name ?? null;

  const openSheet = (s: NonNullable<typeof sheet>) => setSheet(s);
  const closeSheet = () => {
    setSheet(null);
    try {
      // If this popup owns the top history entry, pop it so Back stays in sync.
      if (window.location.hash.includes("~")) window.history.back();
    } catch { /* ignore */ }
  };

  // Tap the active tab → back to that tab's root (WhatsApp/Facebook behavior).
  const goTab = (id: View) => {
    if (id === view && !sheet) {
      if (id === "reviews") {
        setReviewTab("review");
        setReviewFilter(null);
        setReviewPos(0);
        setShowAnswer(false);
      }
      if (id === "study") setChapterSel(null);
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { /* ignore */ }
      return;
    }
    setView(id);
    if (id === "reviews") setReviewTab("review");
  };

  useEffect(() => {
    try {
      const parsed = parseHash();
      if (parsed) {
        setView(parsed.view);
        setReviewTab(parsed.tab);
        setSubjectSel(parsed.subjectId);
        setChapterSel(parsed.chapterId);
        // Popups need their payload (e.g. which card is edited), which only
        // exists in-memory — never auto-open one on a fresh load.
      } else if (!window.location.hash) {
        window.history.replaceState(null, "", hashFor("dashboard", "review", null, null));
      }
    } catch { /* non-browser env */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const base = hashFor(view, reviewTab, subjectSel, chapterSel);
      const h = sheetName ? `${base}~${sheetName}` : base;
      if (window.location.hash !== h) window.history.pushState(sheet ? { ...sheet } : null, "", h);
    } catch { /* non-browser env */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, reviewTab, subjectSel, chapterSel, sheetName]);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      try {
        const parsed = parseHash();
        if (!parsed) return;
        setView(parsed.view);
        setReviewTab(parsed.tab);
        setSubjectSel(parsed.subjectId);
        setChapterSel(parsed.chapterId);
        const st = (e.state as null | { name?: string }) ?? null;
        if (parsed.sheet && st && st.name === parsed.sheet) setSheet(st as NonNullable<typeof sheet>);
        else setSheet(parsed.sheet ? ({ name: parsed.sheet } as NonNullable<typeof sheet>) : null);
      } catch { /* ignore */ }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

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

  if (!data) {
    // Server hiccup (not signed out)? Show retry instead of the login form.
    if (bootError) {
      return (
        <div className="min-h-screen grid place-items-center p-4" style={{ background: "var(--bg)" }}>
          <div className="card w-full max-w-sm p-6 text-center fade-in">
            <DbWarning />
            <div className="font-bold text-lg">Couldn&apos;t reach your study data</div>
            <p className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>{bootError}</p>
            <button onClick={() => refresh().catch(() => {})} className="btn-primary w-full py-2.5 text-sm mt-4">Try again</button>
            <button onClick={() => logout()} className="w-full py-2 text-xs font-semibold mt-2" style={{ color: "var(--ink-2)" }}>Back to sign in</button>
          </div>
        </div>
      );
    }
    return (
      <>
        <DbWarning />
        <AuthScreen />
      </>
    );
  }

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
        <GlobalSearchButton onClick={() => openSheet({ name: "search" })} />
        <nav className="mt-2 flex flex-col gap-1" aria-label="Main">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => goTab(n.id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-left ${view === n.id ? "nav-active" : ""}`}
              style={view !== n.id ? { color: "var(--ink-2)" } : undefined}
              aria-current={view === n.id ? "page" : undefined}>
              <n.icon size={18} className="shrink-0" />{n.label}
              {n.id === "reviews" && d.dueToday > 0 && (
                <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "#7c3aed" }}>{d.dueToday}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="mt-auto">
          <StreakMini />
          <button onClick={() => openSheet({ name: "quickadd" })} className="btn-primary w-full mt-3 py-2.5 text-sm">+ Add</button>
          <button onClick={() => logout()} className="w-full mt-2 py-2 text-xs font-semibold rounded-xl" style={{ border: "1px solid var(--border)", color: "var(--ink-2)" }}>Sign out ({data.user.name})</button>
        </div>
      </aside>

      {/* Content */}
      <div className="md:pl-60 pb-24 md:pb-10">
        <Topbar
          onSearch={() => openSheet({ name: "search" })}
          onAdd={() => openSheet({ name: "quickadd" })}
          setView={setView}
          showBack={view !== "dashboard" || sheet !== null}
          onBack={() => { try { window.history.back(); } catch { /* ignore */ } }}
        />
        <main className="max-w-5xl mx-auto px-4 md:px-8 pt-4 page-enter" key={view + (chapterSel || "") + (subjectSel || "")}>
          {view === "dashboard" && <Dashboard onReview={startReview} go={goTab} openSubject={openSubject} />}
          {view === "plan" && <PlanView onReview={startReview} go={goTab} onOpenChapter={openChapter} onOpenCalendar={() => { setReviewTab("calendar"); setView("reviews"); }} />}
          {view === "study" && <StudyView subjectSel={subjectSel} chapterSel={chapterSel} setSubjectSel={setSubjectSel} setChapterSel={setChapterSel} onReview={startReview} go={goTab} onAddCard={(s, c) => openSheet({ name: "card", subjectId: s, chapterId: c })} onAddChapter={(s) => openSheet({ name: "chapter", subjectId: s })} />}
          {view === "reviews" && (
            <ReviewsPage
              tab={reviewTab} setTab={setReviewTab}
              review={{ queue: reviewQueue, pos: reviewPos, setPos: setReviewPos, setQueue: setReviewQueue, showAnswer, setShowAnswer, filter: reviewFilter, onStartAll: () => startReview(), onGoStudy: () => goTab("study"), onReRead: startReRead }}
              calendar={{ onOpenChapter: openChapter, onReview: startReview, onReRead: startReRead }}
              go={goTab}
            />
          )}
          {view === "pomodoro" && <PomodoroView go={goTab} />}
          {view === "subjects" && <SubjectsView selected={subjectSel} onSelect={setSubjectSel} onOpenChapter={openChapter} onAddSubject={() => openSheet({ name: "subject" })} onAddChapter={(s) => openSheet({ name: "chapter", subjectId: s })} onAddCard={(s, c) => openSheet({ name: "card", subjectId: s, chapterId: c })} />}
          {view === "stats" && <StatsView />}
          {view === "profile" && <ProfileView onAddSubject={() => openSheet({ name: "subject" })} onOpenCalendar={() => { setReviewTab("calendar"); setView("reviews"); }} />}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="mobile-only fixed bottom-0 left-0 right-0 z-30 flex justify-around items-center px-1 py-1.5 shadow-lg" style={{ background: "var(--card)", borderTop: "1px solid var(--border)", paddingBottom: "max(6px, env(safe-area-inset-bottom))" }} aria-label="Mobile Navigation">
        {MOBILE_NAV.map((id) => {
          const n = NAV.find((x) => x.id === id)!;
          const isActive = view === id;
          const label = id === "dashboard" ? "Home" : id === "plan" ? "Plan" : n.label;
          return (
            <button key={id} onClick={() => goTab(id)} className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] px-2 py-1 rounded-xl text-[10px] font-bold transition-all ${isActive ? "nav-active scale-105" : "active:scale-95"}`} style={!isActive ? { color: "var(--ink-2)" } : undefined}>
              <div className="relative">
                <n.icon size={20} className="shrink-0" />
                {id === "reviews" && d.dueToday > 0 && (
                  <span className="absolute -top-1 -right-2 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full text-white bg-purple-600 shadow-2xs">
                    {d.dueToday}
                  </span>
                )}
              </div>
              <span className="mt-0.5 tracking-tight">{label}</span>
            </button>
          );
        })}
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

      {sheet?.name === "quickadd" && <QuickAdd close={closeSheet} onSubject={() => openSheet({ name: "subject" })} onChapter={() => { setSheet(null); setView("subjects"); }} onCard={() => openSheet({ name: "card" })} go={goTab} />}
      {sheet?.name === "search" && <SearchOverlay close={closeSheet} openSubject={openSubject} openChapter={openChapter} goReview={(id) => { setSheet(null); setReviewQueue([id]); setReviewPos(0); setShowAnswer(false); setView("reviews"); }} />}
      {sheet?.name === "card" && <CardModal editId={sheet.editId} subjectId={sheet.subjectId} chapterId={sheet.chapterId} close={closeSheet} />}
      {sheet?.name === "subject" && <SubjectModal close={closeSheet} />}
      {sheet?.name === "chapter" && <ChapterModal subjectId={sheet.subjectId} close={closeSheet} />}
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
      <Search size={15} /> Search… <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded" style={{ border: "1px solid var(--border)" }}>⌘K</kbd>
    </button>
  );
}

function Topbar({ onSearch, onAdd, setView, onBack, showBack }: { onSearch: () => void; onAdd: () => void; setView: (v: View) => void; onBack: () => void; showBack: boolean }) {
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
    <header className="sticky top-0 z-10 px-4 md:px-8 py-3 flex items-center gap-2" style={{ background: "color-mix(in srgb, var(--bg) 88%, transparent)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--border)", paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
      {showBack && (
        <button onClick={onBack} className="md:hidden w-9 h-9 -ml-1 rounded-full grid place-items-center" style={{ color: "var(--ink)" }} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
      )}
      <div className="md:hidden font-bold">Stoke</div>
      <div className="hidden md:block text-sm" style={{ color: "var(--ink-2)" }}>
        {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <span className="hidden sm:inline-flex text-xs font-semibold px-2.5 py-1 rounded-full" style={d.streak >= 2 ? { background: "var(--primary-bg)", color: "#6D28D9" } : { border: "1px solid var(--border)", color: "var(--ink-2)" }}>
          {d.streak >= 2 ? <><Flame size={13} className="inline -mt-0.5" /> {d.streak} day streak</> : "Study 2 days to start a streak"}
        </span>
        <button onClick={onSearch} className="md:hidden px-3 py-2 rounded-xl text-sm" style={{ border: "1px solid var(--border)" }} aria-label="Search"><Search size={16} /></button>
        <button onClick={onAdd} className="btn-primary px-4 py-2 text-sm">+ Add</button>
        <button onClick={() => setView("profile")} className="w-9 h-9 rounded-full grid place-items-center text-sm font-bold text-white" style={{ background: "#7c3aed" }} aria-label="Profile">
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
      <div className="text-sm font-bold flex items-center gap-1.5"><Flame size={15} />{on ? `${d.streak} day streak` : "Start your streak"}</div>
      <div className="text-[11px]" style={{ color: "var(--ink-2)" }}>{on ? `Longest ${d.longest} · ${d.totalDays} study days` : "Study 2 days in a row to ignite it"}</div>
      <div className="flex gap-1 mt-2" aria-hidden>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-6 flex-1 rounded" style={{ background: on && i < Math.min(7, d.streak) ? "#7c3aed" : "var(--border)" }} />
        ))}
      </div>
    </div>
  );
}

/**
 * Shown on the sign-in screen when the server has no persistent database
 * (Vercel without TURSO_* vars): every request can hit a different empty DB,
 * which is exactly why sign-ups seem to "vanish" back to the login page.
 */
function DbWarning() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((b) => { if (b && b.ephemeral) setShow(true); })
      .catch(() => {});
  }, []);
  if (!show) return null;
  return (
    <div className="max-w-xl mx-auto mt-3 px-4 md:px-8">
      <div className="card p-3 text-xs" style={{ borderColor: "#EF4444" }}>
        <b className="flex items-center gap-1.5"><TriangleAlert size={14} /> Server database not connected</b> — accounts and study data vanish between requests, which is why you keep landing back here.
        Admin fix: add <code>TURSO_DATABASE_URL</code> + <code>TURSO_AUTH_TOKEN</code> in Vercel → Settings → Environment Variables, then redeploy.
      </div>
    </div>
  );
}
