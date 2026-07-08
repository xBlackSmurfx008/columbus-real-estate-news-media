import Link from "next/link";
import { FooterNewsletterForm } from "@/components/cren/footer-newsletter-form";

const coverageLinks = [
  { href: "/blog", label: "Market Reports" },
  { href: "/sell/your-home", label: "Get an Offer on Your Home" },
  { href: "/sell/investment-property", label: "Sell a Rental" },
  { href: "/rent/find-a-home", label: "Find a Rental" },
  { href: "/invest/deploy-capital", label: "Deploy Capital" },
  { href: "/areas", label: "Neighborhoods" },
];

const companyLinks = [
  { href: "/about", label: "About" },
  { href: "/advertise", label: "Advertise" },
  { href: "/subscribe", label: "Membership" },
  { href: "/contact", label: "Contact" },
  { href: "/contact", label: "Write for Us" },
  { href: "/advertise", label: "Media Kit" },
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
            <div className="footer-social">
              <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" title="LinkedIn">
                in
              </a>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" title="X">
                X
              </a>
              <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" title="Instagram">
                IG
              </a>
              <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer" title="YouTube">
                YT
              </a>
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
            <Link href="/privacy">Privacy</Link>
            <Link href="/contact">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
