"use client";

import { useMemo } from "react";
import { dayKey, fmtDur, useDerived, useStudy } from "@/lib/study-store";
import { Dot, MiniStat } from "./shared";

export default function StatsView() {
  const { data } = useStudy();
  const d = useDerived();
  const sessions = useMemo(() => data?.sessions ?? [], [data]);
  const logs = useMemo(() => data?.logs ?? [], [data]);
  const subjects = useMemo(() => data?.subjects ?? [], [data]);
  const week = useMemo(() => {
    const arr: { k: string; label: string; sec: number; reviews: number; pomos: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(); dt.setHours(0, 0, 0, 0); dt.setDate(dt.getDate() - i);
      const k = dayKey(dt.getTime());
      const sess = sessions.filter((s) => dayKey(s.start) === k && s.kind === "focus");
      arr.push({
        k, label: dt.toLocaleDateString(undefined, { weekday: "narrow" }),
        sec: sess.reduce((a, s) => a + s.durationSec, 0),
        reviews: logs.filter((l) => dayKey(l.at) === k).length,
        pomos: sess.filter((s) => s.completed).length,
      });
    }
    return arr;
  }, [sessions, logs]);
  const maxSec = Math.max(1, ...week.map((w) => w.sec));
  const maxReviews = Math.max(1, ...week.map((w) => w.reviews));
  const maxPomos = Math.max(1, ...week.map((w) => w.pomos));
  const bySubject = subjects.map((s) => ({
    s, sec: sessions.filter((x) => x.subjectId === s.id).reduce((a, x) => a + x.durationSec, 0),
  })).sort((a, b) => b.sec - a.sec);
  const maxSub = Math.max(1, ...bySubject.map((b) => b.sec));
  const rereadSec = sessions.filter((x) => x.label === "reread").reduce((a, x) => a + x.durationSec, 0);
  return (
    <div>
      <h1 className="text-2xl font-bold">Statistics</h1>
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>Your progress provides the motivation.</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <MiniStat n={d.todayPomos} label={`sessions · ${fmtDur(d.todayFocus)} today`} />
        <MiniStat n={Math.round(d.weekFocus / 3600 * 10) / 10} label="hours this week" />
        <MiniStat n={d.retention} label="retention %" />
        <MiniStat n={d.streak >= 2 ? d.streak : 0} label={d.streak >= 2 ? `day streak · longest ${d.longest}` : "no streak yet — needs 2 days"} />
      </div>
      <div className="grid md:grid-cols-2 gap-3 mt-3">
        <div className="card p-4">
          <h3 className="font-bold text-sm">Study time — last 7 days</h3>
          <div className="flex items-end gap-2 h-32 mt-3" role="img" aria-label="Study time chart">
            {week.map((w) => (
              <div key={w.k} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-lg" style={{ height: `${Math.max(4, (w.sec / maxSec) * 100)}px`, background: "linear-gradient(180deg,#A78BFA,#7C3AED)" }} title={`${fmtDur(w.sec)}`} />
                <span className="text-[10px]" style={{ color: "var(--ink-2)" }}>{w.label}</span>
              </div>
            ))}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--ink-2)" }}>Week total {fmtDur(d.weekFocus)} · month {fmtDur(d.monthFocus)}</div>
        </div>
        <div className="card p-4">
          <h3 className="font-bold text-sm">Reviews & pomodoros — last 7 days</h3>
          <div className="flex items-end gap-2 h-32 mt-3">
            {week.map((w) => (
              <div key={w.k} className="flex-1 flex items-end justify-center gap-1 h-full">
                <div className="w-3 rounded-t" style={{ height: `${Math.max(3, (w.reviews / maxReviews) * 90)}px`, background: "#A78BFA" }} title={`${w.reviews} reviews`} />
                <div className="w-3 rounded-t" style={{ height: `${Math.max(3, (w.pomos / maxPomos) * 90)}px`, background: "#5B21B6" }} title={`${w.pomos} pomodoros`} />
              </div>
            ))}
          </div>
          <div className="text-xs mt-1 flex gap-3" style={{ color: "var(--ink-2)" }}><span><i className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: "#A78BFA" }} />reviews</span><span><i className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: "#5B21B6" }} />pomodoros</span></div>
        </div>
      </div>
      <div className="card p-4 mt-3">
        <h3 className="font-bold text-sm">Subject distribution</h3>
        <div className="mt-2 flex flex-col gap-2">
          {bySubject.map(({ s, sec }) => (
            <div key={s.id} className="flex items-center gap-2 text-sm">
              <Dot color={s.color} /><span className="w-32 truncate">{s.name}</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                <div className="h-full progress-anim" style={{ width: `${(sec / maxSub) * 100}%`, background: s.color }} />
              </div>
              <span className="text-xs w-16 text-right" style={{ color: "var(--ink-2)" }}>{fmtDur(sec)}</span>
            </div>
          ))}
          {bySubject.length === 0 && <span className="text-sm" style={{ color: "var(--ink-2)" }}>No data yet.</span>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 text-center">
          <div className="p-3 rounded-xl" style={{ background: "var(--bg)" }}><div className="font-bold">{logs.length}</div><div className="text-[11px]" style={{ color: "var(--ink-2)" }}>Cards reviewed</div></div>
          <div className="p-3 rounded-xl" style={{ background: "var(--bg)" }}><div className="font-bold">{d.mastered}</div><div className="text-[11px]" style={{ color: "var(--ink-2)" }}>Mastered</div></div>
          <div className="p-3 rounded-xl" style={{ background: "var(--bg)" }}><div className="font-bold">{sessions.filter((s) => s.completed && s.kind === "focus").length}</div><div className="text-[11px]" style={{ color: "var(--ink-2)" }}>Focus sessions</div></div>
          <div className="p-3 rounded-xl" style={{ background: "var(--bg)" }}><div className="font-bold">{d.totalDays}</div><div className="text-[11px]" style={{ color: "var(--ink-2)" }}>Study days</div></div>
        </div>
        <div className="text-xs mt-2" style={{ color: "var(--ink-2)" }}>↻ Re-read (revision) time banked: <b style={{ color: "var(--ink)" }}>{fmtDur(rereadSec)}</b></div>
      </div>
    </div>
  );
}
