import Image from "next/image";

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
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className="object-cover"
    />
  );
}
