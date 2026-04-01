import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Construction } from 'lucide-react';

export function AdminWait() {
  const { logout } = useAuth();
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-brand/20 flex items-center justify-center">
            <Construction className="w-8 h-8 text-brand-light" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">Admin Dashboard</h2>
        <h3 className="text-sm text-brand-light uppercase tracking-widest font-semibold mb-6">Under Construction</h3>
        
        <p className="text-gray-300 mb-8 text-sm">
          The Admin view is currently being built in Phase 2. Once completed, you will be able to see all players, review their clips, and leave administrative notes here.
        </p>

        <Button onClick={logout} variant="outline" className="w-full">
          Sign out
        </Button>
      </GlassCard>
    </div>
  );
}
