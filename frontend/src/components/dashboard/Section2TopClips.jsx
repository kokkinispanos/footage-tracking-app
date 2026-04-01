import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Star, Pencil, Trash2, GripVertical } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';
import { cn } from '../../utils/cn';
import { AdminNoteField } from './AdminNoteField';

const CATEGORIES = [
  "Dribbling", 
  "Passing & Vision", 
  "Defending", 
  "Finishing", 
  "Movement Off the Ball", 
  "Pressing/Hustle", 
  "Aerial", 
  "Other"
];

export function Section2TopClips({ adminMode, overrideData }) {
  const context = usePlayer();
  const playerData = adminMode ? overrideData : context.playerData;
  const updatePlayerState = adminMode ? () => {} : context.updatePlayerState;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({ link: '', title: '', category: CATEGORIES[0], whyBest: '' });

  const clips = playerData?.topThreeClips || [];

  const openAdd = () => {
    if (clips.length >= 3) return; // Prevent adding if 3 already exist
    setFormData({ link: '', title: '', category: CATEGORIES[0], whyBest: '' });
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const openEdit = (item) => {
    setFormData({ ...item });
    setEditingItem(item.id);
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    updatePlayerState(prev => {
      let newClips = [...prev.topThreeClips];
      if (editingItem) {
        newClips = newClips.map(c => c.id === editingItem ? { ...formData, id: editingItem } : c);
      } else {
        newClips.push({ ...formData, id: uuidv4(), order: newClips.length });
      }
      return { ...prev, topThreeClips: newClips };
    });
    setIsModalOpen(false);
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this highlight clip?")) {
      updatePlayerState(prev => ({
        ...prev,
        topThreeClips: prev.topThreeClips.filter(c => c.id !== id)
      }));
    }
  };

  const moveItem = (index, direction, e) => {
    e.stopPropagation();
    if (direction === -1 && index === 0) return;
    if (direction === 1 && index === clips.length - 1) return;
    
    updatePlayerState(prev => {
      const newArr = [...prev.topThreeClips];
      const temp = newArr[index];
      newArr[index] = newArr[index + direction];
      newArr[index + direction] = temp;
      return { ...prev, topThreeClips: newArr };
    });
  };

  // Build fixed length array for exactly 3 slots UI
  const slots = [0, 1, 2];

  return (
    <GlassCard className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Star className="w-5 h-5 text-brand" />
            2. Top 3 Best Clips (Highlight Opener)
          </h2>
          <p className="text-sm text-gray-400 mt-1 max-w-2xl">
            These are your absolutely best moments. Scouts decide in 30 seconds — these must be explosive!
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium">
            <span className={clips.length === 3 ? 'text-success' : 'text-warning'}>
              {clips.length}
            </span>
            <span className="text-gray-500"> / 3 slots filled</span>
          </div>
          {!adminMode && (
            <Button onClick={openAdd} size="sm" className="gap-2" disabled={clips.length >= 3}>
              <Plus className="w-4 h-4" /> Add Clip
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {slots.map((slotIndex) => {
          const clip = clips[slotIndex];
          return (
            <div 
              key={slotIndex} 
              className={cn(
                "group flex flex-col p-4 rounded-lg border transition-all w-full text-left min-h-[80px]",
                clip ? "bg-black/20 border-white/5 hover:border-brand/30 hover:bg-white/5" : "bg-black/10 border-dashed border-white/10"
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                <div className="flex items-start gap-4 flex-1">
                  {/* Visual Slot Number & Reorder Controls */}
                  <div className="flex flex-col items-center gap-1">
                    <span className={cn(
                      "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold", 
                      clip ? "bg-brand text-white" : "bg-white/5 text-gray-500"
                    )}>
                      {slotIndex + 1}
                    </span>
                    {!adminMode && clip && (
                      <div className="flex flex-col gap-0.5 text-gray-500 mt-2 hidden sm:flex">
                        <button onClick={(e) => moveItem(slotIndex, -1, e)} disabled={slotIndex === 0} className="hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 py-0.5"><GripVertical className="w-4 h-4"/></button>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {clip ? (
                      <>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white truncate">{clip.title}</h3>
                          <span className="text-xs bg-brand/10 text-brand-light px-2 py-0.5 rounded flex-shrink-0">
                            {clip.category}
                          </span>
                        </div>
                        <a href={clip.link} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} className="block text-sm text-brand-light hover:underline truncate mb-1">
                          {clip.link}
                        </a>
                        {clip.whyBest && <p className="text-sm text-gray-400 line-clamp-1">{clip.whyBest}</p>}
                      </>
                    ) : (
                       <div className="flex flex-col justify-center h-full">
                         <span className="text-sm text-gray-500 font-medium">Empty Slot</span>
                         <span className="text-xs text-gray-600">{adminMode ? "Player hasn't filled this slot." : "Click 'Add Clip' to fill this opening highlight slot"}</span>
                       </div>
                    )}
                  </div>
                </div>
                
                {!adminMode && clip && (
                  <div className="flex items-center gap-2 mt-4 sm:mt-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button variant="secondary" size="sm" onClick={() => openEdit(clip)} className="px-2">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="danger" size="sm" onClick={(e) => handleDelete(clip.id, e)} className="px-2">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              {adminMode && clip && (
                <div className="w-full">
                  <AdminNoteField 
                    playerId={playerData.uid} 
                    noteKey={`topclip_${clip.id}`} 
                    initialValue={playerData.adminNotes?.perClip?.[`topclip_${clip.id}`] || ''}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!adminMode && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? "Edit Top Clip" : "Add Top Clip"}>
          <form onSubmit={handleSave} className="space-y-4">
            <Input 
              label="Clip Title *" 
              placeholder="e.g. Long-range goal vs Olympiacos U19" 
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              required
              autoFocus
            />
            <Input 
              label="Link (Google Drive, YouTube) *" 
              type="url"
              placeholder="https://..." 
              value={formData.link}
              onChange={e => setFormData({ ...formData, link: e.target.value })}
              required
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">Skill Category *</label>
              <select 
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                required
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand"
              >
                <option value="" disabled className="bg-background">Select Category</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat} className="bg-background">{cat}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">Why this is your best (Optional)</label>
              <textarea
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand min-h-[80px]"
                placeholder="e.g. This goal shows my shooting power and composure..."
                value={formData.whyBest}
                onChange={e => setFormData({ ...formData, whyBest: e.target.value })}
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
