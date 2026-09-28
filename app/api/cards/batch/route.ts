import { NextResponse } from "next/server";
import { batch, q1 } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";
import { uid } from "@/lib/server/util";

/** Save several cards at once (used by AI generation). */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const list = Array.isArray(body?.cards) ? (body.cards as Record<string, unknown>[]).slice(0, 20) : [];
  const clean = list
    .map((c) => ({
      id: String(c?.id || uid()),
      subjectId: String(c?.subjectId ?? ""),
      chapterId: String(c?.chapterId ?? ""),
      front: String(c?.front ?? "").trim(),
      back: String(c?.back ?? "").trim(),
      tags: Array.isArray(c?.tags) ? (c.tags as unknown[]).map(String).slice(0, 8) : [],
      notes: String(c?.notes ?? ""),
    }))
    .filter((c) => c.id && c.subjectId && c.front && c.back);
  if (!clean.length) return NextResponse.json({ error: "No valid cards to save." }, { status: 400 });

  const now = Date.now();
  const stmts: { sql: string; args: unknown[] }[] = [];
  for (const c of clean) {
    // only keep cards in the student's own subjects
    const owns = await q1("SELECT id FROM subjects WHERE user_id = ? AND id = ?", user.id, c.subjectId);
    if (!owns) continue;
    stmts.push({
      sql: "INSERT OR IGNORE INTO cards (id, user_id, subject_id, chapter_id, front, back, tags, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
      args: [c.id, user.id, c.subjectId, c.chapterId, c.front, c.back, JSON.stringify(c.tags), c.notes, now],
    });
    stmts.push({
      sql: "INSERT OR IGNORE INTO reviews (card_id, user_id, last_reviewed_at, next_review_at, interval_days, ease, reps, lapses, correct, incorrect, total_reviews, state) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      args: [c.id, user.id, null, now, 0, 2.5, 0, 0, 0, 0, 0, "new"],
    });
  }
  if (stmts.length) await batch(stmts);
  return NextResponse.json({ ok: true, saved: clean.length });
}
