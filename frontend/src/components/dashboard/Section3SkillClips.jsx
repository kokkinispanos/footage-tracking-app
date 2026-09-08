import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Film, Plus, ChevronDown } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { useConfirm } from '../ui/ConfirmDialog';
import { SectionShell } from './SectionShell';
import { ItemRow } from './ItemRow';
import { AdminNoteField } from './AdminNoteField';
import { normalizeUrl, linkWarning } from '../../utils/links';
import { TARGETS, countSkillClips } from '../../utils/completion';
import { cn } from '../../utils/cn';
import { FIELD_CATEGORIES, GK_CATEGORIES, KEY_FOR_POSITION, isGoalkeeper } from '../../utils/catalog';

export function Section3SkillClips({ adminMode, overrideData, adminDocId, adminNotes }) {
  const context = usePlayer();
  const playerData = adminMode ? overrideData : context.playerData;
  const updateSection = adminMode ? null : context.updateSection;

  const [isOpen, setIsOpen] = useState(false);
  const [activeCat, setActiveCat] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ link: '', notes: '' });
  const [expanded, setExpanded] = useState({});
  const { confirm, dialog } = useConfirm();

  const position = playerData?.profile?.position || '';
  const isGK = isGoalkeeper(position);
  const categories = isGK ? GK_CATEGORIES : FIELD_CATEGORIES;
  const keyCats = KEY_FOR_POSITION[position] || [];
  const clips = playerData?.skillClips || {};
  const total = countSkillClips(playerData);
  const warning = linkWarning(form.link);

  const openAdd = (catKey) => {
    setActiveCat(catKey); setForm({ link: '', notes: '' }); setEditingId(null); setIsOpen(true);
  };
  const openEdit = (catKey, clip) => {
    setActiveCat(catKey); setForm({ link: clip.link, notes: clip.notes || '' }); setEditingId(clip.id); setIsOpen(true);
  };

  const save = (e) => {
    e.preventDefault();
    const entry = { ...form, link: normalizeUrl(form.link) };
    updateSection('skillClips', (all = {}) => {
      const list = all[activeCat] || [];
      return {
        ...all,
        [activeCat]: editingId
          ? list.map((c) => (c.id === editingId ? { ...entry, id: editingId } : c))
          : [...list, { ...entry, id: uuidv4() }],
      };
    });
    setExpanded((p) => ({ ...p, [activeCat]: true }));
    setIsOpen(false);
  };

  const remove = async (catKey, id) => {
    const ok = await confirm({ title: 'Delete this clip?', body: 'It will be removed from this skill.' });
    if (!ok) return;
    updateSection('skillClips', (all = {}) => ({
      ...all,
      [catKey]: (all[catKey] || []).filter((c) => c.id !== id),
    }));
  };

  const move = (catKey, index, direction) => {
    updateSection('skillClips', (all = {}) => {
      const list = [...(all[catKey] || [])];
      const to = index + direction;
      if (to < 0 || to >= list.length) return all;
      [list[index], list[to]] = [list[to], list[index]];
      return { ...all, [catKey]: list };
    });
  };

  const activeLabel = categories.find((c) => c.key === activeCat)?.label || 'clip';

  return (
    <SectionShell
      icon={Film}
      index={3}
      title="Skill clips"
      description="Short moments, 6 to 13 seconds each, filed by what they show. Repeat your strongest skill 5 or 6 times — repetition is what makes a scout believe it."
      count={total}
      target={TARGETS.skillClips}
    >
      <div className="space-y-2.5">
        {categories.map((cat) => {
          const list = clips[cat.key] || [];
          const isOpenCat = expanded[cat.key] ?? list.length > 0;
          const isKey = keyCats.includes(cat.key);

          return (
            <div key={cat.key} className="rounded-xl border border-white/[0.07] bg-black/20 overflow-hidden">
              <div className="flex items-center gap-2 p-3 sm:p-3.5">
                <button
                  type="button"
                  onClick={() => setExpanded((p) => ({ ...p, [cat.key]: !isOpenCat }))}
                  className="flex items-center gap-2.5 flex-1 min-w-0 text-left group"
                  aria-expanded={isOpenCat}
                >
                  <ChevronDown className={cn(
                    "w-4 h-4 text-ink-faint transition-transform flex-none",
                    !isOpenCat && "-rotate-90"
                  )} />
                  <span className="font-medium text-[15px] text-ink truncate group-hover:text-brand-light transition-colors">
                    {cat.label}
                  </span>
                  {isKey && (
                    <span className="hidden sm:inline-flex text-[10px] uppercase tracking-wider text-brand-light bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full flex-none">
                      Key for you
                    </span>
                  )}
                  <span className="text-[13px] text-ink-faint tabular-nums flex-none ml-auto pr-1">
                    {list.length}
                  </span>
                </button>

                {!adminMode && (
                  <Button variant="secondary" size="sm" onClick={() => openAdd(cat.key)} className="px-2.5 flex-none">
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {isOpenCat && (
                <div className="px-3 sm:px-3.5 pb-3.5 space-y-2">
                  {list.length === 0 ? (
                    <p className="text-[13px] text-ink-faint px-1 py-2">
                      {adminMode ? 'Nothing here.' : 'No clips yet for this skill.'}
                    </p>
                  ) : list.map((clip, i) => (
                    <ItemRow
                      key={clip.id}
                      link={clip.link}
                      note={clip.notes}
                      index={i}
                      total={list.length}
                      onMove={(idx, dir) => move(cat.key, idx, dir)}
                      onEdit={() => openEdit(cat.key, clip)}
                      onDelete={() => remove(cat.key, clip.id)}
                      readOnly={adminMode}
                      className="bg-black/30"
                    >
                      {adminMode && (
                        <AdminNoteField
                          docId={adminDocId}
                          noteKey={`skillclip_${clip.id}`}
                          initialValue={adminNotes?.perClip?.[`skillclip_${clip.id}`] || ''}
                        />
                      )}
                    </ItemRow>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!adminMode && (
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editingId ? `Edit ${activeLabel} clip` : `Add a ${activeLabel} clip`}>
          <form onSubmit={save} className="space-y-4">
            <Input
              label="Link to the clip"
              placeholder="https://drive.google.com/..."
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              required
              autoFocus
              error={form.link && warning ? warning : undefined}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="sc-notes" className="text-[13px] font-medium text-ink-muted">What are we looking at?</label>
              <textarea
                id="sc-notes"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-ink placeholder:text-ink-faint
                           focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/60 min-h-[88px] transition-all"
                placeholder="e.g. 50-yard cross-field pass, straight to his feet."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
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
