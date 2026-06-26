import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { useAuthStore } from './context/authStore';
import { useThemeStore } from './context/themeStore';
import { Navbar } from './layouts/Navbar';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LandingPage } from './pages/LandingPage';
import { Marketplace } from './pages/Marketplace';
import { PatentDetail } from './pages/PatentDetail';
import { AuthPage } from './pages/AuthPage';
import { 
  DashboardOverview, PortfolioManager, BookmarksManager, 
  LeadsManager, MeetingsManager, ReviewsManager, UsersManager, AuditsManager,
  NegotiationsManager, EscrowManager, AccessRequestsManager
} from './pages/Dashboards';

// Layout wrapping Navbar on standard exploration pages
const AppLayout = () => (
  <div className="flex flex-col min-h-screen">
    <Navbar />
    <div className="flex-1">
      <Outlet />
    </div>
  </div>
);

export default function App() {
  const initializeAuth = useAuthStore(state => state.initialize);
  const initializeTheme = useThemeStore(state => state.initializeTheme);

  // Run auto-login and theme verification on mount
  React.useEffect(() => {
    initializeAuth();
    initializeTheme();
  }, [initializeAuth, initializeTheme]);

  return (
    <Router>
      <div className="font-sans text-foreground antialiased">
      <Routes>
        {/* Core Exploration Routes */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/marketplace/:id" element={<PatentDetail />} />
          <Route path="/auth" element={<AuthPage />} />
        </Route>

        {/* Dashboard Nested Routes */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardOverview />} />
          <Route path="portfolio" element={<PortfolioManager />} />
          <Route path="bookmarks" element={<BookmarksManager />} />
          <Route path="leads" element={<LeadsManager />} />
          <Route path="negotiations" element={<NegotiationsManager />} />
          <Route path="meetings" element={<MeetingsManager />} />
          <Route path="reviews" element={<ReviewsManager />} />
          <Route path="users" element={<UsersManager />} />
          <Route path="audits" element={<AuditsManager />} />
          <Route path="escrow" element={<EscrowManager />} />
          <Route path="access-requests" element={<AccessRequestsManager />} />
        </Route>
      </Routes>
      </div>
    </Router>
  );
}
