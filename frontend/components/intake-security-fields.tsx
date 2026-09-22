'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

declare global {
  interface Window { turnstile?: { render: (element: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void; reset: (id: string) => void } }
}

export function IntakeSecurityFields({ kind }: { kind: 'lead'|'contact'|'subscribe'|'member'|'preferences' }) {
  const element = useRef<HTMLDivElement>(null);
  const [ready,setReady] = useState(false);
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(() => {
    if (!ready || !key || !element.current || !window.turnstile) return;
    const container = element.current;
    const id = window.turnstile.render(container,{ sitekey:key, action:`intake-${kind}` });
    const form = container.closest('form');
    // Tokens are single use, including rejected submissions. Reset after each completed request.
    const reset = () => window.turnstile?.reset(id);
    form?.addEventListener('intake-complete',reset);
    return () => { form?.removeEventListener('intake-complete',reset); window.turnstile?.remove(id); };
  },[ready,key,kind]);
  return <>
    <div aria-hidden="true" style={{ position:'absolute',left:'-10000px',width:1,height:1,overflow:'hidden' }}>
      <label>Leave this field empty<input name="website_url" tabIndex={-1} autoComplete="off" /></label>
    </div>
    {key ? <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={() => setReady(true)} /><div ref={element} /></>
      : <p role="status" className="text-sm">Secure submissions are temporarily unavailable. Please try again later.</p>}
  </>;
}

export function securityFields(data: FormData) {
  return { turnstileToken: data.get('cf-turnstile-response'), website_url:data.get('website_url') };
}
