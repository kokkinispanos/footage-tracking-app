import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { readableAuthError } from '../services/auth';
import { AuthLayout } from '../components/ui/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';
import { POSITIONS } from '../utils/catalog';

const MIN_PASSWORD = 8;

export function SignUp() {
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', position: POSITIONS[0],
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const change = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const longEnough = form.password.length >= MIN_PASSWORD;

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) return setError('Type your full name.');
    if (!longEnough) return setError(`Your password needs at least ${MIN_PASSWORD} characters.`);

    setError('');
    setLoading(true);
    try {
      await register(form);
      // The router takes it from here once Firebase reports the new user.
    } catch (err) {
      setError(readableAuthError(err));
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="One place for everything about you. Your games, your papers, your numbers."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-brand-light hover:underline font-medium">Sign in</Link>
        </>
      }
    >
      <form onSubmit={handleSignup} className="space-y-4" noValidate>
        <Input
          label="Full name"
          name="fullName"
          autoComplete="name"
          value={form.fullName}
          onChange={change}
          required
          placeholder="Spell it like your passport does"
        />

        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={form.email}
          onChange={change}
          required
          placeholder="you@example.com"
          hint="Use one you actually check. Everything comes here."
        />

        <div>
          <Input
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={form.password}
            onChange={change}
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
          <div className={cn(
            "flex items-center gap-1.5 text-xs mt-2 transition-colors",
            longEnough ? "text-success" : "text-ink-faint"
          )}>
            <Check className={cn("w-3.5 h-3.5", !longEnough && "opacity-40")} />
            At least {MIN_PASSWORD} characters
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="position" className="text-[13px] font-medium text-ink-muted">
            Main position
          </label>
          <select
            id="position"
            name="position"
            value={form.position}
            onChange={change}
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-ink
                       focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/60 transition-all"
          >
            {POSITIONS.map((p) => (
              <option key={p} value={p} className="bg-elevated text-ink">{p}</option>
            ))}
          </select>
          <span className="text-xs text-ink-faint">
            This changes which skill clips we ask you for. You can change it later.
          </span>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 text-sm text-error bg-error/10 border border-error/20 px-3 py-2.5 rounded-xl">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-none" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {loading ? 'Creating your account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
}
