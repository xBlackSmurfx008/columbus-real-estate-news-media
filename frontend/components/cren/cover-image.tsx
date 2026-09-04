"use client";

import Image from "next/image";
import { useState } from "react";
import { displayArticleImageUrl } from "@/lib/article-image";

function placeholderHue(value: string) {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) % 360;
  return hash;
}

/**
 * Width, in CSS pixels, that a card thumbnail is ever asked to fill.
 *
 * `/blog` renders every live article as a card in a three-column grid, and
 * `/areas` renders 86 hubs the same way. With `fill` + a `sizes` string,
 * next/image has to emit EVERY configured width in the srcset and let the
 * browser choose — ten candidate URLs per image, each carrying a ~110-character
 * blob URL. On /blog that was 218KB of srcset attributes inside a 643KB page.
 *
 * A card is never wider than ~440 CSS px at any breakpoint, so a fixed-width
 * image with x-descriptors (1x/2x) is not a downgrade — it is the honest
 * description of the slot, and it costs two URLs instead of ten. Full-bleed
 * heroes still use the `fill` path below, where the flexibility is real.
 *
 * 600 rather than 640 on purpose: next/image snaps 1x and 2x up to the nearest
 * configured width, so 600 resolves to the 640 and 1200 variants. 640 would
 * resolve to 640 and 1920 — a 4K-wide file served to a phone.
 */
const THUMBNAIL_WIDTH = 600;

type CoverImageProps = {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  /**
   * Render as a fixed-width card thumbnail (2 srcset entries) instead of a
   * responsive fill image (10). The parent still controls the visible box; the
   * image is absolutely positioned and object-fit cover, exactly as before.
   */
  thumbnail?: boolean;
  /** Aspect ratio of the thumbnail box, used only to pick the intrinsic height. */
  aspect?: number;
};

// Optimized cover image for a fixed-aspect container. The PARENT must be
// position:relative with a defined size (aspect-ratio or height). Uses
// next/image so Vercel serves resized AVIF/WebP instead of the raw ~8MB PNG.
export function CoverImage({
  src,
  alt,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
  thumbnail = false,
  aspect = 16 / 9,
}: CoverImageProps) {
  const displaySrc = displayArticleImageUrl(src);
  return (
    <ResolvedCoverImage
      key={`${src}:${displaySrc ?? "unavailable"}`}
      initialSrc={displaySrc}
      alt={alt}
      sizes={sizes}
      priority={priority}
      thumbnail={thumbnail}
      aspect={aspect}
    />
  );
}

function ResolvedCoverImage({
  initialSrc,
  alt,
  sizes,
  priority,
  thumbnail,
  aspect,
}: {
  initialSrc: string | null;
  alt: string;
  sizes: string;
  priority: boolean;
  thumbnail: boolean;
  aspect: number;
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

  if (thumbnail) {
    return (
      <Image
        src={currentSrc}
        alt={alt}
        width={THUMBNAIL_WIDTH}
        height={Math.round(THUMBNAIL_WIDTH / aspect)}
        priority={priority}
        className="absolute inset-0 h-full w-full object-cover"
        onError={() => setCurrentSrc(null)}
      />
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
