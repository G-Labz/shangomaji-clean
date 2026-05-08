"use client";

// Phase 5 — Shared artwork components with typographic fallback.
//
// <PosterArt> and <BackdropArt> wrap next/image and render a black,
// typographic fallback (M-mark + truncated title) when no usable artwork
// URL is supplied. Use these instead of <Image> on every public/member
// surface so a missing poster never renders as a gray broken image.

import Image from "next/image";
import { isUsableArtworkUrl } from "@/lib/artwork";

type Variant = "poster" | "backdrop";

function Fallback({ title, variant }: { title: string; variant: Variant }) {
  // Truncate on character count, not pixel width — the fallback intentionally
  // stays minimal and avoids JS measuring overhead.
  const trimmed = (title || "").trim();
  const display =
    trimmed.length > 0
      ? variant === "poster"
        ? trimmed.length > 32
          ? `${trimmed.slice(0, 32).trim()}…`
          : trimmed
        : trimmed
      : "ShangoMaji";

  return (
    <div
      aria-hidden={false}
      className="absolute inset-0 flex flex-col items-center justify-center text-center"
      style={{
        background:
          "linear-gradient(135deg, #0a0809 0%, #110b0c 45%, #0a0809 100%)",
      }}
    >
      {/* M-mark */}
      <span
        className="leading-none"
        style={{
          fontSize: variant === "poster" ? "clamp(28px, 5vw, 44px)" : "clamp(40px, 7vw, 80px)",
          fontWeight: 800,
          letterSpacing: "0.04em",
          background: "linear-gradient(135deg, #e53e2a, #f07030, #f5c518)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          textShadow: "0 0 30px rgba(229,62,42,0.25)",
        }}
      >
        M
      </span>
      <span
        className="mt-2 px-3 leading-tight"
        style={{
          fontSize: variant === "poster" ? "11px" : "13px",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.55)",
          fontWeight: 600,
        }}
      >
        {display}
      </span>
    </div>
  );
}

export function PosterArt({
  src,
  alt,
  title,
  className = "",
  sizes,
  priority,
}: {
  /** Source URL. Pass `null` / `""` / placeholder URLs and the fallback renders. */
  src: string | null | undefined;
  /** Image alt for the underlying <Image>. */
  alt: string;
  /** Title text rendered inside the fallback. Defaults to alt. */
  title?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (isUsableArtworkUrl(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={`object-cover ${className}`}
        sizes={sizes ?? "180px"}
        priority={priority}
      />
    );
  }
  return <Fallback title={title ?? alt} variant="poster" />;
}

export function BackdropArt({
  src,
  alt,
  title,
  className = "",
  sizes,
  priority,
}: {
  src: string | null | undefined;
  alt: string;
  title?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (isUsableArtworkUrl(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={`object-cover ${className}`}
        sizes={sizes ?? "100vw"}
        priority={priority}
      />
    );
  }
  return <Fallback title={title ?? alt} variant="backdrop" />;
}
