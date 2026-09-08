import { useState } from 'react';
import { Image as ImageIcon, Check, ExternalLink } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { SectionShell } from './SectionShell';
import { AdminNoteField } from './AdminNoteField';
import { normalizeUrl, linkWarning, prettyUrl } from '../../utils/links';
import { TARGETS, countPhotos } from '../../utils/completion';
import { cn } from '../../utils/cn';

const PHOTO_TYPES = [
  { key: 'cleanKit', label: 'Clean kit & boots', desc: 'Full body, standing straight, professional look.' },
  { key: 'actionShot', label: 'Action shot', desc: 'In a game, showing intensity.' },
  { key: 'training', label: 'Training', desc: 'At training, on the ball or with a coach.' },
  { key: 'headshot', label: 'Headshot', desc: 'Confident, good light, face clearly visible.' },
  { key: 'teamPhoto', label: 'Team photo', desc: 'Starting XI. Tell us which one is you.' },
  { key: 'lifestyle', label: 'Lifestyle', desc: 'Off the pitch, still professional.' },
];

export function Section4Photos({ adminMode, overrideData, adminDocId }) {
  const context = usePlayer();
  const playerData = adminMode ? overrideData : context.playerData;
  const updateSection = adminMode ? null : context.updateSection;

  const [editingKey, setEditingKey] = useState(null);
  const [draft, setDraft] = useState('');

  const photos = playerData?.photos || {};
  const warning = linkWarning(draft);

  const startEdit = (key) => { setDraft(photos[key]?.link || ''); setEditingKey(key); };

  const save = (key) => {
    updateSection('photos', (all = {}) => ({ ...all, [key]: { link: normalizeUrl(draft) } }));
    setEditingKey(null);
  };

  return (
    <SectionShell
      icon={ImageIcon}
      index={4}
      title="Photographs"
      description="Six photos. High resolution, ones you have the right to use. How you look on paper is the first thing a sporting director judges."
      count={countPhotos(playerData)}
      target={TARGETS.photos}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PHOTO_TYPES.map((type) => {
          const link = photos[type.key]?.link || '';
          const isFilled = link.trim().length > 0;
          const isEditing = editingKey === type.key;

          return (
            <div
              key={type.key}
              className={cn(
                "rounded-xl border p-4 flex flex-col",
                isFilled ? "bg-success/[0.04] border-success/20" : "bg-black/20 border-white/[0.07]"
              )}
            >
              <div className="flex justify-between items-start gap-2 mb-1">
                <h3 className="font-medium text-ink text-sm">{type.label}</h3>
                {isFilled && !isEditing && <Check className="w-4 h-4 text-success flex-none" />}
              </div>
              <p className="text-xs text-ink-faint mb-3.5 leading-relaxed">{type.desc}</p>

              {!adminMode && isEditing ? (
                <div className="flex flex-col gap-2 mt-auto">
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="https://..."
                    autoFocus
                    error={draft && warning ? warning : undefined}
                    onKeyDown={(e) => { if (e.key === 'Enter') save(type.key); }}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setEditingKey(null)}>Cancel</Button>
                    <Button size="sm" onClick={() => save(type.key)}>Save</Button>
                  </div>
                </div>
              ) : (
                <div className="mt-auto flex items-center gap-2">
                  {isFilled ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 min-w-0 inline-flex items-center gap-1.5 text-[13px] text-brand-light hover:underline truncate"
                    >
                      <ExternalLink className="w-3 h-3 flex-none" />
                      <span className="truncate">{prettyUrl(link, 30)}</span>
                    </a>
                  ) : (
                    <span className="flex-1 text-[13px] text-ink-faint">No link yet</span>
                  )}
                  {!adminMode && (
                    <Button variant="secondary" size="sm" onClick={() => startEdit(type.key)} className="flex-none">
                      {isFilled ? 'Change' : 'Add link'}
                    </Button>
                  )}
                </div>
              )}

              {adminMode && (
                <AdminNoteField
                  docId={adminDocId}
                  noteKey={`photo_${type.key}`}
                  initialValue={playerData.adminNotes?.perClip?.[`photo_${type.key}`] || ''}
                />
              )}
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}
