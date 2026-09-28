"use client";

import { useEffect } from "react";

const RADIUS = 140;
const MAX_PULL = 12;
const EASE = 0.15;

/** Magnetic effect: any .magnetic element drifts toward the cursor when near */
export default function Magnetic() {
  useEffect(() => {
    let mx = -9999;
    let my = -9999;
    let raf = 0;
    const pos = new Map<HTMLElement, { x: number; y: number }>();

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };
    const onLeave = () => {
      mx = -9999;
      my = -9999;
    };

    const tick = () => {
      document.querySelectorAll<HTMLElement>(".magnetic").forEach((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = mx - cx;
        const dy = my - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const target =
          dist < RADIUS
            ? { x: (dx / RADIUS) * MAX_PULL, y: (dy / RADIUS) * MAX_PULL }
            : { x: 0, y: 0 };
        const cur = pos.get(el) ?? { x: 0, y: 0 };
        const nx = cur.x + (target.x - cur.x) * EASE;
        const ny = cur.y + (target.y - cur.y) * EASE;
        pos.set(el, { x: nx, y: ny });
        if (Math.abs(nx) < 0.05 && Math.abs(ny) < 0.05 && target.x === 0 && target.y === 0) {
          el.style.transform = "";
        } else {
          el.style.transform = `translate(${nx.toFixed(2)}px, ${ny.toFixed(2)}px)`;
        }
      });
      raf = requestAnimationFrame(tick);
    };

    document.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(tick);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
