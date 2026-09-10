import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { readableAuthError } from '../services/auth';
import { AuthLayout } from '../components/ui/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  // No navigate() here on purpose: signing in changes the Firebase user, and the router
  // sends the player to the right place on its own. One source of truth, no race.
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(readableAuthError(err));
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your hub."
      footer={
        <>
          New to the program?{' '}
          <Link to="/signup" className="text-brand-light hover:underline font-medium">
            Create your account
          </Link>
        </>
      }
    >
      <form onSubmit={handleLogin} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="p-2 text-ink-faint hover:text-ink transition-colors rounded-lg"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />

        <div className="flex justify-end -mt-1">
          <Link to="/forgot-password" className="text-[13px] text-ink-muted hover:text-brand-light transition-colors">
            Forgot your password?
          </Link>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 text-sm text-error bg-error/10 border border-error/20 px-3 py-2.5 rounded-xl">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-none" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  );
}
