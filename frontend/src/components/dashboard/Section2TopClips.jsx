import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Star } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { useConfirm } from '../ui/ConfirmDialog';
import { StatusPill } from '../ui/Brand';
import { SectionShell } from './SectionShell';
import { ItemRow } from './ItemRow';
import { AdminNoteField } from './AdminNoteField';
import { normalizeUrl, linkWarning } from '../../utils/links';
import { TARGETS } from '../../utils/completion';
import { cn } from '../../utils/cn';

const CATEGORIES = [
  "Dribbling", "Passing & Vision", "Defending", "Finishing",
  "Movement Off the Ball", "Pressing/Hustle", "Aerial", "Other",
];

const BLANK = { link: '', title: '', category: CATEGORIES[0], whyBest: '' };

export function Section2TopClips({ adminMode, overrideData, adminDocId, adminNotes }) {
  const context = usePlayer();
  const playerData = adminMode ? overrideData : context.playerData;
  const updateSection = adminMode ? null : context.updateSection;

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK);
  const { confirm, dialog } = useConfirm();

  const clips = playerData?.topThreeClips || [];
  const full = clips.length >= 3;
  const warning = linkWarning(form.link);

  const openAdd = () => {
    if (full) return;
    setForm(BLANK); setEditingId(null); setIsOpen(true);
  };
  const openEdit = (clip) => { setForm({ ...BLANK, ...clip }); setEditingId(clip.id); setIsOpen(true); };

  const save = (e) => {
    e.preventDefault();
    const entry = { ...form, link: normalizeUrl(form.link) };
    updateSection('topThreeClips', (list = []) => (
      editingId
        ? list.map((c) => (c.id === editingId ? { ...entry, id: editingId } : c))
        : [...list, { ...entry, id: uuidv4() }]
    ));
    setIsOpen(false);
  };

  const remove = async (id) => {
    const ok = await confirm({
      title: 'Delete this clip?',
      body: 'It will be removed from your top three. You can add another one in its place.',
    });
    if (ok) updateSection('topThreeClips', (list = []) => list.filter((c) => c.id !== id));
  };

  const move = (index, direction) => {
    const to = index + direction;
    if (to < 0 || to >= clips.length) return;
    updateSection('topThreeClips', (list = []) => {
      const next = [...list];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  };

  return (
    <SectionShell
      icon={Star}
      index={2}
      title="Your top 3 clips"
      description="The three moments that open your highlight video. A scout decides in the first 30 seconds — these are that 30 seconds. Order matters: number 1 plays first."
      count={clips.length}
      target={TARGETS.topThreeClips}
      action={!adminMode && (
        <Button onClick={openAdd} size="sm" className="gap-1.5" disabled={full}>
          <Plus className="w-4 h-4" /> Add clip
        </Button>
      )}
    >
      <div className="space-y-2.5">
        {[0, 1, 2].map((slot) => {
          const clip = clips[slot];

          if (!clip) {
            return (
              <div
                key={slot}
                className="flex items-center gap-3.5 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4"
              >
                <span className="w-7 h-7 rounded-full bg-white/[0.06] text-ink-faint flex items-center justify-center text-xs font-semibold flex-none">
                  {slot + 1}
                </span>
                <div className="min-w-0">
                  <div className="text-sm text-ink-muted font-medium">Empty slot</div>
                  <div className="text-xs text-ink-faint mt-0.5">
                    {adminMode ? 'Not filled yet.' : 'Add the clip you would show a scout first.'}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <ItemRow
              key={clip.id}
              title={clip.title}
              badge={
                <>
                  <span className={cn(
                    "w-6 h-6 rounded-full bg-brand-sheen text-white flex items-center justify-center text-[11px] font-semibold flex-none order-first"
                  )}>
                    {slot + 1}
                  </span>
                  {clip.category && <StatusPill tone="brand">{clip.category}</StatusPill>}
                </>
              }
              link={clip.link}
              note={clip.whyBest}
              index={slot}
              total={clips.length}
              onMove={move}
              onEdit={() => openEdit(clip)}
              onDelete={() => remove(clip.id)}
              readOnly={adminMode}
            >
              {adminMode && (
                <AdminNoteField
                  docId={adminDocId}
                  noteKey={`topclip_${clip.id}`}
                  initialValue={adminNotes?.perClip?.[`topclip_${clip.id}`] || ''}
                />
              )}
            </ItemRow>
          );
        })}
      </div>

      {!adminMode && (
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editingId ? 'Edit clip' : 'Add a top clip'}>
          <form onSubmit={save} className="space-y-4">
            <Input
              label="What happens in it?"
              placeholder="e.g. Long-range goal vs Olympiacos U19"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              autoFocus
            />
            <Input
              label="Link to the clip"
              placeholder="https://drive.google.com/..."
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              required
              error={form.link && warning ? warning : undefined}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tc-cat" className="text-[13px] font-medium text-ink-muted">Which skill does it show?</label>
              <select
                id="tc-cat"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-ink
                           focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/60 transition-all"
              >
                {CATEGORIES.map((c) => <option key={c} value={c} className="bg-elevated">{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tc-why" className="text-[13px] font-medium text-ink-muted">Why is this one of your best?</label>
              <textarea
                id="tc-why"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-ink placeholder:text-ink-faint
                           focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/60 min-h-[88px] transition-all"
                placeholder="e.g. Shows my shooting power and that I stay calm under pressure."
                value={form.whyBest}
                onChange={(e) => setForm({ ...form, whyBest: e.target.value })}
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit">{editingId ? 'Save changes' : 'Add clip'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {dialog}
    </SectionShell>
  );
}
