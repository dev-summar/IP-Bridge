import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../context/authStore';
import { getHomePathForRole } from '../utils/authRoutes';
import { apiFetch } from '../hooks/useApi';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { BrandLogo } from '../components/BrandLogo';
import { cn } from '../utils/cn';
import { springSnappy, transition } from '../utils/motion';
import {
  KeyRound,
  ArrowRight,
  ShieldAlert,
  Users,
  Rocket,
  ArrowLeft,
  Sparkles,
  Building,
  Compass,
  CheckCircle2,
} from 'lucide-react';

const ease = [0.16, 1, 0.3, 1] as const;

const labelClass = 'normal-case text-sm font-medium tracking-normal text-zinc-700 dark:text-zinc-300';

const ROLE_CARDS = [
  {
    role: 'buyer' as const,
    label: 'For acquirers & licensees',
    title: 'Discover IP',
    description:
      'Browse vetted patents and university technologies with AI commercial briefs and secure unlock flows.',
    cta: 'Sign up as buyer',
    icon: Users,
  },
  {
    role: 'owner' as const,
    label: 'For inventors & institutions',
    title: 'List your IP',
    description:
      'Reach corporate acquirers and licensing partners. AI generates your commercial profile automatically.',
    cta: 'Sign up as inventor',
    icon: Rocket,
  },
];

const AUTH_BULLETS = [
  'Discover and compare university & startup IP',
  'Unlock details with NDA-backed access',
  'Manage deals, meetings, and escrow in one place',
];

function AuthAside({ className }: { className?: string }) {
  const navigate = useNavigate();

  return (
    <aside
      className={cn(
        'flex flex-col justify-between bg-zinc-100/80 dark:bg-zinc-900/50 border-b lg:border-b-0 lg:border-r border-zinc-200/80 dark:border-zinc-800 px-6 sm:px-10 py-8 lg:py-12',
        className
      )}
    >
      <div className="space-y-8">
        <BrandLogo size="xl" linkTo="/" priority />
        <div className="max-w-sm space-y-4">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white leading-snug">
            India&apos;s IP marketplace for licensing and acquisition
          </h1>
          <ul className="space-y-3">
            {AUTH_BULLETS.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <button
        type="button"
        onClick={() => navigate('/discover')}
        className="hidden lg:inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-primary transition-colors mt-8"
      >
        <Compass className="h-4 w-4" />
        Browse IP without signing up
      </button>
    </aside>
  );
}

export const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setAuth, isAuthenticated, user } = useAuthStore();

  const [view, setView] = React.useState<'gateway' | 'form'>('gateway');
  const [isRegister, setIsRegister] = React.useState(searchParams.get('register') === 'true');
  const [email, setEmail] = React.useState(searchParams.get('email') || '');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [organization, setOrganization] = React.useState('');
  const [role, setRole] = React.useState<'owner' | 'buyer'>('buyer');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) navigate(getHomePathForRole(user.role));
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    const register = searchParams.get('register') === 'true';
    const mode = searchParams.get('mode');
    const urlRole = searchParams.get('role');
    const urlEmail = searchParams.get('email');

    if (urlEmail) setEmail(urlEmail);
    if (urlRole === 'owner' || urlRole === 'buyer') setRole(urlRole);

    if (mode === 'login') {
      setView('form');
      setIsRegister(false);
    } else if (register) {
      setView('form');
      setIsRegister(true);
    }
  }, [searchParams]);

  const openGateway = () => {
    setError(null);
    setView('gateway');
    setSearchParams({});
  };

  const openRegister = (selectedRole: 'owner' | 'buyer') => {
    setError(null);
    setRole(selectedRole);
    setIsRegister(true);
    setView('form');
    setSearchParams({ register: 'true', role: selectedRole });
  };

  const openLogin = () => {
    setError(null);
    setIsRegister(false);
    setView('form');
    setSearchParams({ mode: 'login' });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await apiFetch('/api/auth/register', {
          method: 'POST',
          body: { name, email, password, organization, role },
        });
        setAuth(res.token, res.user);
        navigate(getHomePathForRole(res.user.role));
      } else {
        const res = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: { email, password },
        });
        setAuth(res.token, res.user);
        navigate(getHomePathForRole(res.user.role));
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoRole: 'admin' | 'owner' | 'buyer') => {
    setError(null);
    setLoading(true);
    const demoEmail = `${demoRole}@patentbridge.com`;
    const demoPassword = 'password123';

    setEmail(demoEmail);
    setPassword(demoPassword);
    setIsRegister(false);
    setView('form');

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: { email: demoEmail, password: demoPassword },
      });
      setAuth(res.token, res.user);
      navigate(getHomePathForRole(res.user.role));
    } catch (err: any) {
      setError(err.message || `Quick login as ${demoRole} failed.`);
      setLoading(false);
    }
  };

  const formTitle = isRegister ? 'Create your account' : 'Sign in';
  const formSubtitle = isRegister
    ? role === 'buyer'
      ? 'Set up your buyer account to discover and license IP.'
      : 'Set up your inventor account to list and manage IP.'
    : 'Use your work email to access your dashboard and deals.';

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-white dark:bg-zinc-950">
      <AnimatePresence mode="wait">
        {view === 'gateway' ? (
          <motion.div
            key="gateway"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease }}
            className="grid lg:grid-cols-2 min-h-[calc(100dvh-4rem)]"
          >
            <AuthAside />

            <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-16 py-10 lg:py-12">
              <div className="w-full max-w-md mx-auto space-y-8">
                <div>
                  <h2 className="text-2xl font-semibold text-zinc-950 dark:text-white">Get started</h2>
                  <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                    Choose how you want to use IPBridge.
                  </p>
                </div>

                <div className="space-y-4">
                  {ROLE_CARDS.map((card) => (
                    <motion.button
                      key={card.role}
                      type="button"
                      onClick={() => openRegister(card.role)}
                      whileHover={{ x: 4, borderColor: 'rgba(79,70,229,0.35)' }}
                      whileTap={{ scale: 0.995 }}
                      transition={springSnappy}
                      className="w-full text-left rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 hover:bg-zinc-50/80 dark:hover:bg-zinc-900/40 transition-colors group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <card.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-zinc-500 mb-1">{card.label}</p>
                          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{card.title}</h3>
                          <p className="text-sm text-zinc-500 mt-1 leading-relaxed">{card.description}</p>
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary mt-3 group-hover:gap-1.5 transition-all">
                            {card.cta}
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <p className="text-sm text-zinc-500 text-center pt-2">
                  Already have an account?{' '}
                  <button type="button" onClick={openLogin} className="font-medium text-primary hover:underline">
                    Sign in
                  </button>
                </p>

                <button
                  type="button"
                  onClick={() => navigate('/discover')}
                  className="lg:hidden w-full inline-flex items-center justify-center gap-1.5 text-sm text-zinc-500 hover:text-primary"
                >
                  <Compass className="h-4 w-4" />
                  Browse without signing up
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease }}
            className="grid lg:grid-cols-2 min-h-[calc(100dvh-4rem)]"
          >
            <AuthAside className="hidden lg:flex" />

            <div className="flex flex-col">
              <div className="lg:hidden px-6 pt-6 pb-2 flex items-center justify-between">
                <BrandLogo size="lg" linkTo="/" priority />
                <button
                  type="button"
                  onClick={openGateway}
                  className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                >
                  Back
                </button>
              </div>

              <div className="flex-1 flex items-center justify-center px-6 sm:px-10 lg:px-16 py-8 lg:py-12">
                <div className="w-full max-w-[400px] space-y-8">
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={openGateway}
                      className="hidden lg:inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 mb-4"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to options
                    </button>
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                      {formTitle}
                    </h2>
                    <p className="text-sm text-zinc-500 leading-relaxed">{formSubtitle}</p>
                  </div>

                  <motion.form
                    onSubmit={handleSubmit}
                    className="space-y-5"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: {},
                      visible: { transition: { staggerChildren: 0.06 } },
                    }}
                  >
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm flex items-start gap-2 overflow-hidden"
                      >
                        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{error}</span>
                      </motion.div>
                    )}

                    {isRegister && (
                      <motion.div variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition } }} className="space-y-5">
                        <Input
                          label="Full name"
                          labelClassName={labelClass}
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Dr. Sarah Jenkins"
                        />
                        <Input
                          label="Organization"
                          labelClassName={labelClass}
                          value={organization}
                          onChange={(e) => setOrganization(e.target.value)}
                          placeholder="MIET Research Lab"
                        />

                        {searchParams.get('role') === null && (
                          <div>
                            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">I am a</p>
                            <div className="grid grid-cols-2 gap-3">
                              {([
                                { id: 'buyer' as const, label: 'Buyer', Icon: Building },
                                { id: 'owner' as const, label: 'Inventor', Icon: Sparkles },
                              ]).map(({ id, label, Icon }) => (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => setRole(id)}
                                  className={cn(
                                    'flex items-center justify-center gap-2 p-3 border rounded-xl text-sm transition-colors',
                                    role === id
                                      ? 'bg-primary border-primary text-white font-medium'
                                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 hover:border-primary/40'
                                  )}
                                >
                                  <Icon className="h-4 w-4" />
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    <motion.div variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition } }}>
                      <Input
                        label="Email address"
                      labelClassName={labelClass}
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      autoComplete="email"
                    />
                    </motion.div>
                    <motion.div variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition } }}>
                      <Input
                        label="Password"
                      labelClassName={labelClass}
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete={isRegister ? 'new-password' : 'current-password'}
                    />
                    </motion.div>

                    <motion.div variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition } }}>
                      <Button type="submit" disabled={loading} isLoading={loading} className="w-full rounded-full h-11 gap-2">
                        {isRegister ? 'Create account' : 'Sign in'}
                        {!loading && <ArrowRight className="h-4 w-4" />}
                      </Button>
                    </motion.div>
                  </motion.form>

                  <p className="text-sm text-zinc-500 text-center">
                    {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        if (isRegister) {
                          setIsRegister(false);
                          setSearchParams({ mode: 'login' });
                        } else {
                          openGateway();
                        }
                      }}
                      className="font-medium text-primary hover:underline"
                    >
                      {isRegister ? 'Sign in' : 'Get started'}
                    </button>
                  </p>

                  <details className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 px-4 py-3 group">
                    <summary className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      <KeyRound className="h-4 w-4 text-primary" />
                      Demo accounts
                      <span className="ml-auto text-xs text-zinc-400 group-open:hidden">Show</span>
                    </summary>
                    <div className="mt-4 pt-4 border-t border-zinc-200/80 dark:border-zinc-800 space-y-3">
                      <p className="text-xs text-zinc-500">
                        Password for all demo users:{' '}
                        <code className="font-mono bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                          password123
                        </code>
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {(['buyer', 'owner', 'admin'] as const).map((demoRole) => (
                          <Button
                            key={demoRole}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickLogin(demoRole)}
                            disabled={loading}
                            className="rounded-lg text-xs capitalize"
                          >
                            {demoRole}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
