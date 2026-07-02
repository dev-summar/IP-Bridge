import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiFetch } from '../hooks/useApi';
import { useAuthStore } from '../context/authStore';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { 
  ArrowLeft, Calendar, FileText,
  ShieldAlert, CheckCircle2, Handshake,
  Lock, AlertCircle, RefreshCw
} from 'lucide-react';
import { getCommercialScore, getMarketReadiness, getCommercialBreakdown } from '../utils/patentAnalysis';
import { UnlockDetailsFlow } from '../components/ip/UnlockDetailsFlow';
import { IPDetailView } from '../components/ip/IPDetailView';
import { transition } from '../utils/motion';

export const PatentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  // Primary data states
  const [patent, setPatent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isUnlockOpen, setIsUnlockOpen] = useState(false);
  const [unlockForm, setUnlockForm] = useState({
    name: '',
    organization: '',
    email: '',
    purpose: 'Licensing',
    message: ''
  });
  const [isAskOpen, setIsAskOpen] = useState(false);
  const [askMessage, setAskMessage] = useState('');
  const [askLoading, setAskLoading] = useState(false);
  const [askSuccess, setAskSuccess] = useState(false);

  // Meeting Dialog states
  const [isMeetingOpen, setIsMeetingOpen] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    preferredDate: '',
    preferredTime: '',
    notes: ''
  });
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [meetingSuccess, setMeetingSuccess] = useState(false);

  // Offer Dialog states
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [offerForm, setOfferForm] = useState({
    price: '',
    type: 'sale',
    notes: '',
    milestonesText: ''
  });
  const [offerLoading, setOfferLoading] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState(false);

  // NDA signature states
  const [isNdaSigned, setIsNdaSigned] = useState(false);
  const [ndaSignature, setNdaSignature] = useState<any>(null);
  const [isNdaOpen, setIsNdaOpen] = useState(false);
  const [ndaLoading, setNdaLoading] = useState(false);
  const [ndaAadhaar, setNdaAadhaar] = useState('');
  const [ndaFullName, setNdaFullName] = useState('');
  const [ndaOtpStep, setNdaOtpStep] = useState(false);
  const [ndaOtp, setNdaOtp] = useState('');
  const [ndaOtpLoading, setNdaOtpLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<'meeting' | 'offer' | null>(null);
  const [ndaSuccess, setNdaSuccess] = useState(false);
  const [accessRequestLoading, setAccessRequestLoading] = useState(false);
  const [isMeetingRequiredOpen, setIsMeetingRequiredOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setUnlockForm(prev => ({
        ...prev,
        name: user.name.split(' (')[0],
        organization: user.organization || '',
        email: user.email
      }));
    }
  }, [user]);

  // Check NDA Status
  const checkNdaStatus = useCallback(async () => {
    if (!isAuthenticated || user?.role !== 'buyer') return;
    try {
      const data = await apiFetch(`/api/patents/${id}/nda/status`);
      setIsNdaSigned(data.signed);
      setNdaSignature(data.signature);
    } catch (err) {
      console.error('Failed to verify NDA status:', err);
    }
  }, [id, isAuthenticated, user]);

  useEffect(() => {
    checkNdaStatus();
  }, [checkNdaStatus]);

  // Request Aadhaar OTP eSign
  const handleRequestNdaOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ndaFullName || ndaAadhaar.replace(/\s|-/g, '').length !== 12) {
      alert('Please enter your full name and a valid 12-digit Aadhaar number.');
      return;
    }
    setNdaLoading(true);
    setTimeout(() => {
      setNdaLoading(false);
      setNdaOtpStep(true);
      alert('[Aadhaar eSign Simulator] Simulated eSign verification OTP code sent: 123456\n\nPlease enter 123456 in the verification code field to sign the agreement.');
    }, 1200); // realistic network delay
  };

  // Submit Aadhaar OTP eSign
  const handleConfirmNdaESign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ndaOtp !== '123456') {
      alert('Invalid eSign verification code. For demo purposes, use code: 123456');
      return;
    }

    try {
      setNdaOtpLoading(true);
      const res = await apiFetch(`/api/patents/${id}/nda/sign`, {
        method: 'POST',
        body: {
          fullName: ndaFullName,
          aadhaarNumber: ndaAadhaar
        }
      });
      setIsNdaSigned(true);
      setNdaSignature(res.signature);
      setNdaSuccess(true);
      
      // Auto transition to the blocked dialog after delay
      setTimeout(() => {
        setIsNdaOpen(false);
        setNdaSuccess(false);
        // Clear sign forms
        setNdaAadhaar('');
        setNdaFullName('');
        setNdaOtp('');
        setNdaOtpStep(false);
        
        // Open the dialog they wanted to open initially
        if (pendingAction === 'meeting') {
          setIsMeetingOpen(true);
        } else if (pendingAction === 'offer') {
          setOfferForm(prev => ({
            ...prev,
            type: patent?.isForSale ? 'sale' : 'license'
          }));
          setIsOfferOpen(true);
        }
        setPendingAction(null);
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to sign NDA.');
    } finally {
      setNdaOtpLoading(false);
    }
  };

  // Download NDA Document
  const downloadNdaDoc = async () => {
    try {
      const token = localStorage.getItem('pb_token');
      const response = await fetch(`/api/patents/${id}/nda/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to download NDA document.');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NDA_${patent?.patentNumber || id}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Error downloading NDA document.');
    }
  };

  // Fetch Patent Data
  const fetchPatentDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch(`/api/patents/${id}`);
      setPatent(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load patent details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPatentDetails();
  }, [fetchPatentDetails]);

  // Submit Access Request
  const handleSendAccessRequest = async () => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    try {
      setAccessRequestLoading(true);
      const res = await apiFetch(`/api/patents/${id}/access-request`, {
        method: 'POST'
      });
      alert(res.message || 'Access request submitted.');
      fetchPatentDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to submit access request.');
    } finally {
      setAccessRequestLoading(false);
    }
  };

  const openUnlockFlow = () => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    setIsUnlockOpen(true);
  };

  const handleAskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askMessage.trim()) return;
    try {
      setAskLoading(true);
      await apiFetch(`/api/patents/${id}/meeting`, {
        method: 'POST',
        body: { preferredDate: '', preferredTime: '', notes: `[Question] ${askMessage}` }
      });
      setAskSuccess(true);
      setTimeout(() => {
        setIsAskOpen(false);
        setAskSuccess(false);
        setAskMessage('');
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Failed to send question.');
    } finally {
      setAskLoading(false);
    }
  };

  // Submit Meeting Request
  const handleMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    try {
      setMeetingLoading(true);
      await apiFetch(`/api/patents/${id}/meeting`, {
        method: 'POST',
        body: meetingForm
      });
      setMeetingSuccess(true);
      fetchPatentDetails();
      setTimeout(() => {
        setIsMeetingOpen(false);
        setMeetingSuccess(false);
      }, 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to request meeting.');
    } finally {
      setMeetingLoading(false);
    }
  };

  // Submit Offer Proposal
  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    try {
      setOfferLoading(true);
      const milestones = offerForm.milestonesText
        .split('\n')
        .map(m => m.trim())
        .filter(m => m.length > 0);

      await apiFetch('/api/offers', {
        method: 'POST',
        body: {
          patentId: id,
          price: Number(offerForm.price),
          type: offerForm.type,
          notes: offerForm.notes,
          milestones
        }
      });
      setOfferSuccess(true);
      setTimeout(() => {
        setIsOfferOpen(false);
        setOfferSuccess(false);
        setOfferForm({ price: '', type: 'sale', notes: '', milestonesText: '' });
      }, 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to submit offer.');
    } finally {
      setOfferLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 space-y-8 animate-pulse">
        <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-9 w-full max-w-xl bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-4 w-2/3 bg-zinc-100 dark:bg-zinc-800/60 rounded" />
        <div className="space-y-3 pt-4">
          <div className="h-4 bg-zinc-100 dark:bg-zinc-800/60 rounded w-full" />
          <div className="h-4 bg-zinc-100 dark:bg-zinc-800/60 rounded w-full" />
          <div className="h-4 bg-zinc-100 dark:bg-zinc-800/60 rounded w-4/5" />
        </div>
      </div>
    );
  }

  if (error || !patent) {
    return (
      <div className="max-w-xl mx-auto py-16 px-6 text-center space-y-4">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-200/60">Unable to load Patent Information</h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">{error || 'The requested patent does not exist.'}</p>
        <Link to="/discover">
          <Button variant="outline" className="mt-2">
            Return to Discover IP
          </Button>
        </Link>
      </div>
    );
  }

  const score = getCommercialScore(patent.analysis);
  const readiness = getMarketReadiness(score);
  const radius = 50;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const scoreClass = score >= 85 ? 'text-emerald-500 dark:text-emerald-400' : score >= 70 ? 'text-lvx-blue dark:text-lvx-blue' : 'text-zinc-400 dark:text-zinc-600';

  const breakdown = getCommercialBreakdown(patent.analysis);

  const radarData = [
    { subject: 'Feasibility', value: breakdown.technicalFeasibility, fullMark: 100 },
    { subject: 'Market Demand', value: breakdown.marketDemand, fullMark: 100 },
    { subject: 'Implementation', value: breakdown.implementationSpeed, fullMark: 100 },
    { subject: 'Licensing', value: breakdown.licensingValue, fullMark: 100 },
    { subject: 'IP Protection', value: breakdown.ipProtection, fullMark: 100 }
  ];

  return (
    <div className="bg-white dark:bg-zinc-950 min-h-[calc(100dvh-4rem)] py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          onClick={() => navigate('/discover')}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Discover
        </button>

        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={transition}
          className="space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-white leading-snug tracking-tight">
              {patent.title}
            </h1>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {patent.accessStatus === 'approved' ? (
                user?.id === patent.ownerId ? (
                  <span className="text-sm text-emerald-600 font-medium">Your listing</span>
                ) : user?.role === 'buyer' || !isAuthenticated ? (
                  <>
                    {patent.hasExpressedInterest && (
                      <span className="text-sm text-emerald-600 inline-flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> Interest sent
                      </span>
                    )}
                    {(patent.isForSale || patent.isForLicense) && patent.hasMeetingDone && (
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!isAuthenticated) { navigate('/auth'); return; }
                          if (user?.role === 'buyer' && !isNdaSigned) {
                            setPendingAction('offer');
                            setIsNdaOpen(true);
                            return;
                          }
                          setOfferForm(prev => ({ ...prev, type: patent.isForSale ? 'sale' : 'license' }));
                          setIsOfferOpen(true);
                        }}
                        className="rounded-full px-4"
                      >
                        <Handshake className="h-4 w-4 mr-1.5" />
                        Make offer
                      </Button>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-zinc-500">Logged in as {user?.role}</span>
                )
              ) : patent.accessStatus === 'pending' ? (
                <span className="text-sm text-zinc-500 inline-flex items-center gap-1.5">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Unlock pending
                </span>
              ) : (
                <Button size="sm" onClick={openUnlockFlow} className="rounded-full px-4 gap-1.5">
                  <Lock className="h-4 w-4" /> Unlock
                </Button>
              )}
            </div>
          </div>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transition, delay: 0.08 }}
        >
        <IPDetailView
          patent={patent}
          isUnlocked={patent.accessStatus === 'approved'}
          score={score}
          readiness={readiness}
          breakdown={breakdown}
          radarData={radarData}
          strokeDashoffset={strokeDashoffset}
          circumference={circumference}
          normalizedRadius={normalizedRadius}
          stroke={stroke}
          scoreClass={scoreClass}
          onUnlockClick={openUnlockFlow}
          accessPending={patent.accessStatus === 'pending'}
          accessRejected={patent.accessStatus === 'rejected'}
          hasExpressedInterest={patent.hasExpressedInterest}
          onCompleteUnlock={patent.hasExpressedInterest && patent.accessStatus === 'none' ? handleSendAccessRequest : undefined}
          completeUnlockLoading={accessRequestLoading}
          onBookMeeting={() => {
            if (!isAuthenticated) { navigate('/auth'); return; }
            if (user?.role === 'buyer' && !isNdaSigned) {
              setPendingAction('meeting');
              setIsNdaOpen(true);
              return;
            }
            setIsMeetingOpen(true);
          }}
          onMakeOffer={() => {
            if (!isAuthenticated) { navigate('/auth'); return; }
            if (!patent.hasMeetingDone) {
              setIsMeetingRequiredOpen(true);
              return;
            }
            if (user?.role === 'buyer' && !isNdaSigned) {
              setPendingAction('offer');
              setIsNdaOpen(true);
              return;
            }
            setOfferForm(prev => ({ ...prev, type: patent.isForSale ? 'sale' : 'license' }));
            setIsOfferOpen(true);
          }}
          onAskQuestion={() => {
            if (!isAuthenticated) { navigate('/auth'); return; }
            setIsAskOpen(true);
          }}
        />
        </motion.div>

      </div>

      <UnlockDetailsFlow
        isOpen={isUnlockOpen}
        onClose={() => setIsUnlockOpen(false)}
        patentId={id!}
        patentTitle={patent.title}
        patentNumber={patent.patentNumber}
        ownerName={patent.ownerName}
        ownerOrganization={patent.ownerOrganization}
        buyerName={user?.name?.split(' (')[0]}
        buyerOrganization={user?.organization}
        hasExpressedInterest={patent.hasExpressedInterest}
        initialForm={unlockForm}
        onSuccess={() => {
          fetchPatentDetails();
          checkNdaStatus();
        }}
      />

      <Dialog isOpen={isAskOpen} onClose={() => setIsAskOpen(false)} title="Ask a Question">
        {askSuccess ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm text-zinc-600">Your question was sent to the inventor.</p>
          </div>
        ) : (
          <form onSubmit={handleAskSubmit} className="space-y-4 text-left">
            <textarea
              required
              rows={4}
              value={askMessage}
              onChange={(e) => setAskMessage(e.target.value)}
              placeholder="Ask about technical claims, licensing terms, or integration..."
              className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsAskOpen(false)}>Cancel</Button>
              <Button type="submit" isLoading={askLoading}>Send question</Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* ========================================== */}
      {/* Dialog: Book Meeting Form */}
      {/* ========================================== */}
      <Dialog
        isOpen={isMeetingOpen}
        onClose={() => setIsMeetingOpen(false)}
        title="Schedule Exploratory Meeting"
      >
        {meetingSuccess ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h4 className="font-bold text-sm text-zinc-900 dark:text-white">Meeting Requested</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">The inventor has been sent your proposed calendar scheduling.</p>
          </div>
        ) : (
          <form onSubmit={handleMeetingSubmit} className="space-y-4 text-left">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Preferred Date"
                type="date"
                required
                value={meetingForm.preferredDate}
                onChange={e => setMeetingForm(prev => ({ ...prev, preferredDate: e.target.value }))}
                className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200/60"
              />
              <Input
                label="Preferred Time"
                type="time"
                required
                value={meetingForm.preferredTime}
                onChange={e => setMeetingForm(prev => ({ ...prev, preferredTime: e.target.value }))}
                className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200/60"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-label mb-2">
                Meeting Agenda & Notes
              </label>
              <textarea
                rows={4}
                placeholder="Include details about what specific technological claims or licensing aspects you wish to review during the video call..."
                value={meetingForm.notes}
                onChange={e => setMeetingForm(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-premium-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lvx-blue/20 focus:border-lvx-blue premium-transition resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsMeetingOpen(false)} className="text-zinc-500 hover:text-zinc-800 font-bold">
                Cancel
              </Button>
              <Button type="submit" isLoading={meetingLoading} className="bg-lvx-blue hover:bg-lvx-blue-hover text-white border-0 font-bold px-5 py-2 shadow-premium-md rounded-lg ">
                Request Meeting Schedule
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* ========================================== */}
      {/* Dialog: Make Offer Form */}
      {/* ========================================== */}
      <Dialog
        isOpen={isOfferOpen}
        onClose={() => setIsOfferOpen(false)}
        title="Submit Acquisition or Licensing Offer"
      >
        {offerSuccess ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h4 className="font-bold text-sm text-zinc-900 dark:text-white">Offer Submitted Successfully</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">The patent owner has been notified of your commercial proposal terms.</p>
          </div>
        ) : (
          <form onSubmit={handleOfferSubmit} className="space-y-4 text-xs text-left">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Offer Price (₹ INR)"
                type="number"
                required
                value={offerForm.price}
                onChange={e => setOfferForm(prev => ({ ...prev, price: e.target.value }))}
                className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200"
              />
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-label mb-2">
                  Proposal Deal Type
                </label>
                <select
                  value={offerForm.type}
                  onChange={e => setOfferForm(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-premium-sm text-zinc-650 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-lvx-blue/20 focus:border-lvx-blue premium-transition"
                >
                  {patent.isForSale && <option value="sale">Buy Out / Assignment</option>}
                  {patent.isForLicense && <option value="license">Royalty Licensing</option>}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-label mb-2">
                Payment Milestones (One per line)
              </label>
              <textarea
                rows={3}
                placeholder="e.g.&#10;25% on deed signing&#10;50% on patent transfer confirmation&#10;25% upon final validation"
                value={offerForm.milestonesText}
                onChange={e => setOfferForm(prev => ({ ...prev, milestonesText: e.target.value }))}
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-premium-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lvx-blue/20 focus:border-lvx-blue premium-transition resize-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-label mb-2">
                Proposal Terms Notes
              </label>
              <textarea
                rows={3}
                placeholder="Include additional comments, custom requirements, or legal considerations..."
                value={offerForm.notes}
                onChange={e => setOfferForm(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-premium-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lvx-blue/20 focus:border-lvx-blue premium-transition resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsOfferOpen(false)} className="text-zinc-500 hover:text-zinc-800 font-bold">
                Cancel
              </Button>
              <Button type="submit" isLoading={offerLoading} className="bg-lvx-blue hover:bg-lvx-blue-hover text-white border-0 font-bold px-5 py-2 shadow-premium-md rounded-lg ">
                Send Offer
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* ========================================== */}
      {/* Dialog: NDA Signature Verification & Aadhaar eSign */}
      {/* ========================================== */}
      <Dialog
        isOpen={isNdaOpen}
        onClose={() => {
          setIsNdaOpen(false);
          setNdaOtpStep(false);
          setPendingAction(null);
        }}
        title="Mutual Non-Disclosure Agreement (NDA) eSign Portal"
      >
        {ndaSuccess ? (
          <div className="text-center py-8 space-y-4">
            <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto animate-bounce" />
            <h4 className="font-bold text-base text-zinc-900 dark:text-white">NDA e-Signed Successfully</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 px-6">
              Your digital signature has been verified and bound to the patent agreement under Section 3 of the Information Technology Act, 2000.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-4 px-6">
              <Button 
                onClick={downloadNdaDoc} 
                variant="outline" 
                className="text-xs font-bold bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 py-2.5 rounded-lg flex items-center justify-center gap-1.5"
              >
                <FileText className="h-4 w-4 text-lvx-blue" />
                Download NDA (.docx)
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-left text-xs">
            <div className="bg-lvx-blue/10 p-3 rounded-lg border border-lvx-blue/20 flex items-start gap-2.5">
              <ShieldAlert className="h-4.5 w-4.5 text-lvx-blue shrink-0 mt-0.5" />
              <p className="text-zinc-650 dark:text-zinc-300 leading-normal text-[11px]">
                <strong>NDA Required:</strong> To protect proprietary technical details and scheduling pathways, you must e-sign a Mutual Non-Disclosure Agreement (NDA) with the inventor. This will immediately unlock the acquisition proposal and booking panels.
              </p>
            </div>

            {/* NDA Text Box */}
            <div className="max-h-56 overflow-y-auto bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-4 text-[11px] leading-relaxed text-zinc-700 dark:text-zinc-300 rounded-lg shadow-inner text-justify select-none">
              <h4 className="text-center font-bold text-xs text-zinc-800 dark:text-zinc-200 mb-4 uppercase">MUTUAL NON-DISCLOSURE AGREEMENT</h4>
              <p className="mb-3">
                This Mutual Non-Disclosure Agreement (the "Agreement") is made and entered into between the Disclosing Party (Inventor: <strong>{patent?.ownerName}</strong>, affiliated with <strong>{patent?.ownerOrganization || "Independent"}</strong>) and the Receiving Party (Acquirer: <strong>{user?.name}</strong>, representing <strong>{user?.organization || "Independent"}</strong>).
              </p>
              <p className="mb-3">
                <strong>1. Scope of Disclosure:</strong> The Disclosing Party owns and has registered proprietary technologies, including Patent Number <strong>{patent?.patentNumber}</strong> (titled <em>"{patent?.title}"</em>). For the purpose of exploring potential licensing or assignment deals, the Disclosing Party may share confidential legal claims, research reports, or system metrics.
              </p>
              <p className="mb-3">
                <strong>2. Standard of Confidentiality:</strong> The Receiving Party agrees to maintain the strict confidentiality of all proprietary materials. Information disclosed under this agreement shall be protected using no less than a reasonable standard of care, and shall not be shared with outside third-parties without the explicit written signature of the Disclosing Party.
              </p>
              <p className="mb-3">
                <strong>3. Duration:</strong> The obligations of confidentiality set forth in this Agreement shall remain in full force for a period of three (3) years from the date of execution.
              </p>
              <p className="mb-3">
                <strong>4. Aadhaar Digital Signature validation:</strong> By typing your full name and authenticating via the UIDAI OTP interface, the parties agree that this electronic transaction constitutes a legally binding document under Section 3 of the Indian Information Technology Act, 2000.
              </p>
            </div>

            {!ndaOtpStep ? (
              <form onSubmit={handleRequestNdaOtp} className="space-y-3">
                <div className="grid grid-cols-2 gap-3.5">
                  <Input
                    label="Full Legal Name"
                    required
                    placeholder="Enter your name exactly"
                    value={ndaFullName}
                    onChange={e => setNdaFullName(e.target.value)}
                    className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-100"
                  />
                  <Input
                    label="12-Digit Aadhaar Card"
                    required
                    placeholder="12-digit number"
                    maxLength={12}
                    value={ndaAadhaar}
                    onChange={e => setNdaAadhaar(e.target.value.replace(/\D/g, ''))}
                    className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-100"
                  />
                </div>

                {ndaFullName && (
                  <div className="p-3 bg-zinc-100/50 dark:bg-zinc-900/60 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-800 text-center my-1.5">
                    <span className="block text-[9px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-label">Handwritten e-Signature Preview</span>
                    <span className="inline-block mt-2 italic text-2xl text-lvx-blue px-6 py-1 border-b border-zinc-400 select-none">
                      {ndaFullName}
                    </span>
                  </div>
                )}

                <div className="flex justify-end gap-2.5 pt-1">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => {
                      setIsNdaOpen(false);
                      setPendingAction(null);
                    }}
                    className="font-bold text-zinc-500 hover:text-zinc-800"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    isLoading={ndaLoading}
                    className="bg-lvx-blue hover:bg-lvx-blue-hover text-white border-0 font-bold px-5 py-2 shadow-premium-md rounded-lg "
                  >
                    Request OTP eSign
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleConfirmNdaESign} className="space-y-4">
                <div className="bg-zinc-50 dark:bg-zinc-900/40 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-center">
                  <span className="block text-[10px] font-bold text-lvx-charcoal dark:text-lvx-blue uppercase tracking-label">Aadhaar OTP Authentication</span>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                    We've simulated a secure eSign verification code to the phone linked with Aadhaar <strong>XXXX-XXXX-{ndaAadhaar.substring(8)}</strong>.
                  </p>
                </div>

                <div className="max-w-[200px] mx-auto">
                  <Input
                    label="Enter 6-Digit OTP"
                    required
                    placeholder="OTP Code"
                    maxLength={6}
                    value={ndaOtp}
                    onChange={e => setNdaOtp(e.target.value.replace(/\D/g, ''))}
                    className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-100 text-center tracking-label font-mono text-base font-bold"
                  />
                  <span className="block text-[9px] text-zinc-400 text-center mt-1.5">For demo simulation, enter code: <strong>123456</strong></span>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setNdaOtpStep(false)}
                    className="font-bold text-zinc-500 hover:text-zinc-800"
                  >
                    Back
                  </Button>
                  <Button 
                    type="submit" 
                    isLoading={ndaOtpLoading}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 font-bold px-5 py-2 shadow-premium-md rounded-lg"
                  >
                    Authenticate & Sign NDA
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </Dialog>

      {/* ========================================== */}
      {/* Dialog: Meeting Required Before Offer */}
      {/* ========================================== */}
      <Dialog
        isOpen={isMeetingRequiredOpen}
        onClose={() => setIsMeetingRequiredOpen(false)}
        title="Meeting Required"
      >
        <div className="space-y-5 text-left">
          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40">
            <div className="h-10 w-10 shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Schedule a meeting before making an offer
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                To protect both parties, acquisition and licensing proposals unlock only after an exploratory call with the inventor is accepted.
              </p>
            </div>
          </div>

          <ol className="space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400">
            <li className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lvx-blue/10 text-[10px] font-bold text-lvx-blue">1</span>
              <span>Book an exploratory meeting with the inventor</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lvx-blue/10 text-[10px] font-bold text-lvx-blue">2</span>
              <span>Wait for the inventor to accept the meeting invite</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-lvx-blue/10 text-[10px] font-bold text-lvx-blue">3</span>
              <span>Submit your acquisition or licensing offer</span>
            </li>
          </ol>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsMeetingRequiredOpen(false)}
              className="text-zinc-500 hover:text-zinc-800 font-bold"
            >
              Maybe Later
            </Button>
            <Button
              type="button"
              onClick={() => {
                setIsMeetingRequiredOpen(false);
                if (user?.role === 'buyer' && !isNdaSigned) {
                  setPendingAction('meeting');
                  setIsNdaOpen(true);
                  return;
                }
                setIsMeetingOpen(true);
              }}
              className="bg-lvx-blue hover:bg-lvx-blue-hover text-white border-0 font-bold px-5 py-2 shadow-premium-md rounded-lg"
            >
              <Calendar className="h-4 w-4 mr-1.5" />
              Book Meeting Now
            </Button>
          </div>
        </div>
      </Dialog>

    </div>
  );
};
