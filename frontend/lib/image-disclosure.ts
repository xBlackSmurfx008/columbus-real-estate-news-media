/** Labels describe provenance, never a claim that a generic image is the story's site. */
export function imageDisclosure(caption: string | null | undefined): string | null {
  if (!caption) return null;
  if (/AI.generated/i.test(caption)) return 'AI illustration · not the actual property or event';
  if (/^Archival\b/i.test(caption)) return 'Archival photo · see caption for context';
  if (/\brendering\b/i.test(caption)) return 'Rendering · not a completed-project photograph';
  return null;
}
