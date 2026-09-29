"use client";

import { useEffect, useState } from "react";

const COLORS = ["#7C3AED", "#A78BFA", "#22C55E", "#F59E0B", "#0EA5E9", "#EF4444"];

/** Full-screen celebration burst (battery full, review session cleared). */
export default function Celebrate({ title = "Done!", onDone }: { title?: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone]);

  const [pieces] = useState(() =>
    Array.from({ length: 42 }, (_, i) => ({
      id: i,
      x: Math.cos((i / 42) * Math.PI * 2 + Math.random()) * (120 + Math.random() * 160),
      y: Math.sin((i / 42) * Math.PI * 2 + Math.random()) * (120 + Math.random() * 160),
      size: 5 + Math.random() * 7,
      color: COLORS[i % COLORS.length],
      round: Math.random() > 0.5,
      delay: Math.random() * 0.15,
    }))
  );

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none grid place-items-center" aria-hidden>
      <div className="relative" style={{ width: 0, height: 0 }}>
        {pieces.map((p) => (
          <span
            key={p.id}
            className="celebrate-piece"
            style={{
              width: p.size,
              height: p.round ? p.size : p.size * 0.5,
              background: p.color,
              borderRadius: p.round ? "50%" : 2,
              ["--cx" as string]: `${p.x}px`,
              ["--cy" as string]: `${p.y}px`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>
      <div className="celebrate-pop absolute px-6 py-3 rounded-2xl font-bold text-lg text-white" style={{ background: "linear-gradient(135deg,#7C3AED,#5B21B6)" }}>
        🎉 {title}
      </div>
    </div>
  );
}
