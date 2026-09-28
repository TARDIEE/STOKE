"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

export default function SectionHead({
  index,
  label,
  title,
}: {
  index: string;
  label: string;
  title: React.ReactNode;
}) {
  const h2Ref = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const h2 = h2Ref.current;
      if (!h2) return;

      // Split title text into per-character spans (keeps <em> styling)
      let chars = Array.from(h2.querySelectorAll<HTMLElement>(".type-char"));
      if (chars.length === 0) {
        const walker = document.createTreeWalker(h2, NodeFilter.SHOW_TEXT);
        const nodes: Text[] = [];
        while (walker.nextNode()) nodes.push(walker.currentNode as Text);
        nodes.forEach((node) => {
          const frag = document.createDocumentFragment();
          (node.textContent ?? "").split("").forEach((ch) => {
            const s = document.createElement("span");
            s.className = "type-char";
            s.textContent = ch;
            frag.appendChild(s);
            chars.push(s);
          });
          node.replaceWith(frag);
        });
      }

      // Scrubbed typing: chars fade in as you scroll down, out as you scroll up
      gsap.fromTo(
        chars,
        { opacity: 0.12 },
        {
          opacity: 1,
          ease: "none",
          stagger: 0.06,
          scrollTrigger: {
            trigger: h2,
            start: "top 85%",
            end: "top 35%",
            scrub: 0.5,
          },
        },
      );
    },
    { scope: h2Ref },
  );

  return (
    <div data-reveal className="mb-14 flex flex-col gap-6 border-t border-line pt-6 md:flex-row md:items-start md:justify-between">
      <span className="font-mono text-xs uppercase tracking-widest text-ink-500">
        ({index}) {label}
      </span>
      <h2 ref={h2Ref} className="max-w-3xl text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] sm:text-7xl">{title}</h2>
    </div>
  );
}
