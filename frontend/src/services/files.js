import { app } from './firebase';
import { UPLOAD_SLOTS, MAX_UPLOAD_BYTES } from '../utils/hubCatalog';

/**
 * The four files a player can upload: two passports, a CV, a photo.
 *
 * Loaded on demand. `firebase/storage` is a chunk of download that a player waiting on a
 * ground's wifi should not pay for until he actually picks a file, so nothing here is
 * imported at the top of the app.
 *
 * Path is `players/<his uid>/<slot>` with no extension. The slot list is fixed in
 * storage.rules too, so he cannot invent a filename or fill the bucket with objects, and
 * uploading again simply replaces what was there. The real filename and type are stored in
 * Firestore next to it, which is what the screen shows him.
 */

let cached = null;
async function storageApi() {
  if (!cached) cached = await import('firebase/storage');
  return cached;
}

let bucketHandle = null;
async function bucket() {
  if (bucketHandle) return bucketHandle;
  const api = await storageApi();
  bucketHandle = api.getStorage(app);
  // Firebase retries a failing upload for TEN MINUTES by default. When the bucket does not
  // exist at all, that is ten minutes of a player watching "0% done" with no error and no
  // way to know anything is wrong. A minute is long enough to ride out bad signal at a
  // ground and short enough to tell him something is broken.
  bucketHandle.maxUploadRetryTime = 60000;
  bucketHandle.maxOperationRetryTime = 20000;
  return bucketHandle;
}

const pathFor = (uid, slot) => `players/${uid}/${slot}`;

/**
 * What the file actually starts with, not what its name claims.
 *
 * The browser reports a type from the extension, so a renamed video arrives labelled
 * "application/pdf" and the rules believe it. Reading the first few bytes catches the
 * honest mistake before it costs someone an upload on a bad connection. It is a courtesy
 * check: the size cap in the rules is what actually protects anything.
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
  if (file.size > MAX_UPLOAD_BYTES) {
    return `That file is too big. The limit is 15 MB and yours is ${Math.round(file.size / 1048576)} MB.`;
  }
  const slotSpec = UPLOAD_SLOTS[slot];
  if (slotSpec?.accept === 'application/pdf' && file.type !== 'application/pdf') {
    return 'This one has to be a PDF.';
  }
  if (slotSpec?.accept === 'image/*' && !file.type?.startsWith('image/')) {
    return 'This one has to be a photo.';
  }
  if (!file.type?.startsWith('image/') && file.type !== 'application/pdf') {
    return 'Use a photo or a PDF.';
  }
  return null;
}

export const fileService = {
  /**
   * Send one file up. `onProgress` gets 0 to 100 so the player can watch it move.
   * Returns what to store in Firestore: never a URL, only what the screen needs to show.
   */
  async upload(uid, slot, file, onProgress) {
    // Without an owner id the path would be `players/undefined/...`, which the rules refuse
    // anyway. Failing here gives a sentence instead of a Firebase code.
    if (!uid) throw new Error('We do not know who you are yet. Reload the page and try again.');
    if (!UPLOAD_SLOTS[slot]) throw new Error(`Unknown slot "${slot}"`);
    const problem = fileProblem(file, slot);
    if (problem) throw new Error(problem);
    if (!(await looksLikeWhatItSays(file))) {
      throw new Error('That file does not look like what its name says. Try saving it again.');
    }

    const api = await storageApi();
    const ref = api.ref(await bucket(), pathFor(uid, slot));

    await new Promise((resolve, reject) => {
      const task = api.uploadBytesResumable(ref, file, {
        contentType: file.type,
        // Shown in the Firebase console, so whoever opens the bucket sees a real name.
        customMetadata: { originalName: file.name.slice(0, 120) },
      });
      task.on(
        'state_changed',
        (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        reject,
        resolve,
      );
    });

    return {
      name: file.name.slice(0, 120),
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
    };
  },

  async remove(uid, slot) {
    const api = await storageApi();
    try {
      await api.deleteObject(api.ref(await bucket(), pathFor(uid, slot)));
    } catch (err) {
      // Already gone is the outcome we wanted anyway.
      if (err?.code !== 'storage/object-not-found') throw err;
    }
  },

  /**
   * Get a file back for viewing, as a blob the browser can show and then forget.
   *
   * Deliberately NOT `getDownloadURL`. That mints a permanent link carrying its own access
   * token: anyone who ever sees it can open the file forever, whatever the rules say
   * afterwards. For a passport that is the wrong trade. A blob is fetched with the signed-in
   * user's credentials, lives in memory, and dies when the viewer closes it.
   *
   * Blob reads need CORS on the bucket. If it is not configured yet this throws, and the
   * caller says so plainly rather than quietly falling back to minting a permanent URL.
   */
  async openBlobUrl(uid, slot) {
    if (!uid) throw new Error('We do not know who you are yet. Reload the page and try again.');
    const api = await storageApi();
    const blob = await api.getBlob(api.ref(await bucket(), pathFor(uid, slot)));
    return URL.createObjectURL(blob);
  },
};
