import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Video, Pencil, Trash2, GripVertical } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { GlassCard } from '../ui/GlassCard';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { AdminNoteField } from './AdminNoteField';

export function Section1FullGames({ adminMode, overrideData }) {
  const context = usePlayer();
  const playerData = adminMode ? overrideData : context.playerData;
  const updatePlayerState = adminMode ? () => {} : context.updatePlayerState;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [formData, setFormData] = useState({ link: '', label: '', date: '', notes: '' });

  const games = playerData?.fullGames || [];
  const recommendedMin = 3;

  const openAdd = () => {
    setFormData({ link: '', label: '', date: '', notes: '' });
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
      let newGames = [...prev.fullGames];
      if (editingItem) {
        newGames = newGames.map(g => g.id === editingItem ? { ...formData, id: editingItem } : g);
      } else {
        newGames.push({ ...formData, id: uuidv4(), order: newGames.length });
      }
      return { ...prev, fullGames: newGames };
    });
    setIsModalOpen(false);
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this game record?")) {
      updatePlayerState(prev => ({
        ...prev,
        fullGames: prev.fullGames.filter(g => g.id !== id)
      }));
    }
  };

  const moveItem = (index, direction, e) => {
    e.stopPropagation();
    if (direction === -1 && index === 0) return;
    if (direction === 1 && index === games.length - 1) return;
    
    updatePlayerState(prev => {
      const newArr = [...prev.fullGames];
      const temp = newArr[index];
      newArr[index] = newArr[index + direction];
      newArr[index + direction] = temp;
      return { ...prev, fullGames: newArr };
    });
  };

  return (
    <GlassCard className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Video className="w-5 h-5 text-brand" />
            1. Full Game Recordings
          </h2>
          <p className="text-sm text-gray-400 mt-1 max-w-2xl">
            Upload links to your FULL match recordings. These should be real competitive games.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium">
            <span className={games.length >= recommendedMin ? 'text-success' : 'text-warning'}>
              {games.length}
            </span>
            <span className="text-gray-500"> / {recommendedMin} recommended</span>
          </div>
          {!adminMode && (
            <Button onClick={openAdd} size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Add Game
            </Button>
          )}
        </div>
      </div>

      {games.length === 0 ? (
        <EmptyState 
          icon={Video}
          title="No full games added yet"
          description={adminMode ? "Player hasn't added any full games." : "Click the button above to add your first full match recording link."}
          actionText={!adminMode ? "Add Full Game" : null}
          onAction={openAdd}
        />
      ) : (
        <div className="space-y-3">
          {games.map((game, i) => (
            <div 
              key={game.id} 
              className="group flex flex-col p-4 rounded-lg bg-black/20 border border-white/5 hover:border-brand/30 hover:bg-white/5 transition-all w-full text-left"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  {!adminMode && (
                    <div className="flex flex-col gap-1 text-gray-500 mt-1 hidden sm:flex">
                      <button onClick={(e) => moveItem(i, -1, e)} disabled={i===0} className="hover:text-white disabled:opacity-30 disabled:hover:text-gray-500"><GripVertical className="w-4 h-4"/></button>
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white">{game.label || 'Untitled Game'}</h3>
                      {game.date && <span className="text-xs bg-white/5 px-2 py-0.5 rounded text-gray-300">{game.date}</span>}
                    </div>
                    <a href={game.link} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} className="text-sm text-brand-light hover:underline line-clamp-1 mb-1">
                      {game.link}
                    </a>
                    {game.notes && <p className="text-sm text-gray-400 line-clamp-1">{game.notes}</p>}
                  </div>
                </div>
                
                {!adminMode && (
                  <div className="flex items-center gap-2 mt-4 sm:mt-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button variant="secondary" size="sm" onClick={() => openEdit(game)} className="px-2">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="danger" size="sm" onClick={(e) => handleDelete(game.id, e)} className="px-2">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              {adminMode && (
                <div className="w-full">
                  <AdminNoteField 
                    playerId={playerData.uid} 
                    noteKey={`fullgame_${game.id}`} 
                    initialValue={playerData.adminNotes?.perClip?.[`fullgame_${game.id}`] || ''}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!adminMode && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingItem ? "Edit Full Game" : "Add Full Game"}>
          <form onSubmit={handleSave} className="space-y-4">
            <Input 
              label="Game Label *" 
              placeholder="e.g. League Match vs FC Athens" 
              value={formData.label}
              onChange={e => setFormData({ ...formData, label: e.target.value })}
              required
              autoFocus
            />
            <Input 
              label="Link (Google Drive, YouTube, etc) *" 
              type="url"
              placeholder="https://..." 
              value={formData.link}
              onChange={e => setFormData({ ...formData, link: e.target.value })}
              required
            />
            <Input 
              label="Date of Match (Optional)" 
              type="date"
              value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">Notes (Optional)</label>
              <textarea
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand min-h-[80px]"
                placeholder="e.g. My best game this season..."
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit">{editingItem ? 'Save Changes' : 'Add Recording'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </GlassCard>
  );
}
