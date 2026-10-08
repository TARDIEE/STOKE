"use client";

import { CalendarDays, ListChecks } from "lucide-react";
import { useState } from "react";
import CalendarView from "./calendar-view";
import PlanView from "./plan-view";
import type { View } from "./shared";

export type PlanTab = "tasks" | "calendar";

/** Today's Plan + Calendar on one page, switched by a segmented control. */
export default function PlanPage({ tab, setTab, plan, calendar }: {
  tab: PlanTab;
  setTab: (t: PlanTab) => void;
  plan: {
    onReview: (s?: string | null, c?: string | null) => void;
    go: (v: View) => void;
    onOpenChapter: (subjectId: string, chapterId: string) => void;
  };
  calendar: {
    onOpenChapter: (sid: string, cid: string) => void;
    onReview: (s?: string | null, c?: string | null) => void;
    onReRead: (s?: string | null, c?: string | null) => void;
  };
}) {
  // Local tab mirrors the parent-driven one so back/forward stays in sync
  // even if the parent passes a stale value on remount.
  const [local, setLocal] = useState<PlanTab>("tasks");
  const active = tab ?? local;
  const pick = (t: PlanTab) => {
    setTab(t);
    setLocal(t);
  };
  return (
    <div>
      <div className="inline-flex p-1 rounded-full" style={{ background: "var(--card)", border: "1px solid var(--border)" }} role="tablist" aria-label="Plan or calendar">
        <button
          role="tab" aria-selected={active === "tasks"} onClick={() => pick("tasks")}
          className={`px-4 py-1.5 rounded-full text-sm font-bold inline-flex items-center gap-1.5 ${active === "tasks" ? "text-white" : ""}`}
          style={active === "tasks" ? { background: "#7c3aed" } : { color: "var(--ink-2)" }}
        >
          <ListChecks size={14} /> Tasks
        </button>
        <button
          role="tab" aria-selected={active === "calendar"} onClick={() => pick("calendar")}
          className={`px-4 py-1.5 rounded-full text-sm font-bold inline-flex items-center gap-1.5 ${active === "calendar" ? "text-white" : ""}`}
          style={active === "calendar" ? { background: "#7c3aed" } : { color: "var(--ink-2)" }}
        >
          <CalendarDays size={14} /> Calendar
        </button>
      </div>
      <div className="mt-4">
        {active === "tasks" ? (
          <PlanView onReview={plan.onReview} go={plan.go} onOpenChapter={plan.onOpenChapter} onOpenCalendar={() => pick("calendar")} />
        ) : (
          <CalendarView onOpenChapter={calendar.onOpenChapter} onReview={calendar.onReview} onReRead={calendar.onReRead} />
        )}
      </div>
    </div>
  );
}
