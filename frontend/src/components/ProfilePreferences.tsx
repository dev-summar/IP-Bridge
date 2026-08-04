import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../context/authStore';
import { apiFetch } from '../hooks/useApi';
import { IP_CATEGORIES, INTEREST_SUGGESTIONS } from '../constants/ip';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';
import { Sparkles, Check } from 'lucide-react';

interface ProfilePreferencesProps {
  onSaved?: () => void;
  compact?: boolean;
  /** Always show the editor (profile page) instead of a collapsed link. */
  forceOpen?: boolean;
}

/** Lets individuals set domains + interests for personalized Discover. */
export const ProfilePreferences: React.FC<ProfilePreferencesProps> = ({
  onSaved,
  compact = false,
  forceOpen = false,
}) => {
  const { user, isAuthenticated, updateUser } = useAuthStore();
  const [domains, setDomains] = useState<string[]>(user?.domains || []);
  const [interests, setInterests] = useState<string[]>(user?.interests || []);
  const [customInterest, setCustomInterest] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [open, setOpen] = useState(forceOpen);

  useEffect(() => {
    setDomains(user?.domains || []);
    setInterests(user?.interests || []);
  }, [user?.id, user?.domains, user?.interests]);

  if (!isAuthenticated || !user) return null;

  const toggleDomain = (d: string) => {
    setDomains((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].slice(0, 12)
    );
  };

  const toggleInterest = (i: string) => {
    setInterests((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i].slice(0, 20)
    );
  };

  const addCustom = () => {
    const t = customInterest.trim();
    if (!t) return;
    toggleInterest(t);
    setCustomInterest('');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: { domains, interests },
      });
      updateUser({
        domains: res.domains || domains,
        interests: res.interests || interests,
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
      onSaved?.();
    } catch (err: any) {
      alert(err.message || 'Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  const hasPrefs = (user.domains?.length || 0) > 0 || (user.interests?.length || 0) > 0;

  if (compact && !open && !forceOpen) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {hasPrefs ? 'Edit interests & domains' : 'Personalize Discover'}
      </button>
    );
  }

  return (
    <div
      className={cn(
        'rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-left',
        compact ? 'p-4 mt-4' : 'p-5'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            Personalize Discover
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Domains and interests power featured matches for you.
          </p>
        </div>
        {compact && !forceOpen && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-zinc-400 hover:text-zinc-600"
          >
            Close
          </button>
        )}
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
        Domains
      </p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {IP_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => toggleDomain(cat)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
              domains.includes(cat)
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900'
                : 'border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
        Interests
      </p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {INTEREST_SUGGESTIONS.map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggleInterest(i)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium transition-colors capitalize',
              interests.includes(i)
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
            )}
          >
            {i}
          </button>
        ))}
        {interests
          .filter((i) => !(INTEREST_SUGGESTIONS as readonly string[]).includes(i))
          .map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleInterest(i)}
              className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/15 text-primary border border-primary/30"
            >
              {i} ×
            </button>
          ))}
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={customInterest}
          onChange={(e) => setCustomInterest(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Add custom interest…"
          className="flex-1 px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 outline-none focus:border-primary/40"
        />
        <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={addCustom}>
          Add
        </Button>
      </div>

      <Button
        type="button"
        size="sm"
        className="rounded-xl gap-1.5"
        isLoading={saving}
        onClick={handleSave}
      >
        {savedFlash ? <Check className="h-3.5 w-3.5" /> : null}
        {savedFlash ? 'Saved' : 'Save preferences'}
      </Button>
    </div>
  );
};
