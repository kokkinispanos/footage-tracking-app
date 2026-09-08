import { calculateCompletion, TARGETS } from './completion';
import { ALL_SKILL_CATEGORIES, PHOTO_TYPES, skillLabel } from './catalog';
import { lastActiveMs, lastSavedMs, fullDate } from './activity';

/**
 * Getting the player's own work back out of the app.
 *
 * Two reasons this exists. The obvious one: nobody should be able to put six months of work
 * into a tool and not be able to take it with them. The one that gets used every week: the
 * editor needs a flat list of every link, and today somebody opens the record and copies them
 * out one at a time.
 *
 * Two files, because they answer different questions:
 *   .txt   what have I sent, and what is still missing — readable by a person
 *   .json  everything exactly as stored — readable by a machine, nothing dropped
 */

/** The lines are joined with newlines at the end, so a blank entry IS the blank line. */
const line = () => '';

function heading(text) {
  return `${text}\n${'-'.repeat(text.length)}`;
}

function safeName(playerData) {
  const name = (playerData?.profile?.fullName || 'player').trim().toLowerCase();
  return name.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'player';
}

/** What is still short of target, in words, so he does not have to do the subtraction. */
export function missingList(playerData) {
  const { counts } = calculateCompletion(playerData);
  const gaps = [];
  const need = (key, singular, plural) => {
    const short = TARGETS[key] - counts[key];
    if (short > 0) gaps.push(`${short} ${short === 1 ? singular : plural}`);
  };
  need('fullGames', 'full game', 'full games');
  need('topThreeClips', 'top clip', 'top clips');
  need('skillClips', 'skill clip', 'skill clips');
  need('photos', 'photo', 'photos');
  if (counts.driveFolder < 1) gaps.push('the master Drive folder');
  return gaps;
}

/**
 * The readable one. This is the file that gets forwarded to an editor, so every link is on
 * its own line with nothing wrapped around it — links that are hard to select are links that
 * get mis-copied.
 */
export function buildLinkSheet(playerData) {
  const p = playerData || {};
  const profile = p.profile || {};
  const stats = calculateCompletion(p);
  const out = [];

  out.push('PRO PLACEMENT — PLAYER HUB');
  out.push('='.repeat(40));
  out.push(`${profile.fullName || 'Unnamed player'}${profile.position ? ` · ${profile.position}` : ''}`);
  if (profile.email) out.push(profile.email);
  out.push(`Exported ${new Date().toLocaleString()}`);
  const active = lastActiveMs(p);
  if (active) out.push(`Last activity ${fullDate(active)}`);
  out.push(line());
  out.push(`PROGRESS: ${stats.percent}%  (${stats.done} of ${stats.total} pieces)`);
  out.push(line());

  // 1 -------------------------------------------------------------- full games
  out.push(heading(`1. FULL GAME RECORDINGS  (${stats.counts.fullGames}/${TARGETS.fullGames})`));
  const games = Array.isArray(p.fullGames) ? p.fullGames : [];
  if (games.length === 0) out.push('  (none yet)');
  games.forEach((g, i) => {
    out.push(`  ${i + 1}. ${g.label || 'Untitled game'}${g.date ? `  ·  ${g.date}` : ''}`);
    out.push(`     ${g.link || '(no link)'}`);
    if (g.notes) out.push(`     note: ${g.notes}`);
  });
  out.push(line());

  // 2 --------------------------------------------------------------- top clips
  out.push(heading(`2. TOP 3 CLIPS  (${stats.counts.topThreeClips}/${TARGETS.topThreeClips})`));
  const top = Array.isArray(p.topThreeClips) ? p.topThreeClips : [];
  if (top.length === 0) out.push('  (none yet)');
  top.forEach((c, i) => {
    out.push(`  ${i + 1}. ${c.title || 'Untitled clip'}${c.category ? `  ·  ${c.category}` : ''}`);
    out.push(`     ${c.link || '(no link)'}`);
    if (c.whyBest) out.push(`     why: ${c.whyBest}`);
  });
  out.push(line());

  // 3 ------------------------------------------------------------- skill clips
  out.push(heading(`3. SKILL CLIPS  (${stats.counts.skillClips}/${TARGETS.skillClips})`));
  const skills = p.skillClips || {};
  const usedCategories = ALL_SKILL_CATEGORIES.filter((c) => (skills[c.key] || []).length > 0);
  if (usedCategories.length === 0) out.push('  (none yet)');
  usedCategories.forEach((cat) => {
    out.push(`  ${cat.label}`);
    (skills[cat.key] || []).forEach((clip) => {
      out.push(`     ${clip.link || '(no link)'}`);
      if (clip.notes) out.push(`       note: ${clip.notes}`);
    });
  });
  // Categories the player has stored under a key we no longer show, so nothing is hidden.
  Object.keys(skills)
    .filter((k) => !ALL_SKILL_CATEGORIES.some((c) => c.key === k) && (skills[k] || []).length > 0)
    .forEach((k) => {
      out.push(`  ${skillLabel(k)}`);
      skills[k].forEach((clip) => out.push(`     ${clip.link || '(no link)'}`));
    });
  out.push(line());

  // 4 ------------------------------------------------------------------ photos
  out.push(heading(`4. PHOTOS  (${stats.counts.photos}/${TARGETS.photos})`));
  PHOTO_TYPES.forEach((slot) => {
    const link = p.photos?.[slot.key]?.link;
    out.push(`  ${slot.label.padEnd(22)} ${link ? link : '(missing)'}`);
  });
  out.push(line());

  // 5 ------------------------------------------------------------------- drive
  out.push(heading('5. MASTER DRIVE FOLDER'));
  out.push(`  ${p.driveFolder?.link || '(missing)'}`);
  out.push(line());

  // what is left
  const gaps = missingList(p);
  out.push(heading('STILL TO SEND'));
  if (gaps.length === 0) out.push('  Nothing — everything on the checklist is in.');
  else gaps.forEach((g) => out.push(`  - ${g}`));
  out.push(line());
  out.push('Every link should open in a private browser window. If it asks for permission,');
  out.push('it is not shared correctly and the editor cannot use it.');

  return out.join('\n');
}

/** Everything exactly as stored, minus the internal plumbing nobody can use outside the app. */
export function buildRawJson(playerData) {
  const { id, authUid, authEmail, updatedAt, ...rest } = playerData || {};
  const savedMs = lastSavedMs(playerData);
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      exportedBy: 'Pro Placement Player Hub',
      // The last time something was SAVED. Not the last time the hub was opened — those are
      // different facts and this file used to report the second one under the first one's name.
      lastSavedAt: savedMs ? new Date(savedMs).toISOString() : null,
      lastOpenedAt: lastActiveMs(playerData) ? new Date(lastActiveMs(playerData)).toISOString() : null,
      player: rest,
    },
    null,
    2,
  );
}

/**
 * Hand the file to the browser.
 * The object URL is revoked on the next tick — Safari cancels the download if it goes early.
 */
export function downloadText(filename, text, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

export function downloadLinkSheet(playerData) {
  downloadText(`${safeName(playerData)}-footage-${stamp()}.txt`, buildLinkSheet(playerData));
}

export function downloadRawJson(playerData) {
  downloadText(
    `${safeName(playerData)}-hub-data-${stamp()}.json`,
    buildRawJson(playerData),
    'application/json;charset=utf-8',
  );
}

/** Clipboard, for the player who wants to paste it straight into a message. */
export async function copyLinkSheet(playerData) {
  await navigator.clipboard.writeText(buildLinkSheet(playerData));
}
