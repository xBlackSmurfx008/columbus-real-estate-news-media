export const SITE_NAME = 'Columbus Real Estate News';
export const SITE_URL = 'https://columbusrealestatenews.com';
export const SITE_DESCRIPTION =
  'Sourced Columbus and Central Ohio reporting on housing, rent, development, neighborhoods, local policy, restaurants, and events.';

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
