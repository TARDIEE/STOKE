import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";
import { aiModelName, generateCards, getAiKey } from "@/lib/server/ai";

/** Generate flashcards on any topic with generative AI. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const topic = String(body?.topic ?? "").trim();
  const count = Math.max(1, Math.min(10, Number(body?.count ?? 5)));
  if (!topic) return NextResponse.json({ error: "Describe the topic first." }, { status: 400 });

  const db = getDb();
  const key = await getAiKey(user.id, db);
  if (!key) {
    return NextResponse.json({
      error: "AI is not set up yet. Get a free key at console.groq.com and paste it in Settings → AI generation.",
    }, { status: 501 });
  }

  const chapter = body?.chapterId
    ? (db.prepare("SELECT name FROM chapters WHERE user_id = ? AND id = ?").get(user.id, String(body.chapterId)) as { name: string } | undefined)
    : undefined;

  try {
    const cards = (await generateCards(topic, count, key, chapter?.name)).slice(0, count);
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
