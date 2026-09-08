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

// ============================================================ signing up
section('A brand-new account creating its record');

await check('creates its own record with the expected fields', () =>
  assertSucceeds(setDoc(doc(fresh, 'players', FRESH), {
    ...blankRecord(FRESH),
    updatedAt: serverTimestamp(),
  })));

await check('cannot create a record under someone else id', () =>
  assertFails(setDoc(doc(fresh, 'players', 'somebodyElse'), blankRecord('somebodyElse'))));

await check('cannot create a record claiming another authUid', () =>
  assertFails(setDoc(doc(fresh, 'players', FRESH), blankRecord(PLAYER_B))));

await check('cannot create a record carrying a password', () =>
  assertFails(setDoc(doc(fresh, 'players', 'freshTwo'), {
    ...blankRecord('freshTwo'), password: 'hunter2',
  })));

await check('cannot create a record with an unknown field', () =>
  assertFails(setDoc(doc(fresh, 'players', 'freshThree'), {
    ...blankRecord('freshThree'), isAdmin: true,
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
