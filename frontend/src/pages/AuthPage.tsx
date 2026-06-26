import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../context/authStore';
import { getHomePathForRole } from '../utils/authRoutes';
import { apiFetch } from '../hooks/useApi';
import { Input } from '../components/ui/Input';
import { BrandLogo } from '../components/BrandLogo';
import {
  KeyRound, ArrowRight, ShieldAlert, Users, Rocket, ArrowLeft, Sparkles, Building,
} from 'lucide-react';

const lvxEase = [0.16, 1, 0.3, 1] as const;

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: lvxEase },
};

const ROLE_CARDS = [
  {
    role: 'buyer' as const,
    label: 'Buyers: Discover IP, License Faster',
    title: 'Discover with PatentBridge',
    description: 'Access vetted patents, AI commercial briefs, and exclusive licensing opportunities to grow your IP portfolio.',
    cta: 'Start Discovering',
    icon: Users,
  },
  {
    role: 'owner' as const,
    label: 'Inventors: List Patents, Connect Faster',
    title: 'List with PatentBridge',
    description: 'Connect with corporate acquirers, venture funds, and licensing partners to commercialize your innovations.',
    cta: 'Sign Up as Inventor',
    icon: Rocket,
  },
];

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
    } else if (register && (urlRole === 'owner' || urlRole === 'buyer')) {
      setView('form');
      setIsRegister(true);
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

  return (
    <div className="min-h-[100dvh] lvx-hero-bg text-white premium-transition safe-bottom">
      <AnimatePresence mode="wait">
        {view === 'gateway' ? (
          <motion.div
            key="gateway"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: lvxEase }}
            className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 lg:py-24"
          >
            <div className="text-center mb-14 lg:mb-16">
              <div className="flex justify-center mb-8">
                <BrandLogo variant="wordmark" linkTo="/" imgClassName="h-11 sm:h-12" />
              </div>
              <motion.h1
                {...fadeUp}
                className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white tracking-display leading-tight"
              >
                Get started with PatentBridge
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: lvxEase }}
                className="mt-4 text-sm sm:text-base text-white/65 max-w-lg mx-auto leading-relaxed font-light"
              >
                Choose how you'd like to join India's leading IP commercialization platform.
              </motion.p>
            </div>

            <div className="grid md:grid-cols-2 gap-5 lg:gap-6">
              {ROLE_CARDS.map((card, idx) => (
                <motion.div
                  key={card.role}
                  initial={{ opacity: 0, y: 32 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.15 + idx * 0.1, ease: lvxEase }}
                  className="lvx-auth-card p-8 sm:p-10 flex flex-col"
                >
                  <div className="h-11 w-11 rounded-full bg-white/10 flex items-center justify-center mb-6">
                    <card.icon className="h-5 w-5 text-lvx-blue" />
                  </div>

                  <p className="text-[10px] font-semibold uppercase tracking-label text-white/45 mb-3">
                    {card.label}
                  </p>
                  <h2 className="text-2xl sm:text-[1.65rem] font-bold tracking-heading mb-4 leading-snug text-white">
                    {card.title}
                  </h2>
                  <p className="text-sm text-white/65 leading-[1.7] flex-1 mb-8 font-light">
                    {card.description}
                  </p>

                  <button
                    type="button"
                    onClick={() => openRegister(card.role)}
                    className="lvx-cta-btn inline-flex items-center justify-center gap-2 w-full sm:w-auto self-start group"
                  >
                    {card.cta}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </motion.div>
              ))}
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45, duration: 0.5 }}
              className="text-center mt-10 text-sm text-white/55"
            >
              Already have an account?{' '}
              <button
                type="button"
                onClick={openLogin}
                className="font-semibold text-white hover:text-lvx-blue premium-transition"
              >
                Sign in
              </button>
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: lvxEase }}
            className="max-w-md mx-auto px-6 py-12 lg:py-16"
          >
            <button
              type="button"
              onClick={openGateway}
              className="inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white mb-8 premium-transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div className="lvx-auth-form-card p-8 sm:p-10">
              <div className="flex justify-center mb-6">
                <BrandLogo variant="monogram" linkTo={false} imgClassName="h-11 w-11" />
              </div>
              <div className="mb-8">
                <p className="text-[10px] font-semibold uppercase tracking-label text-white/50 mb-2">
                  {isRegister ? (role === 'buyer' ? 'Corporate Buyer' : 'Patent Inventor') : 'Welcome Back'}
                </p>
                <h2 className="text-2xl font-bold tracking-heading text-white">
                  {isRegister ? 'Create your account' : 'Sign in to PatentBridge'}
                </h2>
                <p className="text-sm text-white/60 mt-2 leading-relaxed font-light">
                  {isRegister
                    ? 'Join researchers and corporate acquirers transacting intellectual property.'
                    : 'Access your portfolio, licensing proposals, and patent diagnostics.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-500/10 border border-red-400/30 text-red-200 p-3 rounded-lg text-xs flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {isRegister && (
                  <>
                    <Input
                      label="Full Name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Dr. Sarah Jenkins"
                      className="lvx-input-white rounded-sm"
                    />
                    <Input
                      label="Organization"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="e.g. MIET Research Lab"
                      className="lvx-input-white rounded-sm"
                    />

                    {searchParams.get('role') === null && (
                      <div>
                        <label className="block text-[10px] font-semibold text-white/55 uppercase tracking-label mb-2">
                          Account Role
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {([
                            { id: 'buyer' as const, label: 'Buyer', Icon: Building },
                            { id: 'owner' as const, label: 'Inventor', Icon: Sparkles },
                          ]).map(({ id, label, Icon }) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setRole(id)}
                              className={`flex flex-col items-center p-3.5 border rounded-sm text-center premium-transition text-xs ${
                                role === id
                                  ? 'bg-lvx-blue border-lvx-blue text-white font-bold'
                                  : 'bg-white/5 border-white/15 text-white/60 hover:border-lvx-blue/40'
                              }`}
                            >
                              <Icon className="h-4 w-4 mb-1.5" />
                              <span className="font-semibold">{label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <Input
                  label="Email Address"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="lvx-input-white rounded-sm"
                />
                <Input
                  label="Password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="lvx-input-white rounded-sm"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="lvx-cta-btn w-full flex items-center justify-center gap-2 mt-2 group disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
                  {!loading && <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />}
                </button>
              </form>

              <div className="text-center text-xs mt-6 pt-5 border-t border-white/10">
                <span className="text-white/50">
                  {isRegister ? 'Already have an account?' : "Don't have an account?"}
                </span>{' '}
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
                  className="font-semibold text-lvx-blue hover:text-white premium-transition"
                >
                  {isRegister ? 'Sign in' : 'Get started'}
                </button>
              </div>
            </div>

            <div className="mt-6 p-5 rounded-sm border border-white/10 bg-lvx-navy-card">
              <div className="flex items-center gap-1.5 text-white/80 font-bold uppercase tracking-label text-[9px] mb-2">
                <KeyRound className="h-3.5 w-3.5 text-lvx-blue" />
                <span>Quick-Access Demo Roles</span>
              </div>
              <p className="text-[11px] text-white/50 mb-3">
                Password for all: <code className="font-mono bg-white/10 px-1 py-0.5 rounded text-white/80">password123</code>
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(['buyer', 'owner', 'admin'] as const).map((demoRole) => (
                  <button
                    key={demoRole}
                    type="button"
                    onClick={() => handleQuickLogin(demoRole)}
                    className="px-2 py-2 bg-white/5 hover:bg-lvx-blue/20 hover:text-white border border-white/10 hover:border-lvx-blue/40 rounded-sm text-[10px] font-bold text-white/70 premium-transition capitalize"
                  >
                    {demoRole}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
