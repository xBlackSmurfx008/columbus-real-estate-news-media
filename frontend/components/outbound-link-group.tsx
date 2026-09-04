import { FtcDisclosure } from "@/components/ftc-disclosure";
import { groupRequiresDisclosure } from "@/lib/affiliate-disclosure";

// THE ONLY COMPONENT ON THIS SITE THAT MAY RENDER A PAID OUTBOUND LINK.
//
// The FTC rule in .claude/skills/cren-sales is "disclosure appears above every
// affiliate block". A rule enforced by remembering it will eventually be
// forgotten, so it is enforced structurally instead:
//
//   - `OutboundCard` is module-private. Nothing outside this file can render a
//     link carrying `rel="sponsored"`.
//   - The disclosure is not a prop. `OutboundLinkGroup` derives it from the
//     very array it is about to render: if any item is sponsored, the
//     disclosure is emitted above the grid. There is no argument a caller can
//     pass to get paid links without it.
//   - Each paid card also carries its own visible "Affiliate link" label, so
//     the disclosure is proximate to the link and survives a reader who skims.
//   - When nothing in the group is paid, no disclosure renders — claiming
//     "some links pay us" while none do would be its own false statement.
//
// Order is the caller's editorial order and is rendered verbatim. This
// component never sorts, filters, or promotes by sponsorship.

export type OutboundCardLink = {
  /** Stable key. */
  key: string;
  /** Headline shown on the card. */
  title: string;
  /** One line of plain description. */
  note: string;
  /** Destination host, shown so the reader knows where the link goes. */
  host?: string | null;
  /** Small label above the title, e.g. the selected area. */
  eyebrow?: string | null;
  /** Where the click actually goes (normally the tracked /go/<key> path). */
  href: string;
  /** True only when a real, active affiliate program pays for this click. */
  sponsored: boolean;
};

function OutboundCard({ link }: { link: OutboundCardLink }) {
  return (
    <a
      href={link.href}
      target="_blank"
      rel={link.sponsored ? "sponsored nofollow noopener noreferrer" : "noopener noreferrer"}
      className="cren-surface cren-card-link p-5"
    >
      <h3 className="font-semibold text-[color:var(--text-hero)]">{link.title} ↗</h3>
      {link.eyebrow && (
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          {link.eyebrow}
        </p>
      )}
      <p className="cren-body mt-2 text-sm">{link.note}</p>
      <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-muted)]">
        {link.host && <span>{link.host}</span>}
        {link.sponsored && (
          <span className="rounded-full border border-[color:var(--border)] px-2 py-0.5 font-semibold uppercase tracking-wide">
            Affiliate link
          </span>
        )}
      </p>
    </a>
  );
}

export function OutboundLinkGroup({
  links,
  columns = 4,
  className,
}: {
  links: OutboundCardLink[];
  columns?: 3 | 4;
  className?: string;
}) {
  if (links.length === 0) return null;

  // Derived from the rendered array, not passed in. This is the invariant.
  const hasSponsoredLink = groupRequiresDisclosure(links);

  return (
    <div className={className}>
      {hasSponsoredLink && (
        <div className="mb-4">
          <FtcDisclosure />
        </div>
      )}
      <div
        className={`grid gap-3 sm:grid-cols-2 ${columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}
      >
        {links.map((link) => (
          <OutboundCard key={link.key} link={link} />
        ))}
      </div>
    </div>
  );
}
