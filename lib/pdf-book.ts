"use client";

// Extracts readable text from a book PDF entirely in the browser, so the
// server only ever receives plain text (never file uploads).
export interface BookText {
  name: string;
  pages: number;
  chars: number;
  text: string;
}

const MAX_CHARS = 12000;
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
  // No page limit — read the whole book, then spread the AI's reading
  // window evenly across all pages so questions come from everywhere.
  const pageTexts: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    pageTexts.push(
      content.items
        .map((it) => ("str" in it ? String(it.str) : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    );
    page.cleanup();
  }
  await pdf.cleanup();
  const totalLen = pageTexts.reduce((a, t) => a + t.length, 0);
  let text: string;
  if (totalLen <= MAX_CHARS) {
    text = pageTexts.filter(Boolean).join("\n");
  } else {
    // Proportional sampling: every page contributes its share.
    text = pageTexts
      .map((t) => t.slice(0, Math.max(40, Math.floor((t.length / totalLen) * MAX_CHARS))))
      .filter(Boolean)
      .join("\n");
  }
  text = text.replace(/[ \t]+/g, " ").slice(0, MAX_CHARS).trim();
  if (text.length < 200) throw new Error("Could not read any text — the PDF may be scanned images.");
  return { name: file.name, pages: pdf.numPages, chars: text.length, text };
}
