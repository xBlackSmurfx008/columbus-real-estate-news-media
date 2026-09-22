'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function ConfirmIntakePage() {
  const token = useRef(''); const [message,setMessage] = useState('');
  const [busy,setBusy] = useState(false); const [kind,setKind] = useState('');
  useEffect(() => { token.current ||= window.location.hash.slice(1); window.history.replaceState(null,'','/confirm-intake'); },[]);
  async function confirm() {
    setBusy(true);
    try {
      const response = await fetch('/api/intake/confirm',{ method:'POST',headers:{ 'Content-Type':'application/json' },body:JSON.stringify({token:token.current}) });
      const data = await response.json(); setMessage(data.message || data.error);
      if (response.ok) { token.current=''; setKind(data.kind); }
    } catch { setMessage('Unable to confirm. Please retry.'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-xl px-6 py-16"><h1 className="text-3xl font-bold">Confirm your CREN request</h1>
    <p className="my-4">Only confirm if you submitted this request. Confirming a mailbox does not qualify a property or authorize unrelated marketing.</p>
    {!kind && <button className="form-submit" disabled={busy} onClick={confirm}>{busy?'Confirming…':'Confirm my request'}</button>}
    <p role="status" className="my-4">{message}</p>
    {['subscribe','preferences'].includes(kind) && <Link href="/subscriber-preferences" className="underline">Manage newsletter preferences</Link>}
    {kind==='member' && <Link href="/profile" className="underline">Sign in to your account</Link>}
  </main>;
}
