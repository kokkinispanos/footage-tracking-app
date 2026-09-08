import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, MailCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { readableAuthError } from '../services/auth';
import { AuthLayout } from '../components/ui/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { sendReset } = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendReset(email);
      setSent(true);
    } catch (err) {
      // "No such user" is deliberately not reported: telling a stranger which emails
      // have accounts is a way to find out who our clients are.
      if (err?.code === 'auth/user-not-found') setSent(true);
      else setError(readableAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle={`If there is an account for ${email}, a link to set a new password is on its way. It can take a minute, and it may land in spam.`}
        footer={<Link to="/login" className="text-brand-light hover:underline font-medium">Back to sign in</Link>}
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-14 h-14 rounded-2xl bg-success/10 border border-success/25 flex items-center justify-center mb-4">
            <MailCheck className="w-6 h-6 text-success" />
          </div>
          <p className="text-sm text-ink-muted leading-relaxed">
            Open the link on the same phone or computer, choose a new password, then come back and sign in.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Type your email and we will send you a link to set a new one."
      footer={<Link to="/login" className="text-brand-light hover:underline font-medium">Back to sign in</Link>}
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
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

        {error && (
          <div role="alert" className="flex items-start gap-2 text-sm text-error bg-error/10 border border-error/20 px-3 py-2.5 rounded-xl">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-none" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          {loading ? 'Sending…' : 'Send the link'}
        </Button>
      </form>
    </AuthLayout>
  );
}
