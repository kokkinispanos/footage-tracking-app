import { ShieldCheck, Info } from 'lucide-react';
import { SectionShell } from '../dashboard/SectionShell';
import { AdminNoteField } from '../dashboard/AdminNoteField';
import { TextField, SelectField, ChoiceField, ConsentField } from './Field';
import { FileSlot } from './FileSlot';
import { useHubSection, getIn } from './useHubSection';
import { usePlayer } from '../../context/PlayerContext';
import { ALL_COUNTRIES, FAMILY_RELATIONS, WORK_STATUS, CONSENTS } from '../../utils/hubCatalog';
import { countIdentity, HUB_TARGETS, eligibilityHint } from '../../utils/hubCompletion';
import { cn } from '../../utils/cn';

const TONE_BOX = {
  success: 'bg-success/[0.07] border-success/25 text-success',
  warning: 'bg-warning/[0.07] border-warning/25 text-warning',
  neutral: 'bg-white/[0.04] border-white/10 text-ink-muted',
};

/**
 * Who he is, and which countries are even possible for him.
 *
 * The family question is the most valuable one in the app. A player with an Irish
 * grandmother can often get an EU passport, which changes the whole list of clubs he can be
 * sent to. Almost nobody volunteers it, because nobody tells them it matters. So we ask,
 * and we say why.
 */
export function SectionIdentity({ adminMode, overrideData, adminDocId, adminNotes, index = 6 }) {
  const { data, set, setPath, readOnly } = useHubSection('identity', { adminMode, overrideData });
  const context = usePlayer();
  const record = adminMode ? overrideData : context.playerData;
  const uid = record?.authUid || record?.id;
  const playerDocId = record?.id;

  const hint = eligibilityHint(record);
  const hasSecond = !!(getIn(data, ['passportTwo', 'country']) || getIn(data, ['passportTwo', 'file', 'name'], ''));
  const familyAnswer = getIn(data, ['euFamily', 'has']);

  return (
    <SectionShell
      icon={ShieldCheck}
      index={index}
      title="Who you are"
      description="Clubs abroad have to check this before they can talk to you. Do it once and it is done."
      count={countIdentity(record)}
      target={HUB_TARGETS.identity}
    >
      {hint && (
        <div className={cn('flex items-start gap-2.5 rounded-xl border px-4 py-3', TONE_BOX[hint.tone])}>
          <Info className="w-4 h-4 flex-none mt-0.5" />
          <p className="text-[13px] leading-relaxed">{hint.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          label="Your birthday"
          type="date"
          value={data.dateOfBirth}
          onChange={(v) => set('dateOfBirth', v)}
          readOnly={readOnly}
          hint="Pick it from the calendar. Do not type it."
        />
        <SelectField
          label="Can you work in another country right now?"
          value={data.workStatus}
          onChange={(v) => set('workStatus', v)}
          readOnly={readOnly}
          options={WORK_STATUS}
          placeholder="Pick the one that fits"
          className="sm:col-span-1"
        />
      </div>

      {/* ------------------------------------------------------------ passport 1 */}
      <div className="rounded-xl bg-black/20 border border-white/[0.07] p-4 space-y-4">
        <h3 className="text-sm font-semibold text-ink">Your passport</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField
            label="Which country is it from?"
            value={getIn(data, ['passportOne', 'country'])}
            onChange={(v) => setPath(['passportOne', 'country'], v)}
            readOnly={readOnly}
            options={ALL_COUNTRIES}
            placeholder="Pick your country"
          />
          <TextField
            label="When does it run out?"
            type="date"
            value={getIn(data, ['passportOne', 'expiry'])}
            onChange={(v) => setPath(['passportOne', 'expiry'], v)}
            readOnly={readOnly}
            hint="It is on the front page of your passport."
          />
        </div>
        <FileSlot
          slot="passportOne"
          uid={uid}
          playerDocId={playerDocId}
          claimPath="identity.passportOne.file"
          label="Photo of your passport"
          hint="Take a photo of the page with your face on it. Make sure you can read it. Only you and your coach can ever see it."
          value={getIn(data, ['passportOne', 'file'], null)}
          onChange={(file) => setPath(['passportOne', 'file'], file)}
          readOnly={readOnly}
        />
      </div>

      {/* ------------------------------------------------------------ passport 2 */}
      {hasSecond || !readOnly ? (
        <div className="rounded-xl bg-black/20 border border-white/[0.07] p-4 space-y-4">
          <h3 className="text-sm font-semibold text-ink">
            A second passport
            <span className="font-normal text-ink-faint"> (only if you have one)</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField
              label="Which country?"
              value={getIn(data, ['passportTwo', 'country'])}
              onChange={(v) => setPath(['passportTwo', 'country'], v)}
              readOnly={readOnly}
              options={ALL_COUNTRIES}
              placeholder="Pick the country"
            />
            <TextField
              label="When does it run out?"
              type="date"
              value={getIn(data, ['passportTwo', 'expiry'])}
              onChange={(v) => setPath(['passportTwo', 'expiry'], v)}
              readOnly={readOnly}
            />
          </div>
          {(hasSecond || getIn(data, ['passportTwo', 'country'])) && (
            <FileSlot
              slot="passportTwo"
              uid={uid}
              playerDocId={playerDocId}
              claimPath="identity.passportTwo.file"
              label="Photo of your second passport"
              hint="Same again. The page with your face on it."
              value={getIn(data, ['passportTwo', 'file'], null)}
              onChange={(file) => setPath(['passportTwo', 'file'], file)}
              readOnly={readOnly}
            />
          )}
        </div>
      ) : null}

      {/* ---------------------------------------------------------- family in EU */}
      <div className="rounded-xl bg-brand/[0.06] border border-brand/20 p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-brand-light">
            Was your mum, dad, or a grandparent born in Europe?
          </h3>
          <p className="text-[13px] text-ink-muted mt-1 leading-relaxed">
            This one matters more than people think. If one of them was born in an EU country,
            you can often get that passport too. That means a lot more clubs can sign you.
            Answer it even if you are not sure.
          </p>
        </div>

        <ChoiceField
          value={familyAnswer}
          onChange={(v) => setPath(['euFamily', 'has'], v)}
          readOnly={readOnly}
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
            { value: 'notsure', label: 'I am not sure' },
          ]}
        />

        {(familyAnswer === 'yes' || familyAnswer === 'notsure') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ChoiceField
              label="Who was it?"
              value={getIn(data, ['euFamily', 'relation'])}
              onChange={(v) => setPath(['euFamily', 'relation'], v)}
              readOnly={readOnly}
              options={FAMILY_RELATIONS}
            />
            <SelectField
              label="Which country?"
              value={getIn(data, ['euFamily', 'country'])}
              onChange={(v) => setPath(['euFamily', 'country'], v)}
              readOnly={readOnly}
              options={ALL_COUNTRIES}
              placeholder="Pick the country"
            />
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------- consents */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">Three things we need you to say yes to</h3>
          <p className="text-[13px] text-ink-muted mt-1 leading-relaxed">
            We cannot start contacting clubs until you tick all three. You can untick any of
            them later and we stop.
          </p>
        </div>
        {CONSENTS.map((c) => (
          <ConsentField
            key={c.key}
            label={c.label}
            why={c.why}
            value={getIn(data, ['consents', c.key], null)}
            onChange={(v) => setPath(['consents', c.key], v)}
            readOnly={readOnly}
          />
        ))}
      </div>

      {adminMode && (
        <AdminNoteField docId={adminDocId} noteKey="identity" initialValue={adminNotes?.perClip?.identity || ''} />
      )}
    </SectionShell>
  );
}
