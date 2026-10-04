"use client";

import { useState } from "react";
import { useStudy } from "@/lib/study-store";
import { AppLogo } from "./logo";

export default function AuthScreen() {
  const { login, register, authError, clearAuthError } = useStudy();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = async () => {
    setLocalError(null);
    // Name is required — the form cannot be submitted without it.
    if (mode === "register" && !name.trim()) {
      setLocalError("Please enter your name to create your account.");
      return;
    }
    if (!email.trim()) { setLocalError("Please enter your email address."); return; }
    if (password.length < 6) { setLocalError("Password must be at least 6 characters."); return; }
    setBusy(true);
    try {
      if (mode === "register") await register(name.trim(), email.trim(), password);
      else await login(email.trim(), password);
    } catch {
      // error is surfaced via authError from the store
    } finally {
      setBusy(false);
    }
  };

  const error = localError || authError;

  return (
    <div className="min-h-screen grid place-items-center p-4" style={{ background: "var(--bg)" }}>
      <div className="card w-full max-w-sm p-6 fade-in">
        <div className="flex items-center gap-2.5">
          <AppLogo size={42} />
          <div>
            <div className="font-bold text-lg leading-none">Stoke</div>
            <div className="text-[11px]" style={{ color: "var(--ink-2)" }}>Your personal study command center</div>
          </div>
        </div>

        <div className="flex gap-2 mt-5 p-1 rounded-xl" style={{ background: "var(--bg)" }} role="tablist" aria-label="Sign in or create account">
          {(["register", "login"] as const).map((m) => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setLocalError(null); clearAuthError(); }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize ${mode === m ? "text-white" : ""}`}
              style={mode === m ? { background: "#7c3aed" } : { color: "var(--ink-2)" }}>
              {mode === m ? (m === "register" ? "Create account" : "Sign in") : m === "register" ? "Sign up" : "Sign in"}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {mode === "register" && (
            <label className="text-xs font-medium flex flex-col gap-1">Your name *
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex Sharma"
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                type="text" name="stoke-name" id="stoke-name" spellCheck={false} autoCorrect="off" autoCapitalize="words"
                className="px-3 py-2.5 rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Your name" autoComplete="given-name" />
            </label>
          )}
          <label className="text-xs font-medium flex flex-col gap-1">Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" name="email" id="stoke-email"
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              className="px-3 py-2.5 rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Email" autoComplete="email" />
          </label>
          <label className="text-xs font-medium flex flex-col gap-1">Password
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" type="password"
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              className="px-3 py-2.5 rounded-xl text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg)" }} aria-label="Password" autoComplete={mode === "register" ? "new-password" : "current-password"} />
          </label>
        </div>

        {error && <p className="text-xs font-semibold mt-2" style={{ color: "#EF4444" }} role="alert">{error}</p>}
        {/already exists/i.test(error ?? "") && mode === "register" && (
          <button onClick={() => { setMode("login"); setLocalError(null); clearAuthError(); }} className="text-xs font-bold mt-1.5" style={{ color: "#7C3AED" }}>
            Go to Sign in →
          </button>
        )}

        <button onClick={submit} disabled={busy} className="btn-primary w-full py-2.5 text-sm mt-4 disabled:opacity-60">
          {busy ? "Please wait…" : mode === "register" ? "Create my account" : "Sign in"}
        </button>
        <p className="text-[11px] text-center mt-3" style={{ color: "var(--ink-2)" }}>
          {mode === "register" ? "Your subjects, flashcards and progress stay private to your account." : "Welcome back. Your study data is waiting."}
        </p>
      </div>
    </div>
  );
}
