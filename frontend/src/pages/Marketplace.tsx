import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../context/authStore';
import { apiFetch } from '../hooks/useApi';
import { PatentCard } from '../components/PatentCard';
import { StaggerList, StaggerItem } from '../components/motion/StaggerList';
import { Search, Sparkles, SlidersHorizontal, X, Compass, ChevronLeft, ChevronRight } from 'lucide-react';
import { IP_CATEGORIES } from '../constants/ip';
import { EmptyState } from '../components/ui/EmptyState';
import { cn } from '../utils/cn';
import { springSnappy, transition } from '../utils/motion';

import { Button } from '../components/ui/Button';

const PAGE_SIZE = 12;

const QUICK_SEARCHES = [
  { label: 'Edge AI', query: 'low power neural architecture edge inference' },
  { label: 'Healthcare', query: 'pH-sensitive polymer cancer drug delivery' },
  { label: 'Battery tech', query: 'high-density lithium battery fast charging thermal' },
];

export const Marketplace = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, updateUser } = useAuthStore();

  const [query, setQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState(searchParams.get('industry') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [keyword, setKeyword] = useState('');

  const [patents, setPatents] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [aiResults, setAiResults] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiActive, setAiActive] = useState(false);

  useEffect(() => {
    const ind = searchParams.get('industry');
    if (ind) setSelectedIndustry(ind);
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [keyword, selectedIndustry]);

  const fetchPatents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(PAGE_SIZE));
      if (keyword) params.append('query', keyword);
      if (selectedIndustry) params.append('industry', selectedIndustry);
      const data = await apiFetch(`/api/patents?${params.toString()}`);
      if (Array.isArray(data)) {
        setPatents(data);
        setTotal(data.length);
        setTotalPages(1);
      } else {
        setPatents(data.data || []);
        setTotal(data.pagination?.total ?? 0);
        setTotalPages(data.pagination?.totalPages ?? 1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load IP assets.');
    } finally {
      setLoading(false);
    }
  }, [keyword, selectedIndustry, page]);

  useEffect(() => {
    if (!aiActive) fetchPatents();
  }, [fetchPatents, aiActive]);

  // Refetch when restored from browser back-forward cache
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted && !aiActive) fetchPatents();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [fetchPatents, aiActive]);

  const runAiSearch = async (text?: string) => {
    const q = (text ?? query).trim();
    if (!q) return;
    setQuery(q);
    setAiActive(true);
    setAiError(null);
    try {
      setAiLoading(true);
      const data = await apiFetch('/api/patents/ai-match', {
        method: 'POST',
        body: { query: q },
      });
      setAiResults(data);
    } catch (err: any) {
      setAiError(err.message || 'Search failed. Try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const clearAi = () => {
    setAiActive(false);
    setAiResults([]);
    setAiError(null);
    setQuery('');
    setPage(1);
  };

  const applyCategory = (industry: string) => {
    setSelectedIndustry(industry);
    setAiActive(false);
    setAiResults([]);
    setQuery('');
    setPage(1);
  };

  const handleToggleBookmark = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    try {
      const res = await apiFetch(`/api/patents/${id}/save`, { method: 'POST' });
      if (user) updateUser({ savedPatents: res.savedPatents });
    } catch (err: any) {
      alert(err.message || 'Failed to save.');
    }
  };

  const isBookmarked = (id: string) => user?.savedPatents?.includes(id) ?? false;

  const displayList = aiActive ? aiResults : patents;
  const isLoading = aiActive ? aiLoading : loading;
  const hasActiveSearch = aiActive || keyword || selectedIndustry;

  const resultLabel = aiActive
    ? `AI matches for “${query.length > 48 ? `${query.slice(0, 48)}…` : query}”`
    : selectedIndustry
    ? `${selectedIndustry} · ${total} assets`
    : keyword
    ? `${total} results for “${keyword}”`
    : `${total} IP assets`;

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-zinc-50 dark:bg-zinc-950">
      {/* Search hero — Google-style */}
      <section
        className={cn(
          'px-4 sm:px-6 transition-all duration-300',
          hasActiveSearch ? 'pt-6 pb-4 border-b border-zinc-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl sticky top-16 z-30' : 'pt-16 sm:pt-24 pb-8'
        )}
      >
        <div className="max-w-2xl mx-auto text-center space-y-6">
          {!hasActiveSearch && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={transition}
              className="space-y-2"
            >
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                Discover IP
              </h1>
              <p className="text-base text-zinc-500">Search patents and technologies to license or acquire.</p>
            </motion.div>
          )}

          <motion.form
            layout
            onSubmit={(e) => {
              e.preventDefault();
              runAiSearch();
            }}
            className="w-full"
          >
            <motion.div
              layout
              transition={springSnappy}
              className="flex items-center gap-2 sm:gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full shadow-sm hover:shadow-md focus-within:shadow-lg focus-within:border-primary/30 dark:focus-within:border-primary/40 px-4 sm:px-5 py-2.5 sm:py-3 premium-transition"
            >
              <Search className="h-5 w-5 text-zinc-400 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe the technology you need…"
                className="flex-1 min-w-0 bg-transparent text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none"
              />
              {query && (
                <button type="button" onClick={clearAi} className="p-1 text-zinc-400 hover:text-zinc-600" aria-label="Clear">
                  <X className="h-4 w-4" />
                </button>
              )}
              <motion.button
                type="submit"
                disabled={aiLoading || !query.trim()}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={springSnappy}
                className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-white text-sm font-medium disabled:opacity-40 hover:opacity-90"
              >
                <Sparkles className={cn('h-3.5 w-3.5', aiLoading && 'animate-spin')} />
                <span className="hidden sm:inline">{aiLoading ? 'Searching…' : 'Search'}</span>
              </motion.button>
            </motion.div>
          </motion.form>

          {!hasActiveSearch && (
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              {QUICK_SEARCHES.map((s, i) => (
                <motion.button
                  key={s.label}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...transition, delay: 0.1 + i * 0.05 }}
                  whileHover={{ scale: 1.04, borderColor: 'rgba(79,70,229,0.35)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => runAiSearch(s.query)}
                  className="px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-primary transition-colors"
                >
                  {s.label}
                </motion.button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                showFilters ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </button>
            {IP_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => applyCategory(selectedIndustry === cat ? '' : cat)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                  selectedIndustry === cat
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                    : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-2 max-w-xl mx-auto pt-2">
              <input
                type="text"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setAiActive(false);
                }}
                placeholder="Keyword or patent number"
                className="flex-1 px-4 py-2.5 text-base rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 outline-none focus:border-primary/50"
              />
              <button
                type="button"
                onClick={() => {
                  setAiActive(false);
                  fetchPatents();
                }}
                className="px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Results — single-column list like search results */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {hasActiveSearch && (
          <div className="flex items-center justify-between mb-4 pb-2">
            <p className="text-sm text-zinc-500">{isLoading ? 'Searching…' : resultLabel}</p>
            {(aiActive || keyword || selectedIndustry) && (
              <button
                type="button"
                onClick={() => {
                  clearAi();
                  setKeyword('');
                  setSelectedIndustry('');
                  setShowFilters(false);
                  setPage(1);
                }}
                className="text-sm text-primary hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2 py-4 border-b border-zinc-200/70 animate-pulse">
                <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                <div className="h-4 bg-zinc-100 dark:bg-zinc-800/60 rounded w-full" />
                <div className="h-4 bg-zinc-100 dark:bg-zinc-800/60 rounded w-5/6" />
                <div className="h-3 bg-zinc-100 dark:bg-zinc-800/40 rounded w-1/2 mt-2" />
              </div>
            ))}
          </div>
        ) : aiError || error ? (
          <EmptyState
            icon={<Compass className="h-10 w-10" />}
            title="Something went wrong"
            description={aiError || error || 'Please try again.'}
          />
        ) : displayList.length === 0 ? (
          <EmptyState
            icon={<Compass className="h-10 w-10" />}
            title="No matches"
            description="Try a different search or remove filters."
          />
        ) : (
          <>
            <StaggerList key={`discover-page-${page}`} animateOnMount={false} className="">
              {displayList.map((p) => (
                <StaggerItem key={p._id} as="div">
                  <PatentCard
                    variant="compact"
                    patent={p}
                    isSaved={isBookmarked(p._id)}
                    onToggleBookmark={handleToggleBookmark}
                    onExplore={(id) => navigate(`/marketplace/${id}`)}
                    showMatchReason={aiActive && !!p.matchReason}
                  />
                </StaggerItem>
              ))}
            </StaggerList>

            {!aiActive && totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 mt-2 border-t border-zinc-200/70 dark:border-zinc-800">
                <p className="text-sm text-zinc-500 order-2 sm:order-1">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                </p>
                <div className="flex items-center gap-2 order-1 sm:order-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl gap-1"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 px-2">
                    {page} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl gap-1"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};
