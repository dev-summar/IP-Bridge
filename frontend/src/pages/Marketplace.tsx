import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../context/authStore';
import { apiFetch } from '../hooks/useApi';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { PatentCard } from '../components/PatentCard';
import { 
  Search, SlidersHorizontal, Bookmark, BookmarkCheck, 
  ArrowRight, ShieldAlert, Cpu, HeartPulse, Leaf, Landmark, Zap, Compass, 
  Sparkles, RefreshCw, X
} from 'lucide-react';


export const Marketplace = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, updateUser } = useAuthStore();

  const getFilingStatus = (patentNumber: string) => {
    if (patentNumber.endsWith('-B1') || patentNumber.endsWith('-B2') || patentNumber.includes('B2') || patentNumber.includes('B1')) {
      return 'Granted';
    }
    return 'Published';
  };
  
  // Search Mode: 'ai' (Semantic AI Match) vs 'standard' (Filters)
  const [searchMode, setSearchMode] = useState<'ai' | 'standard'>('ai');

  // General listing states
  const [patents, setPatents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Standard filters states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  
  // AI matching states
  const [aiQuery, setAiQuery] = useState('');
  const [aiMatchedPatents, setAiMatchedPatents] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [hasRunAi, setHasRunAi] = useState(false);

  const industries = ['AI', 'Healthcare', 'BioTech', 'Energy', 'Robotics', 'FinTech', 'Manufacturing'];

  // Fetch standard marketplace patents
  const fetchPatents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let url = '/api/patents';
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      if (selectedIndustry) params.append('industry', selectedIndustry);
      
      const queryStr = params.toString();
      if (queryStr) {
        url += `?${queryStr}`;
      }

      const data = await apiFetch(url);
      setPatents(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch patents.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedIndustry]);

  useEffect(() => {
    // Only fetch base patents automatically if we are in standard mode or haven't run AI matching
    if (searchMode === 'standard' || !hasRunAi) {
      fetchPatents();
    }
  }, [fetchPatents, searchMode, hasRunAi]);

  // Handle AI Matching query submission
  const handleAIMatch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const queryToUse = customQuery || aiQuery;
    if (!queryToUse.trim()) return;

    try {
      setAiLoading(true);
      setAiError(null);
      setHasRunAi(true);

      const data = await apiFetch('/api/patents/ai-match', {
        method: 'POST',
        body: { query: queryToUse }
      });
      setAiMatchedPatents(data);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'AI matching gateway returned an error. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleClearAIMatch = () => {
    setAiQuery('');
    setAiMatchedPatents([]);
    setAiError(null);
    setHasRunAi(false);
  };

  // Handle Bookmarks Toggle
  const handleToggleBookmark = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering card navigation
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    try {
      const res = await apiFetch(`/api/patents/${id}/save`, { method: 'POST' });
      if (user) {
        updateUser({ savedPatents: res.savedPatents });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to bookmark patent.');
    }
  };

  const isBookmarked = (id: string) => {
    return user?.savedPatents?.includes(id) || false;
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30';
    if (score >= 70) return 'text-lvx-blue bg-lvx-blue/10 dark:text-lvx-blue dark:bg-lvx-blue/10 border border-lvx-blue/20';
    return 'text-zinc-600 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800';
  };

  return (
    <div className="bg-lvx-surface dark:bg-zinc-950 min-h-[100dvh] py-6 sm:py-10 px-4 sm:px-6 lg:px-8 premium-transition safe-bottom">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Title Brief */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <span className="text-[10px] font-bold text-lvx-blue uppercase tracking-label block mb-2">
            Technology Index
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-lvx-charcoal dark:text-white tracking-heading">
            Explore Open Patent Listings
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">
            Search verified technological patents containing dynamic AI feasibility briefs, target industry classifications, and direct meeting booking pathways.
          </p>
        </div>

        {/* Tab Switcher between AI Matching and Standard filters */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-4 sm:gap-6 overflow-x-auto scrollbar-none">
          <button 
            onClick={() => setSearchMode('ai')} 
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 premium-transition whitespace-nowrap shrink-0 touch-target ${
              searchMode === 'ai' 
                ? 'border-lvx-blue text-lvx-charcoal dark:text-white' 
                : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'
            }`}
          >
            <Sparkles className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-lvx-blue" />
            <span className="sm:hidden">AI Match</span>
            <span className="hidden sm:inline">Semantic AI Matchmaker</span>
          </button>
          <button 
            onClick={() => setSearchMode('standard')} 
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-1.5 border-b-2 premium-transition whitespace-nowrap shrink-0 touch-target ${
              searchMode === 'standard' 
                ? 'border-lvx-blue text-lvx-charcoal dark:text-white' 
                : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'
            }`}
          >
            <Search className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-zinc-500" />
            <span className="sm:hidden">Filters</span>
            <span className="hidden sm:inline">Standard Database Filters</span>
          </button>
        </div>

        {/* 1. SEMANTIC AI MATCH MODE (Primary Option) */}
        {searchMode === 'ai' && (
          <div className="space-y-8">
            <div className="bg-lvx-blue/5 dark:bg-lvx-navy-card/30 border border-lvx-blue/20 dark:border-lvx-blue/30 rounded-3xl p-6 md:p-8 space-y-6">
              <div className="max-w-xl text-left">
                <h3 className="text-lg font-bold text-lvx-charcoal dark:text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-lvx-blue fill-lvx-blue/20" />
                  What technologies are you looking to license?
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
                  State your product requirements, target problem, or technology stack in plain English. The AI scanner parses patent claims to match and rank relevancy.
                </p>
              </div>

              <form onSubmit={handleAIMatch} className="space-y-4">
                <div className="relative">
                  <textarea
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    placeholder="e.g. I need a high-density lithium battery module that survives fast charging at 3C speeds without thermal degradation."
                    className="w-full h-24 px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-premium-sm placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-lvx-blue/20 focus:border-lvx-blue premium-transition resize-none"
                    required
                  />
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                    <span>Or try quick suggestions:</span>
                    <button 
                      type="button" 
                      onClick={() => { setAiQuery("low power neural architecture edge inference"); handleAIMatch(undefined, "low power neural architecture edge inference"); }} 
                      className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-lvx-blue/10 premium-transition text-[10px]"
                    >
                      Edge AI Inference
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setAiQuery("pH-sensitive polymer cancer drug delivery"); handleAIMatch(undefined, "pH-sensitive polymer cancer drug delivery"); }} 
                      className="px-2.5 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-lvx-blue/10 premium-transition text-[10px]"
                    >
                      Targeted BioTech
                    </button>
                  </div>

                  <div className="flex gap-2 justify-end">
                    {aiQuery && (
                      <Button type="button" variant="ghost" size="sm" onClick={handleClearAIMatch} className="text-zinc-500 hover:text-zinc-800 font-bold">
                        Reset
                      </Button>
                    )}
                    <Button type="submit" isLoading={aiLoading} size="sm" className="bg-lvx-blue hover:bg-lvx-blue-hover text-white border-0 font-bold px-5 shadow-lg shadow-lvx-blue/20">
                      Ask AI Matchmaker
                    </Button>
                  </div>
                </div>
              </form>
            </div>

            {/* AI Results Listing */}
            <div className="space-y-4">
              {aiQuery && hasRunAi && (
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-label">
                    AI Relevance Matches for "{aiQuery.substring(0, 40)}..."
                  </h3>
                  <button onClick={handleClearAIMatch} className="text-xs font-bold text-lvx-blue hover:underline flex items-center gap-1">
                    <X className="h-3.5 w-3.5" /> Clear matches
                  </button>
                </div>
              )}

              {aiLoading ? (
                // Skeletons
                [1, 2].map((n) => (
                  <div key={n} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 animate-pulse">
                    <div className="flex justify-between">
                      <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                      <div className="h-6 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    </div>
                    <div className="h-6 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    <div className="h-16 w-full bg-lvx-blue/5 dark:bg-zinc-800/40 rounded-xl" />
                  </div>
                ))
              ) : aiError ? (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-450 p-5 rounded-2xl flex items-center gap-3">
                  <ShieldAlert className="h-5 w-5 text-red-650 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm">AI Matchmaking Timeout or Error</h4>
                    <p className="text-xs text-red-650/90 mt-0.5">{aiError}</p>
                  </div>
                </div>
              ) : hasRunAi && aiMatchedPatents.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center text-zinc-400 space-y-3">
                  <Compass className="h-10 w-10 mx-auto text-zinc-300 dark:text-zinc-700" />
                  <h3 className="font-bold text-zinc-700 dark:text-zinc-300 text-sm">No AI Relevance Matches</h3>
                  <p className="text-xs max-w-sm mx-auto">
                    The AI Matchmaker could not find technologies matching your specifications. Try describing your requirement in different terms.
                  </p>
                </div>
              ) : (
                // Display Matched Patents (or Default Approved Listings if search hasn't run yet)
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {(hasRunAi ? aiMatchedPatents : patents).map((p) => (
                    <PatentCard
                      key={p._id}
                      patent={p}
                      isSaved={isBookmarked(p._id)}
                      onToggleBookmark={handleToggleBookmark}
                      onExplore={(id) => navigate(`/marketplace/${id}`)}
                      showMatchReason={!!(hasRunAi && p.matchReason)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. STANDARD FILTERS MODE (Traditional querying fallback) */}
        {searchMode === 'standard' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-[1fr_260px] gap-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-zinc-400 dark:text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search by keywords, title, abstract, or patent number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-premium-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-600 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-lvx-blue/20 focus:border-lvx-blue premium-transition"
                />
              </div>
              
              <select
                value={selectedIndustry}
                onChange={(e) => setSelectedIndustry(e.target.value)}
                className="px-3.5 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-premium-sm text-zinc-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-lvx-blue/20 focus:border-lvx-blue premium-transition"
              >
                <option value="">All Target Industries</option>
                {industries.map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>

            {/* Mobile industry filter chips */}
            <div className="lg:hidden flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
              <button
                onClick={() => setSelectedIndustry('')}
                className={`shrink-0 px-3 py-2 text-xs font-semibold rounded-full premium-transition touch-target ${
                  selectedIndustry === ''
                    ? 'bg-lvx-blue text-white'
                    : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
                }`}
              >
                All Sectors
              </button>
              {industries.map((ind) => (
                <button
                  key={ind}
                  onClick={() => setSelectedIndustry(ind)}
                  className={`shrink-0 px-3 py-2 text-xs font-semibold rounded-full premium-transition touch-target ${
                    selectedIndustry === ind
                      ? 'bg-lvx-blue text-white'
                      : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>

            <div className="grid lg:grid-cols-[240px_1fr] gap-8 items-start">
              
              {/* Left Sidebar Filter lists */}
              <aside className="space-y-6 hidden lg:block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-premium-md">
                <div>
                  <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-label mb-3 flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-lvx-blue" />
                    Industry Focus
                  </h3>
                  
                  <div className="space-y-1">
                    <button
                      onClick={() => setSelectedIndustry('')}
                      className={`w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg premium-transition ${
                        selectedIndustry === ''
                          ? 'bg-lvx-blue text-white font-semibold'
                          : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      All Sectors
                    </button>
                    {industries.map((ind) => (
                      <button
                        key={ind}
                        onClick={() => setSelectedIndustry(ind)}
                        className={`w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg premium-transition flex items-center justify-between ${
                          selectedIndustry === ind
                            ? 'bg-lvx-blue text-white font-semibold'
                            : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-label mb-2">
                    Discovery Scoring
                  </h3>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-normal">
                    Commercial Potential scores evaluate technological readiness, market sizing, implementation speed, and licensing options.
                  </p>
                </div>
              </aside>

              {/* Right Cards List */}
              <div className="space-y-4">
                {loading ? (
                  [1, 2, 3].map((n) => (
                    <div key={n} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 animate-pulse">
                      <div className="flex justify-between">
                        <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                        <div className="h-6 w-12 bg-zinc-200 dark:bg-zinc-800 rounded" />
                      </div>
                      <div className="h-6 w-2/3 bg-zinc-200 dark:bg-zinc-800 rounded" />
                      <div className="h-10 w-full bg-zinc-100 dark:bg-zinc-800/50 rounded" />
                      <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    </div>
                  ))
                ) : error ? (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-450 px-6 py-5 rounded-2xl flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-450 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm">Failed to connect to API</h4>
                      <p className="text-xs text-red-600/90 dark:text-red-450/90 mt-0.5">{error}</p>
                    </div>
                  </div>
                ) : patents.length === 0 ? (
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center text-zinc-400 space-y-3">
                    <Compass className="h-10 w-10 mx-auto text-zinc-300 dark:text-zinc-700" />
                    <h3 className="font-bold text-zinc-700 dark:text-zinc-300 text-sm">No Patents Found</h3>
                    <p className="text-xs max-w-sm mx-auto">
                      Try adjusting your search keywords, resetting your industry filters, or checking back later.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {patents.map((p) => (
                      <PatentCard
                        key={p._id}
                        patent={p}
                        isSaved={isBookmarked(p._id)}
                        onToggleBookmark={handleToggleBookmark}
                        onExplore={(id) => navigate(`/marketplace/${id}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
