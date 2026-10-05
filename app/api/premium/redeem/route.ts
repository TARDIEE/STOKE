import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";
import { grantPremium, isPremium, validPremiumCode } from "@/lib/server/premium";

/** Redeem a premium code → unlocks AI generation on this account. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (await isPremium(user.id)) return NextResponse.json({ ok: true, premium: true });
  const body = await req.json().catch(() => null);
  const code = String(body?.code ?? "");
  if (!validPremiumCode(code)) {
    return NextResponse.json({ error: "That code didn't work. Check it and try again." }, { status: 403 });
  }
  await grantPremium(user.id);
  return NextResponse.json({ ok: true, premium: true });
}
