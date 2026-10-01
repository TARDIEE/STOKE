import { NextResponse } from "next/server";
import { q } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";

/**
 * Per-subtopic checklist progress: ticked "what to learn" / "question type"
 * items persist across days, so deferring a concept to tomorrow keeps
 * finished checks done — only unticked work carries forward.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const rows = await q<{ key: string; learned: string; solved: string }>(
    "SELECT key, learned, solved FROM topic_progress WHERE user_id = ?",
    user.id
  );
  const progress: Record<string, { learned: number[]; solved: number[] }> = {};
  for (const r of rows) {
    try {
      progress[String(r.key)] = {
        learned: JSON.parse(String(r.learned ?? "[]")),
        solved: JSON.parse(String(r.solved ?? "[]")),
      };
    } catch {
      progress[String(r.key)] = { learned: [], solved: [] };
    }
  }
  return NextResponse.json({ progress });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const key = String(body?.key ?? "").slice(0, 300);
  if (!key) return NextResponse.json({ error: "Missing key." }, { status: 400 });
  const learned = Array.isArray(body?.learned) ? body.learned.filter((n: unknown) => typeof n === "number") : [];
  const solved = Array.isArray(body?.solved) ? body.solved.filter((n: unknown) => typeof n === "number") : [];
  await q(
    "INSERT OR REPLACE INTO topic_progress (user_id, key, learned, solved, updated_at) VALUES (?,?,?,?,?)",
    user.id, key, JSON.stringify(learned), JSON.stringify(solved), Date.now()
  );
  return NextResponse.json({ ok: true });
}
