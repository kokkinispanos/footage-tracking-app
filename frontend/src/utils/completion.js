/**
 * ONE completion formula, used by the player's dashboard AND the admin overview.
 *
 * The old app had two different sums: a record that showed 100% to the admin showed 77%
 * to the player. Nobody could trust either number. There is now exactly one.
 *
 * The targets come from the Footage Submission Guide, not from a round number:
 *   3 full games, 3 top clips, 10 skill clips (the guide asks for 10-20),
 *   6 photos, 1 master Drive folder.
 */

export const TARGETS = {
  fullGames: 3,
  topThreeClips: 3,
  skillClips: 10,
  photos: 6,
  driveFolder: 1,
};

export const TOTAL_TARGET =
  TARGETS.fullGames + TARGETS.topThreeClips + TARGETS.skillClips +
  TARGETS.photos + TARGETS.driveFolder;

const filled = (value) => typeof value === 'string' && value.trim().length > 0;

export function countSkillClips(playerData) {
  return Object.values(playerData?.skillClips || {})
    .reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
}

export function countPhotos(playerData) {
  return Object.values(playerData?.photos || {})
    .filter((p) => filled(p?.link)).length;
}

export function calculateCompletion(playerData) {
  const counts = {
    fullGames: playerData?.fullGames?.length || 0,
    topThreeClips: playerData?.topThreeClips?.length || 0,
    skillClips: countSkillClips(playerData),
    photos: countPhotos(playerData),
    driveFolder: filled(playerData?.driveFolder?.link) ? 1 : 0,
  };

  // Each section counts only up to its own target, so 40 skill clips cannot hide
  // the fact that no photos were ever added.
  const done = Object.keys(TARGETS)
    .reduce((sum, key) => sum + Math.min(counts[key], TARGETS[key]), 0);

  const percent = Math.min(100, Math.round((done / TOTAL_TARGET) * 100));

  let tone = 'error';
  if (percent >= 34 && percent < 67) tone = 'warning';
  if (percent >= 67) tone = 'success';

  return {
    counts,
    done,
    total: TOTAL_TARGET,
    percent,
    tone,
    sections: Object.keys(TARGETS).map((key) => ({
      key,
      count: counts[key],
      target: TARGETS[key],
      complete: counts[key] >= TARGETS[key],
    })),
  };
}

/** Sortable timestamp from the ISO string the app stores. Returns 0 when it is missing. */
export function createdAtMs(playerData) {
  const raw = playerData?.profile?.createdAt;
  if (!raw) return 0;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * The ONE thing worth doing next.
 *
 * A progress bar tells a player he is at 43%. It does not tell him what to do about it, and a
 * list of five gaps is a list nobody starts. So: one sentence, one section, in the order the
 * footage guide actually needs things — the editor cannot cut a reel from photos.
 */
export function nextStep(playerData) {
  const { counts, percent } = calculateCompletion(playerData);

  const steps = [
    counts.fullGames === 0 && {
      anchor: 'full-games',
      title: 'Start with one full game',
      body: 'A whole match, not a clip. Everything your editor cuts comes from these, so this is the one that unblocks the rest.',
    },
    counts.fullGames < TARGETS.fullGames && {
      anchor: 'full-games',
      title: `Add ${TARGETS.fullGames - counts.fullGames} more full game${TARGETS.fullGames - counts.fullGames === 1 ? '' : 's'}`,
      body: 'Different opponents if you can. Three gives your editor enough to find your best minutes.',
    },
    counts.topThreeClips < TARGETS.topThreeClips && {
      anchor: 'top-clips',
      title: `Pick your top ${TARGETS.topThreeClips} moments`,
      body: 'The three you would show a scout if you had thirty seconds of his attention. Nobody knows them better than you.',
    },
    counts.skillClips < TARGETS.skillClips && {
      anchor: 'skill-clips',
      title: `${TARGETS.skillClips - counts.skillClips} more skill clip${TARGETS.skillClips - counts.skillClips === 1 ? '' : 's'}`,
      body: 'Short ones, sorted by what they show. Spread them across the categories rather than ten of the same thing.',
    },
    counts.photos < TARGETS.photos && {
      anchor: 'photos',
      title: `Add ${TARGETS.photos - counts.photos} more photo${TARGETS.photos - counts.photos === 1 ? '' : 's'}`,
      body: 'These go on your profile page and into club emails. A clean kit shot and a headshot matter most.',
    },
    counts.driveFolder < 1 && {
      anchor: 'drive-folder',
      title: 'Link your master Drive folder',
      body: 'One folder holding all of it, shared so anyone with the link can view. It is the last piece.',
    },
  ].filter(Boolean);

  if (steps.length === 0) {
    return {
      done: true,
      anchor: null,
      title: 'Everything on the checklist is in',
      body: 'Nothing is waiting on you. If you film something better, swap it in — this stays open.',
      percent,
    };
  }

  return { done: false, percent, ...steps[0] };
}

/** Which week of his own hub he is in. Honest, and it does not invent a deadline. */
export function weeksSinceStart(playerData) {
  const ms = createdAtMs(playerData);
  if (!ms) return null;
  return Math.floor((Date.now() - ms) / 604800000) + 1;
}
