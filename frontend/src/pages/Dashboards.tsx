import React from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../hooks/useApi';
import { useAuthStore } from '../context/authStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Dialog } from '../components/ui/Dialog';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area 
} from 'recharts';
import { 
  Users as UsersIcon, FolderKanban, ShieldCheck, 
  Inbox, Calendar, Plus, Bookmark, Activity, FileText, CheckCircle, 
  ExternalLink, Sparkles, AlertCircle, RefreshCw, ChevronRight, Handshake,
  FileKey2, CreditCard, Lock
} from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { CardSkeleton } from '../components/ui/Skeleton';
import { formatINR } from '../constants/ip';

type ManagerProps = { embedded?: boolean };

const cardClass = 'rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900';

// ==========================================
// 1. Dashboard Overview Component
// ==========================================
// Helpers for card colors and icons to match Wealthfront's assets style
const getStatIcon = (label: string) => {
  const lowercaseLabel = label.toLowerCase();
  if (lowercaseLabel.includes('patent') || lowercaseLabel.includes('portfolio')) {
    return <FolderKanban className="h-5 w-5 text-lvx-blue" />;
  }
  if (lowercaseLabel.includes('lead') || lowercaseLabel.includes('inbox') || lowercaseLabel.includes('enquir')) {
    return <Inbox className="h-5 w-5 text-lvx-blue" />;
  }
  if (lowercaseLabel.includes('meet') || lowercaseLabel.includes('schedule') || lowercaseLabel.includes('call')) {
    return <Calendar className="h-5 w-5 text-emerald-650 dark:text-emerald-450" />;
  }
  if (lowercaseLabel.includes('save') || lowercaseLabel.includes('bookmark')) {
    return <Bookmark className="h-5 w-5 text-pink-650 dark:text-pink-450" />;
  }
  if (lowercaseLabel.includes('audit') || lowercaseLabel.includes('log') || lowercaseLabel.includes('activit')) {
    return <Activity className="h-5 w-5 text-amber-650 dark:text-amber-450" />;
  }
  if (lowercaseLabel.includes('user') || lowercaseLabel.includes('client')) {
    return <UsersIcon className="h-5 w-5 text-blue-650 dark:text-blue-450" />;
  }
  return <Sparkles className="h-5 w-5 text-lvx-blue" />;
};

const getCardColors = (label: string) => {
  const lowercaseLabel = label.toLowerCase();
  if (lowercaseLabel.includes('patent') || lowercaseLabel.includes('portfolio')) {
    return {
      bg: 'bg-lvx-blue/10',
      border: 'border-lvx-blue/20 hover:border-lvx-blue/40',
      text: 'text-lvx-blue',
      glow: 'shadow-lvx-blue/5'
    };
  }
  if (lowercaseLabel.includes('lead') || lowercaseLabel.includes('inbox') || lowercaseLabel.includes('enquir')) {
    return {
      bg: 'bg-lvx-blue/10',
      border: 'border-lvx-blue/20 hover:border-lvx-blue/40',
      text: 'text-lvx-blue',
      glow: 'shadow-lvx-blue/5'
    };
  }
  if (lowercaseLabel.includes('meet') || lowercaseLabel.includes('schedule') || lowercaseLabel.includes('call')) {
    return {
      bg: 'bg-emerald-50/20 dark:bg-emerald-950/10',
      border: 'border-emerald-100/80 dark:border-emerald-900/30 hover:border-emerald-300 dark:hover:border-emerald-800',
      text: 'text-emerald-700 dark:text-emerald-400',
      glow: 'shadow-emerald-550/5 dark:shadow-emerald-550/10'
    };
  }
  if (lowercaseLabel.includes('save') || lowercaseLabel.includes('bookmark')) {
    return {
      bg: 'bg-pink-50/20 dark:bg-pink-950/10',
      border: 'border-pink-100/80 dark:border-pink-900/30 hover:border-pink-300 dark:hover:border-pink-800',
      text: 'text-pink-700 dark:text-pink-400',
      glow: 'shadow-pink-550/5 dark:shadow-pink-550/10'
    };
  }
  if (lowercaseLabel.includes('audit') || lowercaseLabel.includes('log') || lowercaseLabel.includes('activit')) {
    return {
      bg: 'bg-amber-50/20 dark:bg-amber-950/10',
      border: 'border-amber-100/80 dark:border-amber-900/30 hover:border-amber-300 dark:hover:border-amber-800',
      text: 'text-amber-700 dark:text-amber-400',
      glow: 'shadow-amber-550/5 dark:shadow-amber-550/10'
    };
  }
  return {
    bg: 'bg-blue-50/20 dark:bg-blue-950/10',
    border: 'border-blue-100/80 dark:border-blue-900/30 hover:border-blue-300 dark:hover:border-blue-800',
    text: 'text-blue-700 dark:text-blue-400',
    glow: 'shadow-blue-550/5 dark:shadow-blue-550/10'
  };
};

export const DashboardOverview = ({ embedded }: ManagerProps = {}) => {
  const { user } = useAuthStore();
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [adminTab, setAdminTab] = React.useState<'overview' | 'treasury'>('overview');

  // Mock charts data
  const mockTimelineData = [
    { month: 'Jan', views: 80, inquiries: 2 },
    { month: 'Feb', views: 140, inquiries: 4 },
    { month: 'Mar', views: 220, inquiries: 9 },
    { month: 'Apr', views: 300, inquiries: 14 },
    { month: 'May', views: 410, inquiries: 22 },
    { month: 'Jun', views: 540, inquiries: 29 }
  ];

  const mockIndexData = [
    { month: 'Jan', index: 100, volume: 15 },
    { month: 'Feb', index: 115, volume: 22 },
    { month: 'Mar', index: 130, volume: 38 },
    { month: 'Apr', index: 155, volume: 55 },
    { month: 'May', index: 180, volume: 84 },
    { month: 'Jun', index: 214, volume: 114 }
  ];

  const fetchAnalytics = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/analytics/dashboard');
      setData(res);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1,2,3,4].map((i) => <CardSkeleton key={i} />)}</div>;
  if (error) return <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 rounded-xl text-sm">{error}</div>;

  return (
    <div className="space-y-8">
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200/60 dark:border-zinc-800 pb-5">
          <div>
            <h1 className="text-3xl font-bold text-zinc-950 dark:text-white tracking-tight">
              Welcome back, {user?.name.split(' (')[0]}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">Platform dashboard and operations analytics.</p>
          </div>
        </div>
      )}

      {user?.role === 'admin' && (
        <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 text-left">
          <button
            onClick={() => setAdminTab('overview')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg premium-transition ${
              adminTab === 'overview'
                ? 'bg-lvx-blue text-white shadow-md'
                : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-850/60 hover:text-zinc-900 dark:hover:text-zinc-150'
            }`}
          >
            Platform Overview
          </button>
          <button
            onClick={() => setAdminTab('treasury')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg premium-transition ${
              adminTab === 'treasury'
                ? 'bg-lvx-blue text-white shadow-md'
                : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-850/60 hover:text-zinc-900 dark:hover:text-zinc-150'
            }`}
          >
            Treasury Ledger & Revenue
          </button>
        </div>
      )}

      {/* Stats Cards Grid: Colorful, premium styling */}
      {(!user || user.role !== 'admin' || adminTab === 'overview') ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data?.stats?.map((stat: any, idx: number) => {
            const colors = getCardColors(stat.label);
            const icon = getStatIcon(stat.label);
            const isUrgent = stat.urgent || false;
            return (
              <Card key={idx} className={`border ${isUrgent ? 'border-red-300 bg-red-50/20 dark:border-red-900/40' : colors.border} ${colors.bg} ${colors.glow} hover:shadow-premium-md premium-transition`}>
                <CardContent className="p-5 flex flex-col justify-between h-32 relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-label block">
                      {stat.label}
                    </span>
                    <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/40 dark:border-zinc-800/80 shadow-premium-sm">
                      {icon}
                    </div>
                  </div>

                  <div className="space-y-0.5 text-left">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-lvx-charcoal dark:text-white leading-none">{stat.value}</span>
                    </div>
                    <span className={`text-[10px] block font-bold ${isUrgent ? 'text-red-650 dark:text-red-400' : 'text-emerald-650 dark:text-emerald-400'}`}>
                      {stat.change}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Treasury Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          <Card className="border border-lvx-blue/20 bg-lvx-blue/5 shadow-premium-sm hover:shadow-premium-md premium-transition">
            <CardContent className="p-5 flex flex-col justify-between h-32">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-label block">Gross Merchandise Volume (GMV)</span>
              <div>
                <span className="text-3xl font-bold text-lvx-charcoal dark:text-white block mt-2">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(data?.treasury?.gmv || 0)}
                </span>
                <span className="text-[10px] text-emerald-650 dark:text-emerald-400 font-bold block mt-1 font-sans">Total funded transaction volume</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-lvx-blue/20 bg-lvx-blue/5 shadow-premium-sm hover:shadow-premium-md premium-transition">
            <CardContent className="p-5 flex flex-col justify-between h-32">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-label block">Realized Success Commission (5%)</span>
              <div>
                <span className="text-3xl font-bold text-lvx-charcoal dark:text-white block mt-2">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(data?.treasury?.commissions || 0)}
                </span>
                <span className="text-[10px] text-emerald-650 dark:text-emerald-400 font-bold block mt-1 font-sans">Platform operations revenue</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-emerald-150 dark:border-emerald-900/30 bg-emerald-50/10 dark:bg-emerald-950/5 shadow-premium-sm hover:shadow-premium-md premium-transition">
            <CardContent className="p-5 flex flex-col justify-between h-32">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-label block">Active Escrow Vault Custody</span>
              <div>
                <span className="text-3xl font-bold text-lvx-charcoal dark:text-white block mt-2">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(data?.treasury?.activeEscrow || 0)}
                </span>
                <span className="text-[10px] text-amber-650 dark:text-amber-400 font-bold block mt-1 font-sans">Held securely in active vaults</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-amber-150 dark:border-amber-900/30 bg-amber-50/10 dark:bg-amber-950/5 shadow-premium-sm hover:shadow-premium-md premium-transition">
            <CardContent className="p-5 flex flex-col justify-between h-32">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-label block">Subscription Revenue Stream</span>
              <div>
                <span className="text-3xl font-bold text-lvx-charcoal dark:text-white block mt-2">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(data?.treasury?.subscriptionRevenue || 0)}
                </span>
                <span className="text-[10px] text-lvx-blue font-bold block mt-1 font-sans">Projected monthly stream</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dashboard Analytics Graphics / Detail Grids */}
      {user?.role === 'admin' && adminTab === 'overview' && (
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* Industry Distribution Chart: Glowing bar gradients */}
          <Card className="border border-zinc-200/80 dark:border-zinc-800 shadow-md">
            <CardHeader className="py-4 px-6 border-b border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between text-left">
              <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-200/60">Technology Classification Spread</CardTitle>
            </CardHeader>
            <CardContent className="p-6 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.industryStats || []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4a90e2" stopOpacity={0.95}/>
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.4}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" dark-stroke="#27272a" />
                  <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }} contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid #e4e4e7' }} />
                  <Bar dataKey="value" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Audit Logs Quick View */}
          <Card className="border border-zinc-200/80 dark:border-zinc-800 shadow-md">
            <CardHeader className="py-4 px-6 border-b border-zinc-200/60 dark:border-zinc-800 text-left">
              <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-200/60">System Audit Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5 h-80 overflow-y-auto text-left">
              {data?.recentLogs?.map((log: any) => (
                <div key={log.id} className="text-xs space-y-0.5 border-b border-zinc-100 dark:border-zinc-800 pb-2.5 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-300">{log.action}</span>
                    <span className="text-zinc-400 dark:text-zinc-500">{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 leading-normal">{log.details}</p>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block">By {log.userName}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {user?.role === 'admin' && adminTab === 'treasury' && (
        <div className="space-y-6">
          <Card className="border border-zinc-200/80 dark:border-zinc-800 shadow-md">
            <CardHeader className="py-4 px-6 border-b border-zinc-200/60 dark:border-zinc-800 text-left">
              <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-200/60">Platform Revenue Stream Analysis (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent className="p-6 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.treasury?.timeSeries || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gmvGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="commGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="subsGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="month" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(tick) => `₹${(tick / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ borderRadius: 12 }} formatter={(value: any) => [new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value), '']} />
                  <Area type="monotone" dataKey="gmv" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#gmvGlow)" name="Platform GMV" />
                  <Area type="monotone" dataKey="commissions" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#commGlow)" name="Realized Commission (5%)" />
                  <Area type="monotone" dataKey="subscriptions" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#subsGlow)" name="Subscription Stream" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {user?.role === 'owner' && (
        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          {/* Timeline chart representing reach and views */}
          <Card className="border border-zinc-200/80 dark:border-zinc-800 shadow-md">
            <CardHeader className="py-4 px-6 border-b border-zinc-200/60 dark:border-zinc-800">
              <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-200/60">Portfolio Views & Deal-Flow Trends</CardTitle>
            </CardHeader>
            <CardContent className="p-6 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockTimelineData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGradientViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4a90e2" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="#4a90e2" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="month" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                  <Area type="monotone" dataKey="views" stroke="#4a90e2" strokeWidth={2} fillOpacity={1} fill="url(#areaGradientViews)" name="Patent Views" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {/* Recent Leads received */}
            <Card className="border border-zinc-200/80 dark:border-zinc-800 shadow-md">
              <CardHeader className="py-4 px-6 border-b border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-200/60">Recent Filer Leads</CardTitle>
                <Link to="/dashboard/leads" className="text-xs font-bold text-lvx-blue dark:text-lvx-blue hover:underline">
                  View all
                </Link>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {data?.recentLeads?.length === 0 ? (
                  <p className="text-xs text-zinc-400 text-center py-6">No enquiries received yet.</p>
                ) : (
                  data?.recentLeads?.map((l: any) => (
                    <div key={l.id} className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 last:border-0 last:pb-0 text-xs">
                      <div className="space-y-0.5 max-w-[70%]">
                        <h4 className="font-semibold text-zinc-800 dark:text-zinc-200">{l.buyerName}</h4>
                        <p className="text-zinc-500 dark:text-zinc-400 font-medium truncate">{l.buyerOrg}</p>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">Patent: {l.patentTitle}</p>
                      </div>
                      <Badge variant={l.status === 'new' ? 'indigo' : 'neutral'} className="text-[9px] font-bold">
                        {l.status}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Upcoming Schedule Info */}
            <Card className="border border-zinc-200/80 dark:border-zinc-800 shadow-md">
              <CardHeader className="py-4 px-6 border-b border-zinc-200/60 dark:border-zinc-800">
                <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-200/60">Meetings Scheduled</CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-center space-y-3">
                <Calendar className="h-8 w-8 text-lvx-blue mx-auto" />
                <div>
                  <h4 className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">{data?.upcomingMeetingsCount || 0} Confirmed video calls</h4>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Manage schedules or coordinate upcoming interviews.</p>
                </div>
                <Link to="/dashboard/meetings" className="block w-full">
                  <Button variant="outline" size="sm" className="w-full text-xs font-bold bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                    Go to Schedules
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {user?.role === 'buyer' && (
        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          <div className="space-y-6">
            {/* Recent transactions & offers */}
            <Card className="border border-zinc-200/80 dark:border-zinc-800 shadow-md">
              <CardHeader className="py-4 px-6 border-b border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-200/60">My Transactions & Offers</CardTitle>
                <Link to="/dashboard/deals" className="text-xs font-bold text-lvx-blue dark:text-lvx-blue hover:underline">
                  View all deals
                </Link>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {!data?.recentDeals?.length ? (
                  <p className="text-xs text-zinc-400 text-center py-6">No offers or transactions yet. Explore IP and submit an offer to get started.</p>
                ) : (
                  data.recentDeals.map((deal: any) => (
                    <Link
                      key={deal.id}
                      to={`/dashboard/deals/${deal.id}`}
                      className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 last:border-0 last:pb-0 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900/50 -mx-2 px-2 py-1 rounded-lg transition-colors"
                    >
                      <div className="space-y-0.5 max-w-[70%]">
                        <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-1">{deal.patentTitle}</h4>
                        <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(deal.price || 0)}
                        </p>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          {new Date(deal.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={deal.status === 'accepted' ? 'success' : deal.status === 'rejected' ? 'danger' : 'warning'} className="text-[9px] font-bold capitalize">
                          {deal.status}
                        </Badge>
                        {deal.escrowStatus && (
                          <Badge variant="outline" className="text-[9px] font-bold capitalize">
                            {deal.escrowStatus.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            {/* IP Index Chart */}
            <Card className="border border-zinc-200/80 dark:border-zinc-800 shadow-md">
              <CardHeader className="py-4 px-6 border-b border-zinc-200/60 dark:border-zinc-800">
                <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-200/60">IPBridge Market Index</CardTitle>
              </CardHeader>
              <CardContent className="p-6 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockIndexData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaGradientIndex" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.35}/>
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.01}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis dataKey="month" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                    <Area type="monotone" dataKey="index" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#areaGradientIndex)" name="Deal Index" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recommended Patents */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-lvx-charcoal dark:text-white uppercase tracking-label flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-lvx-blue" />
                Highest Scoring Patent Listings
              </h3>
              
              <div className="grid sm:grid-cols-2 gap-4">
                {data?.recommendedPatents?.map((p: any) => (
                  <Card key={p.id} className="hover:border-lvx-blue/40 dark:hover:border-zinc-700 hover:shadow-premium-md bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 premium-transition">
                    <CardContent className="p-5 flex flex-col justify-between h-40">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">{p.patentNumber}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            p.score >= 85 
                              ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-450 dark:bg-emerald-950/20' 
                              : 'text-lvx-blue bg-lvx-blue/10'
                          }`}>
                            {p.score >= 85 ? 'Readiness: High' : `Potential: ${p.score}/100`}
                          </span>
                        </div>
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-200/60 text-xs line-clamp-2 leading-snug">
                          {p.title}
                        </h4>
                      </div>

                      <Link to={`/marketplace/${p.id}`} className="text-[11px] font-bold text-lvx-blue dark:text-lvx-blue flex items-center gap-0.5 hover:underline pt-3 border-t border-zinc-100 dark:border-zinc-800">
                        Explore Opportunity
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Recent unlock / access requests */}
            <Card className="border border-zinc-200/80 dark:border-zinc-800 shadow-md">
              <CardHeader className="py-4 px-6 border-b border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-200/60">My Requests</CardTitle>
                <Link to="/dashboard/requests" className="text-xs font-bold text-lvx-blue dark:text-lvx-blue hover:underline">
                  View all
                </Link>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {!data?.recentRequests?.length ? (
                  <p className="text-xs text-zinc-400 text-center py-6">No requests submitted yet.</p>
                ) : (
                  data.recentRequests.map((req: any) => (
                    <div key={req.id} className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 last:border-0 last:pb-0 text-xs">
                      <div className="space-y-0.5 max-w-[70%]">
                        <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-2">{req.patentTitle}</h4>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{new Date(req.createdAt).toLocaleDateString()}</p>
                      </div>
                      <Badge variant={req.status === 'new' ? 'indigo' : req.status === 'contacted' ? 'success' : 'neutral'} className="text-[9px] font-bold capitalize">
                        {req.status}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

          {/* Meeting invitations */}
          <Card className="border border-zinc-200/80 dark:border-zinc-800 shadow-md">
            <CardHeader className="py-4 px-6 border-b border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-200/60">Your Meeting Invitations</CardTitle>
              <Link to="/dashboard/meetings" className="text-xs font-bold text-lvx-blue dark:text-lvx-blue hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent className="p-4 space-y-3 max-h-[320px] overflow-y-auto">
              {data?.activeSchedules?.length === 0 ? (
                <p className="text-xs text-zinc-400 text-center py-10">No meetings requested yet.</p>
              ) : (
                data?.activeSchedules?.map((m: any) => (
                  <div key={m.id} className="text-xs border-b border-zinc-100 dark:border-zinc-800 pb-3 last:border-0 last:pb-0 space-y-1">
                    <h5 className="font-bold text-zinc-900 dark:text-zinc-200 truncate leading-snug">{m.patentTitle}</h5>
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <span>{m.date} at {m.time}</span>
                      <Badge variant={m.status === 'accepted' ? 'success' : m.status === 'declined' ? 'danger' : 'warning'} className="text-[9px] px-1.5 py-0 font-bold">
                        {m.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 2. Portfolio Manager (Owner only)
// ==========================================
export const PortfolioManager = ({ embedded }: ManagerProps = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [portfolio, setPortfolio] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    patentNumber: '',
    title: '',
    abstract: '',
    pdfUrl: '',
    askingPrice: '',
    isForSale: true,
    isForLicense: true
  });
  const [submitting, setSubmitting] = React.useState(false);

  const fetchPortfolio = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/patents/my-portfolio');
      setPortfolio(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  React.useEffect(() => {
    if (searchParams.get('new') === '1') {
      setIsNewOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const openNewDialog = () => setIsNewOpen(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await apiFetch('/api/patents', {
        method: 'POST',
        body: {
          ...form,
          askingPrice: Number(form.askingPrice) || 0
        }
      });
      setIsNewOpen(false);
      setForm({
        patentNumber: '',
        title: '',
        abstract: '',
        pdfUrl: '',
        askingPrice: '',
        isForSale: true,
        isForLicense: true
      });
      fetchPortfolio();
    } catch (err: any) {
      alert(err.message || 'Failed to submit patent.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="grid gap-4 sm:grid-cols-2">{[1, 2].map((i) => <CardSkeleton key={i} />)}</div>;

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100 tracking-tight">Patent Portfolio</h1>
            <p className="text-sm text-zinc-500 mt-1">Register new innovation patents or monitor verification status.</p>
          </div>
          <Button onClick={openNewDialog} className="rounded-xl gap-1.5 text-xs font-semibold">
            <Plus className="h-4 w-4" />
            List a Patent
          </Button>
        </div>
      )}

      {embedded && (
        <div className="flex justify-end">
          <Button onClick={openNewDialog} size="sm" className="rounded-xl gap-1.5">
            <Plus className="h-4 w-4" />
            List IP
          </Button>
        </div>
      )}

      {portfolio.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-10 w-10" />}
          title="Your portfolio is empty"
          description='List your first patent or IP asset to reach corporate acquirers and licensees.'
          actionLabel="List IP"
          onAction={openNewDialog}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {portfolio.map((p) => (
            <div key={p._id} className={`${cardClass} p-5 hover:shadow-md hover:border-primary/20 transition-all`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-mono text-zinc-400">{p.patentNumber}</span>
                  <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mt-1 line-clamp-2">{p.title}</h3>
                </div>
                <Badge variant={p.status === 'approved' ? 'success' : p.status === 'rejected' ? 'danger' : 'warning'} className="shrink-0 text-[10px] uppercase">
                  {p.status}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {p.analysis?.industryClassification?.slice(0, 3).map((i: string) => (
                  <Badge key={i} variant="outline" className="text-[10px]">{i}</Badge>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-xs text-zinc-500">
                  AI score: <strong className="text-zinc-800 dark:text-zinc-200">{p.analysis?.commercialPotentialScore ?? '—'}</strong>
                </span>
                <Link to={`/marketplace/${p._id}`}>
                  <Button variant="ghost" size="sm" className="text-xs rounded-lg">View</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Patent Register Dialog */}
      <Dialog isOpen={isNewOpen} onClose={() => setIsNewOpen(false)} title="Register Intellectual Property">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <Input 
            label="Patent Number" 
            placeholder="e.g. US-11394025-B2" 
            required 
            value={form.patentNumber}
            onChange={e => setForm(prev => ({ ...prev, patentNumber: e.target.value }))}
          />
          <Input 
            label="Patent Title" 
            placeholder="Adaptive Neural Architecture for Low-Power..." 
            required 
            value={form.title}
            onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
          />
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-label mb-1.5">
              Patent Abstract
            </label>
            <textarea 
              rows={4} 
              placeholder="Paste the official filing abstract claims..."
              required
              value={form.abstract}
              onChange={e => setForm(prev => ({ ...prev, abstract: e.target.value }))}
              className="w-full px-3.5 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 rounded-md shadow-premium-sm placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 premium-transition"
            />
          </div>
          <Input 
            label="Original registry link / PDF URL (Optional)" 
            placeholder="e.g. https://patentimages.storage.googleapis.com/..." 
            value={form.pdfUrl}
            onChange={e => setForm(prev => ({ ...prev, pdfUrl: e.target.value }))}
          />
          <Input 
            label="Asking Price (₹ INR)" 
            type="number"
            placeholder="e.g. 5000000" 
            required 
            value={form.askingPrice}
            onChange={e => setForm(prev => ({ ...prev, askingPrice: e.target.value }))}
          />
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-1.5 border-t border-zinc-100 dark:border-zinc-800 mt-2">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
              <input 
                type="checkbox" 
                checked={form.isForSale} 
                onChange={e => setForm(prev => ({ ...prev, isForSale: e.target.checked }))}
                className="rounded border-zinc-350 text-lvx-blue focus:ring-lvx-blue dark:bg-zinc-800 dark:border-zinc-700 h-4 w-4"
              />
              <span>Available for Sale / Assignment</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
              <input 
                type="checkbox" 
                checked={form.isForLicense} 
                onChange={e => setForm(prev => ({ ...prev, isForLicense: e.target.checked }))}
                className="rounded border-zinc-350 text-lvx-blue focus:ring-lvx-blue dark:bg-zinc-800 dark:border-zinc-700 h-4 w-4"
              />
              <span>Available for Royalty Licensing</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsNewOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting} className="font-semibold text-xs px-4">
              Submit & Run AI Analysis
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

// ==========================================
// 3. Saved Patents Bookmarks Manager (Buyer only)
// ==========================================
export const BookmarksManager = ({ embedded }: ManagerProps = {}) => {
  const [bookmarks, setBookmarks] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchBookmarks = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/patents/saved');
      setBookmarks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  if (loading) return <div className="text-zinc-400 text-sm">Loading bookmarked patents...</div>;

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100 tracking-heading">Saved Patents</h1>
          <p className="text-xs text-zinc-500 mt-1">Bookmark directory listings for tracking licensing feasibility.</p>
        </div>
      )}

      {bookmarks.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 rounded-lg p-12 text-center text-zinc-400 space-y-3">
          <Bookmark className="h-10 w-10 mx-auto text-zinc-300" />
          <h3 className="font-semibold text-zinc-700 dark:text-zinc-400 text-sm">No Bookmarks Saved</h3>
          <p className="text-xs max-w-sm mx-auto">Explore the marketplace and click the save button on listings.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {bookmarks.map((b) => (
            <Card key={b._id} className="hover:border-zinc-300 premium-transition">
              <CardContent className="p-5 flex flex-col justify-between h-44">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-zinc-400">{b.patentNumber}</span>
                    <Badge variant="indigo" className="text-[9px] py-0">{b.analysis?.industryClassification?.[0]}</Badge>
                  </div>
                  <h4 className="font-bold text-zinc-950 dark:text-zinc-100 text-xs sm:text-sm line-clamp-2 leading-snug">
                    {b.title}
                  </h4>
                  <p className="text-zinc-400 text-[10px] mt-1">Affiliation: {b.ownerOrganization}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                  <span className="text-[10px] text-zinc-400">Commercial Potential: {b.analysis?.commercialPotentialScore}/100</span>
                  <Link to={`/marketplace/${b._id}`} className="text-xs font-semibold text-zinc-900 dark:text-zinc-200 hover:underline">
                    Explore Opportunity →
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 4. Leads Manager (Owner & Buyer)
// ==========================================
export const LeadsManager = ({ embedded }: ManagerProps = {}) => {
  const { user } = useAuthStore();
  const [leads, setLeads] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchLeads = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/interactions/leads');
      setLeads(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await apiFetch(`/api/interactions/leads/${id}`, {
        method: 'PUT',
        body: { status: newStatus }
      });
      fetchLeads();
    } catch (err: any) {
      alert(err.message || 'Failed to update lead status.');
    }
  };

  if (loading) return <div className="grid gap-4">{[1, 2].map((i) => <CardSkeleton key={i} />)}</div>;

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100 tracking-tight">Leads Inbox</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {user?.role === 'owner'
              ? 'Monitor commercial expressions of interest from buyers.'
              : 'Track responses to proposals you have submitted.'}
          </p>
        </div>
      )}

      {leads.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-10 w-10" />}
          title="No requests yet"
          description="Interest and unlock requests will appear here once submitted."
        />
      ) : (
        <div className="space-y-4">
          {leads.map((l) => (
            <div key={l._id} className={`${cardClass} p-5 space-y-4 ${l.status === 'new' && user?.role === 'owner' ? 'ring-1 ring-primary/20' : ''}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded font-semibold">{l.patentNumber}</span>
                    <h3 className="font-bold text-zinc-950 dark:text-zinc-100 text-sm mt-1">{l.patentTitle}</h3>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={l.status === 'new' ? 'indigo' : l.status === 'reviewed' ? 'neutral' : 'success'} className="uppercase py-0.5 text-[9px] font-bold">
                      {l.status}
                    </Badge>
                    <span className="text-[10px] text-zinc-400">{new Date(l.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="h-px bg-zinc-100" />

                <div className="grid sm:grid-cols-[200px_1fr] gap-4 text-xs">
                  <div className="space-y-2 border-r border-zinc-100 dark:border-zinc-800 pr-4">
                    <div>
                      <span className="block text-[9px] text-zinc-400 font-bold uppercase">Proposer</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-300">{l.name}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-zinc-400 font-bold uppercase">Company Affiliation</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-300">{l.organization}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-zinc-400 font-bold uppercase">Target Align Purpose</span>
                      <Badge variant="outline" className="mt-1 py-0">{l.purpose}</Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="block text-[9px] text-zinc-400 font-bold uppercase">Message Proposal Details</span>
                    <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">{l.message}</p>
                    
                    {/* Contact detail display */}
                    <div className="pt-2">
                      <span className="text-[10px] text-zinc-400">Direct Contact Coordinate: </span>
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-300 underline">{l.email}</span>
                    </div>
                  </div>
                </div>

                {/* Owner specific quick-change options */}
                {user?.role === 'owner' && l.status !== 'contacted' && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                    {l.status === 'new' && (
                      <Button variant="outline" size="sm" onClick={() => handleStatusUpdate(l._id, 'reviewed')} className="text-xs font-semibold">
                        Mark Reviewed
                      </Button>
                    )}
                    <Button size="sm" onClick={() => handleStatusUpdate(l._id, 'contacted')} className="text-xs font-semibold">
                      Mark as Contacted
                    </Button>
                  </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 5. Meetings Manager (Owner & Buyer)
// ==========================================
export const MeetingsManager = ({ embedded }: ManagerProps = {}) => {
  const { user } = useAuthStore();
  const [meetings, setMeetings] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeVideoCallId, setActiveVideoCallId] = React.useState<string | null>(null);

  const fetchMeetings = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/interactions/meetings');
      setMeetings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const handleUpdateStatus = async (id: string, newStatus: 'accepted' | 'declined') => {
    try {
      await apiFetch(`/api/interactions/meetings/${id}`, {
        method: 'PUT',
        body: { status: newStatus }
      });
      fetchMeetings();
    } catch (err: any) {
      alert(err.message || 'Failed to update meeting status.');
    }
  };

  if (loading) return <div className="text-zinc-400 text-sm">Loading calendar logs...</div>;

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100 tracking-heading">Meetings Calendar</h1>
          <p className="text-xs text-zinc-500 mt-1">Review exploratory conference schedules regarding patent commercialization.</p>
        </div>
      )}

      {meetings.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 rounded-lg p-12 text-center text-zinc-400 space-y-3">
          <Calendar className="h-10 w-10 mx-auto text-zinc-300" />
          <h3 className="font-semibold text-zinc-700 dark:text-zinc-400 text-sm">No Meetings Scheduled</h3>
          <p className="text-xs max-w-sm mx-auto">No video call slots are registered in this portfolio.</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-100 font-bold text-zinc-400 uppercase tracking-label">
                <th className="p-4 font-semibold">Exploratory Patent</th>
                <th className="p-4 font-semibold">Counter-Party Entity</th>
                <th className="p-4 font-semibold">Proposed Timing</th>
                <th className="p-4 font-semibold">Agenda Notes</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-600">
              {meetings.map((m) => (
                <tr key={m._id} className="hover:bg-zinc-50 dark:bg-zinc-900/60/50">
                  <td className="p-4 font-bold text-zinc-950 dark:text-zinc-100">
                    <span className="block">{m.patentTitle}</span>
                    <span className="text-[10px] text-zinc-400 font-mono mt-0.5 block">{m.patentNumber}</span>
                  </td>
                  <td className="p-4 font-medium text-zinc-700 dark:text-zinc-400">
                    {m.counterParty}
                  </td>
                  <td className="p-4 font-mono font-medium text-zinc-800 dark:text-zinc-300">
                    {m.preferredDate} <br />
                    <span className="text-[10px] text-zinc-400">{m.preferredTime} UTC</span>
                  </td>
                  <td className="p-4 max-w-xs truncate font-sans">
                    {m.notes || 'N/A'}
                  </td>
                  <td className="p-4">
                    <Badge variant={m.status === 'accepted' ? 'success' : m.status === 'declined' ? 'danger' : 'warning'} className="text-[10px] font-semibold uppercase">
                      {m.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    {m.status === 'accepted' ? (
                      <Button 
                        size="sm" 
                        onClick={() => setActiveVideoCallId(m._id)} 
                        className="text-xs px-2.5 py-1 bg-lvx-blue hover:bg-lvx-blue-hover text-white font-bold rounded flex items-center gap-1.5 ml-auto"
                      >
                        <Activity className="h-3 w-3 animate-pulse text-emerald-400" />
                        Join Video Call
                      </Button>
                    ) : user?.role === 'owner' && m.status === 'pending' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(m._id, 'declined')} className="text-xs px-2.5 py-1">
                          Decline
                        </Button>
                        <Button size="sm" onClick={() => handleUpdateStatus(m._id, 'accepted')} className="text-xs px-2.5 py-1 bg-lvx-blue hover:bg-lvx-blue-hover text-white font-bold">
                          Accept
                        </Button>
                      </div>
                    ) : user?.role === 'buyer' && m.status === 'pending' ? (
                      <span className="text-[10px] text-zinc-400 italic">Pending review</span>
                    ) : (
                      <span className="text-[10px] text-zinc-400">No actions</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Video Call Modal */}
      <Dialog
        isOpen={!!activeVideoCallId}
        onClose={() => setActiveVideoCallId(null)}
        title="IPBridge Secure Video Conference"
      >
        <div className="space-y-4 text-xs text-left">
          <div className="bg-lvx-navy text-white p-3.5 rounded-lg flex items-center justify-between">
            <div>
              <h4 className="font-bold text-xs uppercase">Confidential Video Conference Room</h4>
              <p className="text-[9px] text-white/70 mt-0.5 font-medium">Fully secure and private commercial negotiation channel</p>
            </div>
            <Badge variant="success" className="py-0.5 bg-emerald-500 border-0 font-bold uppercase tracking-label text-[9px]">Live</Badge>
          </div>

          <div className="bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800" style={{ height: '420px' }}>
            {activeVideoCallId && (
              <iframe
                src={`https://meet.jit.si/PatentBridge-Meeting-${activeVideoCallId}#userInfo.displayName="${user?.name || 'User'}"`}
                style={{ border: 0, width: '100%', height: '100%' }}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                title="Virtual Meeting Space"
              />
            )}
          </div>

          <div className="flex justify-end pt-1">
            <Button onClick={() => setActiveVideoCallId(null)} className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs border-0 rounded-lg px-4 py-2">
              Leave Conference
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

// ==========================================
// 6. Reviews Queue Manager (Admin only)
// ==========================================
export const ReviewsManager = ({ embedded }: ManagerProps = {}) => {
  const [reviews, setReviews] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchPending = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/patents/pending');
      setReviews(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleReview = async (id: string, actionStatus: 'approved' | 'rejected') => {
    try {
      await apiFetch(`/api/patents/${id}/review`, {
        method: 'PUT',
        body: { status: actionStatus }
      });
      fetchPending();
    } catch (err: any) {
      alert(err.message || 'Review processing failed.');
    }
  };

  if (loading) return <div className="grid gap-4">{[1, 2].map((i) => <CardSkeleton key={i} />)}</div>;

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100 tracking-tight">Review Queue</h1>
          <p className="text-sm text-zinc-500 mt-1">Approve or reject new listings before they go live.</p>
        </div>
      )}

      {reviews.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="h-10 w-10" />}
          title="Review queue clear"
          description="No patents require verification at the moment."
        />
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r._id} className={`${cardClass} p-6 space-y-4 text-xs`}>
                
                {/* Meta details */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded font-semibold">{r.patentNumber}</span>
                    <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-100 mt-1">{r.title}</h3>
                  </div>
                  <span className="text-[10px] text-zinc-400">Filed by {r.ownerName} ({r.ownerOrganization})</span>
                </div>

                <div className="h-px bg-zinc-100" />

                <div className="grid sm:grid-cols-[1fr_240px] gap-6">
                  {/* Abstract preview */}
                  <div className="space-y-2">
                    <span className="block text-[9px] text-zinc-400 font-bold uppercase">Filing Abstract</span>
                    <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">{r.abstract}</p>
                  </div>

                  {/* AI brief details */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/60 rounded-lg p-4 space-y-3.5 border border-zinc-200 dark:border-zinc-800/60">
                    <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-300 font-semibold">
                      <Sparkles className="h-3.5 w-3.5 text-zinc-950 dark:text-zinc-100 fill-zinc-950" />
                      <span>AI Pre-Analysis</span>
                    </div>

                    <div className="space-y-2 text-[11px]">
                      <div>
                        <span className="text-zinc-400">Class: </span>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-400">{r.analysis?.industryClassification?.[0] || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400">Keywords: </span>
                        <span className="font-semibold text-zinc-700 dark:text-zinc-400 truncate block">{r.analysis?.keywords?.join(', ')}</span>
                      </div>
                      <div className="flex items-center gap-1 pt-1">
                        <span className="text-zinc-400">Commercial Potential Score: </span>
                        <span className="font-bold text-zinc-900 bg-white dark:bg-zinc-900 border px-1.5 rounded">{r.analysis?.commercialPotentialScore}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Final approvals buttons */}
                <div className="flex items-center justify-end gap-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                  <Button variant="outline" onClick={() => handleReview(r._id, 'rejected')} className="text-xs border-red-200 hover:bg-red-50 hover:text-red-700 text-red-600 font-semibold px-4">
                    Reject Filing
                  </Button>
                  <Button onClick={() => handleReview(r._id, 'approved')} className="text-xs font-semibold px-4 bg-emerald-600 hover:bg-emerald-700 text-white">
                    Approve & List
                  </Button>
                </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 7. Users Directory Table (Admin only)
// ==========================================
export const UsersManager = ({ embedded }: ManagerProps = {}) => {
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const data = await apiFetch('/api/auth/users');
        setUsers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  if (loading) return <div className="grid gap-4 sm:grid-cols-2">{[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}</div>;

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100 tracking-tight">Users</h1>
          <p className="text-sm text-zinc-500 mt-1">Registered platform accounts.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {users.map((u) => (
          <div key={u.id} className={`${cardClass} p-5`}>
            <div className="flex items-start justify-between gap-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                {u.name.charAt(0)}
              </div>
              <Badge variant={u.role === 'admin' ? 'success' : u.role === 'owner' ? 'indigo' : 'neutral'} className="text-[10px] uppercase">
                {u.role}
              </Badge>
            </div>
            <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mt-3">{u.name}</h3>
            <p className="text-xs text-zinc-500 font-mono mt-0.5 truncate">{u.email}</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">{u.organization || 'Independent'}</p>
            <p className="text-[10px] text-zinc-400 mt-3">Joined {new Date(u.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 8. System Audits Logger (Admin only)
// ==========================================
export const AuditsManager = ({ embedded }: ManagerProps = {}) => {
  const [logs, setLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchAudits = async () => {
      try {
        setLoading(true);
        const res = await apiFetch('/api/analytics/dashboard');
        setLogs(res.recentLogs || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAudits();
  }, []);

  if (loading) return <div className="grid gap-3">{[1, 2, 3].map((i) => <CardSkeleton key={i} />)}</div>;

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100 tracking-tight">Audit log</h1>
          <p className="text-sm text-zinc-500 mt-1">System activities and administrative actions.</p>
        </div>
      )}

      {logs.length === 0 ? (
        <EmptyState title="No audit entries" description="Activity will appear here as users interact with the platform." />
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className={`${cardClass} px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-xs`}>
              <span className="text-zinc-400 font-mono shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 font-mono">{log.action}</span>
              <span className="text-zinc-600 dark:text-zinc-400 flex-1">{log.details}</span>
              <span className="text-zinc-500 font-medium">{log.userName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 9. Negotiations Manager (Owner & Buyer)
// ==========================================
export const NegotiationsManager = ({ embedded }: ManagerProps = {}) => {
  const { user } = useAuthStore();
  const [offers, setOffers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isCounterOpen, setIsCounterOpen] = React.useState(false);
  const [selectedOffer, setSelectedOffer] = React.useState<any>(null);
  const [counterPrice, setCounterPrice] = React.useState('');
  const [processingId, setProcessingId] = React.useState<string | null>(null);
  const [ndas, setNdas] = React.useState<any[]>([]);
  const [ndasLoading, setNdasLoading] = React.useState(true);

  const fetchOffers = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/offers');
      setOffers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNdas = React.useCallback(async () => {
    try {
      setNdasLoading(true);
      const data = await apiFetch('/api/nda');
      setNdas(data);
    } catch (err) {
      console.error(err);
    } finally {
      setNdasLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchOffers();
    fetchNdas();
  }, [fetchOffers, fetchNdas]);

  const handleUpdateStatus = async (id: string, status: 'accepted' | 'declined') => {
    try {
      setProcessingId(id);
      await apiFetch(`/api/offers/${id}`, {
        method: 'PUT',
        body: { status }
      });
      fetchOffers();
      fetchNdas();
    } catch (err: any) {
      alert(err.message || 'Failed to update offer.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCounterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOffer || !counterPrice) return;

    try {
      setProcessingId(selectedOffer._id);
      await apiFetch(`/api/offers/${selectedOffer._id}`, {
        method: 'PUT',
        body: {
          status: 'countered',
          counterPrice: Number(counterPrice)
        }
      });
      setIsCounterOpen(false);
      setSelectedOffer(null);
      setCounterPrice('');
      fetchOffers();
      fetchNdas();
    } catch (err: any) {
      alert(err.message || 'Failed to submit counter-offer.');
    } finally {
      setProcessingId(null);
    }
  };

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(p);
  };

  if (loading) return <div className="grid gap-4">{[1, 2].map((i) => <CardSkeleton key={i} />)}</div>;

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100 tracking-tight">Negotiations</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {user?.role === 'owner'
              ? 'Review acquisition and licensing offers from buyers.'
              : 'Track status and counter-proposals on your offers.'}
          </p>
        </div>
      )}

      {offers.length === 0 ? (
        <EmptyState
          icon={<Handshake className="h-10 w-10" />}
          title="No active negotiations"
          description="Submit an offer on an unlocked IP asset to start negotiating."
        />
      ) : (
        <div className="grid gap-4">
          {offers.map((o) => {
            const isOwner = user?.role === 'owner';
            const isPending = o.status === 'pending';
            const isCountered = o.status === 'countered';
            return (
              <div key={o._id} className={`${cardClass} p-5 space-y-4`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400">{o.patentNumber}</span>
                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{o.patentTitle}</h3>
                    <p className="text-xs text-zinc-500 mt-1">{o.counterParty}</p>
                  </div>
                  <Badge variant={o.status === 'accepted' ? 'success' : o.status === 'declined' ? 'danger' : o.status === 'countered' ? 'indigo' : 'warning'} className="text-[10px] uppercase">
                    {o.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Price</span>
                    {isCountered ? (
                      <div>
                        <span className="line-through text-zinc-400 text-xs">{formatPrice(o.price)}</span>
                        <span className="block font-bold text-primary">{formatPrice(o.counterPrice || 0)}</span>
                      </div>
                    ) : (
                      <span className="font-bold">{formatPrice(o.price)}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Type</span>
                    <Badge variant={o.type === 'sale' ? 'success' : 'indigo'} className="mt-0.5 text-[10px]">
                      {o.type === 'sale' ? 'Acquisition' : 'Licensing'}
                    </Badge>
                  </div>
                </div>
                {o.notes && <p className="text-xs text-zinc-500 italic">&ldquo;{o.notes}&rdquo;</p>}
                {processingId === o._id ? (
                  <p className="text-xs text-zinc-400">Processing...</p>
                ) : isOwner && isPending ? (
                  <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(o._id, 'declined')} className="text-xs rounded-lg text-red-600">Decline</Button>
                    <Button variant="outline" size="sm" onClick={() => { setSelectedOffer(o); setCounterPrice(o.price.toString()); setIsCounterOpen(true); }} className="text-xs rounded-lg">Counter</Button>
                    <Button size="sm" onClick={() => handleUpdateStatus(o._id, 'accepted')} className="text-xs rounded-lg bg-emerald-600">Accept</Button>
                  </div>
                ) : !isOwner && isCountered ? (
                  <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(o._id, 'declined')} className="text-xs rounded-lg">Decline</Button>
                    <Button size="sm" onClick={() => handleUpdateStatus(o._id, 'accepted')} className="text-xs rounded-lg bg-emerald-600">Accept counter</Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* Counter Offer Modal */}
      <Dialog 
        isOpen={isCounterOpen} 
        onClose={() => { setIsCounterOpen(false); setSelectedOffer(null); }} 
        title="Propose Counter-Offer Price"
      >
        {selectedOffer && (
          <form onSubmit={handleCounterSubmit} className="space-y-4 text-xs text-left">
            <div>
              <p className="text-zinc-500 mb-2 leading-relaxed">
                You are countering the offer from <span className="font-bold text-zinc-700">{selectedOffer.counterParty}</span> for the patent <span className="font-bold text-zinc-700">"{selectedOffer.patentTitle}"</span>.
              </p>
              <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg border border-zinc-200/60 dark:border-zinc-750 mb-4 space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Buyer's Proposed Price:</span>
                  <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{formatPrice(selectedOffer.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Deal Type:</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 uppercase">{selectedOffer.type}</span>
                </div>
              </div>
            </div>

            <Input 
              label="Counter Price (₹ INR)" 
              type="number"
              placeholder="e.g. 6000000" 
              required 
              value={counterPrice}
              onChange={e => setCounterPrice(e.target.value)}
              className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => { setIsCounterOpen(false); setSelectedOffer(null); }}
              >
                Cancel
              </Button>
              <Button type="submit" className="font-semibold text-xs px-4">
                Send Counter-Offer
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Signed Agreements & NDAs Section */}
      <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 space-y-4 text-left">
        <div>
          <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-100 tracking-heading flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-lvx-blue" />
            Signed Documents & Agreements
          </h2>
          <p className="text-[11px] text-zinc-500 mt-1">
            Review and download Mutual Non-Disclosure Agreements (NDAs) officially executed via Aadhaar OTP eSign verification.
          </p>
        </div>

        {ndasLoading ? (
          <div className="text-zinc-400 text-xs py-4">Loading signed agreements record...</div>
        ) : ndas.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-lg p-10 text-center text-zinc-400 space-y-2">
            <FileText className="h-8 w-8 mx-auto text-zinc-300" />
            <h3 className="font-semibold text-zinc-700 dark:text-zinc-400 text-xs">No Signed Documents Found</h3>
            <p className="text-[10px] max-w-sm mx-auto">
              {user?.role === 'owner'
                ? 'No buyer NDAs have been signed for your patent listings yet.'
                : 'You have not e-signed any agreements or NDAs for the listed patent opportunities yet.'}
            </p>
          </div>
        ) : (
          <Card className="overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-150 dark:border-zinc-800 font-bold text-zinc-450 uppercase tracking-label text-[10px]">
                  <th className="p-4 font-bold">Document Opportunity</th>
                  <th className="p-4 font-bold">Patent Classification</th>
                  <th className="p-4 font-bold">{user?.role === 'owner' ? 'Buyer Signatory' : 'Authorized Signatory'}</th>
                  <th className="p-4 font-bold">Execution Timing</th>
                  <th className="p-4 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-zinc-650">
                {ndas.map((nda) => (
                  <tr key={nda._id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 premium-transition">
                    <td className="p-4 font-bold text-zinc-900 dark:text-zinc-100">
                      <div className="flex items-center gap-1.5 text-lvx-blue">
                        <FileText className="h-4.5 w-4.5" />
                        <span>Mutual Non-Disclosure Agreement</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="block font-semibold text-zinc-850 dark:text-zinc-200">{nda.patentTitle}</span>
                      <span className="text-[10px] text-zinc-400 font-mono mt-0.5 block">{nda.patentNumber}</span>
                    </td>
                    <td className="p-4">
                      <span className="block font-bold text-zinc-800 dark:text-zinc-200">{nda.buyerName}</span>
                      <span className="text-[10px] text-zinc-400 block">{nda.buyerOrganization || 'Independent'}</span>
                      <span className="text-[9px] font-mono text-zinc-450 dark:text-zinc-550 block mt-0.5">UIDAI ID: {nda.aadhaarNumber}</span>
                    </td>
                    <td className="p-4 font-mono font-medium text-zinc-800 dark:text-zinc-300">
                      {new Date(nda.signedAt).toLocaleDateString('en-IN')} <br />
                      <span className="text-[10px] text-zinc-400">{new Date(nda.signedAt).toLocaleTimeString('en-IN')}</span>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('pb_token');
                            const response = await fetch(`/api/patents/${nda.patentId}/nda/download?buyerId=${nda.buyerId}`, {
                              headers: {
                                'Authorization': `Bearer ${token}`
                              }
                            });
                            if (!response.ok) throw new Error('Failed to download Word document.');
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `NDA_${nda.patentNumber}_Signed.docx`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            window.URL.revokeObjectURL(url);
                          } catch (err: any) {
                            alert(err.message || 'Error downloading signed NDA.');
                          }
                        }}
                        className="text-xs px-2.5 py-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg flex items-center gap-1.5 ml-auto font-bold"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-lvx-blue" />
                        Download (.docx)
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
};

// ==========================================
// 10. EscrowManager Component
// ==========================================
export const EscrowManager = ({ embedded }: ManagerProps = {}) => {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  // Checkout Modal State
  const [selectedTx, setSelectedTx] = React.useState<any | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false);
  const [paymentStep, setPaymentStep] = React.useState(0);
  const [paymentError, setPaymentError] = React.useState<string | null>(null);
  const [cardNumber, setCardNumber] = React.useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = React.useState('12/28');
  const [cvv, setCvv] = React.useState('123');

  const fetchTransactions = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/transactions');
      setTransactions(res);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load transaction ledgers.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleFundEscrow = async (txId: string) => {
    setPaymentError(null);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      // Create order with Razorpay backend
      const res = await apiFetch(`/api/transactions/${txId}/razorpay-order`, { method: 'POST' });
      const { orderId, amount, currency, keyId } = res;

      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: 'PatentBridge Platform',
        description: 'Escrow Deposit Vault funding',
        order_id: orderId,
        handler: async function (response: any) {
          setIsProcessingPayment(true);
          setPaymentStep(1);
          
          const t1 = setTimeout(() => setPaymentStep(2), 700);
          const t2 = setTimeout(() => setPaymentStep(3), 1400);

          try {
            await apiFetch(`/api/transactions/${txId}/verify-payment`, {
              method: 'POST',
              body: {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              }
            });
            setIsProcessingPayment(false);
            setIsCheckoutOpen(false);
            setSelectedTx(null);
            await fetchTransactions();
          } catch (err: any) {
            setIsProcessingPayment(false);
            setPaymentError(err.message || 'Payment signature verification failed.');
          } finally {
            clearTimeout(t1);
            clearTimeout(t2);
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || ''
        },
        theme: {
          color: '#0a1628'
        },
        modal: {
          ondismiss: function() {
            setIsCheckoutOpen(false);
            setSelectedTx(null);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      setPaymentError(err.message || 'Failed to initialize payment gateway.');
    }
  };

  const handleReleaseMilestone = async (txId: string, milestoneIndex: number) => {
    if (!window.confirm('Are you sure you want to release this milestone payment to the inventor? This action is irreversible.')) {
      return;
    }
    try {
      await apiFetch(`/api/transactions/${txId}/milestones/${milestoneIndex}/release`, { method: 'POST' });
      await fetchTransactions();
    } catch (err: any) {
      alert(err.message || 'Failed to release milestone funds.');
    }
  };

  const handleDownloadDeed = async (txId: string, patentNumber: string) => {
    try {
      const token = localStorage.getItem('pb_token');
      const response = await fetch(`/api/transactions/${txId}/deed`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate and download the Assignment Deed.');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Deed_Assignment_${patentNumber}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to download Assignment Deed.');
    }
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  if (loading) return <div className="grid gap-4">{[1, 2].map((i) => <CardSkeleton key={i} />)}</div>;
  if (error) return <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-700 rounded-xl text-sm">{error}</div>;

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-white tracking-tight flex items-center gap-2 text-left">
            <FileKey2 className="h-6 w-6 text-primary" />
            Escrow vault
          </h1>
          <p className="text-sm text-zinc-500 mt-1 text-left">
            Milestone-based escrow — fund, release, and complete IP transfers.
          </p>
        </div>
      )}

      {transactions.length === 0 ? (
        <EmptyState
          icon={<Lock className="h-10 w-10" />}
          title="No active escrows"
          description="An escrow record is created automatically when an offer is accepted."
        />
      ) : (
        <div className="space-y-6">
          {transactions.map((tx) => {
            const isBuyer = user?.role === 'buyer';
            const isOwner = user?.role === 'owner';
            const isAdmin = user?.role === 'admin';
            
            // Calculate progress
            const releasedCount = tx.milestones.filter((m: any) => m.status === 'released').length;
            const progressPercent = Math.round((releasedCount / tx.milestones.length) * 100);

            return (
              <Card key={tx._id} className="border border-zinc-200/80 dark:border-zinc-800 shadow-md overflow-hidden bg-white dark:bg-zinc-900/60">
                {/* Header */}
                <div className="bg-zinc-50 dark:bg-zinc-800/40 p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-left">
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{tx.patentTitle}</h3>
                    <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Application/Grant Ref: {tx.patentNumber}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <span className="text-zinc-400 block text-[9px] uppercase tracking-label font-bold">Transaction Value</span>
                      <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 text-sm">{formatPrice(tx.amount)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[9px] uppercase tracking-label font-bold">Platform Fee (5%)</span>
                      <span className="font-mono font-medium text-zinc-500 dark:text-zinc-400 text-xs">{formatPrice(tx.commissionAmount)}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[9px] uppercase tracking-label font-bold">Payout Status</span>
                      <Badge 
                        variant={
                          tx.status === 'completed' 
                            ? 'success' 
                            : tx.status === 'escrow_funded' 
                              ? 'indigo' 
                              : 'warning'
                        }
                        className="text-[9px] uppercase py-0.5 font-bold"
                      >
                        {tx.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 grid md:grid-cols-[1fr_280px] gap-6 text-xs">
                  {/* Milestones list */}
                  <div className="space-y-4 text-left">
                    <h4 className="font-bold text-zinc-855 dark:text-zinc-300 uppercase tracking-label text-[10px]">Escrow Milestone Schedule</h4>
                    
                    <div className="relative border-l-2 border-zinc-200 dark:border-zinc-800 ml-3.5 pl-6 space-y-5">
                      {tx.milestones.map((m: any, idx: number) => {
                        const isReleased = m.status === 'released';
                        return (
                          <div key={idx} className="relative">
                            {/* Dot indicator */}
                            <span className={`absolute -left-10 top-0.5 flex items-center justify-center h-7 w-7 rounded-full border-2 ${
                              isReleased 
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-600' 
                                : 'bg-white dark:bg-zinc-900 border-zinc-300 text-zinc-400'
                            } text-xs font-bold font-mono shadow-premium-sm`}>
                              {idx + 1}
                            </span>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div>
                                <span className={`font-semibold text-sm ${isReleased ? 'text-zinc-500 dark:text-zinc-400 line-through' : 'text-zinc-900 dark:text-zinc-250'}`}>
                                  {m.description}
                                </span>
                                <div className="flex items-center gap-2 mt-1 text-[10px]">
                                  <span className="font-mono font-bold text-zinc-650 dark:text-zinc-400">{formatPrice(m.amount)}</span>
                                  <span className="text-zinc-400 font-medium">({m.percentage}%)</span>
                                  {m.releasedAt && (
                                    <span className="text-emerald-650 dark:text-emerald-400 font-medium font-mono">
                                      • Released {new Date(m.releasedAt).toLocaleDateString('en-IN')}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Admin custodian releases milestone payouts to inventor */}
                              {tx.status === 'escrow_funded' && !isReleased && isAdmin && (
                                <Button
                                  onClick={() => handleReleaseMilestone(tx._id, idx)}
                                  size="sm"
                                  className="bg-lvx-blue hover:bg-lvx-blue-hover text-white font-bold py-1 px-3 text-xs"
                                >
                                  Release Payout
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions & Summary Panel */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-between space-y-4 text-left">
                    <div className="space-y-4">
                      <h4 className="font-bold text-zinc-855 dark:text-zinc-300 text-[10px] uppercase">Vault Summary</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-zinc-405 text-zinc-400">Escrow Account:</span>
                          <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[140px] font-mono">
                            {tx.paymentId || 'Pending Funding'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-405 text-zinc-400">Vault Progress:</span>
                          <span className="font-bold text-zinc-800 dark:text-zinc-250">{progressPercent}%</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-zinc-200 dark:bg-zinc-850 h-2 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full premium-transition" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-405 text-zinc-400">Buyer:</span>
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">{tx.buyerName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-405 text-zinc-400">Inventor:</span>
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">{tx.ownerName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      {tx.status === 'escrow_pending' && (isBuyer || isAdmin) && (
                        <Button
                          onClick={() => { setSelectedTx(tx); setIsCheckoutOpen(true); }}
                          className="w-full bg-lvx-blue hover:bg-lvx-blue-hover text-white font-bold py-2 flex items-center justify-center gap-1.5"
                        >
                          <CreditCard className="h-4 w-4" />
                          Fund Escrow Vault
                        </Button>
                      )}
                      
                      {tx.status === 'escrow_pending' && isOwner && (
                        <div className="text-center text-amber-600 dark:text-amber-400 font-medium py-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-500/10 rounded-lg text-[10px]">
                          Awaiting buyer deposit funding...
                        </div>
                      )}

                      {tx.status === 'completed' && (
                        <Button
                          onClick={() => handleDownloadDeed(tx._id, tx.patentNumber)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 flex items-center justify-center gap-1.5"
                        >
                          <FileText className="h-4 w-4" />
                          Download Assignment Deed
                        </Button>
                      )}
                      
                      {tx.status === 'escrow_funded' && (
                        <div className="text-center text-lvx-blue font-medium py-2 bg-lvx-blue/10 border border-lvx-blue/20 rounded-lg text-[10px]">
                          {isAdmin
                            ? 'Escrow funded. Release milestones to pay the inventor.'
                            : 'Escrow funded. Awaiting PatentBridge custodian milestone release.'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Checkout Simulator Modal */}
      <Dialog 
        isOpen={isCheckoutOpen} 
        onClose={() => { if (!isProcessingPayment) { setIsCheckoutOpen(false); setSelectedTx(null); } }} 
        title="Fund Escrow Account"
      >
        {selectedTx && (
          <div className="space-y-4 text-xs text-left">
            {!isProcessingPayment ? (
              <>
                <div className="border-b border-zinc-150 dark:border-zinc-800 pb-3">
                  <p className="text-zinc-500 mb-2 leading-relaxed">
                    You are initializing payment for patent <span className="font-bold text-zinc-750 dark:text-zinc-200">"{selectedTx.patentTitle}"</span>.
                  </p>
                  <div className="bg-zinc-50 dark:bg-zinc-850 p-3 rounded-lg border border-zinc-200/60 dark:border-zinc-750 mb-2 space-y-1.5">
                    <div className="flex justify-between font-medium">
                      <span className="text-zinc-400">Total Purchase Price:</span>
                      <span className="font-mono text-zinc-900 dark:text-zinc-100 font-bold">{formatPrice(selectedTx.amount)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-400">
                      <span>Vault Custodian:</span>
                      <span>PatentBridge Escrow Services</span>
                    </div>
                  </div>
                </div>

                <div className="bg-lvx-blue/10 p-4 rounded-lg border border-lvx-blue/20 text-[11px] text-lvx-blue leading-normal flex items-start gap-2 mb-4">
                  <ShieldCheck className="h-5 w-5 shrink-0 text-lvx-blue mt-0.5" />
                  <span>This payment is powered by Razorpay Sandbox. Funds are held in the PatentBridge escrow vault until the admin releases milestone payouts to the inventor.</span>
                </div>

                {paymentError && (
                  <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded-md border border-red-200/40 text-[10px] font-semibold flex items-center gap-1.5 mb-4">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{paymentError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => { setIsCheckoutOpen(false); setSelectedTx(null); }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => handleFundEscrow(selectedTx._id)}
                    className="font-semibold text-xs px-4 bg-lvx-blue hover:bg-lvx-blue-hover text-white flex items-center gap-1.5"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Open Razorpay Gateway
                  </Button>
                </div>
              </>
            ) : (
              <div className="py-8 text-center space-y-4">
                <RefreshCw className="h-10 w-10 mx-auto text-lvx-blue animate-spin" />
                <div className="space-y-1.5">
                  <h4 className="font-bold text-zinc-800 dark:text-zinc-200">Processing Secure Escrow Deposit...</h4>
                  <div className="max-w-xs mx-auto text-[10px] text-zinc-400 font-mono space-y-1">
                    <div className={paymentStep >= 1 ? "text-lvx-blue font-bold" : ""}>
                      {paymentStep >= 1 ? "✔ Link authorized with card gateway" : "Initializing connection..."}
                    </div>
                    <div className={paymentStep >= 2 ? "text-lvx-blue font-bold" : ""}>
                      {paymentStep >= 2 ? "✔ Escrow vault ledger initialized" : "Allocating vault ledger..."}
                    </div>
                    <div className={paymentStep >= 3 ? "text-lvx-blue font-bold" : ""}>
                      {paymentStep >= 3 ? "✔ Securing funds in escrow custody" : "Finalizing vault allocation..."}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
};

// ==========================================
// 11. AccessRequestsManager Component (Owner & Admin)
// ==========================================
export const AccessRequestsManager = ({ embedded }: ManagerProps = {}) => {
  const { user } = useAuthStore();
  const [requests, setRequests] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  const fetchRequests = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/api/interactions/access-requests');
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      setProcessingId(id);
      await apiFetch(`/api/interactions/access-requests/${id}`, {
        method: 'PUT',
        body: { status }
      });
      fetchRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to update access request.');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <div className="grid gap-4">{[1, 2].map((i) => <CardSkeleton key={i} />)}</div>;

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5 text-left">
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <Lock className="h-6 w-6 text-primary" />
            Access Requests
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Approve buyers who want to unlock full IP details.</p>
        </div>
      )}

      {requests.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-10 w-10" />}
          title="No access requests"
          description="Buyers will appear here when they complete the unlock flow."
        />
      ) : (
        <div className="grid gap-4">
          {requests.map((r) => {
            const isPending = r.status === 'pending';
            return (
              <div key={r._id} className={`${cardClass} p-5`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400">{r.patentNumber}</span>
                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mt-1">{r.patentTitle}</h3>
                    <div className="mt-3 space-y-1 text-xs">
                      <p className="font-medium text-zinc-800 dark:text-zinc-200">{r.buyerName}</p>
                      <p className="text-zinc-500">{r.buyerOrganization || 'Independent'}</p>
                      <p className="text-zinc-400 font-mono">{r.buyerEmail}</p>
                    </div>
                  </div>
                  <div className="text-right space-y-2 shrink-0">
                    <Badge variant={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning'} className="text-[10px] uppercase">
                      {r.status}
                    </Badge>
                    <p className="text-[10px] text-zinc-400">{new Date(r.createdAt).toLocaleString('en-IN')}</p>
                  </div>
                </div>
                {processingId === r._id ? (
                  <p className="text-xs text-zinc-400 mt-4">Processing...</p>
                ) : isPending ? (
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(r._id, 'rejected')} className="text-xs text-red-600 border-red-200 rounded-lg">
                      Decline
                    </Button>
                    <Button size="sm" onClick={() => handleUpdateStatus(r._id, 'approved')} className="text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700">
                      Approve access
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

