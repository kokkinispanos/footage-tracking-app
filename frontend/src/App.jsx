import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { ForgotPassword } from './pages/ForgotPassword';
import { Dashboard } from './pages/Dashboard';
import { AdminOverview } from './pages/AdminOverview';
import { AdminPlayerDetail } from './pages/AdminPlayerDetail';
import { Splash } from './components/ui/Splash';

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
          <Routes>
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/signup" element={<PublicOnly><SignUp /></PublicOnly>} />
            <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />

            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />

            <Route path="/admin" element={<Protected adminOnly><AdminOverview /></Protected>} />
            <Route path="/admin/player/:id" element={<Protected adminOnly><AdminPlayerDetail /></Protected>} />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </PlayerProvider>
    </AuthProvider>
  );
}

export default App;
