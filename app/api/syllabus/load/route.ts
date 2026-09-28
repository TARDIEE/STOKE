import { NextResponse } from "next/server";
import { batch, q1 } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";
import { getExam } from "@/lib/exams";
import { uid } from "@/lib/server/util";

/**
 * Replace the student's subjects/chapters with the chosen exam's syllabus.
 * Cards, reviews and logs of the old syllabus are removed; study sessions
 * (history) are kept. Also clears the old day schedule + today's auto plan
 * so both rebuild from the new curriculum.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const exam = getExam(String(body?.examId ?? ""));
  if (!exam) return NextResponse.json({ error: "Unknown exam." }, { status: 400 });

  const now = Date.now();
  const today = new Date();
  const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const stmts: { sql: string; args: unknown[] }[] = [
    { sql: "DELETE FROM review_logs WHERE user_id = ?", args: [user.id] },
    { sql: "DELETE FROM reviews WHERE user_id = ?", args: [user.id] },
    { sql: "DELETE FROM cards WHERE user_id = ?", args: [user.id] },
    { sql: "DELETE FROM chapters WHERE user_id = ?", args: [user.id] },
    { sql: "DELETE FROM subjects WHERE user_id = ?", args: [user.id] },
    { sql: "DELETE FROM schedule WHERE user_id = ?", args: [user.id] },
    { sql: "DELETE FROM ai_questions WHERE user_id = ?", args: [user.id] },
    { sql: "DELETE FROM tasks WHERE user_id = ? AND day = ? AND source = 'auto'", args: [user.id, day] },
  ];
  exam.subjects.forEach((s, si) => {
    const sid = uid();
    stmts.push({
      sql: "INSERT INTO subjects (id, user_id, name, description, color, created_at) VALUES (?,?,?,?,?,?)",
      args: [sid, user.id, s.name, `${exam.name} syllabus`, s.color, now + si],
    });
    s.chapters.forEach((c, ci) => {
      stmts.push({
        sql: "INSERT INTO chapters (id, user_id, subject_id, name, description, notes, ord, weight, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
        args: [uid(), user.id, sid, c.name,
          `Weight ${"★".repeat(c.weight)}${"☆".repeat(5 - c.weight)} · ~${c.hours}h`,
          "", ci, c.weight, now + si * 100 + ci],
      });
    });
  });
  await batch(stmts);

  const subjects = await q1<{ n: number }>("SELECT COUNT(*) AS n FROM subjects WHERE user_id = ?", user.id);
  const chapters = await q1<{ n: number }>("SELECT COUNT(*) AS n FROM chapters WHERE user_id = ?", user.id);
  return NextResponse.json({ ok: true, subjects: subjects?.n ?? 0, chapters: chapters?.n ?? 0 });
}
