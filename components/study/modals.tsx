"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Circle, Layers, Shapes, Sparkles, Timer, Zap } from "lucide-react";
import { requestNotificationPermission, useStudy, type Flashcard } from "@/lib/study-store";
import { Modal, type View } from "./shared";
import { PremiumLockPanel } from "./premium-gate";

export function QuickAdd({ close, onSubject, onChapter, onCard, go }: { close: () => void; onSubject: () => void; onChapter: () => void; onCard: () => void; go: (v: View) => void }) {
  const { logSession, pushToast } = useStudy();
  return (
    <Modal close={close} label="Quick add">
      <h3 className="font-bold text-lg">+ Add</h3>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button onClick={onSubject} className="p-3 rounded-xl text-sm font-semibold text-left flex flex-col gap-1.5" style={{ border: "1px solid var(--border)" }}><Shapes size={18} />Subject</button>
        <button onClick={onChapter} className="p-3 rounded-xl text-sm font-semibold text-left flex flex-col gap-1.5" style={{ border: "1px solid var(--border)" }}><CalendarDays size={18} />Chapter</button>
        <button onClick={onCard} className="p-3 rounded-xl text-sm font-semibold text-left flex flex-col gap-1.5" style={{ border: "1px solid var(--border)" }}><Layers size={18} />Flashcard</button>
        <button onClick={() => { const now = Date.now(); logSession({ subjectId: null, chapterId: null, start: now - 25 * 60000, end: now, durationSec: 25 * 60, kind: "focus", completed: true, label: "learn" }); pushToast({ title: "Study session logged", body: "25 min added." }); close(); }} className="p-3 rounded-xl text-sm font-semibold text-left flex flex-col gap-1.5" style={{ border: "1px solid var(--border)" }}><Timer size={18} />Study session</button>
      </div>
      <button onClick={() => { go("pomodoro"); close(); }} className="btn-primary w-full py-2.5 text-sm mt-3">Start Pomodoro</button>
    </Modal>
  );
}

export function SearchOverlay({ close, openSubject, openChapter, goReview }: {
  close: () => void; openSubject: (id: string) => void; openChapter: (s: string, c: string) => void; goReview: (cardId: string) => void;
}) {
  const { data } = useStudy();
  const [q, setQ] = useState("");
  const res = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const subjects = data?.subjects ?? [];
    const chapters = data?.chapters ?? [];
    const cards = data?.cards ?? [];
    if (!needle) return { s: [], c: [], f: [] as Flashcard[] };
    return {
      s: subjects.filter((x) => x.name.toLowerCase().includes(needle)).slice(0, 5),
      c: chapters.filter((x) => x.name.toLowerCase().includes(needle)).slice(0, 5),
      f: cards.filter((x) => x.front.toLowerCase().includes(needle) || x.back.toLowerCase().includes(needle)).slice(0, 8),
    };
  }, [q, data]);
  return (
    <div className="fixed inset-0 z-40 p-4" role="dialog" aria-modal="true" aria-label="Global search">
      <div className="absolute inset-0" style={{ background: "rgba(15,10,31,.45)" }} onClick={close} />
      <div className="card relative max-w-lg mx-auto mt-10 p-4 fade-in">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder='Search subjects, chapters, flashcards… e.g. "Newton"'
          className="w-full px-3 py-2.5 rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Search" />
        <div className="mt-2 max-h-80 overflow-auto text-sm">
          {res.s.map((x) => <button key={x.id} onClick={() => { openSubject(x.id); close(); }} className="w-full text-left px-2 py-2 rounded-lg hover:opacity-80 flex items-center gap-2"><Shapes size={15} className="shrink-0" /> {x.name}</button>)}
          {res.c.map((x) => <button key={x.id} onClick={() => { openChapter(x.subjectId, x.id); close(); }} className="w-full text-left px-2 py-2 rounded-lg flex items-center gap-2"><CalendarDays size={15} className="shrink-0" /> {x.name}</button>)}
          {res.f.map((x) => <button key={x.id} onClick={() => { goReview(x.id); close(); }} className="w-full text-left px-2 py-2 rounded-lg flex items-start gap-2"><Layers size={15} className="shrink-0 mt-0.5" /> <span>{x.front}<span className="block text-xs" style={{ color: "var(--ink-2)" }}>{x.back.slice(0, 80)}</span></span></button>)}
          {q && res.s.length + res.c.length + res.f.length === 0 && <div className="p-3 text-sm" style={{ color: "var(--ink-2)" }}>No results for “{q}”.</div>}
        </div>
      </div>
    </div>
  );
}

/** AI flashcard generator (Meta Llama, free via Groq). Preview, pick, add. */
function AiGenerator({ topicDefault, chapterId, sourceNotes, onAdd }: {
  topicDefault: string; chapterId: string; sourceNotes?: string;
  onAdd: (cards: { front: string; back: string }[]) => void;
}) {
  const { data, pushToast } = useStudy();
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState(topicDefault);
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<{ front: string; back: string }[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  // Inline AI setup: no key → paste it here instead of hunting Settings.
  const [needKey, setNeedKey] = useState(false);
  const [key, setKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);

  const generate = async (fromNotes = false) => {
    if (!topic.trim()) { pushToast({ title: "Describe the topic first" }); return; }
    setBusy(true);
    setSuggestions([]);
    try {
      const res = await fetch("/api/ai/flashcards", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), count, chapterId, notes: fromNotes ? sourceNotes : undefined }),
      });
      const body = await res.json();
      if (!res.ok) {
        if (res.status === 501 || (res.status === 502 && /busy/i.test(String(body?.error ?? "")))) setNeedKey(true);
        throw new Error(body?.error || "Generation failed.");
      }
      setNeedKey(false);
      setSuggestions(body.cards);
      setPicked(new Set(body.cards.map((_: unknown, i: number) => i)));
    } catch (e) {
      pushToast({ title: "AI generation failed", body: e instanceof Error ? e.message : undefined });
    }
    setBusy(false);
  };

  const saveKeyAndRetry = async () => {
    if (!key.trim()) return;
    setSavingKey(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: { aiKey: key.trim() } }),
      });
      if (!res.ok) throw new Error();
      setKey("");
      setNeedKey(false);
      pushToast({ title: "AI key saved — generating" });
      await generate();
    } catch {
      pushToast({ title: "Couldn't save the key" });
    }
    setSavingKey(false);
  };

  const togglePick = (i: number) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="mt-3 rounded-xl" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
      <button onClick={() => setOpen(!open)} className="w-full text-left px-3 py-2.5 text-sm font-bold" aria-expanded={open}>
        <span className="inline-flex items-center gap-1.5"><Sparkles size={14} /> Generate with AI</span> <span className="font-normal" style={{ color: "var(--ink-2)" }}>— Llama makes the cards for you</span>
      </button>
      {open && (
        <div className="px-3 pb-3">
          {needKey && !data?.user.hasAiKey && (
            <div className="p-2.5 rounded-xl mb-2" style={{ background: "var(--primary-bg)", border: "1px solid var(--border)" }}>
              <div className="text-xs font-bold" style={{ color: "#6D28D9" }}>Built-in AI is struggling — a free Groq key makes it reliable.</div>
              <div className="text-[11px] mt-0.5" style={{ color: "var(--ink-2)" }}>Free at console.groq.com → API keys. Paste it here, once.</div>
              <div className="flex gap-2 mt-2">
                <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="gsk_… paste key" type="password"
                  onKeyDown={(e) => { if (e.key === "Enter" && key.trim()) saveKeyAndRetry(); }}
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--card)" }} aria-label="Groq API key" autoComplete="off" />
                <button onClick={saveKeyAndRetry} disabled={savingKey || !key.trim()} className="btn-primary px-4 py-2 text-sm shrink-0 disabled:opacity-50">
                  {savingKey ? "…" : "Save & Go"}
                </button>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Newton's laws of motion"
              className="flex-1 min-w-0 px-3 py-2 rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--card)" }} aria-label="AI topic" />
            <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="px-2 py-2 rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--card)" }} aria-label="Card count">
              {[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <button onClick={() => generate(false)} disabled={busy} className="btn-primary px-4 py-2 text-sm shrink-0 disabled:opacity-50">{busy ? "…" : "Go"}</button>
          </div>
          {sourceNotes?.trim() ? (
            <button onClick={() => generate(true)} disabled={busy} className="w-full mt-2 px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-50" style={{ background: "var(--primary-bg)", color: "#6D28D9" }}>
              {busy ? "Reading notes…" : "Generate from my chapter notes instead"}
            </button>
          ) : null}
          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-col gap-1.5 max-h-56 overflow-auto">
              {suggestions.map((c, i) => (
                <button key={i} onClick={() => togglePick(i)} className="text-left p-2 rounded-lg text-sm flex gap-2 items-start" style={{ border: picked.has(i) ? "1.5px solid #7C3AED" : "1px solid var(--border)", background: "var(--card)", opacity: picked.has(i) ? 1 : 0.6 }} aria-pressed={picked.has(i)}>
                  <span className="font-bold" style={{ color: "#7C3AED" }}>{picked.has(i) ? <Check size={15} strokeWidth={3} /> : <Circle size={15} />}</span>
                  <span className="min-w-0"><b>{c.front}</b><span className="block text-xs" style={{ color: "var(--ink-2)" }}>{c.back.slice(0, 120)}</span></span>
                </button>
              ))}
            </div>
          )}
          {suggestions.length > 0 && (
            <button
              onClick={() => { const sel = suggestions.filter((_, i) => picked.has(i)); if (sel.length) onAdd(sel); }}
              disabled={picked.size === 0}
              className="btn-primary w-full py-2.5 text-sm mt-2 disabled:opacity-50">
              Add {picked.size} card{picked.size === 1 ? "" : "s"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** One-tap full chapter set: cards for every subtopic (up to 20). */
function BulkChapterButton({ chapterId, chapterName, onAdd }: {
  chapterId: string; chapterName: string;
  onAdd: (cards: { front: string; back: string }[], info: { failed: number; topics: number }) => void;
}) {
  const { pushToast } = useStudy();
  const [busy, setBusy] = useState("");
  const run = async () => {
    setBusy("Starting…");
    try {
      const res = await fetch("/api/ai/flashcards/bulk", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId, perTopic: 2 }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Bulk generation failed.");
      setBusy("");
      onAdd(body.cards, { failed: body.failed ?? 0, topics: body.topics ?? 0 });
    } catch (e) {
      setBusy("");
      pushToast({ title: "Bulk generation failed", body: e instanceof Error ? e.message : undefined });
    }
  };
  return (
    <button onClick={run} disabled={!!busy} className="w-full mt-2 px-3 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-1.5" style={{ background: "linear-gradient(135deg,#7C3AED,#5B21B6)", color: "#fff" }}>
      <Zap size={15} /> {busy || `Full chapter set — ${chapterName || "all subtopics"}`}
    </button>
  );
}

export function CardModal({ editId, subjectId, chapterId, close, inline }: { editId?: string; subjectId?: string; chapterId?: string; close: () => void; inline?: boolean }) {
  const { data, addCard, addCards, updateCard, pushToast } = useStudy();
  const existing = editId ? data?.cards.find((c) => c.id === editId) : undefined;
  const [front, setFront] = useState(existing?.front ?? "");
  const [back, setBack] = useState(existing?.back ?? "");
  const [sid, setSid] = useState(existing?.subjectId ?? subjectId ?? data?.subjects[0]?.id ?? "");
  const [cid, setCid] = useState(existing?.chapterId ?? chapterId ?? "");
  const [tags, setTags] = useState((existing?.tags ?? []).join(", "));
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const chapters = (data?.chapters ?? []).filter((c) => c.subjectId === sid);
  useEffect(() => { if (!cid && chapters[0]) setCid(chapters[0].id); }, [sid]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!data) return null;
  const activeChapter = chapters.find((c) => c.id === cid) ?? chapters[0];
  const body = (
    <>
      <h3 className="font-bold text-lg">{existing ? "Edit flashcard" : "New flashcard"}</h3>
      {!existing && (
        <>
          {data?.user.isPremium ? (
            <>
              <AiGenerator
            topicDefault={activeChapter ? `${data.subjects.find((s) => s.id === sid)?.name ?? ""} — ${activeChapter.name}` : ""}
            chapterId={cid}
            sourceNotes={chapters.find((c) => c.id === cid)?.notes}
            onAdd={(cards) => {
              addCards(cards.map((c) => ({ subjectId: sid, chapterId: cid || chapters[0]?.id || "", front: c.front, back: c.back, tags: ["ai"], notes: "" })));
              pushToast({ title: `${cards.length} AI cards added`, body: "Scheduled for review today." });
              close();
            }}
          />
          <BulkChapterButton
            chapterId={cid || chapters[0]?.id || ""}
            chapterName={activeChapter?.name ?? ""}
            onAdd={(cards, info) => {
              addCards(cards.map((c) => ({ subjectId: sid, chapterId: cid || chapters[0]?.id || "", front: c.front, back: c.back, tags: ["ai"], notes: "" })));
              pushToast({
                title: `${cards.length} AI cards added`,
                body: info.failed > 0
                  ? `${info.failed} subtopic(s) skipped while busy — the rest are covered.`
                  : "Full chapter coverage — scheduled for review today.",
              });
              close();
            }}
          />
            </>
          ) : (
            <PremiumLockPanel />
          )}
        </>
      )}
      <label className="text-xs font-medium block mt-3">Front — question<textarea value={front} onChange={(e) => setFront(e.target.value)} rows={2} placeholder="Write your question…" className="w-full mt-1 px-3 py-2 rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Card front" /></label>
      <label className="text-xs font-medium block mt-2">Back — answer<textarea value={back} onChange={(e) => setBack(e.target.value)} rows={2} placeholder="Write your answer…" className="w-full mt-1 px-3 py-2 rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Card back" /></label>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <label className="text-xs flex flex-col gap-1">Subject<select value={sid} onChange={(e) => setSid(e.target.value)} className="px-2 py-2 rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Subject">{data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label className="text-xs flex flex-col gap-1">Chapter<select value={cid} onChange={(e) => setCid(e.target.value)} className="px-2 py-2 rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Chapter">{chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      </div>
      <label className="text-xs font-medium block mt-2">Tags<input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="comma, separated" className="w-full mt-1 px-3 py-2 rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Tags" /></label>
      <label className="text-xs font-medium block mt-2">Extra notes (formula, diagram notes)<input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="w-full mt-1 px-3 py-2 rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Extra notes" /></label>
      <div className="flex gap-2 mt-4">
        <button onClick={close} className="flex-1 py-2.5 text-sm font-semibold rounded-xl" style={{ border: "1px solid var(--border)" }}>Cancel</button>
        <button onClick={() => {
          if (!front.trim() || !back.trim() || !sid) { pushToast({ title: "Add a question, answer and subject" }); return; }
          const payload = { subjectId: sid, chapterId: cid || chapters[0]?.id || "", front: front.trim(), back: back.trim(), tags: tags.split(",").map((t) => t.trim()).filter(Boolean), notes: notes.trim() };
          if (existing) updateCard(existing.id, payload); else addCard(payload);
          pushToast({ title: "Flashcard saved", body: "Review scheduled for today." });
          close();
        }} className="btn-primary flex-1 py-2.5 text-sm">Save Card</button>
      </div>
    </>
  );
  if (inline) return <div className="card p-4">{body}</div>;
  return <Modal close={close} label="Flashcard editor"><div>{body}</div></Modal>;
}

export function SubjectModal({ close }: { close: () => void }) {
  const { addSubject, pushToast } = useStudy();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [color, setColor] = useState("#7C3AED");
  return (
    <Modal close={close} label="New subject">
      <h3 className="font-bold text-lg">New subject</h3>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Biology" className="w-full mt-3 px-3 py-2 rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Subject name" />
      <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Short description" className="w-full mt-2 px-3 py-2 rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Subject description" />
      <div className="flex gap-2 mt-2">
        {["#7C3AED", "#0EA5E9", "#22C55E", "#F59E0B", "#EF4444"].map((c) => (
          <button key={c} onClick={() => setColor(c)} className="w-8 h-8 rounded-full" style={{ background: c, outline: color === c ? "2px solid #18181B" : "none" }} aria-label={`Color ${c}`} />
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={close} className="flex-1 py-2.5 text-sm rounded-xl" style={{ border: "1px solid var(--border)" }}>Cancel</button>
        <button onClick={() => { if (!name.trim()) return; addSubject(name.trim(), desc.trim(), color); pushToast({ title: "Subject created" }); close(); }} className="btn-primary flex-1 py-2.5 text-sm">Create</button>
      </div>
    </Modal>
  );
}

export function ChapterModal({ subjectId, close }: { subjectId: string; close: () => void }) {
  const { addChapter, pushToast } = useStudy();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  return (
    <Modal close={close} label="New chapter">
      <h3 className="font-bold text-lg">New chapter</h3>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Thermodynamics" className="w-full mt-3 px-3 py-2 rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Chapter name" />
      <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Short description" className="w-full mt-2 px-3 py-2 rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Chapter description" />
      <div className="flex gap-2 mt-4">
        <button onClick={close} className="flex-1 py-2.5 text-sm rounded-xl" style={{ border: "1px solid var(--border)" }}>Cancel</button>
        <button onClick={() => { if (!name.trim()) return; addChapter(subjectId, name.trim(), desc.trim(), ""); pushToast({ title: "Chapter created" }); close(); }} className="btn-primary flex-1 py-2.5 text-sm">Create</button>
      </div>
    </Modal>
  );
}

export function Onboarding({ step, setStep }: { step: number; setStep: (n: number) => void }) {
  const { data, updateUser, updatePomo, setOnboarded, addSubject, pushToast, refresh } = useStudy();
  const [name, setName] = useState(data?.user.name && data.user.name !== "Student" ? data.user.name : "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [exams, setExams] = useState<{ id: string; name: string; region: string; tagline: string; subjects: string[]; chapters: number; country: string; level: string; grade: number | null }[]>([]);
  const [countries, setCountries] = useState<{ id: string; name: string; flag: string }[]>([]);
  const [country, setCountry] = useState("");
  const [countryError, setCountryError] = useState<string | null>(null);
  const [examId, setExamId] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examError, setExamError] = useState<string | null>(null);
  const presets = ["Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "English"];
  const LAST = 5;
  useEffect(() => {
    fetch("/api/exams").then((r) => r.json()).then((b) => {
      setExams(b.exams);
      if (Array.isArray(b.countries)) setCountries(b.countries);
    }).catch(() => {});
  }, []);
  if (!data) return null;
  const visibleExams = country ? exams.filter((e) => e.country === country) : exams;
  const finish = async () => {
    // Save the country first — it decides the exam list everywhere.
    if (country) updateUser({ country });
    // If an exam was chosen, save it and replace the demo subjects with the exam syllabus.
    if (examId) {
      const exam = exams.find((e) => e.id === examId);
      const ts = examDate ? new Date(examDate + "T00:00:00").getTime() : 0;
      updateUser({ examId, examName: exam?.name ?? examId, examDate: ts > Date.now() ? ts : 0 });
      if (examId !== "custom") {
        try {
          await fetch("/api/syllabus/load", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ examId }) });
          await fetch("/api/schedule/rebuild", { method: "POST" });
        } catch { /* ignore */ }
      }
    }
    // Persist onboarding BEFORE refreshing, so the fresh pull can't resurrect it.
    try {
      await fetch("/api/settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: { onboarded: true } }),
      });
    } catch { /* refresh below will retry */ }
    setOnboarded();
    pushToast({ title: `Let's make today count, ${name || data.user.name || "Student"}` });
    // Re-pull fresh state (new syllabus included) instead of reloading the page,
    // so a slow request can never strand the student on the login screen.
    try {
      await refresh();
    } catch {
      window.location.reload();
    }
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Onboarding">
      <div className="absolute inset-0" style={{ background: "rgba(15,10,31,.6)" }} />
      <div className="card relative w-full max-w-md p-6 fade-in max-h-[92vh] overflow-auto">
        <div className="flex gap-1.5">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i <= step ? "#7c3aed" : "var(--border)" }} />)}</div>
        {step === 0 && (
          <div className="mt-4"><h2 className="text-xl font-bold">Welcome to your study system.</h2>
            <p className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>Focus · Consistency · Memory · Progress. Open the app and immediately know what to study.</p>
            <input value={name} onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setNameError(null); }} placeholder="Your name *" type="text" name="stoke-onboard-name" id="stoke-onboard-name" spellCheck={false} autoCorrect="off" autoCapitalize="words" className="w-full mt-3 px-3 py-2.5 rounded-xl text-sm" style={{ border: `1px solid ${nameError ? "#EF4444" : "var(--border)"}`, background: "var(--bg)" }} aria-label="Your name" autoComplete="given-name" />
            {nameError ? <p className="text-xs font-semibold mt-1" style={{ color: "#EF4444" }} role="alert">{nameError}</p> : <p className="text-[11px] mt-1" style={{ color: "var(--ink-2)" }}>Required — you need a name to continue.</p>}
          </div>
        )}
        {step === 1 && (
          <div className="mt-4"><h2 className="text-xl font-bold">Which country are you studying in?</h2>
            <p className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>We show the classes and exams of your country — from school up to competitive exams.</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {(countries.length ? countries : [{ id: "nepal", name: "Nepal", flag: "🇳🇵" }, { id: "india", name: "India", flag: "🇮🇳" }]).map((c) => (
                <button key={c.id} onClick={() => { setCountry(c.id); setCountryError(null); setExamId(""); }}
                  className={`p-3 rounded-xl text-left ${country === c.id ? "text-white" : ""}`}
                  style={country === c.id ? { background: "#7c3aed" } : { border: "1px solid var(--border)" }}>
                  <div className="text-2xl">{c.flag}</div>
                  <div className="font-bold text-sm mt-1">{c.name}</div>
                </button>
              ))}
            </div>
            {countryError ? <p className="text-xs font-semibold mt-1" style={{ color: "#EF4444" }} role="alert">{countryError}</p> : <p className="text-[11px] mt-1" style={{ color: "var(--ink-2)" }}>More countries coming soon.</p>}
          </div>
        )}
        {step === 2 && (
          <div className="mt-4"><h2 className="text-xl font-bold">What are you preparing for?</h2>
            <p className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>Stoke plans your chapters against the exam deadline.</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {visibleExams.map((e) => (
                <button key={e.id} onClick={() => { setExamId(e.id); setExamError(null); setPicked(e.subjects); }}
                  className={`p-2.5 rounded-xl text-left ${examId === e.id ? "text-white" : ""}`}
                  style={examId === e.id ? { background: "#7c3aed" } : { border: "1px solid var(--border)" }}>
                  <div className="font-bold text-sm">{e.name}</div>
                  <div className="text-[11px] opacity-80">{e.region}</div>
                  <div className="text-[11px] opacity-80">{e.grade ? `Class ${e.grade} · ` : ""}{e.chapters} chapters</div>
                </button>
              ))}
              <button onClick={() => { setExamId("custom"); setExamError(null); }}
                className={`p-2.5 rounded-xl text-left ${examId === "custom" ? "text-white" : ""}`}
                style={examId === "custom" ? { background: "#7c3aed" } : { border: "1px solid var(--border)" }}>
                <div className="font-bold text-sm">Other / Custom</div>
                <div className="text-[11px] opacity-80">Just my subjects</div>
              </button>
            </div>
            <label className="text-xs font-medium block mt-3">Exam date *
              <input type="date" value={examDate} onChange={(e) => { setExamDate(e.target.value); setExamError(null); }} className="w-full mt-1 px-3 py-2.5 rounded-xl text-sm" style={{ border: `1px solid ${examError ? "#EF4444" : "var(--border)"}`, background: "var(--bg)" }} aria-label="Exam date" />
            </label>
            {examError && <p className="text-xs font-semibold mt-1" style={{ color: "#EF4444" }} role="alert">{examError}</p>}
          </div>
        )}
        {step === 3 && (
          <div className="mt-4"><h2 className="text-xl font-bold">What are you studying?</h2>
            <div className="flex flex-wrap gap-2 mt-3">{presets.map((p) => (
              <button key={p} onClick={() => setPicked((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${picked.includes(p) ? "text-white" : ""}`}
                style={picked.includes(p) ? { background: "#7c3aed" } : { border: "1px solid var(--border)" }}>{p}</button>
            ))}</div>
          </div>
        )}
        {step === 4 && (
          <div className="mt-4"><h2 className="text-xl font-bold">How do you like to focus?</h2>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[["25/5", 25, 5, 15], ["50/10", 50, 10, 20], ["Custom", 25, 5, 15]].map(([label, f, s, l]) => (
                <button key={label as string} onClick={() => { updatePomo({ focusMin: f as number, shortMin: s as number, longMin: l as number }); updateUser({ focusPreset: label as string }); }}
                  className={`p-3 rounded-xl text-sm font-bold ${data.user.focusPreset === label ? "text-white" : ""}`}
                  style={data.user.focusPreset === label ? { background: "#7c3aed" } : { border: "1px solid var(--border)" }}>{label}<span className="block text-[11px] font-normal opacity-80">{f}/{s}</span></button>
              ))}
            </div>
          </div>
        )}
        {step === 5 && (
          <div className="mt-4"><h2 className="text-xl font-bold">Would you like study reminders?</h2>
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>Get a nudge at 8:00 AM and 7:00 PM when reviews are due.</p>
            <button onClick={() => { updateUser({ reminders: !data.user.reminders }); if (!data.user.reminders) requestNotificationPermission(); }} className="btn-primary px-4 py-2 text-sm mt-3">{data.user.reminders ? "Reminders ON" : "Reminders OFF"}</button>
          </div>
        )}
        <div className="flex gap-2 mt-5">
          {step > 0 && <button onClick={() => setStep(step - 1)} className="px-4 py-2.5 text-sm rounded-xl" style={{ border: "1px solid var(--border)" }}>Back</button>}
          <button onClick={() => {
            // Step 0 cannot be skipped without a name.
            if (step === 0) {
              if (!name.trim()) { setNameError("Please enter your name to continue."); return; }
              updateUser({ name: name.trim() });
            }
            // Step 1 requires a country (decides the exam list).
            if (step === 1) {
              if (!country) { setCountryError("Pick your country to continue."); return; }
            }
            // Step 2 requires an exam + a future date (custom needs the date too for the countdown).
            if (step === 2) {
              if (!examId) { setExamError("Pick the exam you're preparing for."); return; }
              const ts = examDate ? new Date(examDate + "T00:00:00").getTime() : 0;
              if (!ts || ts <= Date.now()) { setExamError("Pick your exam date so Stoke can count down."); return; }
            }
            if (step === 3 && !examId) picked.forEach((p) => { if (!data.subjects.some((s) => s.name === p)) addSubject(p, "", "#7C3AED"); });
            if (step < LAST) setStep(step + 1);
            else finish();
          }} className="btn-primary flex-1 py-2.5 text-sm">{step < LAST ? "Continue" : "Go to dashboard"}</button>
        </div>
      </div>
    </div>
  );
}
