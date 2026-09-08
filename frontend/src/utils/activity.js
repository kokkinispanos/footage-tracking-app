/**
 * When did this player last do something?
 *
 * "Is he working on it?" used to be a guess — you had to open a record and try to remember
 * what was in it last week. Every save already stamps `updatedAt`, and signing in stamps
 * `profile.lastSeenAt`, so the answer is just the later of the two.
 *
 * The two are different questions and both matter:
 *   `updatedAt`   — he added something. Real progress.
 *   `lastSeenAt`  — he opened it and did nothing. He has seen the gaps and left them.
 * A player who signs in every day and never adds a clip is a different problem from one who
 * has vanished, and the admin list shows which is which.
 */

/**
 * A timestamp in the future is a broken clock, not a visit from tomorrow.
 *
 * `lastSeenAt` is a server timestamp now, but records written before that change hold an ISO
 * string from the player's own device — and a phone set a year ahead would have shown him as
 * "active just now" on the coach's list until that date actually arrived. Clamping to now
 * makes the wrong answer boring instead of misleading.
 */
function clampToNow(ms) {
  const now = Date.now();
  return ms > now ? now : ms;
}

/** Firestore Timestamps, Dates and ISO strings all become milliseconds. Anything else is 0. */
export function toMs(value) {
  if (!value) return 0;
  if (typeof value === 'object') {
    if (typeof value.toMillis === 'function') return clampToNow(value.toMillis());   // Timestamp
    if (typeof value.seconds === 'number') return clampToNow(value.seconds * 1000);  // {seconds}
    if (value instanceof Date) return clampToNow(value.getTime());
  }
  if (typeof value === 'number') return clampToNow(value);
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : clampToNow(parsed);
}

export function lastSavedMs(player) {
  return toMs(player?.updatedAt);
}

export function lastSeenMs(player) {
  return toMs(player?.profile?.lastSeenAt);
}

/** The most recent sign of life, whichever kind it was. */
export function lastActiveMs(player) {
  return Math.max(lastSavedMs(player), lastSeenMs(player), toMs(player?.profile?.createdAt));
}

export function daysSince(ms) {
  if (!ms) return null;
  return Math.floor((Date.now() - ms) / 86400000);
}

/** "3 days ago", "just now" — short enough for a list row. */
export function humanAge(ms) {
  if (!ms) return 'never';
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 90) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 31) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  return 'over a year ago';
}

export function fullDate(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/**
 * One line for the admin list, with a colour.
 *
 * The thresholds are deliberately gentle: a week without touching it is normal for someone
 * waiting on a match to be filmed. Two weeks is worth a message. A month is a problem.
 */
export function describeActivity(player) {
  const savedMs = lastSavedMs(player);
  const seenMs = lastSeenMs(player);
  const activeMs = lastActiveMs(player);
  const days = daysSince(activeMs);

  if (!activeMs) {
    return { activeMs, savedMs, seenMs, days: null, tone: 'neutral', label: 'No activity yet', quiet: false };
  }

  let tone = 'success';
  if (days >= 7) tone = 'neutral';
  if (days >= 14) tone = 'warning';
  if (days >= 30) tone = 'error';

  // Seen it recently but added nothing for a fortnight: he is looking, not doing.
  const lookingNotDoing = days <= 3 && savedMs > 0 && daysSince(savedMs) >= 14;

  return {
    activeMs,
    savedMs,
    seenMs,
    days,
    tone: lookingNotDoing ? 'warning' : tone,
    label: lookingNotDoing
      ? `Opened ${humanAge(activeMs)}, added nothing in ${daysSince(savedMs)} days`
      : `Active ${humanAge(activeMs)}`,
    quiet: days >= 14,
  };
}
