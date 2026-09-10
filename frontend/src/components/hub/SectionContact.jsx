import { Phone, Info } from 'lucide-react';
import { SectionShell } from '../dashboard/SectionShell';
import { AdminNoteField } from '../dashboard/AdminNoteField';
import { TextField } from './Field';
import { useHubSection, getIn } from './useHubSection';
import { usePlayer } from '../../context/PlayerContext';
import { countContact, HUB_TARGETS } from '../../utils/hubCompletion';

/**
 * How a club reaches him, and which mailbox we send from.
 *
 * The Gmail line is the one that matters operationally: Stage 3 sends club emails through
 * the player's own account so replies land with him, and the whole sequence stalls without
 * that address.
 */
export function SectionContact({ adminMode, overrideData, adminDocId, adminNotes, index = 8 }) {
  const { data, set, setPath, readOnly } = useHubSection('contact', { adminMode, overrideData });
  const context = usePlayer();
  const record = adminMode ? overrideData : context.playerData;

  return (
    <SectionShell
      icon={Phone}
      index={index}
      title="How we reach you"
      description="When a club replies, we need to get hold of you fast. Some replies come back the same day."
      count={countContact(record)}
      target={HUB_TARGETS.contact}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          label="Your phone number"
          value={data.phone} onChange={(v) => set('phone', v)}
          readOnly={readOnly} type="tel" inputMode="tel"
          placeholder="+44 7700 900000"
          hint="Start with your country code, like +44 or +30."
        />
        <TextField
          label="Your WhatsApp"
          value={data.whatsapp} onChange={(v) => set('whatsapp', v)}
          readOnly={readOnly} type="tel" inputMode="tel"
          hint="Only if it is a different number to the one above."
        />
        <TextField
          label="Your Instagram"
          value={data.instagram} onChange={(v) => set('instagram', v)}
          readOnly={readOnly} placeholder="@yourname"
          hint="This is where most clubs message you first."
        />
        <TextField
          label="Your Transfermarkt page"
          value={data.transfermarkt} onChange={(v) => set('transfermarkt', v)}
          readOnly={readOnly} placeholder="transfermarkt.com/..."
          hint="Paste the link if you have a page. Skip it if you do not."
        />
      </div>

      <div className="rounded-xl bg-brand/[0.06] border border-brand/20 p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <Info className="w-4 h-4 text-brand-light flex-none mt-0.5" />
          <p className="text-[13px] text-ink-muted leading-relaxed">
            We email clubs from <span className="text-ink">your own Gmail</span>, not ours. That way
            it comes from you, and when a club replies it lands in your inbox. We show you every
            email before it goes.
          </p>
        </div>
        <TextField
          label="The Gmail we send from"
          value={data.gmailForClubs} onChange={(v) => set('gmailForClubs', v)}
          readOnly={readOnly} type="email" placeholder="you@gmail.com"
          hint="It has to be a Gmail. Make a new one if you would rather keep this separate."
        />
      </div>

      <div className="rounded-xl bg-black/20 border border-white/[0.07] p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">Your mum, dad, or whoever is paying</h3>
          <p className="text-[13px] text-ink-muted mt-1 leading-relaxed">
            They get one short email on a Monday with what we did that week. Only fill this in if
            you ticked that permission in the section above.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            label="Their name"
            value={getIn(data, ['parent', 'name'])}
            onChange={(v) => setPath(['parent', 'name'], v)}
            readOnly={readOnly}
          />
          <TextField
            label="Their email"
            value={getIn(data, ['parent', 'email'])}
            onChange={(v) => setPath(['parent', 'email'], v)}
            readOnly={readOnly} type="email"
          />
        </div>
      </div>

      {adminMode && (
        <AdminNoteField docId={adminDocId} noteKey="contact" initialValue={adminNotes?.perClip?.contact || ''} />
      )}
    </SectionShell>
  );
}
