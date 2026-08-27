"use client";

import Image from "next/image";
import { useState } from "react";
import { displayArticleImageUrl } from "@/lib/article-image";

function placeholderHue(value: string) {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) % 360;
  return hash;
}

// Optimized cover image for a fixed-aspect container. The PARENT must be
// position:relative with a defined size (aspect-ratio or height). Uses
// next/image so Vercel serves resized AVIF/WebP instead of the raw ~8MB PNG.
export function CoverImage({
  src,
  alt,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
}: {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
}) {
  const displaySrc = displayArticleImageUrl(src);
  return (
    <ResolvedCoverImage
      key={`${src}:${displaySrc ?? "unavailable"}`}
      initialSrc={displaySrc}
      alt={alt}
      sizes={sizes}
      priority={priority}
    />
  );
}

function ResolvedCoverImage({
  initialSrc,
  alt,
  sizes,
  priority,
}: {
  initialSrc: string | null;
  alt: string;
  sizes: string;
  priority: boolean;
}) {
  const [currentSrc, setCurrentSrc] = useState(initialSrc);

  if (!currentSrc) {
    const hue = placeholderHue(alt);
    return (
      <div
        role="img"
        aria-label={`${alt} — image unavailable`}
        className="absolute inset-0 flex items-end p-4 text-xs font-semibold uppercase tracking-[0.18em] text-white"
        style={{ background: `linear-gradient(135deg, hsl(${hue} 28% 24%), hsl(${(hue + 42) % 360} 35% 42%))` }}
      >
        CREN · Image unavailable
      </div>
    );
  }

  return (
    <Image
      src={currentSrc}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className="object-cover"
      onError={() => setCurrentSrc(null)}
    />
  );
}
