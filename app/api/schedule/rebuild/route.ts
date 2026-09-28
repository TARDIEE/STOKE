import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";
import { generateSchedule } from "@/lib/server/schedule";

/** Rebuild the whole chapter plan from the current syllabus + deadline. */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const items = await generateSchedule(user.id, Date.now());
  return NextResponse.json({ ok: true, planned: items.length });
}
