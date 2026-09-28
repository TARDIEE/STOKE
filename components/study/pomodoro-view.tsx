"use client";

import { useEffect, useState } from "react";
import { fmtClock, fmtDur, useDerived, useStudy } from "@/lib/study-store";
import { NumField, SessionRow, Toggle, type View } from "./shared";

export default function PomodoroView({ go }: { go: (v: View) => void }) {
  const s = useStudy();
  const { data, pomoMode, pomoRunning, pomoRemaining, pomoTotal, pomoCycle, pomoStart, pomoPause, pomoResume, pomoReset, pomoSkip, setPomoContext, updatePomo, pomoLabel, setPomoLabel } = s;
  const d = useDerived();
  const [showSettings, setShowSettings] = useState(false);
  const pct = pomoTotal ? 1 - pomoRemaining / pomoTotal : 0;
  const R = 92;
  const C = 2 * Math.PI * R;
  const accent = pomoMode === "focus" ? "#7C3AED" : pomoMode === "short" ? "#22C55E" : "#0EA5E9";
  const label = pomoMode === "focus" ? "FOCUS" : pomoMode === "short" ? "SHORT BREAK" : "LONG BREAK";

  useEffect(() => {
    document.title = `${fmtClock(pomoRemaining)} · ${label} — Stoke`;
    return () => { document.title = "Stoke — Study, Remember, Focus"; };
  }, [pomoRemaining, label]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.code === "Space" && (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA")) {
        e.preventDefault();
        if (pomoRunning) pomoPause(); else if (pomoRemaining >= pomoTotal) pomoStart(); else pomoResume();
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [pomoRunning, pomoRemaining, pomoTotal, pomoPause, pomoResume, pomoStart]);

  if (!data) return null;

  const today = data.sessions.filter((x) => x.start >= d.t0);

  return (
    <div className="max-w-xl mx-auto text-center">
      <div className="flex justify-center gap-2 mt-1" role="tablist" aria-label="Pomodoro modes">
        {(["focus", "short", "long"] as const).map((m) => (
          <button key={m} role="tab" aria-selected={pomoMode === m} onClick={() => { pomoStart(m); }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${pomoMode === m ? "text-white" : ""}`}
            style={pomoMode === m ? { background: accent } : { border: "1px solid var(--border)", color: "var(--ink-2)" }}>
            {m === "focus" ? "Focus" : m === "short" ? "Short Break" : "Long Break"}
          </button>
        ))}
      </div>

      <div className={`relative w-64 h-64 mx-auto mt-6 ${pomoRunning ? "pulse-ring rounded-full" : ""}`}>
        <svg viewBox="0 0 220 220" className="w-full h-full -rotate-90">
          <circle cx="110" cy="110" r={R} fill="none" strokeWidth="10" style={{ stroke: "var(--border)" }} />
          <circle cx="110" cy="110" r={R} fill="none" stroke={accent} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ transition: "stroke-dashoffset .4s linear" }} />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div>
            <div className="text-5xl font-bold timer-tabular tracking-tight">{fmtClock(pomoRemaining)}</div>
            <div className="text-xs font-bold tracking-[0.2em] mt-1" style={{ color: accent }}>{label}</div>
            <div className="text-xs mt-1" style={{ color: "var(--ink-2)" }}>Session {Math.min(pomoCycle, data.pomo.sessionsBeforeLong)} of {data.pomo.sessionsBeforeLong}</div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-2 mt-5">
        {!pomoRunning && pomoRemaining >= pomoTotal ? (
          <button onClick={() => pomoStart()} className="btn-primary px-8 py-2.5 text-sm">Start</button>
        ) : pomoRunning ? (
          <button onClick={pomoPause} className="btn-primary px-8 py-2.5 text-sm">Pause</button>
        ) : (
          <button onClick={pomoResume} className="btn-primary px-8 py-2.5 text-sm">Resume</button>
        )}
        <button onClick={pomoReset} className="px-5 py-2.5 text-sm font-semibold rounded-xl" style={{ border: "1px solid var(--border)" }}>Reset</button>
        <button onClick={pomoSkip} className="px-5 py-2.5 text-sm font-semibold rounded-xl" style={{ border: "1px solid var(--border)" }}>Skip</button>
      </div>

      <div className="flex justify-center gap-2 mt-4" role="group" aria-label="Session intent">
        <button onClick={() => setPomoLabel("learn")} aria-pressed={pomoLabel === "learn"}
          className={`px-4 py-1.5 rounded-full text-xs font-bold ${pomoLabel === "learn" ? "text-white" : ""}`}
          style={pomoLabel === "learn" ? { background: "#7C3AED" } : { border: "1px solid var(--border)", color: "var(--ink-2)" }}>
          📖 Learn new
        </button>
        <button onClick={() => setPomoLabel("reread")} aria-pressed={pomoLabel === "reread"}
          className={`px-4 py-1.5 rounded-full text-xs font-bold ${pomoLabel === "reread" ? "text-white" : ""}`}
          style={pomoLabel === "reread" ? { background: "#F59E0B" } : { border: "1px solid var(--border)", color: "var(--ink-2)" }}>
          ↻ Re-read (revision)
        </button>
      </div>
      {pomoLabel === "reread" && (
        <p className="text-xs mt-2" style={{ color: "var(--ink-2)" }}>Re-read mode: revise what you already read — no new chapters.</p>
      )}

      <div className="flex justify-center gap-2 mt-4">
        <select value={s.pomoSubjectId ?? ""} onChange={(e) => setPomoContext(e.target.value || null, null)} className="text-sm px-3 py-2 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }} aria-label="Pomodoro subject">
          <option value="">General focus</option>
          {data.subjects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        {s.pomoSubjectId && (
          <select value={s.pomoChapterId ?? ""} onChange={(e) => setPomoContext(s.pomoSubjectId, e.target.value || null)} className="text-sm px-3 py-2 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }} aria-label="Pomodoro chapter">
            <option value="">Any chapter</option>
            {data.chapters.filter((c) => c.subjectId === s.pomoSubjectId).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        )}
        <button onClick={() => setShowSettings(!showSettings)} className="text-sm px-3 py-2 rounded-xl font-semibold" style={{ border: "1px solid var(--border)" }} aria-expanded={showSettings}>Settings</button>
      </div>

      {showSettings && (
        <div className="card p-4 mt-3 text-left fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <NumField label="Focus (min)" value={data.pomo.focusMin} set={(v) => updatePomo({ focusMin: v })} />
            <NumField label="Short (min)" value={data.pomo.shortMin} set={(v) => updatePomo({ shortMin: v })} />
            <NumField label="Long (min)" value={data.pomo.longMin} set={(v) => updatePomo({ longMin: v })} />
            <NumField label="Sessions → long" value={data.pomo.sessionsBeforeLong} set={(v) => updatePomo({ sessionsBeforeLong: v })} />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
            <Toggle label="Auto-start breaks" on={data.pomo.autoStartBreaks} set={(v) => updatePomo({ autoStartBreaks: v })} />
            <Toggle label="Auto-start focus" on={data.pomo.autoStartFocus} set={(v) => updatePomo({ autoStartFocus: v })} />
            <Toggle label="Sound" on={data.pomo.sound} set={(v) => updatePomo({ sound: v })} />
            <Toggle label="Vibration" on={data.pomo.vibration} set={(v) => updatePomo({ vibration: v })} />
            <Toggle label="Notifications" on={data.pomo.notifications} set={(v) => updatePomo({ notifications: v })} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mt-4 text-left">
        <div className="card p-4"><div className="text-xs" style={{ color: "var(--ink-2)" }}>Today&apos;s Pomodoros</div><div className="text-2xl font-bold">{d.todayPomos}</div></div>
        <div className="card p-4"><div className="text-xs" style={{ color: "var(--ink-2)" }}>Today&apos;s Focus Time</div><div className="text-2xl font-bold">{fmtDur(d.todayFocus)}</div></div>
      </div>

      <div className="card p-4 mt-3 text-left">
        <h3 className="font-bold text-sm">Today&apos;s sessions</h3>
        <div className="mt-2 flex flex-col gap-1.5 text-sm">
          {today.slice(0, 6).map((x) => <SessionRow key={x.id} sid={x.subjectId} cid={x.chapterId} text={`${fmtDur(x.durationSec)} · ${x.completed ? "Completed" : "Interrupted"}`} date={x.start} label={x.label} />)}
          {today.length === 0 && <span className="text-sm" style={{ color: "var(--ink-2)" }}>No sessions yet today.</span>}
        </div>
        <button onClick={() => go("stats")} className="text-xs font-bold mt-2" style={{ color: "#7C3AED" }}>View statistics →</button>
      </div>
    </div>
  );
}
