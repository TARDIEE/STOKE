"use client";

import { useEffect, useState } from "react";

/** Running SMPTE-style timecode, 25fps. */
export default function Timecode({ className = "" }: { className?: string }) {
  const [frames, setFrames] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrames((f) => f + 1), 40);
    return () => clearInterval(id);
  }, []);
  const p = (n: number) => String(n).padStart(2, "0");
  const s = Math.floor(frames / 25);
  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {p(Math.floor(s / 3600))}:{p(Math.floor(s / 60) % 60)}:{p(s % 60)}:{p(frames % 25)}
    </span>
  );
}
