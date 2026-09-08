import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { ForgotPassword } from './pages/ForgotPassword';
import { Dashboard } from './pages/Dashboard';
import { Splash } from './components/ui/Splash';

// Split out of the first download. A player never opens the admin screens, and he reaches
// his account page rarely — no reason to make him wait for either on a phone at a ground.
const Account = lazy(() => import('./pages/Account').then((m) => ({ default: m.Account })));
const AdminOverview = lazy(() => import('./pages/AdminOverview').then((m) => ({ default: m.AdminOverview })));
const AdminPlayerDetail = lazy(() => import('./pages/AdminPlayerDetail').then((m) => ({ default: m.AdminPlayerDetail })));

/** Signed out -> the login screen. Signed in as the wrong kind of user -> their own home. */
function Protected({ children, adminOnly = false }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (!adminOnly && isAdmin) return <Navigate to="/admin" replace />;

  return children;
}

/** Already signed in? Skip the login screen. */
function PublicOnly({ children }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <Splash />;
  if (user) return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <BrowserRouter>
          <Suspense fallback={<Splash />}>
            <Routes>
              <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
              <Route path="/signup" element={<PublicOnly><SignUp /></PublicOnly>} />
              <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />

              <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
              <Route path="/account" element={<Protected><Account /></Protected>} />

              <Route path="/admin" element={<Protected adminOnly><AdminOverview /></Protected>} />
              <Route path="/admin/player/:id" element={<Protected adminOnly><AdminPlayerDetail /></Protected>} />

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </PlayerProvider>
    </AuthProvider>
  );
}

export default App;
