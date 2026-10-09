import { useEffect, useState } from 'react';
import type { TabName, UserRole } from './types';
import { ThemeProvider } from './contexts/ThemeContext';
import { DataProvider } from './contexts/DataContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { IndexPage } from './pages/IndexPage';
import { RequestPage } from './pages/RequestPage';
import { SharePage } from './pages/SharePage';
import { CommunityPage } from './pages/CommunityPage';
import { LoginPage } from './pages/LoginPage';
import { AdminPage } from './pages/AdminPage';
import { getCurrentUser, setSession, logoutUser } from './services/auth';

const TABS: TabName[] = ['INDEX', 'REQUEST', 'SHARE', 'COMMUNITY'];
const ADMIN_TABS: TabName[] = ['INDEX', 'REQUEST', 'SHARE', 'COMMUNITY', 'ADMIN'];

function readHash(): TabName {
  const raw = window.location.hash.replace('#/', '').toUpperCase();
  return TABS.includes(raw as TabName) ? (raw as TabName) : 'INDEX';
}

function checkAuth(): { isLoggedIn: boolean; role: UserRole } {
  const user = getCurrentUser();
  if (user) {
    return { isLoggedIn: true, role: user.role };
  }
  return { isLoggedIn: false, role: 'user' };
}

function Shell() {
  const [tab, setTab] = useState<TabName>(readHash);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [role, setRole] = useState<UserRole>('user');

  useEffect(() => {
    const auth = checkAuth();
    setIsLoggedIn(auth.isLoggedIn);
    setRole(auth.role);
  }, []);

  useEffect(() => {
    const onHash = () => setTab(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (next: TabName) => {
    setTab(next);
    window.location.hash = `/${next.toLowerCase()}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogin = (userRole: UserRole) => {
    const user = getCurrentUser();
    if (user) {
      setSession(user.email, userRole);
    }
    setIsLoggedIn(true);
    setRole(userRole);
    navigate(userRole === 'admin' ? 'ADMIN' : 'INDEX');
  };

  const handleLogout = () => {
    logoutUser();
    setIsLoggedIn(false);
    setRole('user');
    window.location.hash = '#/login';
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const tabs = role === 'admin' ? ADMIN_TABS : TABS;
  const validTab = tabs.includes(tab) ? tab : (role === 'admin' ? 'ADMIN' : 'INDEX');

  return (
    <div className="flex min-h-screen flex-col">
      <Header active={validTab} onNavigate={navigate} onLogout={handleLogout} role={role} />

      <main className="flex-1">
        {validTab === 'INDEX' && <IndexPage />}
        {validTab === 'REQUEST' && <RequestPage role={role} />}
        {validTab === 'SHARE' && <SharePage role={role} />}
        {validTab === 'COMMUNITY' && <CommunityPage onNavigate={navigate} />}
        {validTab === 'ADMIN' && <AdminPage />}
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <Shell />
      </DataProvider>
    </ThemeProvider>
  );
}
