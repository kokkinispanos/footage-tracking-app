import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Film, Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { AdminNoteField } from './AdminNoteField';

const FIELD_PLAYER_CATEGORIES = [
  { key: 'passing', label: 'Passing & Vision' },
  { key: 'dribbling', label: 'Dribbling & 1v1 Attacking' },
  { key: 'defending', label: 'Defending & 1v1 Defensive' },
  { key: 'finishing', label: 'Finishing / Ball Striking' },
  { key: 'movement', label: 'Movement Off the Ball' },
  { key: 'pressing', label: 'Pressing & Hustle' },
  { key: 'aerial', label: 'Aerial Duels' },
  { key: 'other', label: 'Other Skills' }
];

const GK_CATEGORIES = [
  { key: 'saves', label: 'Shot Stopping / Saves' },
  { key: 'distribution', label: 'Distribution (Hands & Feet)' },
  { key: 'commandingTheBox', label: 'Commanding the Box / Crosses' },
  { key: '1v1Situations', label: '1v1 Situations / Sweeping' },
  { key: 'organizingDefense', label: 'Communication / Organizing' }
];

export function Section3SkillClips({ adminMode, overrideData }) {
  const context = usePlayer();
  const playerData = adminMode ? overrideData : context.playerData;
  const updatePlayerState = adminMode ? () => {} : context.updatePlayerState;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategoryKey, setActiveCategoryKey] = useState(null); 
  const [editingItem, setEditingItem] = useState(null);
  
  const [expandedCategories, setExpandedCategories] = useState({});

  const [formData, setFormData] = useState({ link: '', notes: '' });

  const position = playerData?.profile?.position || 'Other';
  const isGK = position.toLowerCase().includes('goalkeeper');
  const categoriesToUse = isGK ? GK_CATEGORIES : FIELD_PLAYER_CATEGORIES;

  const toggleCategory = (key) => {
    setExpandedCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const openAdd = (catKey) => {
    setActiveCategoryKey(catKey);
    setFormData({ link: '', notes: '' });
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const openEdit = (catKey, item) => {
    setActiveCategoryKey(catKey);
    setFormData({ ...item });
    setEditingItem(item.id);
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    updatePlayerState(prev => {
      let currentClips = [...(prev.skillClips[activeCategoryKey] || [])];
      if (editingItem) {
        currentClips = currentClips.map(c => c.id === editingItem ? { ...formData, id: editingItem } : c);
      } else {
        currentClips.push({ ...formData, id: uuidv4(), order: currentClips.length });
      }
      return { 
        ...prev, 
        skillClips: {
          ...prev.skillClips,
          [activeCategoryKey]: currentClips
        }
      };
    });
    setIsModalOpen(false);
    if (!expandedCategories[activeCategoryKey]) {
      setExpandedCategories(prev => ({ ...prev, [activeCategoryKey]: true }));
    }
  };

  const handleDelete = (catKey, id, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this skill clip?")) {
      updatePlayerState(prev => ({
        ...prev,
        skillClips: {
          ...prev.skillClips,
          [catKey]: prev.skillClips[catKey].filter(c => c.id !== id)
        }
      }));
    }
  };

  const activeCategoryLabel = categoriesToUse.find(c => c.key === activeCategoryKey)?.label || '';

  return (
    <GlassCard className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Film className="w-5 h-5 text-brand" />
          3. Specific Skill Clips ({isGK ? 'Goalkeeper' : 'Field Player'})
        </h2>
        <p className="text-sm text-gray-400 mt-1 max-w-2xl">
          Organize 3-5 short clips (5-15 seconds) into these specific categories. Scouts want to see targeted skills.
        </p>
      </div>

      <div className="space-y-3">
        {categoriesToUse.map((cat) => {
          const clips = playerData?.skillClips[cat.key] || [];
          const isExpanded = expandedCategories[cat.key];

          return (
            <div key={cat.key} className="border border-white/10 rounded-xl overflow-hidden bg-black/20">
              <div 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => toggleCategory(cat.key)}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  <h3 className="font-semibold text-white">{cat.label}</h3>
                  {clips.length > 0 && (
                    <span className="text-xs bg-brand/20 text-brand-light px-2 py-0.5 rounded-full">
                      {clips.length} clip{clips.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {!adminMode && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={(e) => { e.stopPropagation(); openAdd(cat.key); }}
                    className="gap-1 px-2 pointer-events-auto"
                  >
                    <Plus className="w-3 h-3" /> <span className="hidden sm:inline">Add</span>
                  </Button>
                )}
              </div>

              {isExpanded && (
                <div className="p-4 pt-0 border-t border-white/5 bg-black/10">
                  {clips.length === 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-sm text-gray-500 mb-3">{adminMode ? "No clips in this category." : "No clips in this category yet."}</p>
                      {!adminMode && (
                        <Button variant="ghost" size="sm" onClick={() => openAdd(cat.key)} className="text-brand-light">
                          + Add {cat.label} Clip
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 mt-4">
                      {clips.map(clip => (
                        <div key={clip.id} className="group flex flex-col p-3 rounded-lg bg-surface border border-white/5 hover:border-brand/30 transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                            <div className="flex-1 min-w-0 pr-4">
                              <a href={clip.link} target="_blank" rel="noreferrer" className="block text-sm text-brand-light hover:underline truncate mb-1">
                                {clip.link}
                              </a>
                              {clip.notes ? (
                                <p className="text-xs text-gray-400 truncate">{clip.notes}</p>
                              ) : (
                                <p className="text-xs text-gray-600 italic">No notes</p>
                              )}
                            </div>
                            
                            {!adminMode && (
                              <div className="flex items-center gap-2 mt-2 sm:mt-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <Button variant="secondary" size="sm" onClick={() => openEdit(cat.key, clip)} className="px-2">
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="danger" size="sm" onClick={(e) => handleDelete(cat.key, clip.id, e)} className="px-2">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                          {adminMode && (
                            <div className="w-full mt-2">
                              <AdminNoteField 
                                playerId={playerData.uid} 
                                noteKey={`skillclip_${clip.id}`} 
                                initialValue={playerData.adminNotes?.perClip?.[`skillclip_${clip.id}`] || ''}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!adminMode && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? `Edit ${activeCategoryLabel} Clip` : `Add ${activeCategoryLabel} Clip`}>
          <form onSubmit={handleSave} className="space-y-4">
            <Input 
              label="Clip Link *" 
              type="url"
              placeholder="https://..." 
              value={formData.link}
              onChange={e => setFormData({ ...formData, link: e.target.value })}
              required
              autoFocus
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">Context Notes (Optional)</label>
              <textarea
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand min-h-[80px]"
                placeholder="e.g. 50-yard cross-field pass perfectly to feet."
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit">{editingItem ? 'Save Changes' : 'Add Clip'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </GlassCard>
  );
}
