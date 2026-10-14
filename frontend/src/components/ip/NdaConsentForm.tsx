import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { apiFetch } from '../../hooks/useApi';

export const NdaConsentForm = ({ patentId, initialName = '', onAccepted, onBack }: {
  patentId: string; initialName?: string; onAccepted: (signature: any) => void; onBack?: () => void;
}) => {
  const [name, setName] = useState(initialName);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (!name.trim() || !accepted) { setError('Enter your name and confirm that you accept the NDA.'); return; }
    setBusy(true);
    try {
      const result = await apiFetch(`/api/patents/${patentId}/nda/sign`, { method: 'POST', body: { fullName: name.trim(), accepted: true } });
      onAccepted(result.signature);
    } catch (err: any) { setError(err.message || 'Unable to record your acceptance.'); }
    finally { setBusy(false); }
  };
  return <form onSubmit={submit} className="space-y-4">
    <Input label="Full legal name" autoComplete="name" required maxLength={200} value={name} onChange={event => setName(event.target.value)} disabled={busy} />
    <label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" checked={accepted} required disabled={busy} onChange={event => setAccepted(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-blue-600" /><span>I have read the NDA above and accept its confidentiality terms.</span></label>
    <p className="text-xs leading-relaxed text-zinc-500">Acceptance is recorded with your signed-in account, typed name, and timestamp. Identity verification is not performed in this step.</p>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="flex justify-end gap-2">{onBack && <Button type="button" variant="ghost" onClick={onBack} disabled={busy}>Back</Button>}<Button type="submit" isLoading={busy} disabled={!accepted || !name.trim()}>Accept NDA</Button></div>
  </form>;
};
