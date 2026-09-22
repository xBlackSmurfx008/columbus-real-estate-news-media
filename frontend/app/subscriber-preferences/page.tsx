'use client';

import { useState, type FormEvent } from 'react';
import { IntakeSecurityFields, securityFields } from '@/components/intake-security-fields';

export default function SubscriberPreferencesPage() {
  const [message,setMessage] = useState(''); const [busy,setBusy] = useState(false);
  async function requestAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=event.currentTarget; const data=new FormData(form); setBusy(true);
    try {
      const response=await fetch('/api/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({step:'preferences-link',email:data.get('email'),...securityFields(data)})});
      const result=await response.json();setMessage(result.error || 'If your subscription exists, check your email for a secure access link.');
    } catch { setMessage('Unable to request access. Please retry.'); }
    finally { form.dispatchEvent(new Event('intake-complete'));setBusy(false); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); setBusy(true);
    try {
      const response = await fetch('/api/subscribe',{ method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({step:'profile',area:data.get('area'),topic:data.get('topic')}) });
      const result = await response.json(); setMessage(result.error || 'Preferences saved.');
    } catch { setMessage('Unable to save. Please retry.'); } finally { setBusy(false); }
  }
  async function unsubscribe() {
    setBusy(true);
    try { const response = await fetch('/api/subscribe',{method:'DELETE'}); const result = await response.json(); setMessage(result.error || 'You are unsubscribed. Signup retries will not reactivate you.'); }
    catch { setMessage('Unable to unsubscribe. Please retry.'); } finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-xl px-6 py-16"><h1 className="text-3xl font-bold">Newsletter preferences</h1>
    <p className="my-4">A confirmation email opens a 30-minute secure session. These preferences apply only to CREN media, not property-acquisition outreach.</p>
    <form onSubmit={requestAccess} className="grid gap-4 my-6"><label>Need a new access link?<input className="form-input" name="email" type="email" required /></label>
      <IntakeSecurityFields kind="preferences" /><button className="form-submit" disabled={busy}>Email me a secure link</button></form>
    <form onSubmit={save} className="grid gap-4"><label>Area<input name="area" className="form-input" maxLength={120}/></label>
      <label>Topic<input name="topic" className="form-input" maxLength={500}/></label><button className="form-submit" disabled={busy}>Save preferences</button></form>
    <button onClick={unsubscribe} disabled={busy} className="my-6 underline">Unsubscribe from CREN newsletters</button><p role="status">{message}</p>
  </main>;
}
