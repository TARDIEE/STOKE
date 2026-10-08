import { NextResponse } from "next/server";
import { batch, q, q1 } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";
import { aiModelName, generateCards, generateCardsOpen, getAiKey } from "@/lib/server/ai";
import { isPremium } from "@/lib/server/premium";
import { getDb } from "@/lib/server/db";
import { uid } from "@/lib/server/util";

export interface DayQuestion {
  id: string;
  chapterId: string;
  subjectId: string;
  chapter: string;
  front: string;
  back: string;
}

const MAX_CHAPTERS_PER_DAY = 3;
const QUESTIONS_PER_CHAPTER = 2;

async function listDay(userId: string, day: string): Promise<DayQuestion[]> {
  const rows = await q("SELECT * FROM ai_questions WHERE user_id = ? AND day = ? ORDER BY created_at", userId, day);
  return rows.map((r) => ({
    id: String(r.id), chapterId: String(r.chapter_id), subjectId: String(r.subject_id),
    chapter: String(r.chapter_name || ""), front: String(r.front), back: String(r.back),
  }));
}

/** Read the day's AI questions (does not generate). */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const day = new URL(req.url).searchParams.get("day") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return NextResponse.json({ error: "Bad day." }, { status: 400 });
  const db = await getDb();
  const key = await getAiKey(user.id, db);
  return NextResponse.json({ questions: await listDay(user.id, day), aiReady: !!key, model: aiModelName() });
}

/**
 * Generate (or regenerate) fresh questions for one calendar day from that
 * day's scheduled chapters. Each day gets a brand-new set — never yesterday's.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const day = String(body?.day ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return NextResponse.json({ error: "Bad day." }, { status: 400 });

  if (!(await isPremium(user.id))) {
    return NextResponse.json(
      { error: "AI generation is a Premium feature. Redeem a code in Profile → Premium.", code: "PREMIUM_REQUIRED" },
      { status: 403 }
    );
  }

  const db = await getDb();
  const key = await getAiKey(user.id, db);
  const useOpen = !key;

  // That day's scheduled chapters (learn + review), highest priority first.
  const items = await q(
    `SELECT s.chapter_id AS chapterId, s.subject_id AS subjectId, s.kind, c.name AS chapterName, sub.name AS subjectName, ch.weight AS weight
     FROM schedule s
     LEFT JOIN chapters c ON c.id = s.chapter_id AND c.user_id = ?
     LEFT JOIN subjects sub ON sub.id = s.subject_id AND sub.user_id = ?
     LEFT JOIN chapters ch ON ch.id = s.chapter_id AND ch.user_id = ?
     WHERE s.user_id = ? AND s.day = ? AND s.status = 'open' AND s.chapter_id != ''
     ORDER BY CASE s.kind WHEN 'learn' THEN 0 WHEN 'review' THEN 1 ELSE 2 END, COALESCE(ch.weight, 3) DESC`,
    user.id, user.id, user.id, user.id, day
  );

  const seen = new Set<string>();
  const targets = items.filter((i) => {
    const id = String(i.chapterId);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  }).slice(0, MAX_CHAPTERS_PER_DAY);

  if (!targets.length) {
    return NextResponse.json({ questions: await listDay(user.id, day), note: "No chapters scheduled that day." });
  }

  try {
    const made: (DayQuestion & { created: number })[] = [];
    for (const t of targets) {
      const topic = `${String(t.subjectName || "")} — ${String(t.chapterName || t.chapterId)}`.replace(/^— /, "");
      const cards = useOpen
        ? await generateCardsOpen(topic, QUESTIONS_PER_CHAPTER, String(t.chapterName || ""))
        : await generateCards(topic, QUESTIONS_PER_CHAPTER, key, String(t.chapterName || ""));
      const now = Date.now();
      for (const c of cards) {
        made.push({
          id: uid(), chapterId: String(t.chapterId), subjectId: String(t.subjectId),
          chapter: String(t.chapterName || ""), front: c.front, back: c.back, created: now,
        });
      }
    }
    if (!made.length) return NextResponse.json({ error: "The AI returned nothing usable — try again." }, { status: 502 });
    await batch([
      { sql: "DELETE FROM ai_questions WHERE user_id = ? AND day = ?", args: [user.id, day] },
      ...made.map((qq) => ({
        sql: "INSERT INTO ai_questions (id, user_id, day, chapter_id, subject_id, chapter_name, front, back, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
        args: [qq.id, user.id, day, qq.chapterId, qq.subjectId, qq.chapter, qq.front, qq.back, qq.created] as unknown[],
      })),
    ]);
    return NextResponse.json({ ok: true, model: aiModelName(), questions: await listDay(user.id, day) });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "";
    console.error(`[ai] day questions failed: ${detail}`);
    return NextResponse.json({
      error: "Could not reach the AI service. Check your connection and try again.",
      detail: detail.slice(0, 300),
    }, { status: 502 });
  }
}
