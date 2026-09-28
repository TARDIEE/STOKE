"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Reveal from "./Reveal";
import SectionHead from "./SectionHead";

gsap.registerPlugin(ScrollTrigger);

const offers = [
  { title: "Short-form", tags: "Reels · Shorts · TikTok", body: "Hook-first edits with punchy pacing, dynamic captions and sound design made for the scroll." },
  { title: "Long-form", tags: "YouTube · Podcasts · Docs", body: "Story structure, retention-focused cuts, b-roll and graphics that keep viewers past the midpoint." },
  { title: "Motion & Brand", tags: "Motion graphics · Ads", body: "Animated titles, lower-thirds and ad creatives that make brands feel premium and consistent." },
  { title: "Creative Direction", tags: "Scripts · Thumbnails · Design", body: "Script writing and graphic design so the idea is strong before a single frame is cut." },
];

const process = ["Brief", "Rough Cut", "Color Grading", "Motion Graphic", "Revision", "Final Level"];

export default function Services() {
  const stepsRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>(".process-step").forEach((el, i) => {
        gsap.from(el, {
          y: 50,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          delay: (i % 3) * 0.1,
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
            toggleActions: "play reverse play reverse",
          },
        });
      });
    },
    { scope: stepsRef },
  );

  return (
    <Reveal id="services" className="mx-auto max-w-7xl px-4 py-28 sm:px-8 sm:py-40">
      <SectionHead
        index="02"
        label="Services"
        title={<>Everything from raw footage to <em className="font-display font-normal italic">final export.</em></>}
      />

      <div className="divide-y divide-line border-y border-line">
        {offers.map((o, i) => (
          <div key={o.title} data-reveal className="group grid grid-cols-1 gap-4 py-10 md:grid-cols-12 md:items-baseline">
            <span className="font-mono text-xs text-ink-500 md:col-span-1">0{i + 1}</span>
            <h3 className="text-4xl font-extrabold tracking-[-0.04em] transition-transform duration-500 group-hover:translate-x-3 sm:text-5xl md:col-span-5">
              {o.title}
            </h3>
            <div className="md:col-span-6">
              <p className="mb-2 font-mono text-xs uppercase tracking-widest text-rec">{o.tags}</p>
              <p className="max-w-md leading-relaxed text-ink-500">{o.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div ref={stepsRef} className="mt-20 grid grid-cols-2 gap-4 md:grid-cols-3">
        {process.map((step, i) => (
          <div
            key={step}
            className="process-step rounded-2xl bg-paper-2 p-6"
          >
            <p className="font-mono text-xs text-ink-500">Step {i + 1}</p>
            <p className="mt-10 text-2xl font-semibold tracking-tight">{step}</p>
          </div>
        ))}
      </div>
    </Reveal>
  );
}
