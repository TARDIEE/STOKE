"use client";

import { Flame, LogOut, Target } from "lucide-react";
import { fmtDur, useDerived, useStudy } from "@/lib/study-store";
import SettingsView from "./settings-view";

/** Student profile: identity + lifetime stats on top, all settings below. */
export default function ProfileView({ onAddSubject, onOpenCalendar }: {
  onAddSubject: () => void; onOpenCalendar: () => void;
}) {
  const { data, logout } = useStudy();
  const d = useDerived();
  if (!data) return null;
  const initial = (data.user.name || data.user.email || "S").slice(0, 1).toUpperCase();
  const examMs = data.user.examDate > Date.now() ? data.user.examDate - Date.now() : 0;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Profile</h1>
      <p className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>Everything about you and your study setup.</p>

      <div className="card p-5 mt-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full grid place-items-center text-2xl font-bold text-white shrink-0" style={{ background: "linear-gradient(135deg,#7C3AED,#5B21B6)" }} aria-hidden>
            {initial}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-lg truncate">{data.user.name || "Student"}</div>
            <div className="text-sm truncate" style={{ color: "var(--ink-2)" }}>{data.user.email}</div>
            <div className="text-xs mt-1 font-semibold flex items-center gap-1" style={{ color: d.streak >= 2 ? "#6D28D9" : "var(--ink-2)" }}>
              <Flame size={13} />
              {d.streak >= 2 ? `${d.streak} day streak · longest ${d.longest}` : "Study 2 days in a row to start a streak"}
            </div>
          </div>
          <button onClick={() => logout()} className="ml-auto px-4 py-2 text-xs font-semibold rounded-xl shrink-0 inline-flex items-center gap-1.5" style={{ border: "1px solid var(--border)", color: "var(--ink-2)" }}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 text-center">
          <div className="p-3 rounded-xl" style={{ background: "var(--bg)" }}>
            <div className="font-bold text-lg timer-tabular">{d.totalCards}</div>
            <div className="text-[11px]" style={{ color: "var(--ink-2)" }}>Cards</div>
          </div>
          <div className="p-3 rounded-xl" style={{ background: "var(--bg)" }}>
            <div className="font-bold text-lg timer-tabular">{d.mastered}</div>
            <div className="text-[11px]" style={{ color: "var(--ink-2)" }}>Mastered</div>
          </div>
          <div className="p-3 rounded-xl" style={{ background: "var(--bg)" }}>
            <div className="font-bold text-lg timer-tabular">{fmtDur(d.weekFocus)}</div>
            <div className="text-[11px]" style={{ color: "var(--ink-2)" }}>Focus this week</div>
          </div>
          <div className="p-3 rounded-xl" style={{ background: "var(--bg)" }}>
            <div className="font-bold text-lg timer-tabular">{d.totalDays}</div>
            <div className="text-[11px]" style={{ color: "var(--ink-2)" }}>Study days</div>
          </div>
        </div>
        {examMs > 0 && (
          <button onClick={onOpenCalendar} className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold" style={{ background: "var(--primary-bg)", color: "#6D28D9" }}>
            <Target size={15} /> {data.user.examName || "Exam"} · {Math.floor(examMs / 86400000)}d {Math.floor((examMs % 86400000) / 3600000)}h left →
          </button>
        )}
      </div>

      <h2 className="font-bold text-lg mt-6">Settings</h2>
      <div className="mt-3">
        <SettingsView bare onAddSubject={onAddSubject} />
      </div>
    </div>
  );
}
