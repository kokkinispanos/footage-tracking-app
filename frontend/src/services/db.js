import { db } from './firebase';
import {
  collection, doc, setDoc, getDoc, getDocs, updateDoc, onSnapshot,
  query, where, deleteField, FieldPath, serverTimestamp,
} from 'firebase/firestore';

/**
 * Everything to do with the player's RECORD.
 *
 * Two rules hold this file together:
 *  1. A password is never stored, read or written here. Firebase Auth owns that.
 *  2. A player is found by `authUid`, never by email. Looking a player up by email
 *     is what let anyone read anyone's record in the old version.
 *
 * A record's document id is always the owner's Firebase Auth uid, and it also carries
 * `authUid`. Records made before September 2026 kept a random uuid as their id; rather
 * than move them, `mergeLegacyRecord` copies their contents onto the player's real record
 * once he has an account. See `firestore.rules` for what any of this is allowed to do.
 */

/**
 * The three fields that must never remain on a player record: the two that caused the
 * original leak, and the notes that belong in the admin-only collection. `noSecrets()` in
 * firestore.rules refuses any write that leaves one of them behind.
 */
const LEGACY_CLEANUP = {
  password: deleteField(),
  role: deleteField(),
  adminNotes: deleteField(),
};

/** The only top-level keys a player may write on his own record. Mirrored in firestore.rules. */
export const PLAYER_OWNED_KEYS = [
  'profile',
  'fullGames',
  'topThreeClips',
  'skillClips',
  'photos',
  'driveFolder',
  // Reserved for the hub sections (stage 3). Listed here and in the rules now so the
  // rules do not need redeploying when those screens land.
  'identity',
  'playerCard',
  'contact',
  'deliverables',
  'platforms',
];

const SKILL_CATEGORIES = {
  passing: [], dribbling: [], defending: [], finishing: [],
  movement: [], pressing: [], aerial: [], other: [],
  saves: [], distribution: [], commandingTheBox: [], "1v1Situations": [], organizingDefense: [],
};

const PHOTO_SLOTS = {
  cleanKit: { link: "" },
  actionShot: { link: "" },
  training: { link: "" },
  headshot: { link: "" },
  teamPhoto: { link: "" },
  lifestyle: { link: "" },
};

/** The shape of a brand-new player record. No password. No role. */
export function emptyPlayerRecord({ authUid, fullName, email, position }) {
  return {
    authUid,
    profile: {
      fullName: (fullName || '').trim(),
      email: (email || '').trim().toLowerCase(),
      position: position || '',
      createdAt: new Date().toISOString(),
    },
    fullGames: [],
    topThreeClips: [],
    skillClips: { ...SKILL_CATEGORIES },
    photos: JSON.parse(JSON.stringify(PHOTO_SLOTS)),
    driveFolder: { link: "" },
    // `adminNotes` is deliberately absent. The player must never be the one who creates it —
    // the admin's first note creates the map, and the rules stop the player touching it.
  };
}

export const dbService = {
  /** Create the player's record straight after his Auth account exists. Id = his auth uid. */
  async createPlayerRecord({ authUid, fullName, email, position }) {
    const ref = doc(db, 'players', authUid);
    const existing = await getDoc(ref);
    if (existing.exists()) return { id: ref.id, ...existing.data() };

    const record = emptyPlayerRecord({ authUid, fullName, email, position });
    await setDoc(ref, { ...record, updatedAt: serverTimestamp() });
    return { id: ref.id, ...record };
  },

  /**
   * The signed-in player's own record.
   * Tries the fast path (document id = auth uid), then the legacy path (a query on authUid).
   * Both are permitted by the rules; anything else is refused by the server.
   */
  async getMyPlayerRecord(authUid) {
    const direct = await getDoc(doc(db, 'players', authUid));
    if (direct.exists()) return { id: direct.id, ...direct.data() };

    const qs = await getDocs(query(collection(db, 'players'), where('authUid', '==', authUid)));
    if (qs.empty) return null;
    const first = qs.docs[0];
    return { id: first.id, ...first.data() };
  },

  /**
   * Save the player's own changes.
   * Writes ONLY the sections that changed, and only sections he is allowed to own,
   * so two devices editing different sections no longer overwrite each other.
   */
  async savePlayerSections(docId, patch) {
    const clean = {};
    for (const key of Object.keys(patch || {})) {
      if (PLAYER_OWNED_KEYS.includes(key)) clean[key] = patch[key];
    }
    if (Object.keys(clean).length === 0) return;
    clean.updatedAt = serverTimestamp();
    await updateDoc(doc(db, 'players', docId), clean);
  },

  /**
   * Change one of the three facts on the profile: name, position, email.
   *
   * Written as dotted field paths so a name change touches `profile.fullName` alone. The old
   * app rewrote the whole record for any edit, which is how a save on the phone could undo a
   * clip added on the laptop thirty seconds earlier.
   */
  async updateProfileFields(docId, fields, { touch = true } = {}) {
    const ALLOWED = ['fullName', 'position', 'email'];
    const patch = {};
    for (const key of ALLOWED) {
      if (fields?.[key] !== undefined) patch[`profile.${key}`] = fields[key];
    }
    if (Object.keys(patch).length === 0) return;
    // `touch: false` for bookkeeping the player did not do — copying his new email across
    // after he changed it in Firebase. Stamping `updatedAt` there would tell the admin list
    // he added something, and the whole point of that column is that it is not guesswork.
    if (touch) patch.updatedAt = serverTimestamp();
    await updateDoc(doc(db, 'players', docId), patch);
  },

  /**
   * Record the address Firebase says he has proved he owns.
   *
   * This is the field the coach matches an old record against. It is not `profile.email`,
   * because he writes that one himself — he could type a team-mate's address into it and
   * wait for "Bring across" to hand him that team-mate's footage. The rules only accept
   * this write when it equals the signed-in address AND Firebase says it is verified, so
   * an attacker holding an account on someone else's address still cannot set it.
   *
   * Called on load once he has clicked the link in his inbox. Silent on failure: the rules
   * refuse it while he is unverified, which is the normal state for a new player.
   */
  async claimVerifiedEmail(docId, email) {
    await updateDoc(doc(db, 'players', docId), {
      authEmail: (email || '').trim().toLowerCase(),
    });
  },

  /**
   * Stamp that he opened the hub. Deliberately does NOT touch `updatedAt`.
   *
   * The two are different facts and the admin list shows both: `updatedAt` says he added
   * something, `lastSeenAt` says he looked. A player who signs in every day and adds nothing
   * has seen the gaps and chosen to leave them, which is worth knowing and would be invisible
   * if opening the app counted as progress.
   */
  async touchLastSeen(docId) {
    // The SERVER's clock, not the phone's. A device set a year ahead used to make the
    // coach's "who has gone quiet" list wrong until that date arrived.
    await updateDoc(doc(db, 'players', docId), {
      'profile.lastSeenAt': serverTimestamp(),
    });
  },

  /**
   * The coach ticking "this reel is ready to send to clubs".
   *
   * One of the five Phase 1 exit criteria, and until now there was nowhere it was written
   * down. It lives on the player's own record, not in the admin-only collection, because he
   * needs to SEE it: knowing the reel is signed off is the point of signing it off.
   *
   * It lives under `coachSignOff`, which is a top-level key the rules do not let a player
   * write. It used to sit inside `deliverables`, and a player owns that whole section, so he
   * could tick his own coach approval and the screen would say "your coach has checked this
   * video". Being outside also stops his save wiping a sign-off the coach made mid-edit.
   */
  async setCoachSignOff(docId, done) {
    await updateDoc(doc(db, 'players', docId), {
      'coachSignOff.reelApproved': done
        ? { done: true, at: new Date().toISOString() }
        : { done: false, at: '' },
      updatedAt: serverTimestamp(),
    });
  },

  /** The link to the page clubs get sent. Coach writes it, player reads it, same reason. */
  async setProofPage(docId, link) {
    await updateDoc(doc(db, 'players', docId), {
      'coachSignOff.proofPageLink': (link || '').trim(),
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Write ONE value at a nested path, straight away, with no debounce.
   *
   * For things that are events rather than typing. An upload is the case that matters: the
   * file lands in Storage and then the record has to say so. Going through the 700ms
   * debounce leaves a window where the object exists and the record denies it, and if the
   * player closes the tab in that window it stays that way for good.
   */
  async savePlayerPath(docId, dottedPath, value) {
    await updateDoc(doc(db, 'players', docId), {
      [dottedPath]: value,
      updatedAt: serverTimestamp(),
    });
  },

  // ---------------------------------------------------------------- admin only

  async getAllPlayers() {
    const qs = await getDocs(collection(db, 'players'));
    return qs.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  /**
   * Watch one player, for the admin.
   *
   * It used to read once. The coach opens a player WHILE talking to him, asks for two more
   * clips, the player adds them, and the coach's screen still says what it said five minutes
   * ago — so he asks again. Returns an unsubscribe function.
   */
  watchPlayer(docId, onChange) {
    return onSnapshot(
      doc(db, 'players', docId),
      (snap) => onChange(snap.exists() ? { id: snap.id, ...snap.data() } : null),
      () => { /* a dropped listener leaves the last value on screen, which is the right failure */ },
    );
  },

  watchAdminNotes(docId, onChange) {
    return onSnapshot(
      doc(db, 'adminNotes', docId),
      (snap) => onChange(snap.exists() ? snap.data() : { general: '', perClip: {} }),
      () => {},
    );
  },

  async getPlayerById(docId) {
    const snap = await getDoc(doc(db, 'players', docId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  },

  /**
   * The coach's private notes about a player.
   *
   * They live in their OWN collection, not on the player's record, and the rules make that
   * collection admin-only in both directions. This is not tidiness: Firestore hands back a
   * whole document, so a note kept on the player's record is a note the player can read in
   * his browser's network tab, whatever the screen says. The old app kept them there.
   */
  async getAdminNotes(playerDocId) {
    const snap = await getDoc(doc(db, 'adminNotes', playerDocId));
    return snap.exists() ? snap.data() : { general: '', perClip: {} };
  },

  /**
   * Write ONE note at its own field path.
   * The old version read the whole document, merged in memory and wrote it back, so two
   * notes saved within a second of each other lost one. A field-path write cannot do that.
   * An empty string deletes the note (the old version could never delete one).
   */
  async setClipNote(playerDocId, noteKey, text) {
    const ref = doc(db, 'adminNotes', playerDocId);
    const value = (text ?? '').trim() === '' ? deleteField() : text;
    try {
      await updateDoc(ref, new FieldPath('perClip', noteKey), value);
    } catch {
      // First note for this player: the document does not exist yet.
      await setDoc(ref, { general: '', perClip: { [noteKey]: (text ?? '') } }, { merge: true });
    }
  },

  async setGeneralNote(playerDocId, text) {
    await setDoc(doc(db, 'adminNotes', playerDocId), { general: text ?? '' }, { merge: true });
  },

  // ------------------------------------------------- legacy records (pre-Sept 2026)

  /**
   * Records made by the old app: no `authUid`, so nobody can sign in as them.
   * One already carried across is excluded — it is kept, but it is finished business.
   */
  async getLegacyRecords() {
    const all = await this.getAllPlayers();
    return all.filter((p) => !p.authUid && !p.mergedInto);
  },

  /**
   * Carry an old record across to the account the player has just made.
   *
   * He registers again with the same email, which gives him a fresh empty record at
   * `players/<his auth uid>`. This copies his old footage INTO that record, rather than
   * pointing him at the old document, because his own record must always be the one filed
   * under his uid — otherwise he would keep landing on the empty one. The old document is
   * kept, emptied of its password, and marked so it never appears in the list again.
   * Nothing is deleted: an old record is still a client's work.
   */
  async mergeLegacyRecord(legacyRecord, targetDocId) {
    const carried = {};
    for (const key of PLAYER_OWNED_KEYS) {
      // `profile` is skipped on purpose: the name and email he just typed are the current ones.
      if (key !== 'profile' && legacyRecord[key] !== undefined) carried[key] = legacyRecord[key];
    }

    if (Object.keys(carried).length > 0) {
      await updateDoc(doc(db, 'players', targetDocId), {
        ...carried,
        updatedAt: serverTimestamp(),
      });
    }

    // The old app kept notes ON the player's record, where he could read them. Move them.
    if (legacyRecord.adminNotes) {
      await setDoc(doc(db, 'adminNotes', targetDocId), legacyRecord.adminNotes, { merge: true });
    }

    await updateDoc(doc(db, 'players', legacyRecord.id), {
      ...LEGACY_CLEANUP,
      mergedInto: targetDocId,
      linkedAt: serverTimestamp(),
    });
  },

  /**
   * Clean an old record without carrying it across yet: the stored password goes, and any
   * notes on it move to the admin-only collection where the player cannot read them.
   */
  async purgeLegacyPassword(legacyRecord) {
    if (legacyRecord.adminNotes) {
      await setDoc(doc(db, 'adminNotes', legacyRecord.id), legacyRecord.adminNotes, { merge: true });
    }
    await updateDoc(doc(db, 'players', legacyRecord.id), LEGACY_CLEANUP);
  },
};
