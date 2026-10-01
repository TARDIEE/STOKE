"use client";

import { CalendarDays, RotateCcw } from "lucide-react";
import CalendarView from "./calendar-view";
import ReviewsView from "./reviews-view";
import type { View } from "./shared";

export type ReviewTab = "review" | "calendar";

/** Review queue + calendar on one page, switched by a segmented control. */
export default function ReviewsPage({ tab, setTab, review, calendar, go }: {
  tab: ReviewTab;
  setTab: (t: ReviewTab) => void;
  review: {
    queue: string[]; pos: number; setPos: (n: number) => void; setQueue: (q: string[]) => void;
    showAnswer: boolean; setShowAnswer: (b: boolean) => void; filter: string | null;
    onStartAll: () => void; onGoStudy: () => void; onReRead: (s?: string | null, c?: string | null) => void;
  };
  calendar: {
    onOpenChapter: (sid: string, cid: string) => void;
    onReview: (s?: string | null, c?: string | null) => void;
    onReRead: (s?: string | null, c?: string | null) => void;
  };
  go: (v: View) => void;
}) {
  return (
    <div>
      <div className="inline-flex p-1 rounded-full" style={{ background: "var(--card)", border: "1px solid var(--border)" }} role="tablist" aria-label="Review or calendar">
        <button
          role="tab" aria-selected={tab === "review"} onClick={() => setTab("review")}
          className={`px-4 py-1.5 rounded-full text-sm font-bold inline-flex items-center gap-1.5 ${tab === "review" ? "text-white" : ""}`}
          style={tab === "review" ? { background: "#7c3aed" } : { color: "var(--ink-2)" }}
        >
          <RotateCcw size={14} /> Review
        </button>
        <button
          role="tab" aria-selected={tab === "calendar"} onClick={() => setTab("calendar")}
          className={`px-4 py-1.5 rounded-full text-sm font-bold inline-flex items-center gap-1.5 ${tab === "calendar" ? "text-white" : ""}`}
          style={tab === "calendar" ? { background: "#7c3aed" } : { color: "var(--ink-2)" }}
        >
          <CalendarDays size={14} /> Calendar
        </button>
      </div>
      <div className="mt-4">
        {tab === "review" ? (
          <ReviewsView
            queue={review.queue} pos={review.pos} setPos={review.setPos} setQueue={review.setQueue}
            showAnswer={review.showAnswer} setShowAnswer={review.setShowAnswer} filter={review.filter}
            onStartAll={review.onStartAll} onGoStudy={review.onGoStudy} onReRead={review.onReRead}
          />
        ) : (
          <CalendarView onOpenChapter={calendar.onOpenChapter} onReview={calendar.onReview} onReRead={calendar.onReRead} />
        )}
      </div>
    </div>
  );
}
