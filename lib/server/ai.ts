import type { DbIface } from "./db";

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const POLLINATIONS_KEY = (process.env.POLLINATIONS_API_KEY || "").trim();
const POLLINATIONS_MODEL = process.env.POLLINATIONS_MODEL || "openai";

function shortBody(s: string, n = 300) {
  return s.replace(/\s+/g, " ").trim().slice(0, n);
}

export interface AiCard {
  front: string;
  back: string;
}

function clean(s: unknown) {
  return String(s ?? "").trim();
}

export function extractCards(content: string): AiCard[] {
  try {
    const parsed = JSON.parse(content);
    const arr = Array.isArray(parsed) ? parsed : parsed.cards ?? parsed.flashcards ?? parsed.questions ?? [];
    if (Array.isArray(arr)) {
      return arr
        .map((c) => ({ front: clean(c?.front ?? c?.q ?? c?.question), back: clean(c?.back ?? c?.a ?? c?.answer) }))
        .filter((c) => c.front && c.back);
    }
  } catch { /* fall through to bracket scan */ }
  const m = content.match(/\[[\s\S]*\]/);
  if (m) {
    try {
      const arr = JSON.parse(m[0]);
      if (Array.isArray(arr)) {
        return arr
          .map((c) => ({ front: clean(c?.front ?? c?.q ?? c?.question), back: clean(c?.back ?? c?.a ?? c?.answer) }))
          .filter((c) => c.front && c.back);
      }
    } catch { /* ignore */ }
  }
  return [];
}

export async function getAiKey(userId: string, db: DbIface): Promise<string> {
  const r = await db.execute("SELECT ai_key FROM users WHERE id = ?", [userId]);
  const row = r.rows[0] as unknown as { ai_key: string } | undefined;
  return (row?.ai_key || process.env.GROQ_API_KEY || "").trim();
}

export async function generateCards(topic: string, count: number, key: string, chapterName?: string, notes?: string): Promise<AiCard[]> {
  const source = notes?.trim()
    ? ` Base the cards ONLY on the following study notes — do not add facts outside them: """${notes.trim().slice(0, 2000)}"""`
    : "";
  const messages = [
    {
      role: "system",
      content: "You create study flashcards. Reply with ONLY a JSON object shaped {\"cards\": [{\"front\": \"question\", \"back\": \"concise answer\"}]}. No markdown, no extra text.",
    },
    {
      role: "user",
      content: `Create ${count} flashcards for studying "${topic}"${chapterName ? ` (chapter: ${chapterName})` : ""}. Mix definitions, key formulas/facts, and one application question. Keep fronts under 140 characters and backs under 300 characters.${source}`,
    },
  ];
  // Reasoning models (e.g. gpt-oss) reject some sampling/structural params
  // with a 400 "invalid parameters". Walk a ladder: full-featured first,
  // then progressively plainer payloads until one is accepted.
  const payloads: Record<string, unknown>[] = [
    { model: MODEL, temperature: 0.7, max_completion_tokens: 2200, response_format: { type: "json_object" }, messages },
    { model: MODEL, max_completion_tokens: 2200, messages },
    { model: MODEL, max_tokens: 2200, messages },
    { model: MODEL, messages },
  ];
  let lastErr = "";
  for (const payload of payloads) {
    let res: Response;
    try {
      res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(60000),
      });
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "Network failure.";
      break; // network/timeout won't heal by simplifying the payload
    }
    if (res.ok) {
      const data = await res.json();
      const content: string = data?.choices?.[0]?.message?.content ?? "";
      const cards = extractCards(content);
      if (cards.length) return cards;
      throw new Error("AI service error. The AI returned nothing usable — try again.");
    }
    const msg = await res.text().catch(() => "");
    lastErr = shortBody(msg) || `Request failed (${res.status}).`;
    console.error(`[ai] groq ${res.status} payload=${Object.keys(payload).join(",")}: ${lastErr}`);
    if (res.status !== 400) break; // only 400s are worth a simpler retry
  }
  throw new Error(`AI service error. ${lastErr}`);
}

export function aiModelName() {
  return MODEL;
}

/**
 * Keyless fallback (free community inference): same card contract as Groq,
 * used automatically when the student has no API key, so AI generation
 * works out of the box with zero setup.
 *
 * When POLLINATIONS_API_KEY is set, uses the stable authenticated endpoint
 * via POST. Otherwise best-effort anonymous GET — prompts stay short because
 * the whole prompt travels in the URL, and long URLs get rejected (400s).
 */
export async function generateCardsOpen(topic: string, count: number, chapterName?: string, notes?: string): Promise<AiCard[]> {
  if (POLLINATIONS_KEY) return generateCardsViaPollinations(topic, count, chapterName, notes);
  const cleanNotes = (notes ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 800);
  const source = cleanNotes
    ? ` Base the cards ONLY on the following study notes — do not add facts outside them: """${cleanNotes}"""`
    : "";
  const base =
    `Create ${count} flashcards for studying "${topic}"${chapterName ? ` (chapter: ${chapterName})` : ""}. ` +
    `Mix definitions, key formulas/facts, and one application question. Keep fronts under 140 characters and backs under 300 characters.`;
  const tail = ` Do not ask clarifying questions. Output ONLY a JSON object shaped {"cards": [{"front": "question", "back": "concise answer"}]}. No markdown, no extra text.`;
  // Full prompt first, then without notes (short URLs survive strict gateways).
  const prompts = [base + source + tail, base + tail];
  let lastErr = "Open AI failed.";
  for (const prompt of prompts) {
    try {
      const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`, {
        signal: AbortSignal.timeout(60000),
        headers: { Accept: "text/plain" },
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        lastErr = `Open AI service error (${res.status}). ${shortBody(msg, 200)}`.trim();
        console.error(`[ai] pollinations-anon ${res.status}: ${lastErr}`);
        continue;
      }
      const text = await res.text();
      const cards = extractCards(text).slice(0, count);
      if (cards.length) return cards;
      lastErr = "Open AI returned nothing usable.";
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "Open AI failed.";
      // Timeouts/network errors: retrying with a shorter prompt won't help.
      if (/timeout|timed out|abort|network|fetch failed/i.test(lastErr)) break;
    }
  }
  throw new Error(lastErr);
}

/** Authenticated Pollinations (gen.pollinations.ai, OpenAI-compatible). */
async function generateCardsViaPollinations(topic: string, count: number, chapterName?: string, notes?: string): Promise<AiCard[]> {
  const source = notes?.trim()
    ? ` Base the cards ONLY on the following study notes — do not add facts outside them: """${notes.trim().slice(0, 2000)}"""`
    : "";
  const res = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${POLLINATIONS_KEY}`,
    },
    body: JSON.stringify({
      model: POLLINATIONS_MODEL,
      temperature: 0.7,
      max_tokens: 2200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You create study flashcards. Reply with ONLY a JSON object shaped {\"cards\": [{\"front\": \"question\", \"back\": \"concise answer\"}]}. No markdown, no extra text.",
        },
        {
          role: "user",
          content: `Create ${count} flashcards for studying "${topic}"${chapterName ? ` (chapter: ${chapterName})` : ""}. Mix definitions, key formulas/facts, and one application question. Keep fronts under 140 characters and backs under 300 characters.${source}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    const detail = `Open AI service error (${res.status}). ${shortBody(msg, 200)}`.trim();
    console.error(`[ai] pollinations ${res.status}: ${detail}`);
    throw new Error(detail);
  }
  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  const cards = extractCards(content).slice(0, count);
  if (!cards.length) throw new Error("Open AI returned nothing usable.");
  return cards;
}
