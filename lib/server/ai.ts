import type { Database } from "better-sqlite3";

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

export async function getAiKey(userId: string, db: Database): Promise<string> {
  const row = db.prepare("SELECT ai_key FROM users WHERE id = ?").get(userId) as { ai_key: string };
  return (row?.ai_key || process.env.GROQ_API_KEY || "").trim();
}

export async function generateCards(topic: string, count: number, key: string, chapterName?: string): Promise<AiCard[]> {
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
          content: `Create ${count} flashcards for studying "${topic}"${chapterName ? ` (chapter: ${chapterName})` : ""}. Mix definitions, key formulas/facts, and one application question. Keep fronts under 140 characters and backs under 300 characters.`,
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
