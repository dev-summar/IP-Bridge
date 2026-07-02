import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './context/authStore';
import { useThemeStore } from './context/themeStore';
import { Navbar } from './layouts/Navbar';
import { PageTransition } from './components/motion/PageTransition';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LandingPage } from './pages/LandingPage';
import { Marketplace } from './pages/Marketplace';
import { PatentDetail } from './pages/PatentDetail';
import { AuthPage } from './pages/AuthPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { AboutUsPage } from './pages/AboutUsPage';
import { PricingPage } from './pages/PricingPage';
import { ListIPPage } from './pages/ListIPPage';
import { DealRoom } from './pages/DealRoom';
import { DashboardHome } from './pages/DashboardHome';
import { BuyerRequestsPage } from './pages/BuyerRequestsPage';
import { DealsHub } from './pages/DealsHub';
import { RevenuePage } from './pages/RevenuePage';
import { ReportsPage } from './pages/ReportsPage';
import {
  AssetsPage,
  AccessRequestsPage,
  NegotiationsPage,
  ListingsPage,
  UsersPage,
  EscrowPage,
  MeetingsPage,
  SavedIPPage,
} from './pages/dashboard/DashboardPages';

const AppLayout = () => (
  <div className="flex flex-col min-h-screen bg-white dark:bg-zinc-950">
    <Navbar />
    <main className="flex-1">
      <PageTransition />
    </main>
  </div>
);

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const initializeTheme = useThemeStore((state) => state.initializeTheme);

  React.useEffect(() => {
    initializeAuth();
    initializeTheme();
  }, [initializeAuth, initializeTheme]);

  return (
    <Router>
      <div className="font-sans text-foreground antialiased">
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/discover" element={<Marketplace />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/marketplace/:id" element={<PatentDetail />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/about" element={<AboutUsPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/list-ip" element={<ListIPPage />} />
            <Route path="/auth" element={<AuthPage />} />
          </Route>

          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            {/* Buyer */}
            <Route path="requests" element={<BuyerRequestsPage />} />
            <Route path="meetings" element={<MeetingsPage />} />
            <Route path="saved" element={<SavedIPPage />} />
            <Route path="deals" element={<DealsHub />} />
            <Route path="deals/completed" element={<DealsHub completedOnly />} />
            <Route path="deals/:id" element={<DealRoom />} />
            {/* Inventor */}
            <Route path="assets" element={<AssetsPage />} />
            <Route path="access-requests" element={<AccessRequestsPage />} />
            <Route path="negotiations" element={<NegotiationsPage />} />
            <Route path="revenue" element={<RevenuePage />} />
            {/* Admin */}
            <Route path="users" element={<UsersPage />} />
            <Route path="listings" element={<ListingsPage />} />
            <Route path="escrow" element={<EscrowPage />} />
            <Route path="reports" element={<ReportsPage />} />
            {/* Legacy redirects */}
            <Route path="portfolio" element={<Navigate to="/dashboard/assets" replace />} />
            <Route path="bookmarks" element={<Navigate to="/dashboard/saved" replace />} />
            <Route path="leads" element={<Navigate to="/dashboard/requests" replace />} />
            <Route path="reviews" element={<Navigate to="/dashboard/listings" replace />} />
            <Route path="audits" element={<Navigate to="/dashboard/reports" replace />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}
