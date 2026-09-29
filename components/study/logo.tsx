"use client";

import Image from "next/image";

interface LogoProps {
  size?: number;
  /** show the wordmark next to the mark */
  withWordmark?: boolean;
}

/**
 * Stoke logo — the exact brand image, used unchanged everywhere.
 */
export function AppLogo({ size = 36 }: LogoProps) {
  return (
    <Image
      src="/logo.jpeg"
      width={size}
      height={size}
      alt="Stoke logo"
      className="shrink-0 rounded-xl"
      style={{ width: size, height: size, objectFit: "cover" }}
    />
  );
}

export function BrandMark({ size = 36, name = "Stoke", sub = "Study command center" }: LogoProps & { name?: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <AppLogo size={size} />
      <div>
        <div className="font-bold leading-none">{name}</div>
        <div className="text-[11px]" style={{ color: "var(--ink-2)" }}>{sub}</div>
      </div>
    </div>
  );
}
