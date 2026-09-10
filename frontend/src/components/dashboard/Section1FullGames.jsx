import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Video } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { LinkInput } from '../ui/LinkInput';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { ModalActions } from '../ui/ModalActions';
import { useConfirm } from '../ui/ConfirmDialog';
import { StatusPill } from '../ui/Brand';
import { SectionShell } from './SectionShell';
import { ItemRow } from './ItemRow';
import { AdminNoteField } from './AdminNoteField';
import { normalizeUrl } from '../../utils/links';
import { TARGETS } from '../../utils/completion';

const BLANK = { link: '', label: '', date: '', notes: '' };

export function Section1FullGames({ adminMode, overrideData, adminDocId, adminNotes }) {
  const context = usePlayer();
  const playerData = adminMode ? overrideData : context.playerData;
  const updateSection = adminMode ? null : context.updateSection;

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK);
  const { confirm, dialog } = useConfirm();

  const games = playerData?.fullGames || [];

  const openAdd = () => { setForm(BLANK); setEditingId(null); setIsOpen(true); };
  const openEdit = (item) => { setForm({ ...BLANK, ...item }); setEditingId(item.id); setIsOpen(true); };

  const save = (e) => {
    e.preventDefault();
    const entry = { ...form, link: normalizeUrl(form.link) };
    updateSection('fullGames', (list = []) => (
      editingId
        ? list.map((g) => (g.id === editingId ? { ...entry, id: editingId } : g))
        : [...list, { ...entry, id: uuidv4() }]
    ));
    setIsOpen(false);
  };

  const remove = async (id) => {
    const ok = await confirm({
      title: 'Delete this game?',
      body: 'The link and its notes will be removed from your hub. You can always add it again.',
    });
    if (ok) updateSection('fullGames', (list = []) => list.filter((g) => g.id !== id));
  };

  const move = (index, direction) => {
    const to = index + direction;
    if (to < 0 || to >= games.length) return;
    updateSection('fullGames', (list = []) => {
      const next = [...list];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  };

  return (
    <SectionShell
      icon={Video}
      index={1}
      title="Your full games"
      description="Whole games, start to finish. Not clips. Your editor cuts your best bits out of these, so nothing happens without them."
      count={games.length}
      target={TARGETS.fullGames}
      action={!adminMode && (
        <Button onClick={openAdd} size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> Add game
        </Button>
      )}
    >
      {games.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No games yet"
          description={adminMode
            ? "This player has not added any full matches."
            : "Paste the link to a full game. Google Drive, YouTube, anywhere we can open it."}
          actionText={!adminMode ? 'Add your first game' : null}
          onAction={openAdd}
        />
      ) : (
        <div className="space-y-2.5">
          {games.map((game, i) => (
            <ItemRow
              key={game.id}
              title={game.label || 'Untitled game'}
              badge={game.date && <StatusPill>{game.date}</StatusPill>}
              link={game.link}
              note={game.notes}
              index={i}
              total={games.length}
              onMove={move}
              onEdit={() => openEdit(game)}
              onDelete={() => remove(game.id)}
              readOnly={adminMode}
            >
              {adminMode && (
                <AdminNoteField
                  docId={adminDocId}
                  noteKey={`fullgame_${game.id}`}
                  initialValue={adminNotes?.perClip?.[`fullgame_${game.id}`] || ''}
                />
              )}
            </ItemRow>
          ))}
        </div>
      )}

      {!adminMode && (
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editingId ? 'Edit full game' : 'Add a full game'}>
          <form onSubmit={save} className="space-y-4">
            <Input
              label="Who did you play?"
              placeholder="League game vs FC Athens"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              required
            />
            <LinkInput
              value={form.link}
              onChange={(link) => setForm({ ...form, link })}
              autoFocus
              hint="A YouTube or Google Drive link. Use whichever you have room for. A full game in 4K will not fit in a free Drive, and YouTube is free and unlimited."
            />
            <Input
              label="When was it?"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              hint="You can skip this."
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fg-notes" className="text-[13px] font-medium text-ink-muted">Anything we should know</label>
              <textarea
                id="fg-notes"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-ink placeholder:text-ink-faint
                           focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/60 min-h-[88px] transition-all"
                placeholder="My best game this year. I am number 7, right wing."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <ModalActions>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit">{editingId ? 'Save changes' : 'Add game'}</Button>
            </ModalActions>
          </form>
        </Modal>
      )}

      {dialog}
    </SectionShell>
  );
}
