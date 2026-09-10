import { useState } from 'react';
import { Award, ExternalLink, Check, Lock } from 'lucide-react';
import { SectionShell } from '../dashboard/SectionShell';
import { AdminNoteField } from '../dashboard/AdminNoteField';
import { TextField } from './Field';
import { FileSlot } from './FileSlot';
import { useHubSection, getIn } from './useHubSection';
import { usePlayer } from '../../context/PlayerContext';
import { dbService } from '../../services/db';
import { countDeliverables, HUB_TARGETS } from '../../utils/hubCompletion';
import { normalizeUrl, linkWarning, prettyUrl } from '../../utils/links';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

/**
 * A yes/no that records who ticked it and when.
 *
 * Two of these are Phase 1 exit criteria (`phase1_foundation.md` section 8) and until now
 * there was nowhere in the world they were written down. `owner` decides who may tick:
 * the reel is signed off by the coach, the CV by the player. Each side sees the other's
 * tick but cannot move it.
 */
function SignOff({ label, done, at, canTick, onToggle, waitingText }) {
  return (
    <div className={cn(
      'flex items-start gap-3 rounded-xl border p-3.5 mt-3',
      done ? 'bg-success/[0.06] border-success/25' : 'bg-black/25 border-white/[0.07]',
    )}>
      {canTick ? (
        <input
          type="checkbox"
          checked={done}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-0.5 w-5 h-5 flex-none rounded accent-brand cursor-pointer"
        />
      ) : (
        <span className="mt-0.5 w-5 h-5 flex-none flex items-center justify-center">
          {done
            ? <Check className="w-4 h-4 text-success" />
            : <Lock className="w-3.5 h-3.5 text-ink-faint" />}
        </span>
      )}
      <span className="min-w-0">
        <span className="block text-sm text-ink leading-relaxed">{label}</span>
        {done && at && (
          <span className="block text-xs text-success mt-1">
            Ticked on {new Date(at).toLocaleDateString()}
          </span>
        )}
        {!done && !canTick && (
          <span className="block text-xs text-ink-faint mt-1">{waitingText}</span>
        )}
      </span>
    </div>
  );
}

/**
 * The finished pieces: the reel, the CV, the photo, and the page clubs get sent to.
 *
 * Everything here is an OUTPUT of the work, not raw material. It is the last thing to fill
 * in and the first thing a club actually looks at.
 */
export function SectionDeliverables({ adminMode, overrideData, adminDocId, adminNotes, index = 9 }) {
  const { data, setPath, readOnly } = useHubSection('deliverables', { adminMode, overrideData });
  const context = usePlayer();
  const record = adminMode ? overrideData : context.playerData;
  const uid = record?.authUid || record?.id;

  const [editingReel, setEditingReel] = useState(false);
  const [reelDraft, setReelDraft] = useState('');
  const [signingOff, setSigningOff] = useState(false);

  const reelLink = getIn(data, ['highlightReel', 'link']);
  const reelApproved = getIn(data, ['highlightReel', 'approvedByCoach', 'done'], false);
  const cvApproved = getIn(data, ['cv', 'approvedByPlayer', 'done'], false);
  const proofPage = getIn(data, ['proofPage', 'link']);
  const warning = linkWarning(reelDraft);

  const saveReel = () => {
    setPath(['highlightReel', 'link'], normalizeUrl(reelDraft));
    setEditingReel(false);
  };

  const tick = (path, on) =>
    setPath(path, on ? { done: true, at: new Date().toISOString() } : { done: false, at: '' });

  return (
    <SectionShell
      icon={Award}
      index={index}
      title="Your finished stuff"
      description="The three things a club actually opens. This is what all the footage turns into."
      count={countDeliverables(record)}
      target={HUB_TARGETS.deliverables}
    >
      {/* ------------------------------------------------------------ the reel */}
      <div className="rounded-xl bg-black/20 border border-white/[0.07] p-4">
        <h3 className="text-sm font-semibold text-ink mb-1">Your highlights video</h3>
        <p className="text-[13px] text-ink-muted mb-3.5 leading-relaxed">
          Your editor makes this from the games you sent. Paste the link here when you get it.
        </p>

        {!readOnly && editingReel ? (
          <div className="space-y-3">
            <TextField
              label="Paste the link"
              value={reelDraft}
              onChange={setReelDraft}
              placeholder="https://youtu.be/..."
              hint="YouTube, Vimeo or Google Drive. Make sure anyone with the link can open it."
            />
            {reelDraft && warning && <p className="text-xs text-error">{warning}</p>}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
              <Button variant="ghost" onClick={() => setEditingReel(false)}>Cancel</Button>
              <Button onClick={saveReel}>Save the link</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              {reelLink ? (
                <a
                  href={reelLink} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] text-brand-light hover:underline break-all"
                >
                  <ExternalLink className="w-3 h-3 flex-none" /> {prettyUrl(reelLink)}
                </a>
              ) : (
                <span className="text-[13px] text-ink-faint">Nothing here yet.</span>
              )}
            </div>
            {!readOnly && (
              <Button
                variant={reelLink ? 'secondary' : 'primary'} size="sm" className="flex-none"
                onClick={() => { setReelDraft(reelLink); setEditingReel(true); }}
              >
                {reelLink ? 'Change the link' : 'Add the link'}
              </Button>
            )}
          </div>
        )}

        <SignOff
          label="Your coach has checked this video and says it is ready to send to clubs."
          done={reelApproved}
          at={getIn(data, ['highlightReel', 'approvedByCoach', 'at'])}
          canTick={adminMode && !signingOff}
          onToggle={async (on) => {
            // The coach's tick is an admin write, not a section edit, so it does not go
            // through updateSection. The live watcher on the player page brings it back.
            setSigningOff(true);
            try { await dbService.setCoachSignOff(adminDocId, on); } catch { /* shown by the page */ }
            setSigningOff(false);
          }}
          waitingText="Your coach ticks this once he has watched it."
        />
      </div>

      {/* -------------------------------------------------------------- the CV */}
      <div className="rounded-xl bg-black/20 border border-white/[0.07] p-4">
        <h3 className="text-sm font-semibold text-ink mb-1">Your CV</h3>
        <p className="text-[13px] text-ink-muted mb-3.5 leading-relaxed">
          We build this from what you filled in above and send you the PDF. Upload it back here
          once you have read it.
        </p>
        <FileSlot
          slot="cv"
          uid={uid}
          label="Your CV"
          hint="A PDF. The one we sent you, or your own if you already had one."
          value={getIn(data, ['cv', 'file'], null)}
          onChange={(file) => setPath(['cv', 'file'], file)}
          readOnly={readOnly}
        />
        <SignOff
          label="I have read my CV and everything on it is right."
          done={cvApproved}
          at={getIn(data, ['cv', 'approvedByPlayer', 'at'])}
          canTick={!readOnly}
          onToggle={(on) => tick(['cv', 'approvedByPlayer'], on)}
          waitingText="The player ticks this once he has read it."
        />
      </div>

      {/* ----------------------------------------------------------- the photo */}
      <FileSlot
        slot="headshot"
        uid={uid}
        label="Your best photo"
        hint="Head and shoulders, good light, looking at the camera. This goes on your player page."
        value={getIn(data, ['headshot', 'file'], null)}
        onChange={(file) => setPath(['headshot', 'file'], file)}
        readOnly={readOnly}
      />

      {/* ------------------------------------------------------- the proof page */}
      {proofPage && (
        <div className="rounded-xl bg-success/[0.06] border border-success/25 p-4">
          <h3 className="text-sm font-semibold text-ink mb-1">Your player page</h3>
          <p className="text-[13px] text-ink-muted mb-3 leading-relaxed">
            This is the page clubs get sent. It is built from everything above.
          </p>
          <a
            href={proofPage} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[13px] text-brand-light hover:underline break-all"
          >
            <ExternalLink className="w-3 h-3 flex-none" /> {prettyUrl(proofPage)}
          </a>
        </div>
      )}

      {adminMode && (
        <AdminNoteField docId={adminDocId} noteKey="deliverables" initialValue={adminNotes?.perClip?.deliverables || ''} />
      )}
    </SectionShell>
  );
}
