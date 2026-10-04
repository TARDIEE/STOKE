import { NextResponse } from "next/server";
import { q1 } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";
import { aiModelName, generateCards, generateCardsOpen, getAiKey } from "@/lib/server/ai";
import { getDb } from "@/lib/server/db";

/** Generate flashcards on any topic with generative AI. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const topic = String(body?.topic ?? "").trim();
  const count = Math.max(1, Math.min(10, Number(body?.count ?? 5)));
  const notes = String(body?.notes ?? "").slice(0, 4000);
  if (!topic) return NextResponse.json({ error: "Describe the topic first." }, { status: 400 });

  const db = await getDb();
  const key = await getAiKey(user.id, db);

  const chapter = body?.chapterId
    ? await q1<{ name: string }>("SELECT name FROM chapters WHERE user_id = ? AND id = ?", user.id, String(body.chapterId))
    : undefined;

  // No key? Fall back to keyless inference instead of failing.
  if (!key) {
    try {
      const cards = (await generateCardsOpen(topic, count, chapter?.name, notes)).slice(0, count);
      if (!cards.length) return NextResponse.json({ error: "The AI returned nothing usable — try again." }, { status: 502 });
      return NextResponse.json({ ok: true, model: "open", cards });
    } catch {
      return NextResponse.json({
        error: "AI is busy right now — try again in a bit, or paste a free Groq key in Settings → AI generation for priority access.",
      }, { status: 502 });
    }
  }

  try {
    const cards = (await generateCards(topic, count, key, chapter?.name, notes)).slice(0, count);
    if (!cards.length) return NextResponse.json({ error: "The AI returned nothing usable — try again." }, { status: 502 });
    return NextResponse.json({ ok: true, model: aiModelName(), cards });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("AI service error")) {
      return NextResponse.json({ error: `${msg} Check your key in Settings → AI generation.` }, { status: 502 });
    }
    return NextResponse.json({ error: "Could not reach the AI service. Check your connection and try again." }, { status: 502 });
  }
}
