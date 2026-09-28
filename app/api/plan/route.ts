import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";
import { ensureTodayPlan, studiedToday, tomorrowPreview } from "@/lib/server/plan";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const now = Date.now();
  return NextResponse.json({
    items: ensureTodayPlan(user.id, now),
    tomorrow: tomorrowPreview(user.id, now),
    studied: studiedToday(user.id),
  });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Task title is required." }, { status: 400 });
  const q = body?.quadrant === "q1" || body?.quadrant === "q3" || body?.quadrant === "q4" ? body.quadrant : "q2";
  const { getDb } = await import("@/lib/server/db");
  const { uid } = await import("@/lib/server/util");
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const day = `${startOfToday.getFullYear()}-${String(startOfToday.getMonth() + 1).padStart(2, "0")}-${String(startOfToday.getDate()).padStart(2, "0")}`;
  getDb()
    .prepare("INSERT INTO tasks (id, user_id, day, kind, ref_id, ref_subject, title, detail, note, quadrant, status, source, count, created_at, completed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run((uid as () => string)(), user.id, day, "custom", "", "", title, "", "Custom task", q, "open", "custom", 0, Date.now(), null);
  return NextResponse.json({ ok: true });
}
