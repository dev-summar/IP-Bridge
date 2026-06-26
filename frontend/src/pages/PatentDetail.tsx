import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../hooks/useApi';
import { useAuthStore } from '../context/authStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { 
  ArrowLeft, Calendar, Mail, FileText, Sparkles, Building, 
  ExternalLink, Compass, ShieldAlert, CheckCircle2, ChevronRight, Handshake,
  Lock, FolderKey, AlertCircle, RefreshCw
} from 'lucide-react';
import { 
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';
import { getCommercialScore, getMarketReadiness, getCommercialBreakdown } from '../utils/patentAnalysis';

export const PatentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  // Primary data states
  const [patent, setPatent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interest Dialog states
  const [isInterestOpen, setIsInterestOpen] = useState(false);
  const [interestForm, setInterestForm] = useState({
    name: '',
    organization: '',
    email: '',
    purpose: 'Licensing',
    message: ''
  });
  const [interestLoading, setInterestLoading] = useState(false);
  const [interestSuccess, setInterestSuccess] = useState(false);

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

  // Initialize form fields with user credentials if logged in
  useEffect(() => {
    if (user) {
      setInterestForm(prev => ({
        ...prev,
        name: user.name.split(' (')[0],
        organization: user.organization || '',
        email: user.email
      }));
    }
  }, [user, isInterestOpen]);

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

  // Submit Interest Request
  const handleInterestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    try {
      setInterestLoading(true);
      await apiFetch(`/api/patents/${id}/interest`, {
        method: 'POST',
        body: interestForm
      });
      setInterestSuccess(true);
      fetchPatentDetails();
      setTimeout(() => {
        setIsInterestOpen(false);
        setInterestSuccess(false);
      }, 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to submit interest request.');
    } finally {
      setInterestLoading(false);
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
      <div className="max-w-5xl mx-auto py-12 px-6 space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-10 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-96 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <div className="h-96 bg-zinc-100 dark:bg-zinc-900 rounded" />
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
        <Link to="/marketplace">
          <Button variant="outline" className="mt-2">
            Return to Marketplace
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

  const scoreLabel = readiness.label;
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
    <div className="bg-lvx-surface dark:bg-zinc-950 min-h-[100dvh] py-6 sm:py-10 px-4 sm:px-6 lg:px-8 premium-transition safe-bottom">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Back Link */}
        <button
          onClick={() => navigate('/marketplace')}
          className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-lvx-charcoal dark:text-zinc-400 dark:hover:text-zinc-200 premium-transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Directory
        </button>

        {/* Header Summary bar */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="space-y-3.5 max-w-3xl text-left">
            <div className="flex flex-wrap gap-1.5">
              {patent.analysis?.industryClassification?.map((ind: string) => (
                <Badge key={ind} variant="outline" className="px-2.5 py-0.5 text-[10px] font-bold text-lvx-blue bg-lvx-blue/10 border-lvx-blue/20 uppercase tracking-label">
                  {ind}
                </Badge>
              ))}
            </div>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-lvx-charcoal dark:text-white tracking-heading leading-tight">
              {patent.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-mono bg-zinc-200/60 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-600 dark:text-zinc-300 font-bold">{patent.patentNumber}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Building className="h-3.5 w-3.5 text-lvx-blue" /> {patent.ownerOrganization || 'Stanford Robotics Lab'}</span>
              <span>•</span>
              <span>Owner: {patent.ownerName}</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            {patent.accessStatus === 'approved' ? (
              (user?.role === 'buyer' || !isAuthenticated) ? (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (!isAuthenticated) {
                        navigate('/auth');
                        return;
                      }
                      if (user?.role === 'buyer' && !isNdaSigned) {
                        setPendingAction('meeting');
                        setIsNdaOpen(true);
                        return;
                      }
                      setIsMeetingOpen(true);
                    }}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-200 font-bold text-xs py-2 px-4 shadow-premium-sm rounded-lg"
                  >
                    <Calendar className="h-4 w-4 mr-1.5 text-lvx-blue" />
                    Book Meeting
                  </Button>
                  
                  <Button 
                    disabled
                    className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-450 font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 opacity-90 cursor-default"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Interest Expressed
                  </Button>

                  {(patent.isForSale || patent.isForLicense) && (
                    patent.hasMeetingDone ? (
                      <Button 
                        onClick={() => {
                          if (!isAuthenticated) {
                            navigate('/auth');
                            return;
                          }
                          if (user?.role === 'buyer' && !isNdaSigned) {
                            setPendingAction('offer');
                            setIsNdaOpen(true);
                            return;
                          }
                          setOfferForm(prev => ({
                            ...prev,
                            type: patent.isForSale ? 'sale' : 'license'
                          }));
                          setIsOfferOpen(true);
                        }}
                        className="bg-lvx-blue hover:bg-lvx-blue-hover text-white border-0 font-bold text-xs py-2 px-4 shadow-premium-md rounded-lg "
                      >
                        <Handshake className="h-4 w-4 mr-1.5" />
                        Acquire / License
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => setIsMeetingRequiredOpen(true)}
                        className="bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-350 dark:border-zinc-700 font-bold text-xs py-2 px-4 rounded-lg flex items-center"
                      >
                        <Lock className="h-4 w-4 mr-1.5 text-zinc-450" />
                        Acquire / License (Meeting Required)
                      </Button>
                    )
                  )}
                </>
              ) : user?.id === patent.ownerId ? (
                <Badge variant="success" className="py-1 px-3 text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/30">
                  YOUR PORTFOLIO ITEM
                </Badge>
              ) : (
                <Badge variant="outline" className="py-1 px-3 text-xs font-semibold bg-white border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300">
                  Logged in as {user?.role.toUpperCase()}
                </Badge>
              )
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-705 bg-amber-50 border border-amber-200 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/30 px-3 py-1.5 rounded-lg">
                <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>Details Locked</span>
              </div>
            )}
          </div>
        </div>

        {patent.accessStatus !== 'approved' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-premium-lg text-center space-y-6 max-w-2xl mx-auto my-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-lvx-blue/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-lvx-blue/10 rounded-full blur-2xl"></div>
            
            <div className="mx-auto w-16 h-16 bg-lvx-blue/10 rounded-2xl flex items-center justify-center border border-lvx-blue/20 shadow-inner">
              <Lock className="h-7 w-7 text-lvx-blue" />
            </div>
            
            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-xl font-bold text-lvx-charcoal dark:text-white">Detailed Patent is Locked</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {!patent.hasExpressedInterest && patent.accessStatus === 'none' ? (
                  "Technical claims, commercial value briefs, target industries, and official registry documentation are restricted. Submit your interest below — we'll notify the inventor and request unlock in one step."
                ) : patent.accessStatus === 'pending' ? (
                  "Your interest and unlock request are with the inventor. Once approved, full technical details, documents, and meeting scheduling will open automatically."
                ) : patent.hasExpressedInterest && patent.accessStatus === 'none' ? (
                  "Interest was recorded earlier. Complete the unlock request below — new submissions do this in one step."
                ) : patent.accessStatus === 'rejected' ? (
                  "The inventor has declined your detailed access request at this time."
                ) : (
                  "Your unlock request is being processed."
                )}
              </p>
            </div>

            <div className="flex justify-center pt-2">
              {!patent.hasExpressedInterest && patent.accessStatus === 'none' ? (
                <Button
                  onClick={() => {
                    if (!isAuthenticated) {
                      navigate('/auth');
                      return;
                    }
                    setIsInterestOpen(true);
                  }}
                  className="bg-lvx-blue hover:bg-lvx-blue-hover text-white border-0 font-bold px-6 py-2.5 shadow-premium-md rounded-xl flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Express Interest & Request Access
                </Button>
              ) : patent.accessStatus === 'pending' ? (
                <div className="flex flex-col items-center gap-2">
                  <Badge variant="outline" className="px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 bg-lvx-blue/10 border border-lvx-blue/20 text-lvx-blue">
                    <RefreshCw className="h-4 w-4 animate-spin text-lvx-blue" />
                    Request Pending Inventor Approval
                  </Badge>
                  {patent.requestDate && (
                    <span className="text-[10px] text-zinc-400">Submitted on {new Date(patent.requestDate).toLocaleDateString()}</span>
                  )}
                </div>
              ) : patent.accessStatus === 'rejected' ? (
                <div className="flex flex-col items-center gap-1.5">
                  <Badge variant="outline" className="px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/30 text-red-700 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    Access Request Declined
                  </Badge>
                  <span className="text-[10px] text-zinc-400">The inventor has declined to share full details at this time.</span>
                </div>
              ) : patent.hasExpressedInterest && patent.accessStatus === 'none' ? (
                <Button
                  onClick={handleSendAccessRequest}
                  isLoading={accessRequestLoading}
                  className="bg-lvx-blue hover:bg-lvx-blue-hover text-white border-0 font-bold px-6 py-2.5 shadow-premium-md rounded-xl flex items-center gap-2"
                >
                  <FolderKey className="h-4 w-4" />
                  Complete Unlock Request
                </Button>
              ) : null}
            </div>
          </div>
        )}

        {/* Content Layout Column grid */}
        <div className={`grid md:grid-cols-3 gap-8 items-start ${patent.accessStatus !== 'approved' ? 'filter blur-md select-none pointer-events-none' : ''}`}>
          
          {/* Main Profile Details */}
          <div className="md:col-span-2 space-y-6 text-left">
            
            {/* AI Summary Section: Wealthfront Editorial Highlight */}
            {patent.analysis && (
              <Card className="border border-zinc-200 dark:border-zinc-800 shadow-md overflow-hidden bg-white dark:bg-zinc-900">
                <div className="px-6 py-4 bg-gradient-to-r from-lvx-navy to-lvx-blue dark:from-lvx-navy dark:to-zinc-950 text-white flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-lvx-blue fill-lvx-blue/20" />
                  <span className="text-xs font-bold uppercase tracking-label">Technology Profile Summary</span>
                </div>
                
                <div className="p-6 space-y-5">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-label">What it does</h4>
                      <p className="text-zinc-800 dark:text-zinc-200 text-xs leading-relaxed font-sans font-medium">
                        {patent.analysis.summary.description}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-label">Problem Solved</h4>
                      <p className="text-zinc-800 dark:text-zinc-200 text-xs leading-relaxed font-sans font-medium">
                        {patent.analysis.summary.problemSolved}
                      </p>
                    </div>
                  </div>
                  
                  <div className="h-px bg-zinc-200/60 dark:bg-zinc-800" />
                  
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-label">Key Technological Claims</h4>
                      <p className="text-zinc-800 dark:text-zinc-200 text-xs leading-relaxed font-sans font-medium">
                        {patent.analysis.summary.keyInnovation}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-label">Value Proposition</h4>
                      <p className="text-zinc-800 dark:text-zinc-200 text-xs leading-relaxed font-sans font-medium">
                        {patent.analysis.summary.commercialValue}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Patent Legal Abstract */}
            <Card className="border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-md">
              <div className="p-6 space-y-3">
                <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-label">
                  Original Registry Abstract
                </h3>
                <p className="text-zinc-600 dark:text-zinc-300 text-xs leading-relaxed font-sans font-medium">
                  {patent.abstract}
                </p>
              </div>
            </Card>

            {/* Target Commercial Applications */}
            {patent.analysis?.commercialApplications && (
              <Card className="border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-md">
                <div className="p-6 space-y-6">
                  <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-label">
                    Commercial Applications & Market Use
                  </h3>
                  
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-200 mb-2">Potential Target Industries</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {patent.analysis.commercialApplications.potentialIndustries.map((ind: string) => (
                          <Badge key={ind} variant="neutral" className="px-2.5 py-0.5 text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200/50 dark:border-zinc-700">
                            {ind}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-200 mb-2">Suggested Business Use Cases</h4>
                      <ul className="space-y-2.5">
                        {patent.analysis.commercialApplications.useCases.map((uc: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-400 leading-normal">
                            <span className="text-lvx-blue font-bold">0{idx + 1}.</span>
                            <span className="font-sans font-medium">{uc}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

                    <div>
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-200 mb-2">Licensing & Adoption Opportunities</h4>
                      <ul className="space-y-2.5">
                        {patent.analysis.commercialApplications.adoptionOpportunities.map((op: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-400 leading-normal">
                            <CheckCircle2 className="h-4.5 w-4.5 text-lvx-blue dark:text-lvx-blue shrink-0 mt-0.5" />
                            <span className="font-sans font-medium">{op}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Market Opportunity & Target Buyers */}
            {patent.analysis && (patent.analysis.marketOpportunity || (patent.analysis.potentialBuyers?.length > 0)) && (
              <Card className="border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-md">
                <div className="p-6 space-y-5">
                  <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-label">
                    AI Market Intelligence
                  </h3>
                  {patent.analysis.marketOpportunity && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-200">Market Opportunity</h4>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                        {patent.analysis.marketOpportunity}
                      </p>
                    </div>
                  )}
                  {patent.analysis.potentialBuyers?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-200">Potential Acquirers & Licensees</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {patent.analysis.potentialBuyers.map((buyer: string) => (
                          <Badge key={buyer} variant="outline" className="px-2.5 py-0.5 text-[10px] font-semibold">
                            {buyer}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {!patent.analysis && patent.accessStatus === 'approved' && (
              <Card className="border border-amber-200 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/10 p-6 text-center">
                <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                  AI analysis is not available for this patent yet. Ask the admin to run re-analysis.
                </p>
              </Card>
            )}

            {/* Patent PDF preview */}
            <Card className="border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-md">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-label">
                    Original Document Preview
                  </h3>
                  {patent.pdfUrl && (
                    <a
                      href={patent.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-lvx-blue dark:text-lvx-blue hover:underline flex items-center gap-0.5 premium-transition"
                    >
                      Download Full PDF
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>

                <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 bg-[#F7F6FB] dark:bg-zinc-950/50 flex flex-col items-center justify-center text-center space-y-3.5">
                  <FileText className="h-10 w-10 text-lvx-blue" />
                  <div>
                    <h4 className="font-bold text-xs text-zinc-800 dark:text-zinc-200">Official Filing Documentation</h4>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 font-mono">Reference: {patent.patentNumber}</p>
                  </div>
                  <a
                    href={patent.pdfUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="text-xs font-bold bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-200 rounded-lg">
                      View Registry PDF
                    </Button>
                  </a>
                </div>
              </div>
            </Card>

          </div>

          {/* Right Sidebar statistics & score card */}
          <aside className="space-y-6 text-left">
                     {/* Score Ring */}
            <Card className="text-center p-6 flex flex-col items-center shadow-premium-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-label mb-6">
                Commercial Potential Score
              </h3>

              {/* Animated Ring SVG - Fixed scaling and center coordinates */}
              <div className="relative h-32 w-32 flex items-center justify-center">
                <svg className="h-full w-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    className="text-zinc-100 dark:text-zinc-800"
                    strokeWidth={stroke}
                    stroke="currentColor"
                    fill="transparent"
                    r={normalizedRadius}
                    cx={50}
                    cy={50}
                  />
                  <circle
                    className={scoreClass}
                    strokeWidth={stroke}
                    strokeDasharray={circumference + ' ' + circumference}
                    style={{ strokeDashoffset }}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={normalizedRadius}
                    cx={50}
                    cy={50}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-zinc-900 dark:text-white leading-none">{score}</span>
                  <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5">COMMERCIAL SCORE</span>
                </div>
              </div>

              <div className="mt-5 space-y-1">
                <span className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {scoreLabel} Readiness Level
                </span>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 px-4 leading-normal font-sans font-medium">
                  {patent.analysis?.marketOpportunity || 'AI-assessed commercial readiness based on technical feasibility, market demand, and licensing potential.'}
                </p>
              </div>
            </Card>

            {/* Transaction Details Card */}
            <Card className="p-6 space-y-4 shadow-premium-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-label">
                Acquisition & Licensing
              </h3>
              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="block text-zinc-400 text-[10px] uppercase font-bold tracking-label dark:text-zinc-500">Asking Valuation</span>
                  <span className="text-xl font-bold text-lvx-charcoal dark:text-white mt-0.5 block">
                    {patent.askingPrice ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(patent.askingPrice) : 'Contact Owner'}
                  </span>
                </div>
                <div>
                  <span className="block text-zinc-400 text-[10px] uppercase font-bold tracking-label dark:text-zinc-500 mb-1.5">Availability</span>
                  <div className="flex flex-col gap-1.5">
                    <span className="flex items-center gap-1.5 font-bold">
                      <span className={`h-2 w-2 rounded-full ${patent.isForSale ? "bg-emerald-500" : "bg-zinc-350"}`} />
                      <span className={patent.isForSale ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-400 dark:text-zinc-650"}>Available for Sale / Assignment</span>
                    </span>
                    <span className="flex items-center gap-1.5 font-bold">
                      <span className={`h-2 w-2 rounded-full ${patent.isForLicense ? "bg-emerald-500" : "bg-zinc-350"}`} />
                      <span className={patent.isForLicense ? "text-zinc-800 dark:text-zinc-200" : "text-zinc-400 dark:text-zinc-650"}>Available for Royalty Licensing</span>
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Commercial Potential Breakdown Radar Chart */}
            <Card className="p-6 flex flex-col items-center shadow-premium-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-label mb-4">
                AI Commercial Breakdown
              </h3>
              
              <div className="h-56 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="rgba(113, 113, 122, 0.15)" strokeDasharray="3 3" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: '#71717a', fontSize: 9, fontWeight: 'bold' }} 
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 100]} 
                      tick={{ fill: '#a1a1aa', fontSize: 8 }}
                      axisLine={false} 
                    />
                    <Radar
                      name="Potential"
                      dataKey="value"
                      stroke="#4a90e2"
                      fill="#4a90e2"
                      fillOpacity={0.2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Technology Keywords list */}
            {patent.analysis?.keywords && (
              <Card className="p-6 space-y-3 shadow-premium-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-label">
                  Technology Keywords
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {patent.analysis.keywords.map((kw: string) => (
                    <Badge key={kw} variant="outline" className="px-2 py-0.5 text-[10px] font-mono text-lvx-blue bg-lvx-blue/10 border-lvx-blue/20">
                      #{kw}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Owner Details card */}
            <Card className="p-6 space-y-4 shadow-premium-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-label">
                Filing Entity
              </h3>
              
              <div className="space-y-3 text-xs">
                <div>
                  <span className="block text-zinc-400 text-[10px] uppercase font-bold tracking-label dark:text-zinc-500">Filer</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{patent.ownerName}</span>
                </div>
                <div>
                  <span className="block text-zinc-400 text-[10px] uppercase font-bold tracking-label dark:text-zinc-500">Affiliation</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">{patent.ownerOrganization || 'Stanford Robotics Lab'}</span>
                </div>
                <div>
                  <span className="block text-zinc-400 text-[10px] uppercase font-bold tracking-label dark:text-zinc-500">Registry status</span>
                  <Badge variant="success" className="py-0.5 px-2.5 text-[9px] font-bold mt-1 uppercase tracking-label bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-450 rounded-full">
                    Verified Approved
                  </Badge>
                </div>
              </div>
            </Card>

          </aside>
        </div>

      </div>

      {/* ========================================== */}
      {/* Dialog: Express Interest Form */}
      {/* ========================================== */}
      <Dialog
        isOpen={isInterestOpen}
        onClose={() => setIsInterestOpen(false)}
        title="Express Interest & Request Access"
      >
        {interestSuccess ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h4 className="font-bold text-sm text-zinc-900 dark:text-white">Submitted Successfully</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              The inventor has been notified of your interest and unlock request. You&apos;ll see full details once they approve.
            </p>
          </div>
        ) : (
          <form onSubmit={handleInterestSubmit} className="space-y-4 text-left">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Your Full Name"
                required
                value={interestForm.name}
                onChange={e => setInterestForm(prev => ({ ...prev, name: e.target.value }))}
                className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200/60"
              />
              <Input
                label="Organization"
                required
                value={interestForm.organization}
                onChange={e => setInterestForm(prev => ({ ...prev, organization: e.target.value }))}
                className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200/60"
              />
            </div>
            
            <Input
              label="Verified Email"
              type="email"
              required
              value={interestForm.email}
              onChange={e => setInterestForm(prev => ({ ...prev, email: e.target.value }))}
              className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200/60"
            />

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-label mb-2">
                Primary Business Purpose
              </label>
              <select
                value={interestForm.purpose}
                onChange={e => setInterestForm(prev => ({ ...prev, purpose: e.target.value }))}
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-premium-sm text-zinc-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-lvx-blue/20 focus:border-lvx-blue premium-transition"
              >
                <option value="Licensing">IP Licensing Agreement</option>
                <option value="Acquisition">IP Acquisition / Purchase</option>
                <option value="JV">Joint Venture Setup</option>
                <option value="Research">Collaborative R&D</option>
                <option value="Investment">VC / Seed Investment</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-label mb-2">
                Your Proposal / Message
              </label>
              <textarea
                required
                rows={4}
                placeholder="Outline your company's alignment, targeted integration pipeline, and proposed timeline..."
                value={interestForm.message}
                onChange={e => setInterestForm(prev => ({ ...prev, message: e.target.value }))}
                className="w-full px-3.5 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-premium-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lvx-blue/20 focus:border-lvx-blue premium-transition resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsInterestOpen(false)} className="text-zinc-500 hover:text-zinc-800 font-bold">
                Cancel
              </Button>
              <Button type="submit" isLoading={interestLoading} className="bg-lvx-blue hover:bg-lvx-blue-hover text-white border-0 font-bold px-5 py-2 shadow-premium-md rounded-lg ">
                Submit Interest & Request Access
              </Button>
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
