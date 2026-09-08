import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

// This config is PUBLIC by design — it ships inside the JavaScript bundle and always has.
// It is an address, not a key: it tells the browser which Firebase project to talk to.
//
// The security boundary is `firestore.rules` and `storage.rules` at the root of this repo.
// Those rules decide who may read and write what. Never put a secret in this file.
const firebaseConfig = {
  apiKey: "AIzaSyBULVCEmUckqt3928ja52YZAo8ecDgYkhM",
  authDomain: "footage-tracker.firebaseapp.com",
  projectId: "footage-tracker",
  storageBucket: "footage-tracker.firebasestorage.app",
  messagingSenderId: "837813107769",
  appId: "1:837813107769:web:dd5102ed55d4fffc94a1e8",
  measurementId: "G-VV3QKQFNDL"
};

const app = initializeApp(firebaseConfig);

/**
 * Firestore, with an on-device cache.
 *
 * Why this and not `getFirestore(app)`: a player films at a ground on bad wifi. Without a
 * cache, a paste that fails to reach the server is simply lost and he has no idea. With it,
 * Firestore writes to IndexedDB first, tells the app it succeeded, and sends it when the
 * connection returns — even if he closes the tab and comes back tomorrow.
 *
 * `persistentMultipleTabManager` because he will have the hub open on his phone and his
 * laptop, and two tabs sharing one cache must not fight over it.
 *
 * If the browser refuses the cache (private windows, an old browser, storage turned off)
 * Firebase falls back to memory on its own. Nothing here throws; the app just goes back to
 * needing a connection, which is where it was before.
 */
function openFirestore() {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    // Already initialised. In production this module is evaluated once and we never get
    // here; in development Vite re-evaluates it on every hot reload, and without this the
    // whole app throws `failed-precondition` until you reload the page by hand.
    return getFirestore(app);
  }
}

export const db = openFirestore();

/**
 * Did the on-device cache actually start?
 *
 * `initializeFirestore` never tells you. If IndexedDB is unavailable — a private window, an
 * old browser, site data blocked — Firebase quietly falls back to a memory cache, and then a
 * write made while offline lives only until the tab closes. The app was telling the player
 * "saved on this device" either way, which is the one lie that costs him his work.
 *
 * So we ask IndexedDB directly. A refusal here means the fallback definitely happened; a
 * success means it almost certainly did not.
 */
export const offlineStorageAvailable = (async () => {
  const NAME = 'pph-storage-probe';
  try {
    if (typeof indexedDB === 'undefined') return false;
    return await new Promise((resolve) => {
      let request;
      try {
        request = indexedDB.open(NAME);
      } catch {
        resolve(false);
        return;
      }
      request.onerror = () => resolve(false);
      request.onblocked = () => resolve(true);
      request.onsuccess = () => {
        try { request.result.close(); indexedDB.deleteDatabase(NAME); } catch { /* fine */ }
        resolve(true);
      };
      // Safari in some private modes never fires either handler.
      setTimeout(() => resolve(false), 3000);
    });
  } catch {
    return false;
  }
})();

export const auth = getAuth(app);

/**
 * Storage is deliberately NOT initialised here yet.
 *
 * Nothing uploads a file until the hub sections land, and importing `firebase/storage`
 * costs every player a chunk of download on a phone for a feature that does not exist.
 * `storage.rules` is already written and published; when the first upload screen is built,
 * add `getStorage(app)` back — ideally behind a dynamic import in that screen alone.
 */
