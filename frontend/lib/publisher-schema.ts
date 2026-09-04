import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from './site.ts';

// Machine-readable publisher identity for the site itself.
//
// Article pages already emit NewsArticle + BreadcrumbList and /market-data
// emits Dataset, but the homepage carried no structured data at all, so a
// search engine had nothing tying the byline "CREN Newsroom", the logo, the
// editorial standards page, and the corrections policy to one publisher.
//
// EVERY field below is something the site already states publicly:
//   name / alternateName  — the masthead, and /newsroom ("CREN Newsroom is the
//                           organizational byline for Columbus Real Estate News")
//   logo                  — app/icon.svg, the same file the NewsArticle
//                           publisher node on every article already points at
//   description           — SITE_DESCRIPTION, the site's own meta description
//   publishingPrinciples  — /editorial-standards, a page that resolves
//   correctionsPolicy     — /corrections, a page that resolves
//   SearchAction target   — /search?q=…, the real query parameter app/search
//                           reads
//
// Nothing else is asserted. There is no founding date, postal address,
// telephone, `sameAs` social profile, named founder, employee count, rating, or
// circulation figure here, because none of those are established anywhere in
// this repository and structured data is not the place to guess. If the owner
// supplies them they belong here — invented, they are a lie told to Google in a
// machine-readable format.

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

export function organizationNode() {
  return {
    '@type': ['NewsMediaOrganization', 'Organization'],
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    alternateName: 'CREN',
    url: absoluteUrl('/'),
    description: SITE_DESCRIPTION,
    logo: {
      '@type': 'ImageObject',
      '@id': `${SITE_URL}/#logo`,
      url: absoluteUrl('/icon.svg'),
      caption: SITE_NAME,
    },
    areaServed: 'Columbus, Ohio, United States',
    publishingPrinciples: absoluteUrl('/editorial-standards'),
    correctionsPolicy: absoluteUrl('/corrections'),
  };
}

export function websiteNode() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    url: absoluteUrl('/'),
    description: SITE_DESCRIPTION,
    inLanguage: 'en-US',
    publisher: { '@id': ORGANIZATION_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${absoluteUrl('/search')}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** The homepage graph: one publisher, one website, joined by @id. */
export function publisherGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [organizationNode(), websiteNode()],
  };
}
