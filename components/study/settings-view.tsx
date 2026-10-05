"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { requestNotificationPermission, useStudy } from "@/lib/study-store";
import { NumField, Toggle } from "./shared";

function AiKeyForm({ hasKey }: { hasKey: boolean }) {
  const { pushToast } = useStudy();
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(hasKey);
  const [busy, setBusy] = useState(false);
  const save = async (clear = false) => {
    setBusy(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: { aiKey: clear ? "" : key.trim() } }),
      });
      if (!res.ok) throw new Error();
      setSaved(!clear);
      setKey("");
      pushToast({ title: clear ? "AI key removed" : "AI key saved — generation unlocked" });
    } catch {
      pushToast({ title: "Couldn't save the key" });
    }
    setBusy(false);
  };
  return (
    <div className="mt-2">
      <div className="text-xs font-bold" style={{ color: saved ? "#22C55E" : "var(--ink-2)" }}>
        {saved ? "● AI ready" : "○ AI not set up"}
      </div>
      <div className="flex gap-2 mt-2">
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="gsk_… paste Groq key" type="password"
          onKeyDown={(e) => { if (e.key === "Enter" && key.trim()) save(); }}
          className="flex-1 min-w-0 px-3 py-2 rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Groq API key" autoComplete="off" />
        <button onClick={() => save()} disabled={busy || !key.trim()} className="btn-primary px-4 py-2 text-sm shrink-0 disabled:opacity-50">Save</button>
        {saved && <button onClick={() => save(true)} disabled={busy} className="px-3 py-2 text-xs font-bold shrink-0" style={{ color: "#EF4444" }}>Remove</button>}
      </div>
    </div>
  );
}

export default function SettingsView({ onAddSubject, bare }: { onAddSubject: () => void; bare?: boolean }) {
  const { data, updateUser, updatePomo, resetAll, exportData, pushToast } = useStudy();
  if (!data) return null;
  return (
    <div className="max-w-2xl">
      {!bare && <h1 className="text-2xl font-bold">Settings</h1>}
      <div className="card p-4 mt-4">
        <h3 className="font-bold text-sm">Profile</h3>
        <div className="grid sm:grid-cols-2 gap-2 mt-2">
          <label className="text-xs flex flex-col gap-1">Name<input value={data.user.name} onChange={(e) => updateUser({ name: e.target.value })} className="px-3 py-2 rounded-lg text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Name" /></label>
          <label className="text-xs flex flex-col gap-1">Email<input value={data.user.email} onChange={(e) => updateUser({ email: e.target.value })} className="px-3 py-2 rounded-lg text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Email" /></label>
        </div>
      </div>
      <div className="card p-4 mt-3">
        <h3 className="font-bold text-sm">Study preferences</h3>
        <div className="mt-2 flex flex-col gap-2 text-sm">
          <Toggle label="Review reminders" on={data.user.reminders} set={(v) => updateUser({ reminders: v })} />
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs flex flex-col gap-1">Morning<input type="time" value={data.user.morning} onChange={(e) => updateUser({ morning: e.target.value })} className="px-2 py-1.5 rounded-lg" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Reminder time" /></label>
            <label className="text-xs flex flex-col gap-1">Evening<input type="time" value={data.user.evening} onChange={(e) => updateUser({ evening: e.target.value })} className="px-2 py-1.5 rounded-lg" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Evening reminder" /></label>
            <label className="text-xs flex flex-col gap-1">Frequency
              <select value={data.user.frequency} onChange={(e) => updateUser({ frequency: e.target.value as "daily" | "twice" | "custom" })} className="px-2 py-1.5 rounded-lg" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Reminder frequency">
                <option value="daily">Once daily</option><option value="twice">Twice daily</option><option value="custom">Custom</option>
              </select>
            </label>
          </div>
          <button onClick={() => { requestNotificationPermission(); pushToast({ title: "Notifications", body: "Permission requested. Short relearning reminders use 10-min in-app toasts." }); }} className="text-xs font-bold self-start" style={{ color: "#7C3AED" }}>Enable browser notifications</button>
        </div>
      </div>
      <div className="card p-4 mt-3">
        <h3 className="font-bold text-sm">Target exam</h3>
        <div className="grid sm:grid-cols-2 gap-2 mt-2">
          <label className="text-xs flex flex-col gap-1">Country
            <select value={data.user.country} onChange={(e) => updateUser({ country: e.target.value })} className="px-3 py-2 rounded-lg text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Country">
              <option value="">Not set</option>
              <option value="nepal">🇳🇵 Nepal</option>
              <option value="india">🇮🇳 India</option>
              <option value="usa">🇺🇸 USA</option>
            </select>
          </label>
          <label className="text-xs flex flex-col gap-1">Exam<input value={data.user.examName} onChange={(e) => updateUser({ examName: e.target.value })} placeholder="e.g. IOE Entrance" className="px-3 py-2 rounded-lg text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Exam name" /></label>
          <label className="text-xs flex flex-col gap-1">Exam date<input type="date" value={data.user.examDate ? new Date(data.user.examDate).toISOString().slice(0, 10) : ""} onChange={(e) => { const ts = e.target.value ? new Date(e.target.value + "T00:00:00").getTime() : 0; updateUser({ examDate: ts }); }} className="px-3 py-2 rounded-lg text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Exam date" /></label>
        </div>
        <p className="text-[11px] mt-1" style={{ color: "var(--ink-2)" }}>Drives the Calendar countdown and the day-by-day chapter plan.</p>
      </div>
      <div className="card p-4 mt-3">
        <h3 className="font-bold text-sm">Theme</h3>
        <div className="flex gap-2 mt-2">
          {(["light", "dark", "system"] as const).map((t) => (
            <button key={t} onClick={() => updateUser({ theme: t })} className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize ${data.user.theme === t ? "text-white" : ""}`} style={data.user.theme === t ? { background: "#7c3aed" } : { border: "1px solid var(--border)" }}>{t}</button>
          ))}
        </div>
        <p className="text-[11px] mt-1" style={{ color: "var(--ink-2)" }}>Dark mode uses deep purple / near-black backgrounds.</p>
      </div>
      <div className="card p-4 mt-3">
        <h3 className="font-bold text-sm flex items-center gap-1.5"><Sparkles size={14} /> AI flashcard generation</h3>
        <p className="text-[11px] mt-1" style={{ color: "var(--ink-2)" }}>
          Powered by Meta&apos;s Llama (free via Groq). Get a free key at console.groq.com — it stays on the server, never shared.
        </p>
        <AiKeyForm hasKey={data.user.hasAiKey} />
      </div>
      <div className="card p-4 mt-3">
        <h3 className="font-bold text-sm">Daily focus goal</h3>
        <div className="flex items-center gap-2 mt-2">
          <input type="number" min={15} max={720} step={15} value={data.user.focusGoal || 120}
            onChange={(e) => updateUser({ focusGoal: Math.max(15, Math.min(720, Number(e.target.value) || 120)) })}
            className="px-3 py-2 rounded-lg text-sm w-28" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Daily focus goal in minutes" />
          <span className="text-xs" style={{ color: "var(--ink-2)" }}>minutes of focus per day. The dashboard tracks this.</span>
        </div>
      </div>
      <div className="card p-4 mt-3">
        <h3 className="font-bold text-sm">Pomodoro defaults</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
          <NumField label="Focus" value={data.pomo.focusMin} set={(v) => updatePomo({ focusMin: v })} />
          <NumField label="Short" value={data.pomo.shortMin} set={(v) => updatePomo({ shortMin: v })} />
          <NumField label="Long" value={data.pomo.longMin} set={(v) => updatePomo({ longMin: v })} />
          <NumField label="Before long" value={data.pomo.sessionsBeforeLong} set={(v) => updatePomo({ sessionsBeforeLong: v })} />
        </div>
      </div>
      <div className="card p-4 mt-3">
        <h3 className="font-bold text-sm">Data</h3>
        <div className="flex flex-wrap gap-2 mt-2">
          <button onClick={exportData} className="px-4 py-2 text-sm font-semibold rounded-xl" style={{ border: "1px solid var(--border)" }}>Export data</button>
          <button onClick={onAddSubject} className="px-4 py-2 text-sm font-semibold rounded-xl" style={{ border: "1px solid var(--border)" }}>+ Subject</button>
          <button onClick={() => { if (confirm("Reset all study data?")) resetAll(); }} className="px-4 py-2 text-sm font-semibold rounded-xl" style={{ color: "#EF4444", border: "1px solid var(--border)" }}>Reset study data</button>
        </div>
      </div>
    </div>
  );
}
