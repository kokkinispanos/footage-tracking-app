import { useState } from 'react';
import { FolderUp, CheckCircle2 } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { GlassCard } from '../ui/GlassCard';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { AdminNoteField } from './AdminNoteField';

export function Section5Drive({ adminMode, overrideData }) {
  const context = usePlayer();
  const playerData = adminMode ? overrideData : context.playerData;
  const updatePlayerState = adminMode ? () => {} : context.updatePlayerState;

  const [isEditing, setIsEditing] = useState(false);
  const [tempLink, setTempLink] = useState('');

  const driveLink = playerData?.driveFolder?.link || '';
  const isFilled = driveLink.trim().length > 0;

  const handleEdit = () => {
    setTempLink(driveLink);
    setIsEditing(true);
  };

  const handleSave = () => {
    updatePlayerState(prev => ({
      ...prev,
      driveFolder: { link: tempLink }
    }));
    setIsEditing(false);
  };

  return (
    <GlassCard className="space-y-6 relative overflow-hidden">
      <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-brand/10 blur-3xl rounded-full pointer-events-none" />

      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FolderUp className="w-5 h-5 text-brand" />
          5. Master Google Drive Folder
        </h2>
        <p className="text-sm text-gray-400 mt-1 max-w-2xl">
          Everything must be compiled into a single, organized Google Drive folder. Paste the top-level shared link here. Ensure permissions are set to 'Anyone with the link can view'.
        </p>
      </div>

      <div className="bg-black/30 border border-white/10 rounded-xl p-6">
        {!adminMode && isEditing ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <Input 
              value={tempLink}
              onChange={(e) => setTempLink(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className="flex-1"
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={handleSave}>Save Link</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 pr-4">
                {isFilled ? (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-5 h-5 text-success" />
                      <span className="font-semibold text-white">Drive Linked Successfully</span>
                    </div>
                    <a href={driveLink} target="_blank" rel="noreferrer" className="text-brand-light hover:underline text-sm break-all">
                      {driveLink}
                    </a>
                  </div>
                ) : (
                  <div>
                    <span className="font-semibold text-white block mb-1">No Drive Link Provided</span>
                    <span className="text-sm text-gray-500">Add the link once your folder structure matches the guide.</span>
                  </div>
                )}
              </div>
              
              {!adminMode && (
                <Button variant={isFilled ? "secondary" : "primary"} onClick={handleEdit}>
                  {isFilled ? 'Update Link' : 'Add Drive Link'}
                </Button>
              )}
            </div>
            
            {adminMode && (
               <AdminNoteField 
                 playerId={playerData.uid} 
                 noteKey={`master_drive`} 
                 initialValue={playerData.adminNotes?.perClip?.master_drive || ''}
               />
            )}
          </div>
        )}
      </div>
      
      <div className="bg-brand/5 border border-brand/20 rounded-lg p-4 mt-4">
        <h4 className="text-sm font-semibold text-brand-light mb-2">Required Subfolder Structure:</h4>
        <ul className="text-xs text-brand-light/70 space-y-1 list-disc list-inside">
          <li>01_Full_Games</li>
          <li>02_Top_3_Clips</li>
          <li>03_Skill_Clips_Shorts</li>
          <li>04_Player_Profile_Resume (PDF format)</li>
          <li>05_Photos</li>
        </ul>
      </div>
    </GlassCard>
  );
}
