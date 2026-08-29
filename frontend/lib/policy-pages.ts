export type PolicyLink = {
  label: string;
  href: string;
};

export type PolicySection = {
  title: string;
  body?: string[];
  bullets?: string[];
  links?: PolicyLink[];
};

export type PolicyPageContent = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  effectiveDate: string;
  reviewStatus: string;
  sections: PolicySection[];
};

export const POLICY_PAGES = {
  terms: {
    slug: "terms",
    title: "Terms of Use",
    eyebrow: "Legal terms",
    description:
      "Rules for using Columbus Real Estate News, including accounts, submissions, directory profiles, ads, lead routing, data, and informational disclaimers.",
    effectiveDate: "Draft for review - 2026-08-29",
    reviewStatus: "Draft for counsel review before production use.",
    sections: [
      {
        title: "CREN's role",
        body: [
          "Columbus Real Estate News provides local reporting, market context, guides, directories, advertising placements, and reader tools for general information. CREN is not acting as your broker, agent, lender, insurer, attorney, tax adviser, appraiser, investment adviser, securities broker, property manager, or fiduciary unless a separate written agreement signed by an authorized party says otherwise.",
          "Readers, advertisers, members, and profile owners should verify official records, property availability, pricing, rents, fees, school boundaries, tax figures, permits, zoning status, licenses, credentials, and contract terms before acting.",
        ],
      },
      {
        title: "Accounts and profiles",
        bullets: [
          "You are responsible for accurate account, profile, business, listing, and contact information.",
          "You may not claim a business, property, apartment community, listing, brokerage, professional profile, or advertiser account unless you have authority to do so.",
          "CREN may require proof of authority, proof of credentials, a work email, public records, or manual review before publishing or updating profiles.",
          "CREN may suspend, limit, remove, relabel, or correct accounts and profiles that are misleading, disputed, unauthorized, stale, unsafe, or inconsistent with policy.",
        ],
      },
      {
        title: "Submissions and license",
        body: [
          "If you submit tips, profile details, corrections, advertising materials, logos, photos, documents, comments, listings, or other content, you represent that you have the right to submit them and that they are accurate to the best of your knowledge.",
          "You grant CREN a non-exclusive license to use submitted content to operate the site, review and verify claims, publish or reject submissions, promote published content, provide services, maintain records, and enforce policies.",
        ],
      },
      {
        title: "Advertising, sponsored content, and affiliate links",
        bullets: [
          "Advertising buys labeled distribution and commercial visibility. It does not buy newsroom coverage, rankings, conclusions, recommendations, corrections decisions, or source treatment.",
          "Sponsored content, sponsor messages, paid profiles, affiliate links, and advertisements must be labeled where readers encounter them and on destination surfaces where required.",
          "Advertisers are responsible for substantiating offers, claims, prices, credentials, availability, comparisons, guarantees, images, and landing-page content.",
          "CREN may reject or pause ads or sponsored content for legal, editorial, brand-safety, fair-housing, privacy, intellectual-property, or substantiation concerns.",
        ],
      },
      {
        title: "Lead routing and communications",
        body: [
          "If you submit a request for rental help, selling help, business listing review, advertising, services, or capital conversations, CREN may use that request to respond directly and, where disclosed, route it to relevant providers, profile owners, sponsors, or partners.",
          "Lead routing does not mean CREN endorses the recipient, guarantees a response, guarantees a lease, sale, closing, loan, rate, insurance policy, investment result, availability, pricing, quality, or professional outcome.",
        ],
      },
      {
        title: "Payments, refunds, and memberships",
        bullets: [
          "Free memberships remain free unless a user chooses a paid product or service under separate terms.",
          "Paid ads, profiles, reports, events, or sponsorships should use a written order or checkout flow that identifies price, term, deliverables, cancellation rights, and refund or make-good rules.",
          "No refund is promised for normal performance variation, low click volume, low lead volume, advertiser-caused delays, unsupported claims, policy violations, or third-party landing-page failures unless the order says otherwise.",
        ],
      },
      {
        title: "Prohibited uses",
        bullets: [
          "No unlawful, discriminatory, deceptive, defamatory, harassing, infringing, spam, malware, scraping, impersonation, fake review, false credential, false availability, false price, or fraudulent submission activity.",
          "No housing advertisement, profile, recommendation, routing, filter, or targeting may express an unlawful preference, limitation, exclusion, steering signal, or discriminatory practice.",
          "No one may use CREN to promote unsubstantiated investment returns, guaranteed appreciation, guaranteed occupancy, guaranteed approval, hidden fees, or misleading scarcity.",
        ],
      },
      {
        title: "Disclaimers and limits",
        body: [
          "CREN content and tools are provided as-is and as-available for general information. Market data can lag, differ by source, or change without notice. Public records, permits, listings, and legal obligations can change after publication.",
          "Final limitations of liability, indemnity, arbitration, class-action waiver, venue, and governing-law terms require attorney review before launch-grade use.",
        ],
      },
    ],
  },
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    eyebrow: "Privacy and consent",
    description:
      "How CREN collects, uses, shares, protects, and retains information from readers, members, advertisers, profile owners, and public forms.",
    effectiveDate: "Draft for review - 2026-08-29",
    reviewStatus: "Draft for counsel review before production use.",
    sections: [
      {
        title: "Data CREN collects",
        bullets: [
          "Contact data such as name, email, phone number, company, role, and message.",
          "Account data such as email, password hash, member profile, role, interests, preferred area, tier, and status.",
          "Lead data such as persona, area, budget, timeline, property details, business details, capital-interest details, source page, consent, and status.",
          "Advertiser and business data such as business name, legal entity name, public contact details, service areas, credentials, claimant authority, dispute contact, creative assets, packages, and campaign details.",
          "Usage data such as page path, referrer host, event name, sanitized event payload, and daily visitor hash where analytics are enabled.",
          "Affiliate data such as partner slug, source path, and referrer when a user follows an affiliate redirect.",
        ],
      },
      {
        title: "Sources of data",
        bullets: [
          "Information you enter into forms, accounts, profiles, subscriptions, advertising inquiries, corrections, and business listing requests.",
          "Automated site interactions such as page views, conversion events, email engagement where supported, and affiliate redirects.",
          "Public records, official sources, business websites, data providers, advertisers, profile claimants, and service providers.",
        ],
      },
      {
        title: "How data is used",
        bullets: [
          "Operate the site, publish reporting, maintain accounts, process subscriptions, route requests, respond to messages, and manage advertising.",
          "Review profile claims, credentials, disputes, corrections, and sponsored-placement requirements.",
          "Measure content, campaigns, area interest, and conversion funnels using aggregated or limited operational analytics.",
          "Prevent abuse, enforce policies, comply with law, maintain records, and improve product quality.",
        ],
      },
      {
        title: "Sharing and disclosure",
        body: [
          "CREN may share information with service providers that help operate hosting, database, email, analytics, payment, notification, security, and customer-support functions. CREN may share lead details with a provider, sponsor, advertiser, or profile owner only when the user request and site disclosure support that routing.",
          "Campaign reporting should be aggregate unless a user has submitted a lead intended for a specific recipient. CREN should not sell raw contact lists. Whether any advertising or analytics activity is a sale or share under state privacy laws is counsel-review pending.",
        ],
      },
      {
        title: "Cookies and analytics",
        body: [
          "CREN currently has first-party session cookies for admin and member login. The audited pageview and activation endpoints use a daily visitor hash and do not store raw IP addresses or full user agents in those tables. Any third-party analytics, pixels, email tracking, or ad targeting must be inventoried in the Cookie Policy before launch.",
        ],
      },
      {
        title: "Choices and requests",
        bullets: [
          "Newsletter recipients should be able to unsubscribe from marketing email.",
          "Users should be able to request access, correction, deletion, or restriction where required by law or adopted voluntarily by CREN.",
          "Business and profile owners should be able to request corrections, claim review, dispute review, downgrade, or removal under the applicable profile policy.",
        ],
      },
      {
        title: "Retention, security, and minors",
        bullets: [
          "Retention periods should be defined by data type before launch-grade use.",
          "CREN should protect data with reasonable administrative, technical, and organizational safeguards, but no system can be guaranteed perfectly secure.",
          "CREN should not knowingly collect personal information from children under 13. Housing and business services are intended for adults and authorized representatives.",
        ],
      },
    ],
  },
  cookies: {
    slug: "cookies",
    title: "Cookie and Tracking Policy",
    eyebrow: "Tracking controls",
    description:
      "Draft inventory and rules for cookies, session storage, analytics, affiliate redirects, pixels, and newsletter tracking.",
    effectiveDate: "Draft for review - 2026-08-29",
    reviewStatus: "Draft for counsel and technical review before production use.",
    sections: [
      {
        title: "Current known tracking",
        bullets: [
          "Member and admin login use first-party HTTP-only session cookies.",
          "Pageview and activation endpoints record path-level engagement using daily visitor hashes, not raw IP addresses or full user agents in the analytics tables.",
          "Affiliate redirects can log partner slug, source path, and referrer for reporting.",
          "Newsletter providers, pixels, third-party analytics, and advertising tags must be inventoried before activation.",
        ],
      },
      {
        title: "Cookie categories",
        bullets: [
          "Essential: login, security, form protection, and site operation.",
          "Analytics: aggregate audience, content, and conversion measurement.",
          "Advertising: sponsor measurement, campaign attribution, pixels, and retargeting if added.",
          "Personalization: saved areas, preferences, and newsletter topic selection where supported.",
        ],
      },
      {
        title: "Controls",
        body: [
          "CREN should provide opt-out or consent controls when legally required or when non-essential advertising, retargeting, or cross-site tracking is activated. Dark patterns, pre-checked telemarketing consents, and hidden tracking disclosures should not be used.",
        ],
      },
    ],
  },
  advertisingTerms: {
    slug: "advertising-terms",
    title: "Advertising Terms",
    eyebrow: "Advertiser rules",
    description:
      "Draft terms for advertiser inquiries, sponsor packages, insertion orders, claims, labels, cancellations, refunds, and reporting.",
    effectiveDate: "Draft for review - 2026-08-29",
    reviewStatus: "Draft for counsel review before paid self-service or signed insertion orders.",
    sections: [
      {
        title: "Orders and deliverables",
        bullets: [
          "Each paid campaign should identify advertiser, package, price, term, flight dates, placements, asset specs, due dates, reporting, cancellation rules, and make-good terms.",
          "CREN may require manual approval before any ad, sponsor slot, native placement, sponsored article, directory upgrade, event package, or market-report sponsorship goes live.",
          "Inventory is not exclusive unless the order expressly grants exclusivity and defines category, geography, dates, and conflict rules.",
        ],
      },
      {
        title: "Advertiser responsibilities",
        bullets: [
          "Advertisers must have rights to all copy, images, video, logos, trademarks, landing pages, claims, offers, and data they submit.",
          "Advertisers must comply with fair housing, lending, insurance, consumer protection, privacy, intellectual property, email, telemarketing, and truth-in-advertising laws.",
          "Advertisers must provide substantiation for objective claims, prices, availability, discounts, guarantees, superlatives, credentials, licenses, comparisons, and performance claims.",
        ],
      },
      {
        title: "Prohibited advertising",
        bullets: [
          "No unlabeled native ads, fake editorial headlines, hidden sponsorship, misleading door openers, fake scarcity, false credentials, false availability, illegal targeting, discriminatory housing copy, or unsupported guarantees.",
          "No ad may imply CREN endorsement, top ranking, approval, best-in-market status, or editorial recommendation unless a separate published methodology and approval process supports that claim.",
          "CREN may reject or pause ads that create editorial, legal, reader-safety, brand-safety, data-rights, or fair-housing risk.",
        ],
      },
      {
        title: "Reporting and refunds",
        body: [
          "Reporting should identify available metrics and limitations. Unless expressly stated in an order, CREN does not guarantee impressions, clicks, leads, leases, closings, conversions, attendance, rankings, editorial coverage, or investment outcomes.",
          "Refunds or make-goods should be limited to missed placements, material CREN-caused labeling errors, or delivery failures defined in the order. Low performance, late advertiser assets, rejected unsupported claims, and policy violations should not automatically trigger refunds.",
        ],
      },
    ],
  },
  sponsoredContent: {
    slug: "sponsored-content-policy",
    title: "Sponsored Content and Native Advertising Policy",
    eyebrow: "Commercial disclosure",
    description:
      "How CREN labels and reviews sponsor messages, sponsored articles, paid profiles, affiliate placements, and native advertising.",
    effectiveDate: "Draft for review - 2026-08-29",
    reviewStatus: "Draft for counsel/editorial review before production use.",
    sections: [
      {
        title: "Core rule",
        body: [
          "Paid or commercially influenced content must be recognizable as advertising or sponsored content before a reader clicks and again on the destination surface when needed. The more a placement resembles independent editorial content, the clearer and more prominent the disclosure must be.",
        ],
        links: [
          { label: "FTC Native Advertising Guide", href: "https://www.ftc.gov/business-guidance/resources/native-advertising-guide-businesses" },
        ],
      },
      {
        title: "Approved labels",
        bullets: [
          "Advertisement",
          "Paid Advertisement",
          "Sponsored Advertising Content",
          "Sponsored Provider",
          "Sponsor Message",
        ],
      },
      {
        title: "Label placement",
        bullets: [
          "Place labels above or immediately before sponsored headlines, cards, thumbnails, and newsletter blurbs.",
          "Repeat labels on article pages, service guides, profile pages, emails, social posts, and media assets where the reader could encounter the item without the original card.",
          "Do not rely on sponsor logos alone to disclose commercial nature.",
        ],
      },
      {
        title: "Editorial firewall",
        bullets: [
          "Sales may sell labeled distribution and sponsor packages, not newsroom conclusions.",
          "Newsroom staff should retain editorial control over independent reporting, corrections, rankings, source treatment, and story decisions.",
          "Sponsored content should use a branded-content workflow with claim substantiation, fair-housing review where applicable, and final approval before publication.",
        ],
      },
    ],
  },
  fairHousing: {
    slug: "fair-housing",
    title: "Fair Housing and Equal Opportunity Policy",
    eyebrow: "Housing compliance",
    description:
      "Draft rules for housing-related ads, listings, profiles, recommendations, routing, targeting, and neighborhood content.",
    effectiveDate: "Draft for review - 2026-08-29",
    reviewStatus: "Draft for counsel review before housing ads, listings, profile routing, or apartment products scale.",
    sections: [
      {
        title: "Protected classes and local scope",
        body: [
          "CREN should treat fair-housing compliance as a product, editorial, advertising, and data-design requirement. Federal law bars discrimination in housing because of race, color, national origin, religion, sex, familial status, and disability. Ohio and Columbus add additional protected classes and local obligations that must be reflected in housing-related workflows.",
        ],
        links: [
          { label: "HUD Fair Housing Rights and Obligations", href: "https://www.hud.gov/stat/fheo/rights-obligations" },
          { label: "Ohio Revised Code Chapter 4112", href: "https://codes.ohio.gov/ohio-revised-code/chapter-4112" },
          { label: "Columbus Protected Classes", href: "https://www.columbus.gov/Government/Mayors-Office/City-Boards-Commissions-Committees/Community-Relations-Commission/Discrimination-Protected-Classes-in-Columbus" },
        ],
      },
      {
        title: "Banned uses",
        bullets: [
          "No housing ad, profile, search tool, lead route, ranking, filter, article, or sponsor placement may state or imply unlawful preference, limitation, exclusion, steering, or discouragement.",
          "Do not target or suppress housing opportunities by protected class.",
          "Do not describe neighborhoods as best or not best for protected groups.",
          "Do not tie protected-class demographic changes to property values, school quality, safety, crime, or neighborhood desirability.",
        ],
      },
      {
        title: "Safer content pattern",
        bullets: [
          "Use objective, source-labeled facts: rent, sale price, inventory, commute, transit, permits, zoning, taxes, public amenities, and property features.",
          "Use user-selected preferences that are not protected-class proxies: budget, bedrooms, pet policy, parking, commute anchor, lease timing, accessibility features requested by the user, and property type.",
          "Require manual review for apartment, lender, agent, school, safety, ranking, and neighborhood-comparison copy.",
        ],
      },
      {
        title: "Advertiser certification",
        body: [
          "Housing-related advertisers, profile owners, and listing submitters should certify that their copy, targeting, screening, application, pricing, and lead-handling practices comply with applicable fair-housing law. CREN should preserve certification version and timestamp before paid placement.",
        ],
      },
    ],
  },
  listingQuality: {
    slug: "listing-quality-policy",
    title: "Listing and Directory Quality Policy",
    eyebrow: "Profile quality",
    description:
      "Draft rules for business, apartment, vendor, service, and real estate professional listings and directory profiles.",
    effectiveDate: "Draft for review - 2026-08-29",
    reviewStatus: "Draft for counsel and operations review before public self-service profile launch.",
    sections: [
      {
        title: "Who may submit or claim",
        bullets: [
          "A business owner, authorized employee, authorized property manager, legal owner, exclusive listing agent, builder, developer, or other documented representative may submit or claim a profile.",
          "CREN may create unclaimed public-interest profiles from public records or business sources, but should label them clearly and provide a correction/claim path.",
          "Conflicting claims move to manual review before profile control changes.",
        ],
      },
      {
        title: "Required facts",
        bullets: [
          "Public business name, legal entity name, website or verified public profile, public contact path, service area, category, claimant authority, limitations, and dispute contact.",
          "For higher-risk categories: licenses, registrations, insurance, permits, NMLS or professional identifiers where applicable, fee/rate caveats, warranty terms, and complaint path.",
          "For apartment communities: manager/owner authority, address, unit mix, current availability source, rents, required fees, concessions, amenities, pet policy, parking, accessibility features, tour/apply links, and last verified date.",
        ],
      },
      {
        title: "Freshness and labels",
        bullets: [
          "Listings and profiles should show status labels such as Basic Listing, Claimed by Business, Credentials Provided, Sponsored Provider, or Last Verified.",
          "Last-verified dates must not imply CREN endorsement or full legal compliance.",
          "Stale pricing, availability, credentials, or contact data should trigger reminders, demotion, relabeling, or removal.",
        ],
      },
      {
        title: "Disputes and removal",
        body: [
          "Readers and businesses should be able to report inaccurate identity, category, credentials, service area, pricing, disclosure, impersonation, fair-housing, or consumer-safety concerns. CREN may correct, pause, downgrade, remove, or leave unchanged with an internal note documenting the decision.",
        ],
      },
    ],
  },
  profileClaims: {
    slug: "profile-claim-policy",
    title: "Profile Claim Policy",
    eyebrow: "Business self-service",
    description:
      "Draft workflow for claiming, updating, disputing, and auditing CREN business, apartment, advertiser, and professional profiles.",
    effectiveDate: "Draft for review - 2026-08-29",
    reviewStatus: "Draft for counsel, operations, and security review before self-service release.",
    sections: [
      {
        title: "Claim proof",
        bullets: [
          "Claimant name, role, work email, phone, business website, proof of authority, and requested listing relationship.",
          "Acceptable proof can include domain email, public staff page, government or license record, management agreement excerpt, owner authorization, broker authorization, or manual verification notes.",
          "Sensitive proof documents should be stored privately and never published unless specifically approved.",
        ],
      },
      {
        title: "Edit rights",
        bullets: [
          "Claimed profile owners may update factual business fields, contacts, service areas, photos, links, hours, and proof records subject to review.",
          "They may not remove disclosures, sponsor labels, correction notes, dispute status, policy notices, reader-safety language, or CREN editorial context.",
          "High-risk profile edits require manual review before publication.",
        ],
      },
      {
        title: "Audit trail",
        bullets: [
          "Store profile versions, claimant, reviewer, status, reason, timestamp, source, and before/after values.",
          "Store disputes and outcomes separately from public-facing copy.",
          "Pause paid prominence for credible high-risk disputes until reviewed.",
        ],
      },
    ],
  },
  leadDisclosure: {
    slug: "lead-disclosure",
    title: "Lead Disclosure Policy",
    eyebrow: "Lead routing",
    description:
      "How CREN should explain and record form submissions, lead routing, paid relationships, and consumer expectations.",
    effectiveDate: "Draft for review - 2026-08-29",
    reviewStatus: "Draft for counsel review before expanded lead routing, referral fees, or partner dashboards.",
    sections: [
      {
        title: "When CREN routes a request",
        body: [
          "When a user asks for help with renting, buying, selling, investing, listing a business, advertising, or contacting a provider, CREN may respond directly. If disclosed in the form or policy, CREN may route the request to a relevant advertiser, sponsor, profile owner, service provider, agent, apartment community, lender, property manager, or partner.",
        ],
      },
      {
        title: "Compensation disclosure",
        bullets: [
          "Disclose whether a recipient is paid, sponsored, affiliate, free, manually selected, or not compensated.",
          "Disclose whether CREN may receive a flat advertising fee, subscription fee, profile fee, affiliate commission, referral fee, or other compensation.",
          "Do not launch referral-fee, lender, insurance, brokerage, or investment-related compensation without legal review.",
        ],
      },
      {
        title: "No guarantees",
        bullets: [
          "CREN does not guarantee response, availability, price, rent, rate, fee, lease approval, loan approval, closing, investment result, professional quality, or legal compliance.",
          "Users should compare multiple providers and independently verify licenses, credentials, reviews, public records, and contract terms.",
        ],
      },
      {
        title: "Consent log",
        bullets: [
          "Store consent text version, policy version, timestamp, source route, persona, requested recipient category, compensation-disclosure category, and routing outcome.",
          "Make consent text specific enough for email, phone, SMS, lead routing, and partner contact to be distinguished.",
        ],
      },
    ],
  },
  aiPolicy: {
    slug: "ai-policy",
    title: "AI and Automation Policy",
    eyebrow: "Automation governance",
    description:
      "Draft rules for AI-assisted research, writing, images, checks, routing, data refreshes, and autonomous workflows.",
    effectiveDate: "Draft for review - 2026-08-29",
    reviewStatus: "Draft for editorial, legal, and technical review before public reliance.",
    sections: [
      {
        title: "Allowed automation",
        bullets: [
          "Topic discovery, public-record monitoring, source collection, draft structuring, link checks, image-generation assistance, duplicate checks, data refreshes, queue triage, and internal reporting.",
          "Deterministic publication gates, image integrity checks, market-data quality status, broken-link audits, and policy scanners.",
        ],
      },
      {
        title: "Human gates",
        bullets: [
          "Do not autonomously publish high-risk accusations, legal pages, corrections decisions, sponsored claims, rankings, investment language, fair-housing-sensitive recommendations, or final ad approvals.",
          "Material legal, financial, tax, lending, insurance, real estate, securities, safety, or reputation-sensitive claims need qualified human review.",
          "External outreach, purchases, credential changes, production deploys, payments, and public launches require explicit approval.",
        ],
      },
      {
        title: "Disclosures and records",
        bullets: [
          "AI-generated editorial images should be labeled when they represent a scene and are not documentary photos of a specific place or property.",
          "AI-assisted articles should preserve source links, source status, fact-check timestamps, image records, and correction context.",
          "Automation should create audit logs that identify actor, action, source, changed fields, and timestamp.",
        ],
      },
    ],
  },
  accessibility: {
    slug: "accessibility",
    title: "Accessibility Statement",
    eyebrow: "Access and usability",
    description:
      "CREN's draft accessibility commitment, contact path, and audit targets for public pages and forms.",
    effectiveDate: "Draft for review - 2026-08-29",
    reviewStatus: "Draft for accessibility and legal review before production use.",
    sections: [
      {
        title: "Commitment",
        body: [
          "CREN should aim for accessible public content, forms, navigation, and account workflows. The working target should be WCAG 2.2 AA where feasible, with manual and automated checks for the routes that matter most to readers, advertisers, and profile owners.",
        ],
        links: [
          { label: "W3C WCAG 2.2", href: "https://www.w3.org/TR/WCAG22/" },
        ],
      },
      {
        title: "Checks",
        bullets: [
          "Keyboard access, visible focus, color contrast, headings, labels, error messages, alt text, link purpose, responsive layout, and no horizontal overflow.",
          "Forms should identify required fields, errors, success states, and privacy/disclosure links.",
          "Generated or uploaded images need meaningful alt text or an empty decorative role when appropriate.",
        ],
      },
      {
        title: "Feedback path",
        body: [
          "Users should have a clear contact path for accessibility problems, including page URL, assistive technology where relevant, and the issue encountered. CREN should track and prioritize fixes.",
        ],
      },
    ],
  },
  copyright: {
    slug: "copyright",
    title: "Copyright, DMCA, and Content Reuse Policy",
    eyebrow: "Copyright and reuse",
    description:
      "Draft rules for CREN content ownership, excerpting, advertiser assets, user submissions, copyright complaints, and DMCA-style takedowns.",
    effectiveDate: "Draft for review - 2026-08-29",
    reviewStatus: "Draft for counsel review before accepting broad user or advertiser media uploads.",
    sections: [
      {
        title: "CREN content",
        body: [
          "CREN articles, guides, graphics, databases, page layouts, market summaries, logos, generated editorial images, and original site materials are protected by applicable intellectual-property rights. Limited sharing of headlines, links, and short excerpts should be allowed with attribution unless a separate license says otherwise.",
        ],
      },
      {
        title: "Submitted content",
        bullets: [
          "Submitters must have rights to logos, photos, videos, documents, ads, business copy, profile text, and listing materials they provide.",
          "Submitted materials may be reviewed, edited, resized, rejected, archived, or removed for policy, rights, quality, or safety reasons.",
          "Advertisers and profile owners remain responsible for rights and permissions in their submitted materials.",
        ],
      },
      {
        title: "Copyright complaints",
        body: [
          "CREN should publish a copyright contact path and required notice elements before broad user-upload or advertiser-upload workflows scale. A repeat-infringer and counter-notice process should be reviewed by counsel before production use.",
        ],
      },
    ],
  },
  submissions: {
    slug: "submissions-policy",
    title: "Submissions and Tips Policy",
    eyebrow: "Reader and business submissions",
    description:
      "Draft rules for tips, corrections, photos, profile updates, listing requests, event submissions, and confidential-source limits.",
    effectiveDate: "Draft for review - 2026-08-29",
    reviewStatus: "Draft for newsroom, legal, and operations review before public expansion.",
    sections: [
      {
        title: "What users may submit",
        bullets: [
          "News tips, public-record links, correction requests, business profile details, apartment/listing information, event details, photos, logos, advertiser materials, and service-provider information.",
          "Submissions are not guaranteed to be published, promoted, investigated, corrected, or preserved.",
        ],
      },
      {
        title: "Evidence and safety",
        bullets: [
          "Submit factual support when possible: public records, official links, documents, dates, names, and contact paths.",
          "Do not submit private personal data, confidential business records you are not allowed to share, copyrighted files without rights, unlawful recordings, threats, harassment, spam, malware, or unsupported accusations.",
          "Sensitive tips should not be submitted through ordinary forms if anonymity or source protection is essential; CREN needs a separate secure-tip process before promising confidentiality.",
        ],
      },
      {
        title: "CREN review",
        body: [
          "CREN may verify, edit, summarize, reject, hold, archive, publish, label, correct, or remove submissions. Business, listing, advertiser, and high-risk factual claims may require proof and manual review before publication.",
        ],
      },
    ],
  },
  communications: {
    slug: "communications-policy",
    title: "Communications, Email, SMS, and Calling Policy",
    eyebrow: "Contact permissions",
    description:
      "Draft rules for newsletters, service emails, advertiser communications, lead follow-up, phone calls, SMS, and opt-outs.",
    effectiveDate: "Draft for review - 2026-08-29",
    reviewStatus: "Draft for counsel and operations review before SMS/calling or marketing automation expands.",
    sections: [
      {
        title: "Email",
        body: [
          "CREN should identify the sender, avoid deceptive subject lines, include a valid postal address when required, and provide an unsubscribe mechanism for commercial email. Opt-out requests must be honored promptly under applicable law.",
        ],
        links: [
          { label: "FTC CAN-SPAM compliance guide", href: "https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business" },
        ],
      },
      {
        title: "Phone and SMS",
        bullets: [
          "Do not launch marketing SMS, automated calls, prerecorded calls, or third-party call routing without counsel-approved consent language and operational controls.",
          "Consent should not be pre-checked or bundled in a way that hides the communication method, seller identity, or consequence of agreeing.",
          "Transactional follow-up to a user-initiated request should be separated from marketing messages and logged by consent version.",
        ],
        links: [
          { label: "FTC Telemarketing Sales Rule guide", href: "https://www.ftc.gov/business-guidance/resources/complying-telemarketing-sales-rule" },
        ],
      },
      {
        title: "Internal notifications",
        body: [
          "CREN may use internal notifications, including Telegram alerts, to route form submissions to staff. Internal notifications should avoid unnecessary sensitive data and should not replace the source database record.",
        ],
      },
    ],
  },
} satisfies Record<string, PolicyPageContent>;

export type PolicyPageKey = keyof typeof POLICY_PAGES;

export const POLICY_LIBRARY_ORDER: PolicyPageKey[] = [
  "terms",
  "privacy",
  "cookies",
  "advertisingTerms",
  "sponsoredContent",
  "fairHousing",
  "listingQuality",
  "profileClaims",
  "leadDisclosure",
  "aiPolicy",
  "accessibility",
  "copyright",
  "submissions",
  "communications",
];

export function policyPath(key: PolicyPageKey) {
  return `/${POLICY_PAGES[key].slug}`;
}
