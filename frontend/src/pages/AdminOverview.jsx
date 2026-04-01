import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, LogOut, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { dbService } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/ui/GlassCard';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

// Utility to calculate completion correctly per player
const calculatePlayerCompletion = (playerData) => {
  let count = 0;
  let totalTarget = 20;

  // Games
  const games = playerData?.fullGames?.length || 0;
  count += Math.min(games, 5);

  // Top Clips
  const topClips = playerData?.topThreeClips?.length || 0;
  count += Math.min(topClips, 3);

  // Skill Clips
  let skillCount = 0;
  Object.values(playerData?.skillClips || {}).forEach(arr => {
     skillCount += (arr.length || 0);
  });
  count += Math.min(skillCount, 15);

  // Photos
  const photos = Object.values(playerData?.photos || {}).filter(item => item?.link?.trim() !== '').length;
  count += Math.min(photos, 6);

  totalTarget = 30; // same as Phase 1 Dashboard logic (5+3+15+6+1)
  if(playerData?.driveFolder?.link?.trim()) count += 1;

  const percent = Math.min(Math.round((count / totalTarget) * 100), 100);
  
  let color = 'bg-red-500';
  if (percent >= 33 && percent < 66) color = 'bg-amber-500';
  if (percent >= 66) color = 'bg-green-500';
  
  return {
    count,
    totalTarget,
    percent,
    color,
    checks: {
      games: games > 0,
      topClips: topClips === 3,
      skillClips: skillCount > 0,
      photos: photos === 6,
      drive: (playerData?.driveFolder?.link || '').trim() !== ''
    }
  };
};

export function AdminOverview() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtering / Sorting State
  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    const fetchPlayers = async () => {
      const allPlayers = await dbService.getAllPlayers();
      const enriched = allPlayers.map(p => ({
        ...p,
        stats: calculatePlayerCompletion(p)
      }));
      setPlayers(enriched);
      setLoading(false);
    };
    fetchPlayers();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredAndSorted = players
    .filter(p => !search || p.profile?.fullName?.toLowerCase().includes(search.toLowerCase()))
    .filter(p => !positionFilter || p.profile?.position === positionFilter)
    .sort((a, b) => {
      if (sortBy === 'newest') return (b.profile?.createdAt || 0) - (a.profile?.createdAt || 0);
      if (sortBy === 'az') return (a.profile?.fullName || '').localeCompare(b.profile?.fullName || '');
      if (sortBy === 'most_complete') return b.stats.percent - a.stats.percent;
      if (sortBy === 'least_complete') return a.stats.percent - b.stats.percent;
      return 0;
    });

  const positions = [...new Set(players.map(p => p.profile?.position).filter(Boolean))];

  return (
    <div className="min-h-screen bg-background text-white pb-20">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-brand-light to-brand bg-clip-text text-transparent">
              Pro Placement Admin
            </h1>
            <span className="hidden sm:inline-block bg-brand/20 text-brand-light text-xs font-bold px-2.5 py-1 rounded-full">
              {players.length} Players Registered
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-400 hover:text-white">
            <LogOut className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-10">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="Search by player name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand"
            />
          </div>
          <div className="flex gap-4">
            <select 
              value={positionFilter} 
              onChange={e => setPositionFilter(e.target.value)}
              className="px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand shrink-0"
            >
              <option value="">All Positions</option>
              {positions.map(pos => <option key={pos} value={pos}>{pos}</option>)}
            </select>
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)}
              className="px-4 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand shrink-0"
            >
              <option value="newest">Newest First</option>
              <option value="az">Name (A-Z)</option>
              <option value="most_complete">Most Complete</option>
              <option value="least_complete">Least Complete</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-20">
            <div className="animate-spin w-8 h-8 rounded-full border-4 border-brand border-t-brand-light"></div>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <GlassCard className="p-12 text-center flex flex-col items-center">
            <h3 className="text-xl font-bold text-white mb-2">No players found</h3>
            <p className="text-gray-400">
              {search || positionFilter ? "Try clearing your filters." : "No players registered yet. Players will appear here once they create an account."}
            </p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSorted.map(player => (
              <GlassCard 
                key={player.uid} 
                className="group cursor-pointer hover:border-brand/40 hover:shadow-lg hover:shadow-brand/10 transition-all p-0 flex flex-col overflow-hidden relative"
                onClick={() => navigate(`/admin/player/${player.uid}`)}
              >
                <div className="h-1.5 w-full bg-white/5 relative">
                  <div className={`absolute top-0 left-0 h-full ${player.stats.color} transition-all`} style={{width: `${player.stats.percent}%`}} />
                </div>
                
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-brand-light transition-colors">{player.profile?.fullName || 'Unknown Player'}</h3>
                      <p className="text-xs text-gray-500">{player.profile?.email}</p>
                    </div>
                    <span className="bg-brand/10 text-brand-light font-semibold text-xs px-2 py-1 rounded">
                      {player.profile?.position}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-2xl font-bold">{player.stats.count}</span>
                    <span className="text-xs text-gray-500 uppercase font-medium leading-tight">Total<br/>Items</span>
                  </div>

                  <div className="mt-auto grid grid-cols-5 gap-1 border-t border-white/5 pt-4">
                    <SectionIcon title="Full Games" status={player.stats.checks.games} />
                    <SectionIcon title="Top 3" status={player.stats.checks.topClips} />
                    <SectionIcon title="Skills" status={player.stats.checks.skillClips} />
                    <SectionIcon title="Photos" status={player.stats.checks.photos} />
                    <SectionIcon title="Drive" status={player.stats.checks.drive} />
                  </div>
                </div>
                
                <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                  <ArrowRight className="w-5 h-5 text-brand" />
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function SectionIcon({ title, status }) {
  return (
    <div className="flex flex-col items-center gap-1" title={title}>
      {status ? (
        <CheckCircle2 className="w-4 h-4 text-green-500" />
      ) : (
        <XCircle className="w-4 h-4 text-white/10" />
      )}
      <span className="text-[10px] text-gray-500">{title.split(' ')[0]}</span>
    </div>
  );
}
