"use client";

import { useState } from "react";
import { Crown, Flame, LogOut, Target, Trash2 } from "lucide-react";
import { fmtDur, useDerived, useStudy } from "@/lib/study-store";
import SettingsView from "./settings-view";
import { PremiumLockPanel } from "./premium-gate";

/** Student profile: identity + lifetime stats on top, all settings below. */
export default function ProfileView({ onAddSubject, onOpenCalendar }: {
  onAddSubject: () => void; onOpenCalendar: () => void;
}) {
  const { data, logout } = useStudy();
  const d = useDerived();
  if (!data) return null;
  const initial = (data.user.name || data.user.email || "S").slice(0, 1).toUpperCase();
  const examMs = data.user.examDate > Date.now() ? data.user.examDate - Date.now() : 0;
  const [arming, setArming] = useState(false);
  const [delPw, setDelPw] = useState("");
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  const deleteAccount = async () => {
    if (!delPw) {
      setDelError("Enter your password to confirm.");
      return;
    }
    setDelBusy(true);
    setDelError(null);
    try {
      const res = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: delPw }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Delete failed.");
      window.location.reload();
    } catch (e) {
      setDelError(e instanceof Error ? e.message : "Delete failed.");
    }
    setDelBusy(false);
  };

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

      <h2 className="font-bold text-lg mt-6">Premium</h2>
      <div className="mt-3">
        {data.user.isPremium ? (
          <div className="card p-4 flex items-center gap-2">
            <Crown size={18} style={{ color: "#7C3AED" }} />
            <div>
              <div className="font-bold text-sm">Premium member</div>
              <div className="text-xs" style={{ color: "var(--ink-2)" }}>AI flashcard generation is unlocked on your account.</div>
            </div>
          </div>
        ) : (
          <PremiumLockPanel />
        )}
      </div>

      <h2 className="font-bold text-lg mt-6">Settings</h2>
      <div className="mt-3">
        <SettingsView bare onAddSubject={onAddSubject} />
      </div>

      <div className="card p-4 mt-3" style={{ borderColor: "#EF4444" }}>
        <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: "#EF4444" }}>
          <Trash2 size={14} /> Danger zone
        </h3>
        {!arming ? (
          <button onClick={() => { setArming(true); setDelError(null); }} className="mt-2 px-4 py-2 text-xs font-bold rounded-xl" style={{ border: "1px solid #EF4444", color: "#EF4444" }}>
            Delete my account…
          </button>
        ) : (
          <div className="mt-2">
            <p className="text-xs font-semibold" style={{ color: "#EF4444" }}>
              Permanently deletes your account and ALL study data. This cannot be undone.
            </p>
            <input
              value={delPw}
              onChange={(e) => setDelPw(e.target.value)}
              type="password"
              placeholder="Current password to confirm"
              className="w-full mt-2 px-3 py-2 rounded-xl text-sm"
              style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
              aria-label="Current password"
            />
            {delError && <p className="text-xs font-semibold mt-1" style={{ color: "#EF4444" }} role="alert">{delError}</p>}
            <div className="flex gap-2 mt-2">
              <button onClick={() => { setArming(false); setDelPw(""); setDelError(null); }} className="flex-1 py-2 text-xs font-semibold rounded-xl" style={{ border: "1px solid var(--border)" }}>
                Keep my account
              </button>
              <button onClick={deleteAccount} disabled={delBusy} className="flex-1 py-2 text-xs font-bold rounded-xl text-white disabled:opacity-50" style={{ background: "#EF4444" }}>
                {delBusy ? "Deleting…" : "Yes, delete everything"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
