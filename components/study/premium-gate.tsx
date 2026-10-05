"use client";

import { useState } from "react";
import { Crown } from "lucide-react";
import { useStudy } from "@/lib/study-store";

/** Locked panel shown where Premium AI features live for free accounts. */
export function PremiumLockPanel({ compact }: { compact?: boolean }) {
  const { refresh, pushToast } = useStudy();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const redeem = async () => {
    if (!code.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/premium/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Redeem failed.");
      setCode("");
      pushToast({ title: "Premium unlocked — AI generation is yours" });
      await refresh().catch(() => {});
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Redeem failed.");
    }
    setBusy(false);
  };

  return (
    <div className={compact ? "p-3 rounded-xl" : "p-4 rounded-xl mt-2"} style={{ background: "var(--primary-bg)", border: "1px solid var(--border)" }}>
      <div className="text-sm font-bold flex items-center gap-1.5" style={{ color: "#6D28D9" }}>
        <Crown size={15} /> AI generation is Premium
      </div>
      <p className="text-[11px] mt-1" style={{ color: "var(--ink-2)" }}>
        Flashcards, full chapter sets and daily AI questions unlock with a code.
      </p>
      <div className="flex gap-2 mt-2">
        <input
          value={code}
          onChange={(e) => { setCode(e.target.value); setErr(null); }}
          onKeyDown={(e) => { if (e.key === "Enter" && code.trim()) redeem(); }}
          placeholder="Enter premium code"
          className="flex-1 min-w-0 px-3 py-2 rounded-xl text-sm"
          style={{ border: "1px solid var(--border)", background: "var(--card)" }}
          aria-label="Premium code"
          autoComplete="off"
        />
        <button onClick={redeem} disabled={busy || !code.trim()} className="btn-primary px-4 py-2 text-sm shrink-0 disabled:opacity-50">
          {busy ? "…" : "Unlock"}
        </button>
      </div>
      {err && <p className="text-[11px] font-semibold mt-1" style={{ color: "#EF4444" }} role="alert">{err}</p>}
    </div>
  );
}
