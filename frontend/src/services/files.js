import { db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { UPLOAD_SLOTS, MAX_FILE_BYTES, MAX_PDF_BYTES, MAX_STORED_CHARS } from '../utils/hubCatalog';

/**
 * The files a player uploads: two passport photos, a CV, a headshot.
 *
 * They live in FIRESTORE, not Firebase Storage. Storage needs the paid Blaze plan and this
 * project stays on the free one, so each file is shrunk on the phone and stored as a base64
 * string in its own document under `playerFiles`.
 *
 * That turns out to be the safer design anyway. Firebase Storage hands out download links
 * that carry their own access token and keep working for anyone who ever sees one, which is
 * the wrong property for a passport. A Firestore document has no URL at all: the only way to
 * read it is to be signed in as its owner or as an admin, and `firestore.rules` decides that
 * on every read.
 *
 * The costs of doing it this way, stated plainly:
 *  - A Firestore document tops out at 1 MiB, so photos are compressed to fit and a PDF that
 *    will not fit is refused with an explanation rather than quietly truncated.
 *  - One document per file, never on the player's own record, so the coach's list does not
 *    drag a megabyte of passport photos down the wire just to draw a row of names.
 */

/** `playerFiles/<uid>__<slot>`. One document per file, so nothing else pays for its size. */
export const fileDocId = (uid, slot) => `${uid}__${slot}`;

/**
 * Shrink a photo on the phone, before anything is sent.
 *
 * A modern phone camera makes 3 to 8 MB a shot and none of that detail is needed to read a
 * passport. Long edge 1600px at quality 0.82 lands around 250 to 400 KB, which is easily
 * readable and easily under the limit. If it still does not fit, the quality steps down.
 */
async function shrinkImage(file) {
  const bitmap = await createImageBitmap(file);
  const longEdge = Math.max(bitmap.width, bitmap.height);
  const scale = longEdge > 1600 ? 1600 / longEdge : 1;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  for (const quality of [0.82, 0.7, 0.6, 0.5, 0.4]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= MAX_STORED_CHARS) return dataUrl;
  }
  return null;   // even at 0.4 it will not fit; the caller explains why
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * What the file actually starts with, not what its name claims.
 *
 * The browser types a file from its extension, so a renamed video arrives labelled
 * "application/pdf". Reading the first bytes catches the honest mistake early.
 */
async function looksLikeWhatItSays(file) {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const starts = (...bytes) => bytes.every((b, i) => head[i] === b);

  if (file.type === 'application/pdf') return starts(0x25, 0x50, 0x44, 0x46);   // %PDF
  if (file.type?.startsWith('image/')) {
    return starts(0xff, 0xd8, 0xff)                                             // jpeg
      || starts(0x89, 0x50, 0x4e, 0x47)                                         // png
      || starts(0x47, 0x49, 0x46)                                               // gif
      || starts(0x52, 0x49, 0x46, 0x46)                                         // webp
      || (head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70); // heic
  }
  return true;
}

/** Plain sentences, because the player reads these. */
export function fileProblem(file, slot) {
  if (!file) return 'Pick a file first.';
  if (file.size === 0) return 'That file is empty. Try picking it again.';

  const spec = UPLOAD_SLOTS[slot];
  if (spec?.accept === 'application/pdf' && file.type !== 'application/pdf') {
    return 'This one has to be a PDF.';
  }
  if (spec?.accept === 'image/*' && !file.type?.startsWith('image/')) {
    return 'This one has to be a photo.';
  }
  if (!file.type?.startsWith('image/') && file.type !== 'application/pdf') {
    return 'Use a photo or a PDF.';
  }
  // A photo is shrunk before it is sent, so only the silly ceiling applies to it. A PDF
  // cannot be shrunk, so it is measured against what will actually fit.
  if (file.type.startsWith('image/') && file.size > MAX_FILE_BYTES) {
    return `That photo is huge (${Math.round(file.size / 1048576)} MB). Take it again, or pick a smaller one.`;
  }
  if (file.type === 'application/pdf' && file.size > MAX_PDF_BYTES) {
    return `That PDF is ${Math.round(file.size / 1024)} KB. The most we can take is `
      + `${Math.round(MAX_PDF_BYTES / 1024)} KB. Save it smaller, or paste a link to it instead.`;
  }
  return null;
}

export const fileService = {
  /**
   * Save one file. Photos are shrunk first. Returns what the player's record should hold:
   * the name, size and date, and nothing that could be used to reach the file from outside.
   */
  async upload(uid, slot, file, onProgress) {
    if (!uid) throw new Error('We do not know who you are yet. Reload the page and try again.');
    if (!UPLOAD_SLOTS[slot]) throw new Error(`Unknown slot "${slot}"`);

    const problem = fileProblem(file, slot);
    if (problem) throw new Error(problem);
    if (!(await looksLikeWhatItSays(file))) {
      throw new Error('That file does not look like what its name says. Try saving it again.');
    }

    onProgress?.(15);
    const isImage = file.type.startsWith('image/');
    const data = isImage ? await shrinkImage(file) : await readAsDataUrl(file);

    if (!data) {
      throw new Error('We could not make that photo small enough. Take it again from further back.');
    }
    if (data.length > MAX_STORED_CHARS) {
      throw new Error(
        `That file is too big to save (${Math.round(data.length / 1024)} KB). `
        + 'Save it smaller, or paste a link to it instead.',
      );
    }

    onProgress?.(60);
    await setDoc(doc(db, 'playerFiles', fileDocId(uid, slot)), {
      ownerUid: uid,
      slot,
      name: file.name.slice(0, 120),
      type: isImage ? 'image/jpeg' : file.type,
      data,
      savedAt: serverTimestamp(),
    });
    onProgress?.(100);

    return {
      name: file.name.slice(0, 120),
      // The stored size, not the original: this is what he would get back.
      size: Math.round((data.length * 3) / 4),
      type: isImage ? 'image/jpeg' : file.type,
      uploadedAt: new Date().toISOString(),
    };
  },

  async remove(uid, slot) {
    await deleteDoc(doc(db, 'playerFiles', fileDocId(uid, slot)));
  },

  /**
   * Read a file back for viewing.
   *
   * The data URL comes straight out of Firestore. Nothing is minted, nothing is shareable,
   * and the rules were consulted on the way. `null` means the record claims a file that is
   * not actually there, which the caller says out loud rather than hiding.
   */
  async open(uid, slot) {
    if (!uid) throw new Error('We do not know who you are yet. Reload the page and try again.');
    const snap = await getDoc(doc(db, 'playerFiles', fileDocId(uid, slot)));
    if (!snap.exists()) return null;
    return { data: snap.data().data, type: snap.data().type };
  },

  /** Does the file really exist? The coach's page uses this to catch a record that lies. */
  async exists(uid, slot) {
    if (!uid) return false;
    try {
      const snap = await getDoc(doc(db, 'playerFiles', fileDocId(uid, slot)));
      return snap.exists();
    } catch {
      return false;
    }
  },
};
