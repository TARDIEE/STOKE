"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { services } from "@/lib/content";

export default function Marquee() {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.to(".marquee-track", { xPercent: -50, duration: 40, ease: "none", repeat: -1 });
    },
    { scope: ref },
  );
  const items = [...services, ...services];
  return (
    <div ref={ref} className="overflow-hidden border-y border-line py-6">
      <div className="marquee-track flex w-max gap-12 whitespace-nowrap">
        {items.map((s, i) => (
          <span key={i} className="flex items-center gap-12 font-display text-4xl italic sm:text-5xl">
            {s}
            <span className="text-rec not-italic">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
