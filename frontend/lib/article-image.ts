/** Return true only for durable image hosts configured in next.config.ts. */
export function isDurableArticleImageUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;

    return url.hostname === 'images.unsplash.com'
      || url.hostname.endsWith('.cloudfront.net')
      || url.hostname.endsWith('.public.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

export function displayArticleImageUrl(value: unknown): string | null {
  return isDurableArticleImageUrl(value) ? value : null;
}

/** Verify an image before it is allowed onto a public article. */
export async function verifyArticleImageUrl(
  value: unknown,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (!isDurableArticleImageUrl(value)) return false;

  try {
    const response = await fetchImpl(value, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok && response.headers.get('content-type')?.startsWith('image/') === true;
  } catch {
    return false;
  }
}
