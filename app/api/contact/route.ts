import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { profile } from "@/lib/content";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "messages.json");

type Submission = {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Best-effort local record. Works great in dev; on Vercel's serverless
// filesystem this write won't persist, so it's wrapped to fail silently
// there — email (below) is the durable path in production.
async function saveLocally(submission: Submission): Promise<boolean> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    let existing: Submission[] = [];
    try {
      existing = JSON.parse(await readFile(DATA_FILE, "utf-8"));
    } catch {
      existing = [];
    }
    existing.push(submission);
    await writeFile(DATA_FILE, JSON.stringify(existing, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Could not save contact submission locally:", err);
    return false;
  }
}

// Emails the submission via Web3Forms (no domain verification required).
// Configure WEB3FORMS_ACCESS_KEY in the environment to enable this.
async function sendEmail(submission: Submission): Promise<boolean> {
  const accessKey = process.env.WEB3FORMS_ACCESS_KEY;
  if (!accessKey) return false;

  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: accessKey,
        subject: `New portfolio message from ${submission.name}`,
        name: submission.name,
        email: submission.email,
        message: submission.message,
        to: process.env.CONTACT_TO_EMAIL || profile.email,
      }),
    });
    const data = await res.json().catch(() => null);
    return res.ok && data?.success !== false;
  } catch (err) {
    console.error("Could not send contact email:", err);
    return false;
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 100) : "";
  const email = typeof body?.email === "string" ? body.email.trim().slice(0, 254) : "";
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 5000) : "";

  if (!email || !message || !isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, error: "A valid email and a message are required." },
      { status: 400 },
    );
  }

  const submission: Submission = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name || "Anonymous",
    email,
    message,
    createdAt: new Date().toISOString(),
  };

  const [emailed, saved] = await Promise.all([
    sendEmail(submission),
    saveLocally(submission),
  ]);

  if (!emailed && !saved) {
    return NextResponse.json(
      { ok: false, error: "Couldn't deliver your message right now. Please try again shortly." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
