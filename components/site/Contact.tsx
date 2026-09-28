"use client";

import { useState } from "react";
import { profile } from "@/lib/content";

type Status = "idle" | "submitting" | "success" | "error";

const field =
  "w-full border-b border-white/20 bg-transparent py-4 text-lg outline-none transition-colors placeholder:text-white/40 focus:border-rec";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setStatus("success");
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  return (
    <section id="contact" className="invert-band bg-ink-900 text-paper">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-16 px-4 py-28 sm:px-8 sm:py-40 md:grid-cols-2">
        <div>
          <p className="mb-6 font-mono text-xs uppercase tracking-widest text-white/50">(04) Contact</p>
          <h2 className="text-6xl font-extrabold leading-[0.9] tracking-[-0.05em] sm:text-8xl">
            Got footage?
            <br />
            <em className="font-display font-normal italic text-rec">Let&apos;s talk.</em>
          </h2>
          <div className="mt-12 flex flex-col gap-3 text-lg">
            <a href={`mailto:${profile.email}`} className="w-fit border-b border-white/30 hover:border-rec">
              {profile.email}
            </a>
            <a
              href={`https://instagram.com/${profile.instagram}`}
              target="_blank"
              rel="noreferrer"
              className="w-fit border-b border-white/30 hover:border-rec"
            >
              Instagram — @{profile.instagram}
            </a>
          </div>
        </div>

        {status === "success" ? (
          <div className="self-end">
            <p className="text-3xl font-semibold">Message received ✓</p>
            <p className="mt-2 text-white/60">Thanks for reaching out — I&apos;ll get back to you soon.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-2 self-end">
            <input value={form.name} onChange={set("name")} placeholder="Your name" className={field} />
            <input value={form.email} onChange={set("email")} type="email" required placeholder="Email address" className={field} />
            <textarea
              value={form.message}
              onChange={set("message")}
              required
              rows={3}
              placeholder="Tell me about your project"
              className={`${field} resize-none`}
            />
            {status === "error" && <p className="text-sm text-rec">{error}</p>}
            <button
              type="submit"
              disabled={status === "submitting"}
              className="mt-8 w-fit rounded-full bg-paper px-8 py-4 font-medium text-ink-900 transition-transform hover:scale-[1.04] disabled:opacity-60"
            >
              {status === "submitting" ? "Sending…" : "Send message →"}
            </button>
          </form>
        )}
      </div>
      <footer className="mx-auto flex max-w-7xl justify-between border-t border-white/10 px-4 py-6 font-mono text-xs text-white/40 sm:px-8">
        <span>
          © {new Date().getFullYear()} {profile.name}
        </span>
        <span>Edited in {profile.location}</span>
      </footer>
    </section>
  );
}
