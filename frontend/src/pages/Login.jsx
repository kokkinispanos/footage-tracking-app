import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      // Wait for auth to complete then navigate
      const session = JSON.parse(localStorage.getItem('auth_session'));
      if (session?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-md">
        <div className="text-center mb-8 animate-fadeIn">
          <h1 className="text-2xl font-bold text-white tracking-tight">Pro Placement Program</h1>
          <p className="text-sm text-brand-light mt-1 uppercase tracking-widest font-semibold">Footage Tracker</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input 
            label="Email" 
            type="email" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            required 
            placeholder="player@example.com"
          />
          <Input 
            label="Password" 
            type="password" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            required 
            placeholder="••••••••"
          />

          {error && <p className="text-error text-sm text-center bg-error/10 py-2 rounded">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Entering...' : 'Log In'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Not in the program? <Link to="/signup" className="text-brand-light hover:underline ml-1">Register here</Link>
        </p>

        {/* Admin Toggle */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <button 
            type="button"
            onClick={() => { setEmail('admin@admin.com'); setPassword('adminpw123'); }}
            className="text-xs text-brand-dark/50 hover:text-brand-light transition-colors cursor-pointer"
          >
            Admin Access (Auto-fill)
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
