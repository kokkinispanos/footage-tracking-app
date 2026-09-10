import { calculateCompletion, TARGETS } from './completion';
import { ALL_SKILL_CATEGORIES, PHOTO_TYPES, skillLabel } from './catalog';
import { lastActiveMs, lastSavedMs, fullDate } from './activity';
import { UPLOAD_SLOTS, UPLOAD_SLOT_KEYS } from './hubCatalog';
import { PLAYER_OWNED_KEYS } from '../services/db';
import { fileService } from '../services/files';
import { makeZip, dataUrlToBytes, extensionFor } from './zip';

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

/**
 * Everything the player himself owns, and nothing else.
 *
 * This used to be a blacklist: strip `id`, `authUid`, `authEmail`, `updatedAt` and keep the
 * rest. That quietly kept every field it had not been told about, and the six records that
 * pre-date the security rebuild still carry `password` in plain text, plus `role` and
 * `adminNotes`, until somebody presses the cleanup button on the admin page. So an admin
 * exporting a legacy player wrote his old plaintext password into `hub-data.json`, and the
 * "everything in one file" button then wrapped it in a zip meant to be handed to somebody
 * else. Found by the Codex review, 2026-09-10.
 *
 * An allowlist now. A new internal field is invisible here until somebody deliberately adds
 * it, which is the right way round for a file that leaves the building.
 */
const EXPORT_KEYS = [...PLAYER_OWNED_KEYS, 'coachSignOff'];

export function buildRawJson(playerData) {
  const source = playerData || {};
  const rest = {};
  EXPORT_KEYS.forEach((key) => {
    if (source[key] !== undefined) rest[key] = source[key];
  });
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
export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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


/**
 * ONE file with everything in it.
 *
 * This is the button that starts a CV. The player's answers, his footage links and the
 * actual files he uploaded, in a single zip that gets handed to a session and read without
 * anybody clicking through the app copying things out.
 *
 * The files have to be fetched one at a time, because each one is its own Firestore
 * document and the rules are checked on every read. That is the design and it is the right
 * one; it just means this button takes a couple of seconds rather than none.
 *
 * A file that will not open is skipped rather than failing the whole bundle. A missing
 * headshot is a note in the README; a bundle that refuses to build because of it is useless.
 */
export async function buildEverythingBundle(playerData, { onProgress } = {}) {
  const encoder = new TextEncoder();
  const enc = (text) => encoder.encode(text);

  // `authUid` and nothing else. It used to fall back to the document id, which is only the
  // same thing for records created after the Auth rebuild. On a legacy record that fallback
  // looked up a file id that cannot exist, found nothing, and the archive then reported a
  // passport that IS uploaded as "not uploaded yet".
  const uid = playerData?.authUid;
  if (!uid) {
    throw new Error(
      'This player has not been joined up with a sign-in yet, so his files cannot be '
      + 'collected. Use "Bring across" on the admin page first.',
    );
  }

  const entries = [
    { name: 'hub-data.json', bytes: enc(buildRawJson(playerData)) },
    { name: 'footage-links.txt', bytes: enc(buildLinkSheet(playerData)) },
  ];

  const included = [];
  const missing = [];
  const failed = [];

  for (let i = 0; i < UPLOAD_SLOT_KEYS.length; i += 1) {
    const slot = UPLOAD_SLOT_KEYS[i];
    onProgress?.(Math.round(((i + 1) / (UPLOAD_SLOT_KEYS.length + 1)) * 100));
    const label = UPLOAD_SLOTS[slot].label;

    // Three outcomes, not two. "He never uploaded it" and "we could not read it" look the
    // same from here and mean completely different things to whoever opens the archive.
    let found;
    try {
      found = await fileService.open(uid, slot);
    } catch (err) {
      failed.push(`${label} (${err?.code || err?.message || 'could not be read'})`);
      continue;
    }
    if (!found?.data) { missing.push(label); continue; }

    let bytes;
    try {
      bytes = dataUrlToBytes(found.data);
    } catch (err) {
      failed.push(`${label} (${err.message})`);
      continue;
    }
    const name = `files/${UPLOAD_SLOTS[slot].file}.${extensionFor(found.type)}`;
    entries.push({ name, bytes });
    included.push(name);
  }

  entries.push({
    name: 'README.txt',
    bytes: enc(bundleReadme(playerData, included, missing, failed)),
  });
  onProgress?.(100);
  return { blob: makeZip(entries), included, missing, failed };
}

/** What is in the box, for whoever opens it in three months. */
function bundleReadme(playerData, included, missing, failed) {
  const profile = playerData?.profile || {};
  const stats = calculateCompletion(playerData);
  const lines = [
    'PRO PLACEMENT — PLAYER HUB EXPORT',
    '='.repeat(40),
    `${profile.fullName || 'Unnamed player'}${profile.position ? ` · ${profile.position}` : ''}`,
    `Exported ${new Date().toLocaleString()}`,
    '',
    'WHAT IS IN HERE',
    '-'.repeat(15),
    'hub-data.json      Every answer the player gave, exactly as stored.',
    '                   This is the file to read first. It holds his identity,',
    '                   his numbers, his seasons, his contacts, his platforms',
    '                   and his finished links.',
    'footage-links.txt  The same footage as a flat list, for the editor.',
    'files/             The documents he uploaded.',
    '',
  ];
  if (included.length) {
    lines.push('FILES INCLUDED');
    lines.push('-'.repeat(14));
    included.forEach((f) => lines.push(`  ${f}`));
    lines.push('');
  }
  if (missing.length) {
    lines.push('NOT UPLOADED YET');
    lines.push('-'.repeat(16));
    missing.forEach((f) => lines.push(`  ${f}`));
    lines.push('');
  }
  // Kept apart from the list above on purpose. A file we could not read is not a file he
  // never sent, and telling a coach the first when it is the second sends him chasing a
  // player who already did the work.
  if (failed.length) {
    lines.push('*** COULD NOT BE READ. THIS ARCHIVE IS INCOMPLETE. ***');
    lines.push('-'.repeat(52));
    failed.forEach((f) => lines.push(`  ${f}`));
    lines.push('  These exist but did not come out. Try the export again before using this.');
    lines.push('');
  }
  lines.push(`FOOTAGE PROGRESS: ${stats.percent}% (${stats.done} of ${stats.total} pieces)`);
  const gaps = missingList(playerData);
  if (gaps.length) {
    lines.push('Still to send: ' + gaps.join(', '));
  }
  lines.push('');
  lines.push('These are a real person\'s identity documents. Do not put this folder anywhere');
  lines.push('shared, and delete it once the work it was pulled for is finished.');
  return lines.join('\n');
}

export async function downloadEverything(playerData, options) {
  const { blob, failed } = await buildEverythingBundle(playerData, options);
  downloadBlob(`${safeName(playerData)}-everything-${stamp()}.zip`, blob);
  return { failed };
}
