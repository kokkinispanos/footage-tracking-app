import { BarChart3, Plus, Trash2 } from 'lucide-react';
import { SectionShell } from '../dashboard/SectionShell';
import { AdminNoteField } from '../dashboard/AdminNoteField';
import { TextField, TextArea, SelectField, ChoiceField, TagField } from './Field';
import { useHubSection, getIn } from './useHubSection';
import { usePlayer } from '../../context/PlayerContext';
import {
  FOOT, PLAY_LEVEL, COMMON_LANGUAGES, OUTFIELD_NUMBERS, KEEPER_NUMBERS,
  TEAM_LEVELS, LANGUAGE_LEVELS, RELOCATION, TRIAL_NOTICE, WEAK_FOOT,
  STRENGTH_TAGS, GK_STRENGTH_TAGS, ALL_COUNTRIES,
} from '../../utils/hubCatalog';
import { isGoalkeeper, POSITIONS } from '../../utils/catalog';
import { countPlayerCard, HUB_TARGETS } from '../../utils/hubCompletion';
import { Button } from '../ui/Button';
import { useConfirm } from '../ui/ConfirmDialog';

const blankSeason = () => ({
  id: `s${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
  season: '', club: '', country: '', league: '', teamLevel: '',
  matches: '', minutes: '', goals: '', assists: '',
  yellowCards: '', redCards: '', cleanSheets: '', note: '',
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
  const languages = Array.isArray(data.languages) ? data.languages : [];

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

      {/* --------------------------------------------------------- where he plays */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SelectField
          label="Can you play anywhere else?"
          value={data.secondaryPosition} onChange={(v) => set('secondaryPosition', v)}
          readOnly={readOnly} options={POSITIONS} placeholder="Only if you really can"
          hint="Leave it empty rather than guessing. A club will try you there."
        />
        <TextField
          label="Your shirt number"
          value={data.squadNumber} onChange={(v) => set('squadNumber', v)}
          readOnly={readOnly} inputMode="numeric" placeholder="9"
        />
        <ChoiceField
          label="Your other foot"
          value={data.weakFoot} onChange={(v) => set('weakFoot', v)}
          readOnly={readOnly} options={WEAK_FOOT}
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

        {/* How well, not just which. A club flying him in wants to know if he can be
            talked to on the pitch. */}
        {languages.length > 0 && (
          <div className="space-y-3 pt-1">
            <p className="text-[13px] text-ink-muted">How good are you at each one?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {languages.map((lang) => (
                <SelectField
                  key={lang}
                  label={lang}
                  value={getIn(data, ['languageLevels', lang])}
                  onChange={(v) => setPath(['languageLevels', lang], v)}
                  readOnly={readOnly} options={LANGUAGE_LEVELS} placeholder="Pick one"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------ moving away */}
      <div className="rounded-xl bg-black/20 border border-white/[0.07] p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">Moving, and going on trial</h3>
          <p className="text-[13px] text-ink-muted mt-1 leading-relaxed">
            A trial usually lands with about three days' notice. Clubs ask this before they
            ask anything else, so answering it honestly now saves a week later.
          </p>
        </div>
        <ChoiceField
          label="Would you move abroad to play?"
          value={data.relocation} onChange={(v) => set('relocation', v)}
          readOnly={readOnly} options={RELOCATION}
        />
        <ChoiceField
          label="How much notice do you need for a trial?"
          value={data.trialNotice} onChange={(v) => set('trialNotice', v)}
          readOnly={readOnly} options={TRIAL_NOTICE}
        />
        <TextField
          label="Anything that would stop you travelling?"
          hint="Exams, work, a passport that has run out, money. Say it now, not later. We work around it."
          value={data.travelNotes} onChange={(v) => set('travelNotes', v)}
          readOnly={readOnly}
        />
      </div>

      {/* -------------------------------------------------------------- his game */}
      <div className="rounded-xl bg-black/20 border border-white/[0.07] p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">What you are good at</h3>
          <p className="text-[13px] text-ink-muted mt-1 leading-relaxed">
            This is the part of your CV a scout reads first. Tap what is actually true of
            you. Three or four honest ones beat twelve.
          </p>
        </div>
        <TagField
          label="Your strengths"
          value={data.strengths} onChange={(v) => set('strengths', v)}
          readOnly={readOnly}
          options={keeper ? GK_STRENGTH_TAGS : STRENGTH_TAGS}
          addLabel="Add your own"
        />
        <TextField
          label="What system do you play best in?"
          hint="Like a 4-3-3 as the holding midfielder, or a back three on the left. Write it how your coach would say it."
          value={data.tacticalFit} onChange={(v) => set('tacticalFit', v)}
          readOnly={readOnly}
          placeholder="4-3-3, holding midfielder"
        />
        <TextField
          label="Which player do you play a bit like?"
          hint="Not who you want to be. Who you actually resemble on the pitch. Skip it if nobody comes to mind."
          value={data.comparison} onChange={(v) => set('comparison', v)}
          readOnly={readOnly}
        />
        <TextArea
          label="What are you working on?"
          hint="Every honest player has something. Saying it makes the rest of your CV more believable, not less."
          value={data.workingOn} onChange={(v) => set('workingOn', v)}
          readOnly={readOnly} rows={2}
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
                  <SelectField label="Country" value={s.country} readOnly={readOnly}
                    onChange={(v) => changeSeason(s.id, 'country', v)}
                    options={ALL_COUNTRIES} placeholder="Pick one" />
                  <TextField label="League" value={s.league} readOnly={readOnly}
                    onChange={(v) => changeSeason(s.id, 'league', v)} />
                  {/* "20 games" means a different thing in an U19 side than in a first team,
                      and a CV that does not say which is a CV a scout stops trusting. */}
                  <SelectField label="Which team" value={s.teamLevel} readOnly={readOnly}
                    onChange={(v) => changeSeason(s.id, 'teamLevel', v)}
                    options={TEAM_LEVELS} placeholder="Pick one" />
                  <TextField label="Games" value={s.matches} readOnly={readOnly} inputMode="numeric"
                    onChange={(v) => changeSeason(s.id, 'matches', v)} />
                  <TextField label="Minutes" value={s.minutes} readOnly={readOnly} inputMode="numeric"
                    onChange={(v) => changeSeason(s.id, 'minutes', v)} />
                  <TextField label="Goals" value={s.goals} readOnly={readOnly} inputMode="numeric"
                    onChange={(v) => changeSeason(s.id, 'goals', v)} />
                  <TextField label="Assists" value={s.assists} readOnly={readOnly} inputMode="numeric"
                    onChange={(v) => changeSeason(s.id, 'assists', v)} />
                  <TextField label="Yellow cards" value={s.yellowCards} readOnly={readOnly} inputMode="numeric"
                    onChange={(v) => changeSeason(s.id, 'yellowCards', v)} />
                  <TextField label="Red cards" value={s.redCards} readOnly={readOnly} inputMode="numeric"
                    onChange={(v) => changeSeason(s.id, 'redCards', v)} />
                  {keeper && (
                    <TextField label="Clean sheets" value={s.cleanSheets} readOnly={readOnly} inputMode="numeric"
                      onChange={(v) => changeSeason(s.id, 'cleanSheets', v)} />
                  )}
                </div>
                <div className="mt-3">
                  <TextField label="Anything about that season?" value={s.note} readOnly={readOnly}
                    onChange={(v) => changeSeason(s.id, 'note', v)}
                    placeholder="Captain, promoted, out injured from January" />
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
