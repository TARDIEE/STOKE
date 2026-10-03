import { NextResponse } from "next/server";
import { q1 } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";
import { generateCards, generateCardsOpen, getAiKey } from "@/lib/server/ai";
import { getDb } from "@/lib/server/db";

/**
 * Bulk chapter set: generates cards for EVERY subtopic of a chapter in one
 * call, so a student gets full concept coverage instead of one small box.
 * Capped at 20 cards (the addCards batch limit).
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const chapterId = String(body?.chapterId ?? "");
  if (!chapterId) return NextResponse.json({ error: "Pick a chapter first." }, { status: 400 });
  const perTopic = Math.max(1, Math.min(4, Number(body?.perTopic ?? 2)));

  const ch = await q1<{ name: string; topics: string }>(
    "SELECT name, topics FROM chapters WHERE user_id = ? AND id = ?",
    user.id, chapterId
  );
  if (!ch) return NextResponse.json({ error: "Chapter not found." }, { status: 404 });

  let topics: string[] = [];
  try {
    const t = JSON.parse(String(ch.topics ?? "[]"));
    if (Array.isArray(t)) topics = t.filter((x): x is string => typeof x === "string" && x.length > 0);
  } catch {
    topics = [];
  }

  const db = getDb();
  const key = await getAiKey(user.id, db);
  const gen = (topic: string, count: number) =>
    key
      ? generateCards(topic, count, key, ch.name)
      : generateCardsOpen(topic, count, ch.name);

  const cards: { front: string; back: string }[] = [];
  let failedTopics: string[] = [];
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const runTopic = async (label: string, topic: string) => {
    try {
      const made = await gen(topic, perTopic);
      for (const c of made) {
        if (cards.length >= 20) break;
        cards.push({ ...c });
      }
      return true;
    } catch {
      failedTopics.push(label);
      return false;
    }
  };
  if (!topics.length) {
    // No subtopics stored: one full-size generic set for the chapter.
    await runTopic(ch.name, ch.name);
  } else {
    for (const t of topics) {
      if (cards.length >= 20) break;
      await runTopic(t, `${ch.name} — ${t}`);
      await sleep(1500);
    }
    // One retry pass for busy-model misses, so partial sets fill up.
    if (failedTopics.length && cards.length < 20) {
      await sleep(4000);
      const retry = failedTopics;
      failedTopics = [];
      for (const t of retry) {
        if (cards.length >= 20) break;
        await runTopic(t, `${ch.name} — ${t}`);
        await sleep(1500);
      }
    }
  }

  if (!cards.length) {
    return NextResponse.json({
      error: "AI is busy right now — try again in a bit, or paste a free Groq key in Settings → AI generation for priority access.",
    }, { status: 502 });
  }
  return NextResponse.json({ ok: true, model: key ? "groq" : "open", cards, topics: topics.length, failed: failedTopics.length });
}
