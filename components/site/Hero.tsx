"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { profile } from "@/lib/content";
import Timecode from "./Timecode";

export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.from(".hero-line > span", { yPercent: 110, duration: 1.4, stagger: 0.12 }).from(
        ".hero-fade",
        { opacity: 0, y: 20, duration: 1, stagger: 0.08 },
        "-=0.9",
      );
    },
    { scope: root },
  );

  return (
    <section id="top" ref={root} className="relative pb-20 pt-32 sm:pb-28 sm:pt-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <div className="hero-fade mb-8 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs uppercase tracking-widest text-ink-500">
          <span className="flex items-center gap-2 text-ink-900">
            <span className="h-2 w-2 rounded-full bg-rec" /> Rec
            <Timecode />
          </span>
          <span>Video Editor — {profile.location}</span>
          <span>Available for projects</span>
        </div>

        <h1 className="text-[15vw] font-extrabold leading-[0.86] tracking-[-0.05em] sm:text-[11vw] xl:text-[9.5rem]">
          <span className="hero-line split-line"><span>I cut the noise,</span></span>
          <span className="hero-line split-line">
            <span>
              keep the <em className="font-display font-normal italic tracking-tight">story.</em>
            </span>
          </span>
        </h1>

        <div className="mt-10 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <p className="hero-fade max-w-md text-lg leading-relaxed text-ink-500">
            Short-form, long-form and branded edits for creators and businesses —
            paced to hold attention from the first frame to the last.
          </p>
          <div className="hero-fade flex gap-3">
            <a href="#work" className="magnetic rounded-full bg-ink-900 px-6 py-3 text-sm font-medium text-paper transition-transform hover:scale-[1.04]">
              View work
            </a>
            <a href="#contact" className="magnetic rounded-full border border-rec px-6 py-3 text-sm font-medium text-rec transition-colors hover:bg-rec hover:text-paper">
              Start a project
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
