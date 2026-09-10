import { Globe, ExternalLink } from 'lucide-react';
import { SectionShell } from '../dashboard/SectionShell';
import { AdminNoteField } from '../dashboard/AdminNoteField';
import { useHubSection, getIn } from './useHubSection';
import { usePlayer } from '../../context/PlayerContext';
import { PLATFORMS, PLATFORM_STATUS } from '../../utils/hubCatalog';
import { countPlatforms, HUB_TARGETS } from '../../utils/hubCompletion';
import { normalizeUrl, prettyUrl } from '../../utils/links';
import { cn } from '../../utils/cn';

const STATUS_STYLE = {
  live: 'bg-success/15 border-success/40 text-success',
  todo: 'bg-warning/12 border-warning/35 text-warning',
  na: 'bg-white/[0.06] border-white/15 text-ink-faint',
};

function PlatformRow({ platform, value, onStatus, onLink, readOnly }) {
  const status = value?.status || '';
  const link = value?.link || '';

  return (
    <div className={cn(
      'rounded-xl border p-3.5 transition-colors',
      status === 'live' ? 'bg-success/[0.05] border-success/25' : 'bg-black/20 border-white/[0.07]',
    )}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-ink">{platform.label}</div>
          <div className="text-xs text-ink-faint mt-0.5">{platform.hint}</div>
        </div>

        <div className="flex gap-1.5 flex-none">
          {PLATFORM_STATUS.map((s) => (
            <button
              key={s.value}
              type="button"
              disabled={readOnly}
              onClick={() => onStatus(status === s.value ? '' : s.value)}
              className={cn(
                'px-3 py-2 rounded-lg text-xs border transition-all min-h-[38px] disabled:cursor-default',
                status === s.value
                  ? STATUS_STYLE[s.value]
                  : 'bg-black/25 border-white/10 text-ink-faint hover:border-white/25 disabled:hover:border-white/10',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {status === 'live' && (
        <div className="mt-3">
          {readOnly ? (
            link ? (
              <a
                href={link} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] text-brand-light hover:underline break-all"
              >
                <ExternalLink className="w-3 h-3 flex-none" /> {prettyUrl(link)}
              </a>
            ) : (
              <span className="text-xs text-ink-faint italic">Marked done, no link added.</span>
            )
          ) : (
            <input
              type="url"
              value={link}
              onChange={(e) => onLink(e.target.value)}
              onBlur={(e) => onLink(normalizeUrl(e.target.value))}
              placeholder={`Paste your ${platform.label} link`}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-ink
                         placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand/40
                         focus:border-brand/60 transition-all"
            />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Where a scout can already find him.
 *
 * `phase2_visibility.md` line 211, in Panos's own words: "No internal tracker for which
 * platforms each client is live on, currently tribal knowledge per client folder." This is
 * that tracker, filled in by the player as he goes live, readable at a glance by the coach.
 *
 * "Not for me" is a real answer and is stored, so a blank row means nobody has looked at it
 * yet rather than nobody wanting it.
 */
export function SectionPlatforms({ adminMode, overrideData, adminDocId, adminNotes, index = 10 }) {
  const { data, setPath, readOnly } = useHubSection('platforms', { adminMode, overrideData });
  const context = usePlayer();
  const record = adminMode ? overrideData : context.playerData;

  const scouting = PLATFORMS.filter((p) => p.kind === 'scouting');
  const social = PLATFORMS.filter((p) => p.kind === 'social');
  const liveCount = countPlatforms(record);

  const row = (platform) => (
    <PlatformRow
      key={platform.key}
      platform={platform}
      value={getIn(data, [platform.key], null)}
      onStatus={(v) => setPath([platform.key, 'status'], v)}
      onLink={(v) => setPath([platform.key, 'link'], v)}
      readOnly={readOnly}
    />
  );

  return (
    <SectionShell
      icon={Globe}
      index={index}
      title="Where people can find you"
      description="Scouts look you up before they reply. If there is nothing to find, that is a problem you can fix in an afternoon."
      count={Math.min(liveCount, HUB_TARGETS.platforms)}
      target={HUB_TARGETS.platforms}
    >
      <p className="text-[13px] text-ink-muted leading-relaxed">
        Four of these is a good place to start. Transfermarkt first, it is the one clubs check.
        Tap <span className="text-success">Done</span> when a page is live and paste the link.
        Tap <span className="text-ink-faint">Not for me</span> if you are never going to use it,
        so we stop asking.
      </p>

      <div>
        <h3 className="text-sm font-semibold text-ink mb-3">Scouting sites</h3>
        <div className="space-y-2">{scouting.map(row)}</div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-ink mb-3">Social</h3>
        <div className="space-y-2">{social.map(row)}</div>
      </div>

      {adminMode && (
        <AdminNoteField docId={adminDocId} noteKey="platforms" initialValue={adminNotes?.perClip?.platforms || ''} />
      )}
    </SectionShell>
  );
}
