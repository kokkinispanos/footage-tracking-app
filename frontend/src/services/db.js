import { db } from './firebase';
import {
  collection, doc, setDoc, getDoc, getDocs, updateDoc,
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
 * New records use the Firebase Auth uid as their document id AND carry `authUid`.
 * Records made before September 2026 keep their old uuid id and have `authUid`
 * filled in when an admin links them (see `linkLegacyRecord`). Because every read
 * goes through `authUid`, both kinds behave identically everywhere else.
 */

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

  // ---------------------------------------------------------------- admin only

  async getAllPlayers() {
    const qs = await getDocs(collection(db, 'players'));
    return qs.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getPlayerById(docId) {
    const snap = await getDoc(doc(db, 'players', docId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  },

  /**
   * Write ONE admin note at its own field path.
   * The old version read the whole document, merged in memory and wrote it back, so two
   * notes saved within a second of each other lost one. A field-path write cannot do that.
   * An empty string deletes the note (the old version could never delete one).
   */
  async setClipNote(docId, noteKey, text) {
    const path = new FieldPath('adminNotes', 'perClip', noteKey);
    const value = (text ?? '').trim() === '' ? deleteField() : text;
    await updateDoc(doc(db, 'players', docId), path, value);
  },

  async setGeneralNote(docId, text) {
    const path = new FieldPath('adminNotes', 'general');
    await updateDoc(doc(db, 'players', docId), path, text ?? '');
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
    if (legacyRecord.adminNotes) carried.adminNotes = legacyRecord.adminNotes;

    if (Object.keys(carried).length > 0) {
      await updateDoc(doc(db, 'players', targetDocId), {
        ...carried,
        updatedAt: serverTimestamp(),
      });
    }

    await updateDoc(doc(db, 'players', legacyRecord.id), {
      password: deleteField(),
      role: deleteField(),
      mergedInto: targetDocId,
      linkedAt: serverTimestamp(),
    });
  },

  /** Strip the stored password from an old record without linking it yet. */
  async purgeLegacyPassword(legacyDocId) {
    await updateDoc(doc(db, 'players', legacyDocId), {
      password: deleteField(),
      role: deleteField(),
    });
  },
};
