import { useState } from 'react';
import { FolderUp, CheckCircle2, ExternalLink } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { SectionShell } from './SectionShell';
import { AdminNoteField } from './AdminNoteField';
import { normalizeUrl, linkWarning, prettyUrl } from '../../utils/links';

const SUBFOLDERS = [
  '01_Full_Games',
  '02_Top_3_Clips',
  '03_Skill_Clips_Shorts',
  '04_Player_Profile_Resume',
  '05_Photos',
];

export function Section5Drive({ adminMode, overrideData, adminDocId }) {
  const context = usePlayer();
  const playerData = adminMode ? overrideData : context.playerData;
  const updateSection = adminMode ? null : context.updateSection;

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const link = playerData?.driveFolder?.link || '';
  const isFilled = link.trim().length > 0;
  const warning = linkWarning(draft);

  const save = () => {
    updateSection('driveFolder', () => ({ link: normalizeUrl(draft) }));
    setIsEditing(false);
  };

  return (
    <SectionShell
      icon={FolderUp}
      index={5}
      title="Your master Drive folder"
      description="One folder holding everything, shared so anyone with the link can view it. This is what your editor opens to build your reel."
      count={isFilled ? 1 : 0}
      target={1}
    >
      <div className="rounded-xl border border-white/[0.07] bg-black/20 p-5">
        {!adminMode && isEditing ? (
          <div className="space-y-3">
            <Input
              label="Paste the shared folder link"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              autoFocus
              error={draft && warning ? warning : undefined}
              hint="In Drive: right-click the folder, Share, then Copy link. Set it to 'Anyone with the link'."
            />
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={save}>Save link</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              {isFilled ? (
                <>
                  <div className="flex items-center gap-2 mb-1.5">
                    <CheckCircle2 className="w-4 h-4 text-success flex-none" />
                    <span className="font-medium text-ink text-sm">Folder linked</span>
                  </div>
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[13px] text-brand-light hover:underline break-all"
                  >
                    <ExternalLink className="w-3 h-3 flex-none" />
                    {prettyUrl(link)}
                  </a>
                </>
              ) : (
                <>
                  <span className="font-medium text-ink text-sm block mb-1">No folder yet</span>
                  <span className="text-[13px] text-ink-muted">
                    Add it once your folders match the list below.
                  </span>
                </>
              )}
            </div>

            {!adminMode && (
              <Button
                variant={isFilled ? 'secondary' : 'primary'}
                onClick={() => { setDraft(link); setIsEditing(true); }}
                className="flex-none"
              >
                {isFilled ? 'Change link' : 'Add folder link'}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-brand/[0.06] border border-brand/20 p-4">
        <h4 className="text-[13px] font-semibold text-brand-light mb-2.5">
          Name your subfolders exactly like this
        </h4>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {SUBFOLDERS.map((name) => (
            <li key={name} className="text-xs text-ink-muted font-mono flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-brand-light/60 flex-none" />
              {name}
            </li>
          ))}
        </ul>
      </div>

      {adminMode && (
        <AdminNoteField
          docId={adminDocId}
          noteKey="master_drive"
          initialValue={playerData.adminNotes?.perClip?.master_drive || ''}
        />
      )}
    </SectionShell>
  );
}
