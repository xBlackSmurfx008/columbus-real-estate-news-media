import Link from "next/link";
import { FooterNewsletterForm } from "@/components/cren/footer-newsletter-form";

const coverageLinks = [
  { href: "/blog", label: "Latest Coverage" },
  { href: "/areas", label: "Neighborhoods" },
  { href: "/market-data", label: "Market Data" },
  { href: "/things-to-do", label: "Things to Do" },
  { href: "/housing-search", label: "Housing Search" },
  { href: "/directory", label: "Local Directory" },
  { href: "/topics/local-politics", label: "Local Politics" },
  { href: "/resources", label: "Housing Resources" },
];

const companyLinks = [
  { href: "/about", label: "About" },
  { href: "/newsroom", label: "Newsroom" },
  { href: "/editorial-standards", label: "Editorial Standards" },
  { href: "/corrections", label: "Corrections" },
  { href: "/advertise", label: "Advertise" },
  { href: "/subscribe", label: "Membership" },
  { href: "/contact", label: "Contact" },
  { href: "/directory/list-your-business", label: "List Your Business" },
];

export function SiteFooter() {
  return (
    <footer className="cren-site-footer">
      <div className="cren-container">
        <div className="footer-grid">
          <div>
            <div className="footer-brand-name">Columbus Real Estate News</div>
            <div className="footer-desc">
              Central Ohio&apos;s boutique real estate media platform. Hyper-local data, trusted journalism, and community
              intelligence for renters, buyers, and investors.
            </div>
          </div>
          <div>
            <div className="footer-col-title">Coverage</div>
            <ul className="footer-links">
              {coverageLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Company</div>
            <ul className="footer-links">
              {companyLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="footer-col-title">Newsletter</div>
            <p style={{ fontSize: 13, opacity: 0.4, marginBottom: 12 }}>Get the Columbus RE Insider every Tuesday.</p>
            <FooterNewsletterForm />
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Columbus Real Estate News LLC</span>
          <div className="footer-bottom-links">
            <Link href="/site-map">Site Map</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
