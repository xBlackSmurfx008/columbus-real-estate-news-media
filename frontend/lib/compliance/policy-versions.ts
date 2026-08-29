export const CURRENT_POLICY_VERSIONS = {
  terms: "2026-08-29-local-1",
  privacy: "2026-08-29-local-1",
  cookies: "2026-08-29-local-1",
  leadDisclosure: "2026-08-29-local-1",
  advertisingTerms: "2026-08-29-local-1",
  sponsoredContent: "2026-08-29-local-1",
  fairHousing: "2026-08-29-local-1",
  listingQuality: "2026-08-29-local-1",
  profileClaim: "2026-08-29-local-1",
  communications: "2026-08-29-local-1",
  aiAutomation: "2026-08-29-local-1",
  accessibility: "2026-08-29-local-1",
  copyright: "2026-08-29-local-1",
  submissions: "2026-08-29-local-1",
} as const;

export type PolicyVersionKey = keyof typeof CURRENT_POLICY_VERSIONS;

export const POLICY_ROUTES: Record<PolicyVersionKey, string> = {
  terms: "/terms",
  privacy: "/privacy",
  cookies: "/cookies",
  leadDisclosure: "/lead-disclosure",
  advertisingTerms: "/advertising-terms",
  sponsoredContent: "/sponsored-content-policy",
  fairHousing: "/fair-housing",
  listingQuality: "/listing-quality-policy",
  profileClaim: "/profile-claim-policy",
  communications: "/communications-policy",
  aiAutomation: "/ai-policy",
  accessibility: "/accessibility",
  copyright: "/copyright",
  submissions: "/submissions-policy",
};

export const FORM_VERSIONS = {
  contact: "contact-form-2026-08-29-1",
  advertisingInquiry: "advertising-inquiry-2026-08-29-1",
  lead: "lead-form-2026-08-29-1",
  subscribe: "subscribe-form-2026-08-29-1",
  join: "join-form-2026-08-29-1",
} as const;

export type ConsentType =
  | "contact_permission"
  | "email_marketing"
  | "lead_routing"
  | "terms_acceptance"
  | "advertiser_terms"
  | "profile_claim"
  | "fair_housing_certification"
  | "communications";

export const CONSENT_COPY = {
  contactPermission: {
    type: "contact_permission" satisfies ConsentType,
    version: "contact-permission-2026-08-29-1",
    text:
      "CREN may contact me about this request and use my information under the Privacy Policy and Communications Policy.",
  },
  emailMarketing: {
    type: "email_marketing" satisfies ConsentType,
    version: "email-marketing-2026-08-29-1",
    text:
      "Send me CREN email updates. I can unsubscribe or change preferences later.",
  },
  leadRouting: {
    type: "lead_routing" satisfies ConsentType,
    version: "lead-routing-2026-08-29-1",
    text:
      "CREN may contact me about this request and, where relevant, route it to a CREN team member, profile owner, sponsor, advertiser, or service provider under the Lead Disclosure Policy.",
  },
  memberTerms: {
    type: "terms_acceptance" satisfies ConsentType,
    version: "member-terms-2026-08-29-1",
    text:
      "I agree to the CREN Terms of Use and acknowledge the Privacy Policy.",
  },
  advertiserTerms: {
    type: "advertiser_terms" satisfies ConsentType,
    version: "advertiser-terms-2026-08-29-1",
    text:
      "CREN may contact me about advertising, review submitted claims and materials, and apply the Advertising Terms and Sponsored Content Policy.",
  },
  profileClaim: {
    type: "profile_claim" satisfies ConsentType,
    version: "profile-claim-2026-08-29-1",
    text:
      "I certify that I am authorized to submit or update this profile and that the information is accurate to the best of my knowledge.",
  },
  fairHousingCertification: {
    type: "fair_housing_certification" satisfies ConsentType,
    version: "fair-housing-certification-2026-08-29-1",
    text:
      "I certify that housing-related copy, targeting, screening, pricing, availability, and lead handling must comply with fair-housing requirements.",
  },
} as const;

export type ConsentCopyKey = keyof typeof CONSENT_COPY;

export function getPolicyVersionSnapshot(keys?: PolicyVersionKey[]) {
  const selectedKeys = keys ?? Object.keys(CURRENT_POLICY_VERSIONS) as PolicyVersionKey[];
  return Object.fromEntries(
    selectedKeys.map((key) => [key, CURRENT_POLICY_VERSIONS[key]]),
  ) as Partial<typeof CURRENT_POLICY_VERSIONS>;
}
