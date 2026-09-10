import { calculateCompletion, TOTAL_TARGET, nextStep } from './completion';
import { getIn } from './nested';
import { CONSENTS, PLATFORMS, isEuEea } from './hubCatalog';

/**
 * What "done" means for the five sections about the player himself.
 *
 * Written once, here, because three different screens ask the question: the player's
 * progress bar, each section's own counter, and the coach's readiness panel. The footage
 * sections learned this lesson the hard way in the old app, where one record showed 100%
 * to the coach and 77% to the player and nobody could trust either number.
 *
 * Everything is counted the same way: a thing is done when it holds an answer. Nothing here
 * judges whether the answer is any good. That is a conversation, not a checkbox.
 */

const filled = (value) => typeof value === 'string' && value.trim().length > 0;
const anyFilled = (obj) => Object.values(obj || {}).some((v) => filled(String(v ?? '')));

export const HUB_TARGETS = {
  identity: 6,
  playerCard: 8,
  contact: 4,
  deliverables: 3,
  platforms: 4,
};

export const HUB_TOTAL = Object.values(HUB_TARGETS).reduce((a, b) => a + b, 0);

/** Every consent ticked, and each one carries the date it was ticked. */
export function allConsentsGiven(record) {
  return CONSENTS.every((c) => getIn(record, ['identity', 'consents', c.key, 'agreed'], false) === true);
}

export function countIdentity(record) {
  const id = record?.identity || {};
  let done = 0;
  if (filled(id.dateOfBirth)) done += 1;
  if (filled(getIn(id, ['passportOne', 'country']))) done += 1;
  if (getIn(id, ['passportOne', 'file', 'name'], '')) done += 1;
  if (filled(getIn(id, ['euFamily', 'has']))) done += 1;
  if (filled(id.workStatus)) done += 1;
  if (allConsentsGiven(record)) done += 1;
  return done;
}

export function countPlayerCard(record) {
  const card = record?.playerCard || {};
  let done = 0;
  if (filled(String(card.heightCm ?? ''))) done += 1;
  if (filled(String(card.weightKg ?? ''))) done += 1;
  if (filled(card.foot)) done += 1;
  if (filled(card.club) || card.level === 'none') done += 1;
  if (filled(card.availableFrom)) done += 1;
  if (Array.isArray(card.languages) && card.languages.length > 0) done += 1;
  if (anyFilled(card.numbers)) done += 1;
  if (Array.isArray(card.seasons) && card.seasons.some((s) => filled(s?.club))) done += 1;
  return done;
}

export function countContact(record) {
  const c = record?.contact || {};
  let done = 0;
  if (filled(c.phone)) done += 1;
  if (filled(c.instagram)) done += 1;
  if (filled(c.gmailForClubs)) done += 1;
  if (filled(getIn(c, ['parent', 'name'])) && filled(getIn(c, ['parent', 'email']))) done += 1;
  return done;
}

export function countDeliverables(record) {
  const d = record?.deliverables || {};
  let done = 0;
  if (filled(getIn(d, ['highlightReel', 'link']))) done += 1;
  if (getIn(d, ['cv', 'file', 'name'], '')) done += 1;
  if (getIn(d, ['headshot', 'file', 'name'], '')) done += 1;
  return done;
}

/** Only the ones he has actually gone live on. "Not for me" is a valid answer, not progress. */
export function countPlatforms(record) {
  const p = record?.platforms || {};
  return PLATFORMS.filter((plat) => getIn(p, [plat.key, 'status']) === 'live').length;
}

export function hubCounts(record) {
  return {
    identity: countIdentity(record),
    playerCard: countPlayerCard(record),
    contact: countContact(record),
    deliverables: countDeliverables(record),
    platforms: Math.min(countPlatforms(record), HUB_TARGETS.platforms),
  };
}

export function calculateHub(record) {
  const counts = hubCounts(record);
  const done = Object.keys(HUB_TARGETS)
    .reduce((sum, key) => sum + Math.min(counts[key], HUB_TARGETS[key]), 0);
  return {
    counts,
    done,
    total: HUB_TOTAL,
    percent: Math.min(100, Math.round((done / HUB_TOTAL) * 100)),
  };
}

/** The label each hub section shows in the progress panel and the phone bar. */
export const HUB_SECTION_LABELS = {
  identity: 'Who you are',
  playerCard: 'Your numbers',
  contact: 'Contact',
  deliverables: 'Finished stuff',
  platforms: 'Where to find you',
};

/** Footage and the rest, as one number, for the top of the dashboard. */
export function calculateEverything(record) {
  const footage = calculateCompletion(record);
  const hub = calculateHub(record);
  const done = footage.done + hub.done;
  const total = TOTAL_TARGET + HUB_TOTAL;
  const percent = Math.min(100, Math.round((done / total) * 100));

  let tone = 'error';
  if (percent >= 34 && percent < 67) tone = 'warning';
  if (percent >= 67) tone = 'success';

  const hubSections = Object.keys(HUB_TARGETS).map((key) => ({
    key,
    count: hub.counts[key],
    target: HUB_TARGETS[key],
    complete: hub.counts[key] >= HUB_TARGETS[key],
  }));

  return {
    footage, hub, done, total, percent, tone,
    sections: [...footage.sections, ...hubSections],
  };
}

/**
 * The ONE thing to do next, across the whole hub.
 *
 * Footage first, because that is the raw material everything else is cut from and it is the
 * only part nobody can do for him. Then the answers that unblock Stage 3, in the order they
 * block it. One instruction at a time; a list of nine gaps is a list nobody starts.
 */
export function nextThing(record) {
  const footage = nextStep(record);
  if (!footage.done) return { ...footage, tab: 'footage' };

  const c = hubCounts(record);
  const steps = [
    !filled(getIn(record, ['identity', 'dateOfBirth'])) && {
      tab: 'about', anchor: 'identity',
      title: 'Add your birthday and your passport',
      body: 'Three minutes, and it decides which countries can even look at you. Nothing moves until this is in.',
    },
    !allConsentsGiven(record) && {
      tab: 'about', anchor: 'identity',
      title: 'Tick the three permissions',
      body: 'We cannot email a single club until you do. They are at the bottom of "Who you are".',
    },
    !filled(getIn(record, ['contact', 'gmailForClubs'])) && {
      tab: 'about', anchor: 'contact',
      title: 'Give us the Gmail we send from',
      body: 'Club emails go out from your address, so replies come to you. We need it before we start.',
    },
    c.playerCard < HUB_TARGETS.playerCard && {
      tab: 'about', anchor: 'player-card',
      title: 'Fill in your numbers',
      body: 'Height, foot, your club, what you have been clocked at. This goes into every email a club gets.',
    },
    c.deliverables < HUB_TARGETS.deliverables && {
      tab: 'about', anchor: 'deliverables',
      title: 'Add your video, your CV and your photo',
      body: 'These three are what a club actually opens.',
    },
    c.platforms < HUB_TARGETS.platforms && {
      tab: 'about', anchor: 'platforms',
      title: 'Get yourself on four scouting sites',
      body: 'Scouts look you up before they reply. Transfermarkt first.',
    },
    c.contact < HUB_TARGETS.contact && {
      tab: 'about', anchor: 'contact',
      title: 'Finish your contact details',
      body: 'Phone, Instagram, and whoever is paying. A club that likes you needs a way through.',
    },
  ].filter(Boolean);

  if (steps.length === 0) {
    return {
      done: true, tab: 'about', anchor: null,
      title: 'Everything is in',
      body: 'There is nothing waiting on you. If you film something better, swap it in. This stays open.',
    };
  }
  return { done: false, ...steps[0] };
}

/**
 * Which lane is even possible for this player.
 *
 * A guess for the screen, not a decision. Stage 3 sets the real lane, and a grandparent's
 * birth certificate has to be seen before anyone acts on it. It is here because a player
 * who does not know that his grandmother being Irish matters will never mention it, and
 * that one answer turned a Lane B player into a possible Lane A in the wave-3 test.
 */
export function eligibilityHint(record) {
  const one = getIn(record, ['identity', 'passportOne', 'country']);
  const two = getIn(record, ['identity', 'passportTwo', 'country']);
  if (isEuEea(one) || isEuEea(two)) {
    return { tone: 'success', text: 'Your passport opens up clubs across Europe.' };
  }
  const family = getIn(record, ['identity', 'euFamily', 'has']);
  if (family === 'yes') {
    return {
      tone: 'warning',
      text: 'Your family link might get you a European passport. That would open up a lot more clubs. We will look into it with you.',
    };
  }
  if (!one) return null;
  return {
    tone: 'neutral',
    text: 'You may need a visa for some countries. That is normal and we work around it.',
  };
}

/**
 * What Stage 3 cannot start without.
 *
 * Everything on this list is a column the outreach engine reads or a permission it needs.
 * Nothing is here because it would be nice to have.
 */
export function readiness(record) {
  const items = [
    { key: 'dob', label: 'Birthday', ok: filled(getIn(record, ['identity', 'dateOfBirth'])) },
    { key: 'passport', label: 'Passport country', ok: filled(getIn(record, ['identity', 'passportOne', 'country'])) },
    { key: 'passportScan', label: 'Passport photo', ok: !!getIn(record, ['identity', 'passportOne', 'file', 'name'], '') },
    { key: 'consents', label: 'All three permissions', ok: allConsentsGiven(record) },
    { key: 'gmail', label: 'Gmail for club emails', ok: filled(getIn(record, ['contact', 'gmailForClubs'])) },
    { key: 'instagram', label: 'Instagram', ok: filled(getIn(record, ['contact', 'instagram'])) },
    { key: 'reel', label: 'Highlights video', ok: filled(getIn(record, ['deliverables', 'highlightReel', 'link'])) },
    { key: 'cv', label: 'CV', ok: !!getIn(record, ['deliverables', 'cv', 'file', 'name'], '') },
    { key: 'numbers', label: 'Measured numbers', ok: anyFilled(getIn(record, ['playerCard', 'numbers'], {})) },
    { key: 'games', label: '3 full games', ok: (calculateCompletion(record).counts.fullGames || 0) >= 3 },
    { key: 'photos', label: '6 photos', ok: (calculateCompletion(record).counts.photos || 0) >= 6 },
  ];
  const missing = items.filter((i) => !i.ok);
  return { items, missing, ready: missing.length === 0, done: items.length - missing.length, total: items.length };
}
