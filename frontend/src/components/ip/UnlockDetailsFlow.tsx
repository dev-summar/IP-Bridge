import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ProgressSteps } from '../ui/ProgressSteps';
import { apiFetch } from '../../hooks/useApi';
import { CheckCircle2, Shield, FileKey2 } from 'lucide-react';

const UNLOCK_STEPS = [
  { id: 'org', label: 'Organization' },
  { id: 'nda', label: 'NDA' },
  { id: 'submit', label: 'Submit' },
];

export interface UnlockFormData {
  name: string;
  organization: string;
  email: string;
  purpose: string;
  message: string;
}

interface UnlockDetailsFlowProps {
  isOpen: boolean;
  onClose: () => void;
  patentId: string;
  patentTitle?: string;
  patentNumber?: string;
  ownerName?: string;
  ownerOrganization?: string;
  buyerName?: string;
  buyerOrganization?: string;
  hasExpressedInterest?: boolean;
  onSuccess: () => void;
  initialForm?: Partial<UnlockFormData>;
}

export const UnlockDetailsFlow: React.FC<UnlockDetailsFlowProps> = ({
  isOpen,
  onClose,
  patentId,
  patentTitle,
  patentNumber,
  ownerName,
  ownerOrganization,
  buyerName,
  buyerOrganization,
  hasExpressedInterest,
  onSuccess,
  initialForm,
}) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<UnlockFormData>({
    name: '',
    organization: '',
    email: '',
    purpose: 'Licensing',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [ndaFullName, setNdaFullName] = useState('');
  const [ndaAadhaar, setNdaAadhaar] = useState('');
  const [ndaOtpStep, setNdaOtpStep] = useState(false);
  const [ndaOtp, setNdaOtp] = useState('');
  const [ndaSigned, setNdaSigned] = useState(false);
  const [ndaLoading, setNdaLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setSuccess(false);
      setNdaOtpStep(false);
      setNdaOtp('');
      setForm((prev) => ({
        ...prev,
        name: initialForm?.name || prev.name,
        organization: initialForm?.organization || prev.organization,
        email: initialForm?.email || prev.email,
        purpose: initialForm?.purpose || prev.purpose,
        message: initialForm?.message || prev.message,
      }));
      setNdaFullName(initialForm?.name || '');
      apiFetch(`/api/patents/${patentId}/nda/status`)
        .then((d) => setNdaSigned(!!d.signed))
        .catch(() => setNdaSigned(false));
    }
  }, [isOpen, patentId, initialForm]);

  const validateOrg = () => {
    if (!form.name.trim() || !form.organization.trim() || !form.email.trim() || !form.message.trim()) {
      alert('Please complete all organization fields.');
      return false;
    }
    return true;
  };

  const handleRequestNdaOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ndaFullName || ndaAadhaar.replace(/\D/g, '').length !== 12) {
      alert('Enter your full legal name and a valid 12-digit Aadhaar number.');
      return;
    }
    setNdaLoading(true);
    setTimeout(() => {
      setNdaLoading(false);
      setNdaOtpStep(true);
    }, 800);
  };

  const handleConfirmNda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ndaOtp !== '123456') {
      alert('Invalid OTP. For demo, use: 123456');
      return;
    }
    try {
      setNdaLoading(true);
      await apiFetch(`/api/patents/${patentId}/nda/sign`, {
        method: 'POST',
        body: { fullName: ndaFullName, aadhaarNumber: ndaAadhaar },
      });
      setNdaSigned(true);
      setStep(2);
    } catch (err: any) {
      alert(err.message || 'NDA signing failed.');
    } finally {
      setNdaLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!ndaSigned) {
      alert('Please complete NDA signing first.');
      setStep(1);
      return;
    }
    try {
      setLoading(true);
      if (!hasExpressedInterest) {
        await apiFetch(`/api/patents/${patentId}/interest`, { method: 'POST', body: form });
      } else {
        await apiFetch(`/api/patents/${patentId}/access-request`, { method: 'POST' });
      }
      setSuccess(true);
      onSuccess();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2200);
    } catch (err: any) {
      alert(err.message || 'Failed to submit unlock request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Unlock Details">
      {success ? (
        <div className="text-center py-10 space-y-4">
          <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
          <h4 className="font-semibold text-lg text-zinc-900 dark:text-white">Request submitted</h4>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            The inventor will review your request. Full IP details unlock after approval.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <ProgressSteps steps={UNLOCK_STEPS} currentIndex={step} />

          {step === 0 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (validateOrg()) {
                  setNdaFullName(form.name);
                  setStep(1);
                }
              }}
              className="space-y-4 text-left"
            >
              <p className="text-sm text-zinc-500">Tell the inventor who you are and why you want access.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Full name" required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                <Input label="Organization" required value={form.organization} onChange={(e) => setForm((p) => ({ ...p, organization: e.target.value }))} />
              </div>
              <Input label="Work email" type="email" required value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Purpose</label>
                <select
                  value={form.purpose}
                  onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900"
                >
                  <option value="Licensing">Licensing</option>
                  <option value="Acquisition">Acquisition</option>
                  <option value="JV">Joint venture</option>
                  <option value="Research">Collaborative R&D</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Message</label>
                <textarea
                  required
                  rows={3}
                  value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                  placeholder="Briefly describe your interest and intended use..."
                  className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit">Continue to NDA</Button>
              </div>
            </form>
          )}

          {step === 1 && (
            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  <strong className="text-zinc-900 dark:text-zinc-100">Mutual NDA</strong> for &ldquo;{patentTitle || 'this IP asset'}&rdquo;.
                  Between {ownerName || 'Inventor'} ({ownerOrganization || 'Institution'}) and {buyerName || form.name} ({buyerOrganization || form.organization}).
                </div>
              </div>

              {ndaSigned ? (
                <div className="text-center py-6">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-emerald-700">NDA already signed</p>
                  <Button className="mt-4" onClick={() => setStep(2)}>Continue</Button>
                </div>
              ) : !ndaOtpStep ? (
                <form onSubmit={handleRequestNdaOtp} className="space-y-4">
                  <Input label="Legal name (e-sign)" required value={ndaFullName} onChange={(e) => setNdaFullName(e.target.value)} />
                  <Input label="Aadhaar (12 digits)" required maxLength={12} value={ndaAadhaar} onChange={(e) => setNdaAadhaar(e.target.value.replace(/\D/g, ''))} />
                  <p className="text-[10px] text-zinc-400">Demo OTP: <strong>123456</strong></p>
                  <div className="flex justify-between gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setStep(0)}>Back</Button>
                    <Button type="submit" isLoading={ndaLoading}>Request OTP</Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleConfirmNda} className="space-y-4">
                  <Input label="6-digit OTP" required maxLength={6} value={ndaOtp} onChange={(e) => setNdaOtp(e.target.value.replace(/\D/g, ''))} />
                  <div className="flex justify-between gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setNdaOtpStep(false)}>Back</Button>
                    <Button type="submit" isLoading={ndaLoading}>Sign NDA</Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 text-left">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3 text-sm">
                <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-medium">
                  <FileKey2 className="h-4 w-4 text-primary" />
                  Review unlock request
                </div>
                <p><span className="text-zinc-500">Organization:</span> {form.organization}</p>
                <p><span className="text-zinc-500">Purpose:</span> {form.purpose}</p>
                <p><span className="text-zinc-500">Patent ref:</span> {patentNumber || '—'}</p>
                <p className="text-zinc-500 text-xs leading-relaxed pt-2">
                  Submitting sends your unlock request to the inventor. You&apos;ll get full executive summary, commercial analysis, and documents once approved.
                </p>
              </div>
              <div className="flex justify-between gap-2">
                <Button type="button" variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={handleFinalSubmit} isLoading={loading} className="rounded-xl px-6">
                  Submit unlock request
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
};
