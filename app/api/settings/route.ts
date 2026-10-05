import { NextResponse } from "next/server";
import { run } from "@/lib/server/db";
import { currentUser } from "@/lib/server/auth";

const USER_FIELDS: Record<string, string> = {
  name: "name", onboarded: "onboarded", focusPreset: "focus_preset",
  reminders: "reminders", morning: "morning", evening: "evening",
  frequency: "frequency", theme: "theme",
  examId: "exam_id", examName: "exam_name", examDate: "exam_date", focusGoal: "focus_goal",
  country: "country",
};
const POMO_FIELDS: Record<string, string> = {
  focusMin: "focus_min", shortMin: "short_min", longMin: "long_min",
  sessionsBeforeLong: "sessions_before_long", autoStartBreaks: "auto_start_breaks",
  autoStartFocus: "auto_start_focus", sound: "sound", vibration: "vibration",
  notifications: "notifications",
};

const toInt = (v: unknown) => (v ? 1 : 0);

/** AI key is write-only: accepted here, never returned by any endpoint. */
const AI_KEY_FIELD = "aiKey";

export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  if (body?.user && typeof body.user === "object") {
    const fields: string[] = [];
    const vals: unknown[] = [];
    for (const [key, col] of Object.entries(USER_FIELDS)) {
      const v = body.user[key];
      if (v === undefined) continue;
      if (key === "name" && !String(v).trim()) {
        return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
      }
      fields.push(`${col} = ?`);
      vals.push(key === "onboarded" || key === "reminders" ? toInt(v) : v);
    }
    // write-only AI key (a blank value clears a saved key)
    if (typeof body.user[AI_KEY_FIELD] === "string") {
      fields.push("ai_key = ?");
      vals.push(body.user[AI_KEY_FIELD].trim());
    }
    if (fields.length) {
      vals.push(user.id);
      await run(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, ...vals);
    }
  }

  if (body?.pomo && typeof body.pomo === "object") {
    const fields: string[] = [];
    const vals: unknown[] = [];
    for (const [key, col] of Object.entries(POMO_FIELDS)) {
      const v = body.pomo[key];
      if (v === undefined) continue;
      fields.push(`${col} = ?`);
      vals.push(typeof v === "boolean" ? toInt(v) : Number(v) || 0);
    }
    if (fields.length) {
      vals.push(user.id);
      await run(`UPDATE pomo_settings SET ${fields.join(", ")} WHERE user_id = ?`, ...vals);
    }
  }

  return NextResponse.json({ ok: true });
}
