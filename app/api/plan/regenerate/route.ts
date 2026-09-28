import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";
import { ensureTodayPlan, studiedToday, tomorrowPreview } from "@/lib/server/plan";

/** Rebuild today's open auto tasks from current spaced-repetition state. */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const now = Date.now();
  return NextResponse.json({
    items: await ensureTodayPlan(user.id, now, true),
    tomorrow: await tomorrowPreview(user.id),
    studied: await studiedToday(user.id),
  });
}
