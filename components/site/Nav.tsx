"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import dynamic from "next/dynamic";
import { profile } from "@/lib/content";

const ThemeToggle = dynamic(() => import("./ThemeToggle"), { ssr: false });

const links = [
  { href: "#work", label: "Work" },
  { href: "#services", label: "Services" },
  { href: "#about", label: "About" },
];

export default function Nav() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState("");

  useGSAP(() => {
    gsap.from(ref.current, { y: -40, opacity: 0, duration: 1, delay: 1.2, ease: "power3.out" });
  });

  useEffect(() => {
    const ids = ["work", "services", "about"];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(`#${e.target.id}`);
        });
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <header ref={ref} className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-8">
      <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-line bg-paper/70 px-5 py-3 backdrop-blur-md">
        <a href="#top" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="h-2 w-2 animate-pulse rounded-full bg-rec" />
          {profile.name}
        </a>
        <div className="hidden items-center gap-1 text-sm text-ink-500 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className={`rounded-full px-4 py-1.5 transition-all ${
                active === l.href ? "bg-rec text-paper" : "hover:text-ink-900"
              }`}
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href="#contact"
            className="magnetic rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-paper transition-transform hover:scale-[1.04]"
          >
            Let&apos;s talk
          </a>
        </div>
      </nav>
    </header>
  );
}
