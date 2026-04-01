import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

const POSITIONS = [
  "Goalkeeper",
  "Center Back",
  "Full Back / Wing Back",
  "Defensive Midfielder",
  "Central Midfielder",
  "Attacking Midfielder",
  "Winger",
  "Striker"
];

export function SignUp() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    position: POSITIONS[0]
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(formData.fullName, formData.email, formData.password, formData.position);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white tracking-tight">Register</h2>
          <p className="text-sm text-gray-400 mt-1">Join the Pro Placement Program</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <Input 
            label="Full Name" 
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required 
            placeholder="e.g. Kwame Mensah"
          />
          <Input 
            label="Email Address" 
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required 
            placeholder="player@example.com"
          />
          <Input 
            label="Password (min 6 chars)" 
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required 
            placeholder="••••••••"
          />
          
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-300">Primary Position</label>
            <select 
              name="position"
              value={formData.position}
              onChange={handleChange}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand"
            >
              {POSITIONS.map(pos => (
                <option key={pos} value={pos} className="bg-background text-white">{pos}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-error text-sm text-center bg-error/10 py-2 rounded">{error}</p>}

          <Button type="submit" className="w-full mt-2" disabled={loading}>
            {loading ? 'Registering...' : 'Create Account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already registered? <Link to="/login" className="text-brand-light hover:underline ml-1">Log in</Link>
        </p>
      </GlassCard>
    </div>
  );
}
