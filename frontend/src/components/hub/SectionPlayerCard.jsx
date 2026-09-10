import { BarChart3, Plus, Trash2 } from 'lucide-react';
import { SectionShell } from '../dashboard/SectionShell';
import { AdminNoteField } from '../dashboard/AdminNoteField';
import { TextField, TextArea, SelectField, ChoiceField, TagField } from './Field';
import { useHubSection, getIn } from './useHubSection';
import { usePlayer } from '../../context/PlayerContext';
import {
  FOOT, PLAY_LEVEL, COMMON_LANGUAGES, OUTFIELD_NUMBERS, KEEPER_NUMBERS,
} from '../../utils/hubCatalog';
import { isGoalkeeper } from '../../utils/catalog';
import { countPlayerCard, HUB_TARGETS } from '../../utils/hubCompletion';
import { Button } from '../ui/Button';
import { useConfirm } from '../ui/ConfirmDialog';

const blankSeason = () => ({
  id: `s${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
  season: '', club: '', league: '', matches: '', goals: '', assists: '',
});

/**
 * The numbers and facts that go into every club email.
 *
 * The measured numbers get one box each, with the unit printed on the box. They used to be
 * one free text field, and a real player's cell read "Top Speed/ 32 km/hour, Distance
 * sprint: 120m 13seconds, 7 saves avr per game, 6 foot 7 tall". That went in front of clubs.
 */
export function SectionPlayerCard({ adminMode, overrideData, adminDocId, adminNotes, index = 7 }) {
  const { data, set, setPath, readOnly } = useHubSection('playerCard', { adminMode, overrideData });
  const context = usePlayer();
  const record = adminMode ? overrideData : context.playerData;
  const { confirm, dialog } = useConfirm();

  const keeper = isGoalkeeper(record?.profile?.position || '');
  const numbers = keeper ? KEEPER_NUMBERS : OUTFIELD_NUMBERS;
  const seasons = Array.isArray(data.seasons) ? data.seasons : [];

  const addSeason = () => set('seasons', [...seasons, blankSeason()]);

  const changeSeason = (id, key, value) =>
    set('seasons', seasons.map((s) => (s.id === id ? { ...s, [key]: value } : s)));

  const removeSeason = async (id) => {
    const ok = await confirm({
      title: 'Delete this season?',
      body: 'The row goes. You can add it again any time.',
      confirmText: 'Yes, delete it',
    });
    if (ok) set('seasons', seasons.filter((s) => s.id !== id));
  };

  return (
    <SectionShell
      icon={BarChart3}
      index={index}
      title="Your numbers"
      description="This is what goes in every email we send a club. The more of it you fill in, the less they have to ask."
      count={countPlayerCard(record)}
      target={HUB_TARGETS.playerCard}
    >
      {dialog}

      {/* ------------------------------------------------------------- your body */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TextField
          label="How tall are you?"
          value={data.heightCm} onChange={(v) => set('heightCm', v)}
          readOnly={readOnly} unit="cm" inputMode="numeric" placeholder="180"
        />
        <TextField
          label="How much do you weigh?"
          value={data.weightKg} onChange={(v) => set('weightKg', v)}
          readOnly={readOnly} unit="kg" inputMode="numeric" placeholder="75"
        />
        <ChoiceField
          label="Which foot?"
          value={data.foot} onChange={(v) => set('foot', v)}
          readOnly={readOnly} options={FOOT}
        />
      </div>

      {/* ------------------------------------------------------------- your club */}
      <div className="rounded-xl bg-black/20 border border-white/[0.07] p-4 space-y-4">
        <h3 className="text-sm font-semibold text-ink">Where you play now</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            label="Your club"
            value={data.club} onChange={(v) => set('club', v)}
            readOnly={readOnly} placeholder="Write the full name"
            hint="Leave it empty if you do not have one."
          />
          <SelectField
            label="What level is it?"
            value={data.level} onChange={(v) => set('level', v)}
            readOnly={readOnly} options={PLAY_LEVEL} placeholder="Pick one"
          />
          <ChoiceField
            label="Are you signed to them?"
            value={data.registered} onChange={(v) => set('registered', v)}
            readOnly={readOnly}
            options={[
              { value: 'yes', label: 'Yes, I am signed' },
              { value: 'no', label: 'No, I am free' },
            ]}
          />
          <TextField
            label="When does your contract end?"
            type="date" value={data.contractUntil} onChange={(v) => set('contractUntil', v)}
            readOnly={readOnly} hint="Skip this if you are not signed."
          />
          <TextField
            label="When can you join a new club?"
            type="date" value={data.availableFrom} onChange={(v) => set('availableFrom', v)}
            readOnly={readOnly} hint="If you can go now, pick today."
          />
        </div>
        <TagField
          label="What languages do you speak?"
          hint="Tap the ones you speak. Clubs care about this more than you would think."
          value={data.languages} onChange={(v) => set('languages', v)}
          readOnly={readOnly} options={COMMON_LANGUAGES} addLabel="Add a language"
        />
      </div>

      {/* ---------------------------------------------------------- the numbers */}
      <div className="rounded-xl bg-black/20 border border-white/[0.07] p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">Your measured numbers</h3>
          <p className="text-[13px] text-ink-muted mt-1 leading-relaxed">
            Only put in numbers someone actually measured. A GPS vest, a coach with a stopwatch,
            a match report. Leave the rest empty. A made up number gets found out at the trial.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {numbers.map((n) => (
            <TextField
              key={n.key}
              label={n.label}
              unit={n.unit}
              hint={n.hint}
              inputMode="decimal"
              value={getIn(data, ['numbers', n.key])}
              onChange={(v) => setPath(['numbers', n.key], v)}
              readOnly={readOnly}
            />
          ))}
        </div>
      </div>

      {/* ---------------------------------------------------------- season stats */}
      <div className="rounded-xl bg-black/20 border border-white/[0.07] p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-ink">Your seasons</h3>
            <p className="text-[13px] text-ink-muted mt-1 leading-relaxed">
              One line per season. Start with this one and work backwards.
            </p>
          </div>
          {!readOnly && (
            <Button size="sm" variant="secondary" onClick={addSeason} className="gap-1.5 flex-none">
              <Plus className="w-3.5 h-3.5" /> Add a season
            </Button>
          )}
        </div>

        {seasons.length === 0 ? (
          <p className="text-[13px] text-ink-faint italic py-2">No seasons added yet.</p>
        ) : (
          <div className="space-y-3">
            {seasons.map((s) => (
              <div key={s.id} className="rounded-lg bg-black/30 border border-white/[0.07] p-3.5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <TextField label="Season" value={s.season} readOnly={readOnly}
                    onChange={(v) => changeSeason(s.id, 'season', v)} placeholder="2025/26" />
                  <TextField label="Club" value={s.club} readOnly={readOnly}
                    onChange={(v) => changeSeason(s.id, 'club', v)} />
                  <TextField label="League" value={s.league} readOnly={readOnly}
                    onChange={(v) => changeSeason(s.id, 'league', v)} />
                  <TextField label="Games" value={s.matches} readOnly={readOnly} inputMode="numeric"
                    onChange={(v) => changeSeason(s.id, 'matches', v)} />
                  <TextField label="Goals" value={s.goals} readOnly={readOnly} inputMode="numeric"
                    onChange={(v) => changeSeason(s.id, 'goals', v)} />
                  <TextField label="Assists" value={s.assists} readOnly={readOnly} inputMode="numeric"
                    onChange={(v) => changeSeason(s.id, 'assists', v)} />
                </div>
                {!readOnly && (
                  <div className="flex justify-end mt-3">
                    <Button variant="danger" size="sm" onClick={() => removeSeason(s.id)} className="gap-1.5">
                      <Trash2 className="w-3.5 h-3.5" /> Delete this season
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------ your story */}
      <div className="space-y-4">
        <TextArea
          label="What have you won?"
          hint="Cups, player of the season, call ups, trials you got. Anything at all. One per line."
          value={data.achievements} onChange={(v) => set('achievements', v)}
          readOnly={readOnly} rows={3}
          placeholder={'Regional cup winner 2024\nPlayer of the month, March'}
        />
        <TextArea
          label="Tell us about your football so far"
          hint="Where you started, the clubs you have been at, anything that happened along the way. Write it how you would say it."
          value={data.history} onChange={(v) => set('history', v)}
          readOnly={readOnly} rows={4}
        />
        <TextField
          label="One line about you"
          hint="How would you describe yourself as a player, in one sentence? We may use it word for word."
          value={data.headline} onChange={(v) => set('headline', v)}
          readOnly={readOnly}
          placeholder="Left footed winger who runs at defenders all game"
        />
        <TextArea
          label="A short bit about you"
          hint="Three or four sentences. What you are good at, what you are working on, what you want next."
          value={data.summary} onChange={(v) => set('summary', v)}
          readOnly={readOnly} rows={4}
        />
      </div>

      {adminMode && (
        <AdminNoteField docId={adminDocId} noteKey="playerCard" initialValue={adminNotes?.perClip?.playerCard || ''} />
      )}
    </SectionShell>
  );
}
