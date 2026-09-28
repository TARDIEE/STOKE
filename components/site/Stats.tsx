"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";

const stats = [
  { value: 150, suffix: "+", label: "Videos delivered" },
  { value: 1, suffix: "M+", label: "Views generated" },
  { value: 10, suffix: "+", label: "Clients & creators" },
  { value: 24, suffix: "h", label: "Avg. turnaround" },
];

export default function Stats() {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>(".stat-num").forEach((el) => {
        const obj = { v: 0 };
        gsap.to(obj, {
          v: Number(el.dataset.value),
          duration: 2,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
          onUpdate: () => {
            el.textContent = Math.round(obj.v).toString();
          },
        });
      });
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className="invert-band bg-ink-900 text-paper">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-12 px-4 py-20 sm:px-8 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="border-l border-white/15 pl-5">
            <p className="text-6xl font-extrabold tracking-[-0.05em] sm:text-7xl">
              <span className="stat-num" data-value={s.value}>0</span>
              <span className="text-rec">{s.suffix}</span>
            </p>
            <p className="mt-2 font-mono text-xs uppercase tracking-widest text-white/50">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
