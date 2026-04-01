import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileJson } from 'lucide-react';
import { dbService } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';

// Import all sections for the readonly view
import { Section1FullGames } from '../components/dashboard/Section1FullGames';
import { Section2TopClips } from '../components/dashboard/Section2TopClips';
import { Section3SkillClips } from '../components/dashboard/Section3SkillClips';
import { Section4Photos } from '../components/dashboard/Section4Photos';
import { Section5Drive } from '../components/dashboard/Section5Drive';

export function AdminPlayerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generalNotes, setGeneralNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const allPlayers = await dbService.getAllPlayers();
      const player = allPlayers.find(p => p.uid === id);
      if (player) {
        setPlayerData(player);
        setGeneralNotes(player.adminNotes?.general || '');
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const handleExportData = () => {
    if (!playerData) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(playerData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${playerData.profile?.fullName?.replace(/\s+/g, '_') || 'player'}_data.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleSaveGeneralNotes = async () => {
    setIsSaving(true);
    try {
      await dbService.updateAdminNotes(playerData.uid, { general: generalNotes });
      setSaveStatus('Saved!');
      setTimeout(() => setSaveStatus(''), 2000);
    } catch (e) {
      setSaveStatus('Error');
    }
    setIsSaving(false);
  };

  if (loading) {
     return <div className="min-h-screen bg-background flex justify-center items-center"><div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full" /></div>;
  }

  if (!playerData) {
     return (
       <div className="min-h-screen bg-background p-10 text-white flex flex-col items-center">
         <h2>Player not found</h2>
         <Button onClick={() => navigate('/admin')}>Go Back</Button>
       </div>
     );
  }

  return (
    <div className="min-h-screen bg-background text-white pb-20">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          
          <Button onClick={handleExportData} size="sm" variant="outline" className="gap-2">
            <FileJson className="w-4 h-4" /> Export JSON
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8">
        <div className="mb-8 flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              {playerData.profile?.fullName || 'Unnamed Player'}
            </h1>
            <p className="text-gray-400 mt-1">{playerData.profile?.email} | {playerData.profile?.position}</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          <div className="flex-1 space-y-8">
            <h2 className="text-xl font-bold text-white border-b border-white/10 pb-2">Player Dashboard (Read-Only)</h2>
            <Section1FullGames adminMode={true} overrideData={playerData} />
            <Section2TopClips adminMode={true} overrideData={playerData} />
            <Section3SkillClips adminMode={true} overrideData={playerData} />
            <Section4Photos adminMode={true} overrideData={playerData} />
            <Section5Drive adminMode={true} overrideData={playerData} />
          </div>

          <div className="w-full lg:w-96 flex-shrink-0">
            <div className="sticky top-24 bg-black/40 border border-brand/20 rounded-xl p-6 flex flex-col h-[calc(100vh-120px)]">
              <h2 className="text-lg font-bold text-white mb-4">General Player Notes</h2>
              <p className="text-xs text-brand-light/70 mb-4">
                These notes are strictly internal and visible only to admins. 
                Use this to keep track of communications, physical metrics, scout feedback, or overall placement strategy.
              </p>
              
              <textarea 
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Type general notes here..."
                className="w-full flex-1 bg-black/50 border border-white/10 rounded-lg p-4 text-sm text-gray-200 resize-none focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              />
              
              <div className="mt-4 flex items-center justify-between">
                <span className={`text-sm ${saveStatus === 'Error' ? 'text-red-400' : 'text-success'} transition-opacity ${saveStatus ? 'opacity-100' : 'opacity-0'}`}>
                  {saveStatus}
                </span>
                <Button onClick={handleSaveGeneralNotes} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save General Notes'}
                </Button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
