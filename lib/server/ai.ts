import type { DbIface } from "./db";

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

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
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODEL,
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
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`AI service error (${res.status}). ${msg.slice(0, 120)}`);
  }
  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  return extractCards(content);
}

export function aiModelName() {
  return MODEL;
}

/**
 * Keyless fallback (free community inference): same card contract as Groq,
 * used automatically when the student has no API key, so AI generation
 * works out of the box with zero setup.
 */
export async function generateCardsOpen(topic: string, count: number, chapterName?: string, notes?: string): Promise<AiCard[]> {
  const source = notes?.trim()
    ? ` Base the cards ONLY on the following study notes — do not add facts outside them: """${notes.trim().slice(0, 2000)}"""`
    : "";
  const prompt =
    `Create ${count} flashcards for studying "${topic}"${chapterName ? ` (chapter: ${chapterName})` : ""}. ` +
    `Mix definitions, key formulas/facts, and one application question. Keep fronts under 140 characters and backs under 300 characters.${source} ` +
    `Do not ask clarifying questions. Output ONLY a JSON object shaped {"cards": [{"front": "question", "back": "concise answer"}]}. No markdown, no extra text.`;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`, {
        signal: AbortSignal.timeout(60000),
        headers: { Accept: "text/plain" },
      });
      if (!res.ok) throw new Error(`Open AI service error (${res.status}).`);
      const text = await res.text();
      const cards = extractCards(text).slice(0, count);
      if (cards.length) return cards;
      lastErr = new Error("Open AI returned nothing usable.");
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Open AI failed.");
}
