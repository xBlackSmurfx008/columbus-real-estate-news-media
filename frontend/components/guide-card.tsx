import Image from "next/image";
import Link from "next/link";
import type { GuideCard as GuideCardData } from "@/lib/area-guides";

export function GuideCard({ card }: { card: GuideCardData }) {
  const body = (
    <>
      <div className="relative aspect-[16/10] overflow-hidden bg-[color:var(--green-pale)]">
        <Image
          src={card.image}
          alt={card.imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.025]"
        />
      </div>
      <div className="p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--green)]">{card.eyebrow}</p>
        <h3 className="mt-2 font-[family-name:var(--serif)] text-xl font-semibold leading-tight text-[color:var(--text-hero)]">
          {card.title}
        </h3>
        <p className="cren-body mt-2 text-sm">{card.description}</p>
        <span className="cren-text-link mt-4 inline-flex items-center gap-1 text-sm">
          Explore {card.external ? "current results ↗" : "options →"}
        </span>
      </div>
    </>
  );

  const className = "group cren-surface cren-card-link overflow-hidden";
  if (card.external) {
    return (
      <a href={card.href} target="_blank" rel="noopener noreferrer" className={className}>
        {body}
      </a>
    );
  }
  return (
    <Link href={card.href} className={className}>
      {body}
    </Link>
  );
}

export function RepresentativeImageNote() {
  return (
    <p className="mt-2 text-xs leading-relaxed text-[color:var(--text-muted)]">
      CREN representative editorial image. It illustrates the guide category and is not documentary photography of a named venue.
    </p>
  );
}
