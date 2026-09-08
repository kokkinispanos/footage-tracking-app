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
