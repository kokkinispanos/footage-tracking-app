/**
 * Proof that firestore.rules does what the README claims.
 *
 * The rules ARE the security of this app — every check in the React code is a suggestion a
 * player can edit out in his own browser. Before these tests existed, "a player cannot read
 * another player's record" was a sentence in a comment. Now it fails a build.
 *
 * Run:  npm test        (from this folder; starts the Firestore emulator itself)
 * Needs Java, which the emulator runs on.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where,
  deleteField, serverTimestamp,
} from 'firebase/firestore';

const here = dirname(fileURLToPath(import.meta.url));

const testEnv = await initializeTestEnvironment({
  projectId: 'footage-tracker',
  firestore: {
    rules: readFileSync(join(here, '..', 'firestore.rules'), 'utf8'),
    host: '127.0.0.1',
    port: 8080,
  },
});

// ---------------------------------------------------------------- tiny runner
let passed = 0;
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok    ${name}`);
  } catch (err) {
    failures.push({ name, message: err?.message || String(err) });
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err?.message || err}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
}

// ------------------------------------------------------------------ the world
const PLAYER_A = 'playerAuid';
const PLAYER_B = 'playerBuid';
const ADMIN = 'adminUid';
const FRESH = 'freshUid';

const blankRecord = (uid) => ({
  authUid: uid,
  profile: { fullName: `Player ${uid}`, email: `${uid}@example.com`, position: 'Striker' },
  fullGames: [],
  topThreeClips: [],
  skillClips: {},
  photos: {},
  driveFolder: { link: '' },
});

await testEnv.clearFirestore();
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'players', PLAYER_A), blankRecord(PLAYER_A));
  await setDoc(doc(db, 'players', PLAYER_B), blankRecord(PLAYER_B));
  // A record from the old app: no authUid, and the plaintext password that started all this.
  await setDoc(doc(db, 'players', 'legacyRecord'), {
    profile: { fullName: 'Old Record', email: 'old@example.com' },
    password: 'plaintext123',
    role: 'player',
    adminNotes: { general: 'chase him' },
    fullGames: [{ id: '1', link: 'https://example.com/game' }],
  });
  await setDoc(doc(db, 'admins', ADMIN), { email: 'coach@example.com' });
  await setDoc(doc(db, 'adminNotes', PLAYER_A), { general: 'Not good enough yet.', perClip: {} });
});

const anon = testEnv.unauthenticatedContext().firestore();
const a = testEnv.authenticatedContext(PLAYER_A).firestore();
const b = testEnv.authenticatedContext(PLAYER_B).firestore();
const admin = testEnv.authenticatedContext(ADMIN).firestore();
const fresh = testEnv.authenticatedContext(FRESH).firestore();

// The same player, with and without having clicked the link in his inbox. `authEmail` is
// the field the coach matches an old record against, so who may write it is the whole
// difference between a working migration and handing one player another player's footage.
const A_EMAIL = 'playera@example.com';
const verifiedA = testEnv
  .authenticatedContext(PLAYER_A, { email: A_EMAIL, email_verified: true })
  .firestore();
const unverifiedA = testEnv
  .authenticatedContext(PLAYER_A, { email: A_EMAIL, email_verified: false })
  .firestore();

// ============================================================ a stranger
section('A stranger, signed into nothing');

await check('cannot read a player record', () =>
  assertFails(getDoc(doc(anon, 'players', PLAYER_A))));

await check('cannot list the players collection', () =>
  assertFails(getDocs(collection(anon, 'players'))));

await check('cannot read the admins collection', () =>
  assertFails(getDoc(doc(anon, 'admins', ADMIN))));

await check('cannot read the coach notes', () =>
  assertFails(getDoc(doc(anon, 'adminNotes', PLAYER_A))));

await check('cannot write anything', () =>
  assertFails(setDoc(doc(anon, 'players', 'whatever'), { profile: {} })));

// ============================================================ a player
section('A signed-in player, on his own record');

await check('reads his own record', () =>
  assertSucceeds(getDoc(doc(a, 'players', PLAYER_A))));

await check('updates a section he owns', () =>
  assertSucceeds(updateDoc(doc(a, 'players', PLAYER_A), {
    fullGames: [{ id: 'g1', link: 'https://youtu.be/x' }],
    updatedAt: serverTimestamp(),
  })));

// The activity trail writes this dotted path. If affectedKeys() saw 'profile.lastSeenAt'
// rather than 'profile', ownedKeysOnly() would reject it and the trail would silently die.
await check('writes profile.lastSeenAt as a dotted field path', () =>
  assertSucceeds(updateDoc(doc(a, 'players', PLAYER_A), {
    'profile.lastSeenAt': new Date().toISOString(),
  })));

await check('changes his own name and position', () =>
  assertSucceeds(updateDoc(doc(a, 'players', PLAYER_A), {
    'profile.fullName': 'A New Name',
    'profile.position': 'Winger',
    updatedAt: serverTimestamp(),
  })));

// The email-sync path writes profile.email ALONE, with no updatedAt, because copying his new
// email across is not him adding something. A rule that required updatedAt would break it.
await check('writes profile.email alone, with no updatedAt', () =>
  assertSucceeds(updateDoc(doc(a, 'players', PLAYER_A), {
    'profile.email': 'moved@example.com',
  })));

await check('finds himself by authUid', () =>
  assertSucceeds(getDocs(query(collection(a, 'players'), where('authUid', '==', PLAYER_A)))));

section('A signed-in player, on everything else');

await check('cannot read another player record', () =>
  assertFails(getDoc(doc(a, 'players', PLAYER_B))));

await check('cannot list every player', () =>
  assertFails(getDocs(collection(a, 'players'))));

await check('cannot query for someone else by authUid', () =>
  assertFails(getDocs(query(collection(a, 'players'), where('authUid', '==', PLAYER_B)))));

await check('cannot write to another player record', () =>
  assertFails(updateDoc(doc(a, 'players', PLAYER_B), { fullGames: [] })));

await check('cannot store a password on his own record', () =>
  assertFails(updateDoc(doc(a, 'players', PLAYER_A), { password: 'hunter2' })));

await check('cannot give himself a role', () =>
  assertFails(updateDoc(doc(a, 'players', PLAYER_A), { role: 'admin' })));

await check('cannot write coach notes onto his own record', () =>
  assertFails(updateDoc(doc(a, 'players', PLAYER_A), { adminNotes: { general: 'I am great' } })));

await check('cannot add an unknown field to his own record', () =>
  assertFails(updateDoc(doc(a, 'players', PLAYER_A), { secretPayload: 'anything' })));

await check('cannot take over a record by rewriting authUid', () =>
  assertFails(updateDoc(doc(a, 'players', PLAYER_A), { authUid: PLAYER_B })));

await check('cannot delete his record', () =>
  assertFails(deleteDoc(doc(a, 'players', PLAYER_A))));

await check('cannot read the coach notes about himself', () =>
  assertFails(getDoc(doc(a, 'adminNotes', PLAYER_A))));

await check('cannot write coach notes about himself', () =>
  assertFails(setDoc(doc(a, 'adminNotes', PLAYER_A), { general: 'ten out of ten' })));

await check('cannot make himself an admin', () =>
  assertFails(setDoc(doc(a, 'admins', PLAYER_A), { email: 'a@example.com' })));

await check('cannot read the admin who exists', () =>
  assertFails(getDoc(doc(a, 'admins', ADMIN))));

await check('cannot list the admins', () =>
  assertFails(getDocs(collection(a, 'admins'))));

// This one MUST be allowed: it is how the app asks "am I an admin?" and the answer is no.
await check('may check his own admin document (and find nothing)', () =>
  assertSucceeds(getDoc(doc(a, 'admins', PLAYER_A))));

await check('cannot reach the legacy record with the plaintext password', () =>
  assertFails(getDoc(doc(a, 'players', 'legacyRecord'))));

await check('another player cannot read the first one either', () =>
  assertFails(getDoc(doc(b, 'players', PLAYER_A))));

// ================================================ the verified-email claim
section('Claiming a verified email — the field the migration matches on');

await check('an UNVERIFIED player cannot claim his own address', () =>
  assertFails(updateDoc(doc(unverifiedA, 'players', PLAYER_A), { authEmail: A_EMAIL })));

await check('a verified player CAN claim his own address', () =>
  assertSucceeds(updateDoc(doc(verifiedA, 'players', PLAYER_A), { authEmail: A_EMAIL })));

await check('a verified player cannot claim someone else address', () =>
  assertFails(updateDoc(doc(verifiedA, 'players', PLAYER_A), {
    authEmail: 'victim@example.com',
  })));

await check('a player with no email claim at all cannot set it', () =>
  assertFails(updateDoc(doc(a, 'players', PLAYER_A), { authEmail: 'anything@example.com' })));

await check('a player cannot rewrite his claim to a team-mate address later', () =>
  assertFails(updateDoc(doc(verifiedA, 'players', PLAYER_A), {
    authEmail: 'someone.else@example.com',
  })));

await check('the coach can still edit a record that carries a claim', () =>
  assertSucceeds(updateDoc(doc(admin, 'players', PLAYER_A), {
    'profile.position': 'Center Back', updatedAt: serverTimestamp(),
  })));

await check('the coach cannot change a claim', () =>
  assertFails(updateDoc(doc(admin, 'players', PLAYER_A), { authEmail: 'coach@example.com' })));

await check('the player can still save his footage with a claim in place', () =>
  assertSucceeds(updateDoc(doc(verifiedA, 'players', PLAYER_A), {
    topThreeClips: [{ id: 'c1', link: 'https://youtu.be/x' }],
    updatedAt: serverTimestamp(),
  })));

// ================================================ the shape of a record
section('The shape of a record — a player cannot break the coach dashboard');

await check('a name must be text, not a map', () =>
  assertFails(updateDoc(doc(a, 'players', PLAYER_A), { 'profile.fullName': { evil: true } })));

await check('a position must be text', () =>
  assertFails(updateDoc(doc(a, 'players', PLAYER_A), { 'profile.position': 42 })));

await check('full games must be a list', () =>
  assertFails(updateDoc(doc(a, 'players', PLAYER_A), { fullGames: 'not a list' })));

await check('photos must be a map', () =>
  assertFails(updateDoc(doc(a, 'players', PLAYER_A), { photos: ['nope'] })));

await check('a properly shaped write still goes through', () =>
  assertSucceeds(updateDoc(doc(a, 'players', PLAYER_A), {
    'profile.fullName': 'A Real Name', updatedAt: serverTimestamp(),
  })));

// ========================================== the files (passports live here)
section('Uploaded files');

const smallImage = 'data:image/jpeg;base64,' + 'A'.repeat(2000);
const fileDoc = (uid, slot, data = smallImage) => ({
  ownerUid: uid, slot, name: 'passport.jpg', type: 'image/jpeg', data, savedAt: serverTimestamp(),
});

await testEnv.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'playerFiles', `${PLAYER_B}__passportOne`), fileDoc(PLAYER_B, 'passportOne'));
});

await check('a stranger cannot read a passport', () =>
  assertFails(getDoc(doc(anon, 'playerFiles', `${PLAYER_B}__passportOne`))));

await check('a stranger cannot list the files', () =>
  assertFails(getDocs(collection(anon, 'playerFiles'))));

await check('a player CANNOT read another player passport', () =>
  assertFails(getDoc(doc(a, 'playerFiles', `${PLAYER_B}__passportOne`))));

await check('a player cannot list every file', () =>
  assertFails(getDocs(collection(a, 'playerFiles'))));

await check('a player cannot delete another player passport', () =>
  assertFails(deleteDoc(doc(a, 'playerFiles', `${PLAYER_B}__passportOne`))));

await check('a player cannot write into another player slot', () =>
  assertFails(setDoc(doc(a, 'playerFiles', `${PLAYER_B}__cv`), fileDoc(PLAYER_B, 'cv'))));

await check('a player cannot claim someone else as the owner of his own file', () =>
  assertFails(setDoc(doc(a, 'playerFiles', `${PLAYER_A}__cv`), fileDoc(PLAYER_B, 'cv'))));

await check('a player saves his own passport', () =>
  assertSucceeds(setDoc(doc(a, 'playerFiles', `${PLAYER_A}__passportOne`), fileDoc(PLAYER_A, 'passportOne'))));

await check('and reads it back', () =>
  assertSucceeds(getDoc(doc(a, 'playerFiles', `${PLAYER_A}__passportOne`))));

await check('and deletes it', () =>
  assertSucceeds(deleteDoc(doc(a, 'playerFiles', `${PLAYER_A}__passportOne`))));

await check('a made-up slot is refused', () =>
  assertFails(setDoc(doc(a, 'playerFiles', `${PLAYER_A}__secrets`), fileDoc(PLAYER_A, 'secrets'))));

await check('an id that does not match the slot is refused', () =>
  assertFails(setDoc(doc(a, 'playerFiles', `${PLAYER_A}__cv`), fileDoc(PLAYER_A, 'headshot'))));

await check('a file over the size ceiling is refused', () =>
  assertFails(setDoc(doc(a, 'playerFiles', `${PLAYER_A}__cv`),
    fileDoc(PLAYER_A, 'cv', 'data:application/pdf;base64,' + 'A'.repeat(900001)))));

await check('an extra field on a file is refused', () =>
  assertFails(setDoc(doc(a, 'playerFiles', `${PLAYER_A}__cv`),
    { ...fileDoc(PLAYER_A, 'cv'), sneaky: true })));

await check('the coach can read any player file', () =>
  assertSucceeds(getDoc(doc(admin, 'playerFiles', `${PLAYER_B}__passportOne`))));

await check('the coach can list them', () =>
  assertSucceeds(getDocs(collection(admin, 'playerFiles'))));

await check('the coach can delete one', () =>
  assertSucceeds(deleteDoc(doc(admin, 'playerFiles', `${PLAYER_B}__passportOne`))));

section('What only the coach may say');

await check('a player cannot tick his own coach sign-off', () =>
  assertFails(updateDoc(doc(a, 'players', PLAYER_A), {
    'coachSignOff.reelApproved': { done: true, at: '2026-09-10T00:00:00.000Z' },
  })));

await check('a player cannot set the proof page clubs are sent to', () =>
  assertFails(updateDoc(doc(a, 'players', PLAYER_A), {
    'coachSignOff.proofPageLink': 'https://evil.example.com',
  })));

await check('a player cannot replace the whole coach block', () =>
  assertFails(updateDoc(doc(a, 'players', PLAYER_A), { coachSignOff: {} })));

await check('the coach CAN sign off the reel', () =>
  assertSucceeds(updateDoc(doc(admin, 'players', PLAYER_A), {
    'coachSignOff.reelApproved': { done: true, at: '2026-09-10T00:00:00.000Z' },
    updatedAt: serverTimestamp(),
  })));

await check('the coach CAN set the proof page', () =>
  assertSucceeds(updateDoc(doc(admin, 'players', PLAYER_A), {
    'coachSignOff.proofPageLink': 'https://proplacement.cloud/p/matt',
    updatedAt: serverTimestamp(),
  })));

await check('the player can still save his own sections with a sign-off in place', () =>
  assertSucceeds(updateDoc(doc(a, 'players', PLAYER_A), {
    deliverables: { highlightReel: { link: 'https://youtu.be/mine' } },
    updatedAt: serverTimestamp(),
  })));

section('The clock the coach reads');

await check('a player cannot bump updatedAt on its own to look busy', () =>
  assertFails(updateDoc(doc(a, 'players', PLAYER_A), { updatedAt: serverTimestamp() })));

await check('a player cannot hand-write updatedAt into the future', () =>
  assertFails(updateDoc(doc(a, 'players', PLAYER_A), {
    fullGames: [], updatedAt: new Date(Date.now() + 400 * 86400000),
  })));

await check('a player cannot backdate updatedAt either', () =>
  assertFails(updateDoc(doc(a, 'players', PLAYER_A), {
    fullGames: [], updatedAt: new Date(2020, 0, 1),
  })));

await check('the real server timestamp is accepted', () =>
  assertSucceeds(updateDoc(doc(a, 'players', PLAYER_A), {
    fullGames: [], updatedAt: serverTimestamp(),
  })));

section('The hub sections');

await check('he can fill in who he is', () =>
  assertSucceeds(updateDoc(doc(a, 'players', PLAYER_A), {
    identity: {
      dateOfBirth: '2006-04-02',
      passportOne: { country: 'Nigeria', expiry: '2030-01-01', file: { name: 'p.jpg', size: 900, type: 'image/jpeg' } },
      euFamily: { has: 'yes', relation: 'grandmother', country: 'Ireland' },
      workStatus: 'needs-visa',
      consents: { shareContact: { agreed: true, at: '2026-09-10T00:00:00.000Z' } },
    },
    updatedAt: serverTimestamp(),
  })));

await check('he can fill in his numbers, contact, finished work and platforms', () =>
  assertSucceeds(updateDoc(doc(a, 'players', PLAYER_A), {
    playerCard: { heightCm: '186', foot: 'right', languages: ['English'], numbers: { topSpeedKmh: '33' } },
    contact: { phone: '+44 7700 900000', gmailForClubs: 'player@gmail.com', parent: { name: 'Ada' } },
    deliverables: { highlightReel: { link: 'https://youtu.be/x' }, cv: { file: { name: 'cv.pdf' } } },
    platforms: { transfermarkt: { status: 'live', link: 'https://transfermarkt.com/x' } },
    updatedAt: serverTimestamp(),
  })));

await check('a hub section cannot be a string', () =>
  assertFails(updateDoc(doc(a, 'players', PLAYER_A), { identity: 'not a map' })));

await check('a hub section cannot be a list', () =>
  assertFails(updateDoc(doc(a, 'players', PLAYER_A), { platforms: ['nope'] })));

await check('a player still cannot touch another player hub sections', () =>
  assertFails(updateDoc(doc(b, 'players', PLAYER_A), { identity: { dateOfBirth: '2000-01-01' } })));

// The coach's two values used to live inside `deliverables`, which the player owns. They are
// under `coachSignOff` now (see the section below). Nothing reads the old paths any more, so a
// player writing them achieves nothing, but the app must not read them again by accident.
await check('the old in-section coach paths are dead weight, not authority', async () => {
  const before = JSON.stringify((await getDoc(doc(a, 'players', PLAYER_A))).data().coachSignOff ?? null);
  // He is allowed to write inside his own `deliverables`. The point is that doing so must
  // not reach the coach's field, which is where everything actually reads from.
  await assertSucceeds(updateDoc(doc(a, 'players', PLAYER_A), {
    'deliverables.highlightReel.approvedByCoach': { done: true, at: 'whenever' },
    updatedAt: serverTimestamp(),
  }));
  const after = JSON.stringify((await getDoc(doc(a, 'players', PLAYER_A))).data().coachSignOff ?? null);
  if (before !== after) throw new Error('writing the old path changed coachSignOff');
});

// ============================================================ signing up
section('A brand-new account creating its record');

await check('creates its own record with the expected fields', () =>
  assertSucceeds(setDoc(doc(fresh, 'players', FRESH), {
    ...blankRecord(FRESH),
    updatedAt: serverTimestamp(),
  })));

await check('cannot create a record under someone else id', () =>
  assertFails(setDoc(doc(fresh, 'players', 'somebodyElse'), {
    ...blankRecord('somebodyElse'), updatedAt: serverTimestamp(),
  })));

await check('cannot create a record claiming another authUid', () =>
  assertFails(setDoc(doc(fresh, 'players', FRESH), {
    ...blankRecord(PLAYER_B), updatedAt: serverTimestamp(),
  })));

await check('cannot create a record carrying a password', () =>
  assertFails(setDoc(doc(fresh, 'players', 'freshTwo'), {
    ...blankRecord('freshTwo'), password: 'hunter2', updatedAt: serverTimestamp(),
  })));

await check('cannot create a record with an unknown field', () =>
  assertFails(setDoc(doc(fresh, 'players', 'freshThree'), {
    ...blankRecord('freshThree'), isAdmin: true, updatedAt: serverTimestamp(),
  })));

// ============================================================ the admin
section('The coach');

await check('reads any player record', () =>
  assertSucceeds(getDoc(doc(admin, 'players', PLAYER_B))));

await check('lists every player', () =>
  assertSucceeds(getDocs(collection(admin, 'players'))));

await check('reads and writes his own notes', async () => {
  await assertSucceeds(getDoc(doc(admin, 'adminNotes', PLAYER_A)));
  await assertSucceeds(setDoc(doc(admin, 'adminNotes', PLAYER_A), { general: 'Better.' }, { merge: true }));
});

await check('fixes a player name', () =>
  assertSucceeds(updateDoc(doc(admin, 'players', PLAYER_B), {
    'profile.fullName': 'Corrected Name', updatedAt: serverTimestamp(),
  })));

await check('cleans a legacy record: password and notes go, content stays', () =>
  assertSucceeds(updateDoc(doc(admin, 'players', 'legacyRecord'), {
    password: deleteField(),
    role: deleteField(),
    adminNotes: deleteField(),
    mergedInto: PLAYER_A,
    linkedAt: serverTimestamp(),
  })));

await check('cannot put a password back on a record', () =>
  assertFails(updateDoc(doc(admin, 'players', PLAYER_B), { password: 'hunter2' })));

await check('cannot give a player a role', () =>
  assertFails(updateDoc(doc(admin, 'players', PLAYER_B), { role: 'admin' })));

await check('cannot move a record to a different owner', () =>
  assertFails(updateDoc(doc(admin, 'players', PLAYER_B), { authUid: ADMIN })));

await check('cannot delete a player record', () =>
  assertFails(deleteDoc(doc(admin, 'players', PLAYER_B))));

await check('cannot appoint another admin from the app', () =>
  assertFails(setDoc(doc(admin, 'admins', PLAYER_A), { email: 'x@example.com' })));

await check('cannot remove himself as admin from the app', () =>
  assertFails(deleteDoc(doc(admin, 'admins', ADMIN))));

// ============================================================ everything else
section('Every other collection');

await check('a player cannot invent a new collection', () =>
  assertFails(setDoc(doc(a, 'anythingElse', 'x'), { hello: 'world' })));

await check('an admin cannot either', () =>
  assertFails(setDoc(doc(admin, 'anythingElse', 'x'), { hello: 'world' })));

// ------------------------------------------------------------------- result
await testEnv.cleanup();

console.log(`\n${'='.repeat(50)}`);
if (failures.length === 0) {
  console.log(`ALL ${passed} RULE TESTS PASSED`);
  process.exit(0);
}
console.log(`${passed} passed, ${failures.length} FAILED`);
for (const f of failures) console.log(`  - ${f.name}\n    ${f.message}`);
process.exit(1);
