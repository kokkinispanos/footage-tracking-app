import { useState } from 'react';
import { Image as ImageIcon, Check } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { GlassCard } from '../ui/GlassCard';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { AdminNoteField } from './AdminNoteField';

const PHOTO_TYPES = [
  { key: 'cleanKit', label: 'Clean Kit & Boots (Full Body)', desc: 'Full length, standing straight, professional look.' },
  { key: 'actionShot', label: 'Action Shot', desc: 'In-game high quality shot showing intensity.' },
  { key: 'training', label: 'Training Environment', desc: 'At training, interacting with ball or coach.' },
  { key: 'headshot', label: 'Headshot / Portrait', desc: 'Looking confident, good lighting.' },
  { key: 'teamPhoto', label: 'Team Photo / Starting XI', desc: 'Highlight yourself in the photo.' },
  { key: 'lifestyle', label: 'Lifestyle / Casual', desc: 'Professional off-pitch demeanor.' }
];

export function Section4Photos({ adminMode, overrideData }) {
  const context = usePlayer();
  const playerData = adminMode ? overrideData : context.playerData;
  const updatePlayerState = adminMode ? () => {} : context.updatePlayerState;

  const [editingKey, setEditingKey] = useState(null);
  const [tempLink, setTempLink] = useState('');

  const photos = playerData?.photos || {};

  const handleEdit = (key) => {
    setTempLink(photos[key]?.link || '');
    setEditingKey(key);
  };

  const handleSave = (key) => {
    updatePlayerState(prev => ({
      ...prev,
      photos: {
        ...prev.photos,
        [key]: { link: tempLink }
      }
    }));
    setEditingKey(null);
  };

  return (
    <GlassCard className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-brand" />
          4. Professional Photography
        </h2>
        <p className="text-sm text-gray-400 mt-1 max-w-2xl">
          Provide links to high-resolution images. Visual presentation matters immensely. Ensure you have the rights to use these images.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PHOTO_TYPES.map((type) => {
          const currentLink = photos[type.key]?.link || '';
          const isFilled = currentLink.trim().length > 0;
          const isEditing = editingKey === type.key;

          return (
            <div key={type.key} className="bg-black/20 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
              <div className="mb-4">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-white text-sm">{type.label}</h3>
                  {isFilled && !isEditing && <Check className="w-4 h-4 text-success" />}
                </div>
                <p className="text-xs text-gray-500">{type.desc}</p>
              </div>

              {!adminMode && isEditing ? (
                <div className="flex gap-2">
                  <Input 
                    value={tempLink}
                    onChange={(e) => setTempLink(e.target.value)}
                    placeholder="https:// image link..."
                    className="flex-1"
                    autoFocus
                  />
                  <Button size="sm" onClick={() => handleSave(type.key)}>Save</Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center bg-black/40 rounded border border-white/5 px-3 py-2">
                    <span 
                      className={`text-sm truncate mr-2 ${isFilled ? 'text-brand-light hover:underline cursor-pointer' : 'text-gray-600'}`} 
                      onClick={() => {if(isFilled) window.open(currentLink, '_blank')}}
                    >
                      {isFilled ? currentLink : 'No link added'}
                    </span>
                    {!adminMode && (
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(type.key)} className="text-xs px-2 h-7 py-0">
                        {isFilled ? 'Edit' : 'Add Link'}
                      </Button>
                    )}
                  </div>
                  {adminMode && (
                    <div className="mt-2">
                      <AdminNoteField 
                        playerId={playerData.uid} 
                        noteKey={`photo_${type.key}`} 
                        initialValue={playerData.adminNotes?.perClip?.[`photo_${type.key}`] || ''}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
