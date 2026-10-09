"use client";

// Extracts readable text from a book PDF entirely in the browser, so the
// server only ever receives plain text (never file uploads).
export interface BookText {
  name: string;
  pages: number;
  chars: number;
  text: string;
}

const MAX_PAGES = 60;
const MAX_CHARS = 15000;
const MAX_BYTES = 25 * 1024 * 1024;

export async function extractBookText(file: File): Promise<BookText> {
  if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
    throw new Error("Only PDF books are supported.");
  }
  if (file.size > MAX_BYTES) throw new Error("Book is too large — keep it under 25 MB.");
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const total = Math.min(pdf.numPages, MAX_PAGES);
  const parts: string[] = [];
  for (let p = 1; p <= total; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const line = content.items
      .map((it) => ("str" in it ? String(it.str) : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (line) parts.push(line);
    if (parts.join(" ").length >= MAX_CHARS) break;
    page.cleanup();
  }
  await pdf.cleanup();
  const text = parts.join("\n").replace(/[ \t]+/g, " ").slice(0, MAX_CHARS).trim();
  if (text.length < 200) throw new Error("Could not read any text — the PDF may be scanned images.");
  return { name: file.name, pages: total, chars: text.length, text };
}
