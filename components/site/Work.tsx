"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { portfolioItems } from "@/lib/content";
import Reveal from "./Reveal";
import SectionHead from "./SectionHead";

gsap.registerPlugin(ScrollTrigger);

export default function Work() {
  const [active, setActive] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<any>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>(".work-card").forEach((el, i) => {
        gsap.from(el, {
          y: 90,
          opacity: 0,
          scale: 0.95,
          duration: 0.9,
          ease: "power3.out",
          delay: (i % 2) * 0.1,
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
            toggleActions: "play reverse play reverse",
          },
        });
      });
    },
    { scope: gridRef },
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  // Wire up the YouTube IFrame API player and hover-to-play (muted)
  useEffect(() => {
    if (!active || !iframeRef.current) return;

    const onApiLoad = () => {
      const yt = (window as any).YT;
      if (!yt || !yt.Player) return;
      playerRef.current = new yt.Player(iframeRef.current, {
        videoId: active,
        playerVars: { autoplay: 1, mute: 1, modestbranding: 1, controls: 1 },
        events: {
          onReady: () => {
            const p = playerRef.current;
            if (!p) return;
            const container = p.getIframe()?.parentElement;
            if (!container) return;
            const playMuted = () => { p.mute(); p.playVideo().catch(() => {}); };
            const pauseVid = () => { p.pauseVideo().catch(() => {}); };
            container.addEventListener("mouseenter", playMuted);
            container.addEventListener("mouseleave", pauseVid);
          },
        },
      });
    };

    // Load the IFrame API if not already loaded
    if (!(window as any).YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScript = document.getElementsByTagName("script")[0];
      firstScript?.parentNode?.insertBefore(tag, firstScript);
      const onYTReady = () => {
        (window as any).onYouTubeIframeAPIReady = onApiLoad;
        // The global callback fires; call our init
        setTimeout(onApiLoad, 200);
      };
      (window as any).onYouTubeIframeAPIReady = onYTReady;
    } else {
      onApiLoad();
    }

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [active]);

  return (
    <Reveal id="work" className="mx-auto max-w-7xl px-4 py-28 sm:px-8 sm:py-40">
      <SectionHead
        index="01"
        label="Selected work"
        title={<>Edits built to be <em className="font-display font-normal italic">watched</em> to the end.</>}
      />

      <div ref={gridRef} className="grid grid-cols-1 gap-x-6 gap-y-14 md:grid-cols-2">
        {portfolioItems.map((item, i) => (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            className={`work-card tilt-card group text-left ${i % 2 === 1 ? "md:mt-24" : ""}`}
          >
            <div className="card no-border">
              <div
                className="shadow"
                style={{ backgroundImage: `url(https://img.youtube.com/vi/${item.id}/maxresdefault.jpg)` }}
              />
              <div
                className="image background"
                style={{
                  backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.4), transparent), url(https://img.youtube.com/vi/${item.id}/maxresdefault.jpg)`,
                }}
              />
            </div>
            <div className="mt-4 flex items-baseline justify-between border-b border-line pb-4">
              <span className="text-xl font-semibold tracking-tight">{item.title}</span>
              <span className="font-mono text-xs text-ink-500">{String(i + 1).padStart(2, "0")}</span>
            </div>
          </button>
        ))}
      </div>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Video player"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-900/90 p-4 backdrop-blur-sm"
          onClick={() => setActive(null)}
          data-lenis-prevent
        >
          <button
            autoFocus
            aria-label="Close video"
            onClick={() => setActive(null)}
            className="absolute right-6 top-6 font-mono text-xs uppercase tracking-widest text-paper"
          >
            Close ✕
          </button>
          <div className="aspect-video w-full max-w-5xl overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <iframe
              ref={iframeRef}
              className="h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${active}?autoplay=1&mute=1&modestbranding=1`}
              title="Video"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </Reveal>
  );
}
