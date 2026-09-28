import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
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

  const db = getDb();
  const now = Date.now();
  const t = db.transaction(() => {
    db.prepare("DELETE FROM review_logs WHERE user_id = ?").run(user.id);
    db.prepare("DELETE FROM reviews WHERE user_id = ?").run(user.id);
    db.prepare("DELETE FROM cards WHERE user_id = ?").run(user.id);
    db.prepare("DELETE FROM chapters WHERE user_id = ?").run(user.id);
    db.prepare("DELETE FROM subjects WHERE user_id = ?").run(user.id);
    db.prepare("DELETE FROM schedule WHERE user_id = ?").run(user.id);
    const today = new Date();
    const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    db.prepare("DELETE FROM tasks WHERE user_id = ? AND day = ? AND source = 'auto'").run(user.id, day);
    const insSub = db.prepare("INSERT INTO subjects (id, user_id, name, description, color, created_at) VALUES (?,?,?,?,?,?)");
    const insCh = db.prepare("INSERT INTO chapters (id, user_id, subject_id, name, description, notes, ord, weight, created_at) VALUES (?,?,?,?,?,?,?,?,?)");
    exam.subjects.forEach((s, si) => {
      const sid = uid();
      insSub.run(sid, user.id, s.name, `${exam.name} syllabus`, s.color, now + si);
      s.chapters.forEach((c, ci) => {
        insCh.run(uid(), user.id, sid, c.name,
          `Weight ${"★".repeat(c.weight)}${"☆".repeat(5 - c.weight)} · ~${c.hours}h`,
          "", ci, c.weight, now + si * 100 + ci);
      });
    });
  });
  t();

  const subjects = db.prepare("SELECT COUNT(*) AS n FROM subjects WHERE user_id = ?").get(user.id) as { n: number };
  const chapters = db.prepare("SELECT COUNT(*) AS n FROM chapters WHERE user_id = ?").get(user.id) as { n: number };
  return NextResponse.json({ ok: true, subjects: subjects.n, chapters: chapters.n });
}
