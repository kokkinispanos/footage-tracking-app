import { CheckCircle2, UserCircle, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { Button } from '../components/ui/Button';

import { Section1FullGames } from '../components/dashboard/Section1FullGames';
import { Section2TopClips } from '../components/dashboard/Section2TopClips';
import { Section3SkillClips } from '../components/dashboard/Section3SkillClips';
import { Section4Photos } from '../components/dashboard/Section4Photos';
import { Section5Drive } from '../components/dashboard/Section5Drive';

export function Dashboard() {
  const { logout } = useAuth();
  const { playerData, loading, saveStatus } = usePlayer();

  if (loading || !playerData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
        <p className="text-gray-400 mt-4">Loading your dashboard...</p>
      </div>
    );
  }

  // Calculate generic progress
  const skillClipsCount = Object.values(playerData.skillClips || {}).reduce((acc, arr) => acc + (arr?.length || 0), 0);
  const clipsAdded = playerData.fullGames.length + playerData.topThreeClips.length + skillClipsCount;
  const targetClips = 30;
  const progressPercent = Math.min(100, Math.round((clipsAdded / targetClips) * 100));

  return (
    <div className="min-h-screen bg-background text-white pb-24">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight">Pro Placement</h1>
            
            {/* Save Status Indicator */}
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1.5 text-xs text-brand-light animate-pulse bg-brand/10 px-2 py-0.5 rounded-full">
                <Loader2 className="w-3 h-3 animate-spin"/> Saving
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1.5 text-xs text-success animate-fadeIn bg-success/10 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3"/> Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-xs text-error bg-error/10 px-2 py-0.5 rounded-full">Save Error</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="hidden sm:flex gap-2">
              <UserCircle className="w-4 h-4" />
              {playerData.profile.fullName}
            </Button>
            <Button variant="ghost" size="sm" onClick={logout} className="text-gray-400 hover:text-error">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pt-8 space-y-8">
        {/* Welcome & Progress Area */}
        <section className="animate-fadeIn">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {playerData.profile.fullName.split(' ')[0]}</h2>
          <p className="text-gray-400 mb-6">Let's get your footage ready for the scouts.</p>
          
          <div className="bg-surface border border-white/5 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex justify-between text-sm font-medium mb-3 relative z-10">
              <span className="text-gray-300">Overall Progress</span>
              <span className="text-brand-light">{clipsAdded} of {targetClips} clips submitted</span>
            </div>
            {/* Progress Bar Track */}
            <div className="h-3 bg-black/40 rounded-full overflow-hidden relative z-10">
              <div 
                className="h-full bg-gradient-to-r from-brand-dark to-brand transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {/* Decorative background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          </div>
        </section>

        {/* The 5 Guided Sections */}
        <div className="space-y-6">
          <Section1FullGames />
          <Section2TopClips />
          <Section3SkillClips />
          <Section4Photos />
          <Section5Drive />
        </div>
      </main>
    </div>
  );
}
