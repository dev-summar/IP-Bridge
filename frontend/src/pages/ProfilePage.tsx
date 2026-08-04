import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../context/authStore';
import { apiFetch } from '../hooks/useApi';
import { ProfilePreferences } from '../components/ProfilePreferences';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { User, Sparkles } from 'lucide-react';

export const ProfilePage = () => {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [organization, setOrganization] = useState(user?.organization || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(user?.name || '');
    setOrganization(user?.organization || '');
  }, [user?.id, user?.name, user?.organization]);

  if (!user) {
    return (
      <div className="p-6 text-sm text-zinc-500">
        Sign in to manage your profile.
      </div>
    );
  }

  const hasPrefs =
    (user.domains?.length || 0) > 0 || (user.interests?.length || 0) > 0;

  const saveBasics = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage(null);
      const res = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: {
          name: name.trim(),
          organization: organization.trim(),
        },
      });
      updateUser({
        name: res.name,
        organization: res.organization,
        interests: res.interests,
        domains: res.domains,
      });
      setMessage('Profile updated.');
    } catch (err: any) {
      setMessage(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        title="Profile"
        description="Update your account details and the technologies you care about for Discover."
      />

      {!hasPrefs && user.role === 'buyer' && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/80 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-900 dark:text-amber-200 flex items-start gap-2">
          <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            You haven&apos;t set tech interests yet. Choose domains and interests below so Discover can show patents that fit you.
          </span>
        </div>
      )}

      <form
        onSubmit={saveBasics}
        className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4"
      >
        <div className="flex items-center gap-2 mb-1">
          <User className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Account</h2>
        </div>
        <Input
          label="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="Email"
          value={user.email}
          disabled
        />
        <Input
          label="Organization"
          value={organization}
          onChange={(e) => setOrganization(e.target.value)}
          placeholder="Your company or institution"
        />
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" className="rounded-xl" isLoading={saving}>
            Save account
          </Button>
          {message && <p className="text-xs text-zinc-500">{message}</p>}
        </div>
      </form>

      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">
          Tech interests & domains
        </h2>
        <ProfilePreferences forceOpen onSaved={() => setMessage('Interests saved — Discover will use them.')} />
      </div>
    </div>
  );
};
