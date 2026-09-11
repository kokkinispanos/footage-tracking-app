import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  verifyBeforeUpdateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { doc, getDoc, terminate, clearIndexedDbPersistence } from 'firebase/firestore';
import { auth, db } from './firebase';

/**
 * Everything to do with WHO the user is.
 *
 * The password never touches our database. Firebase Auth holds it, hashed, and we
 * only ever see a signed-in user object. Admin rights are not a field the browser
 * can set: they come from the existence of an `admins/{uid}` document, which the
 * security rules make read-only to everyone (only the Firebase console can create one).
 */

/** Firebase's error codes are not sentences. Turn them into something a tired person understands. */
export function readableAuthError(err) {
  const code = err?.code || '';
  // The player sees plain words; whoever is debugging still gets the real thing.
  if (import.meta.env?.DEV) console.warn('[auth]', code, err);
  switch (code) {
    case 'auth/invalid-email':
      return 'That does not look like an email address.';
    case 'auth/missing-password':
      return 'Type your password.';
    case 'auth/weak-password':
      return 'That password is too short. Use at least 8 characters.';
    case 'auth/email-already-in-use':
      return 'There is already an account with that email. Log in instead, or use "Forgot password".';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Wrong email or password.';
    case 'auth/too-many-requests':
      return 'Too many tries. Wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'No connection. Check your internet and try again.';
    case 'auth/user-disabled':
      return 'This account has been turned off. Please contact Pro Placement.';
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      // Firebase Auth has not been switched on for the project (MIGRATION.md, step 1).
      return 'Sign-in is not switched on yet. Please contact Pro Placement — this is on our side, not yours.';
    case 'auth/internal-error':
      return 'Something went wrong at our end. Please try again in a moment.';
    case 'auth/requires-recent-login':
      return 'For your security, please sign in again before making that change.';
    case 'auth/invalid-login-credentials':
      return 'That password is not right.';
    case 'auth/unverified-email':
      return 'Confirm your current email address first — the link is in your inbox.';
    default:
      // Never show a player a raw error code.
      return 'Something went wrong. Please try again, or contact Pro Placement if it keeps happening.';
  }
}

/**
 * Why the verification email did not go, if it did not.
 *
 * Kept here rather than thrown, because a failed verification mail must never stop an
 * account being created: the player can use the whole hub without it. What it must not do
 * is disappear, which is what a bare `.catch(() => {})` did.
 */
let lastVerificationError = null;

export const authService = {
  get lastVerificationError() {
    return lastVerificationError;
  },

  /** The signed-in Firebase user right now, or null. */
  get currentUser() {
    return auth.currentUser;
  },

  /** Create the Firebase Auth account and send the verification email. Returns the user. */
  async register({ fullName, email, password }) {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (fullName) {
      await updateProfile(cred.user, { displayName: fullName.trim() }).catch(() => {});
    }
    // Non-fatal: a failed verification mail must not block a working signup. But it must
    // not vanish either. The banner on the dashboard reads this and says so, instead of the
    // player waiting all evening for an email that was never accepted for sending.
    try {
      await sendEmailVerification(cred.user);
      lastVerificationError = null;
    } catch (err) {
      lastVerificationError = err;
      if (import.meta.env?.DEV) console.warn('[auth] verification mail failed at signup', err);
    }
    return cred.user;
  },

  async login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return cred.user;
  },

  /**
   * Sign out AND empty the on-device cache.
   *
   * Firestore's cache keeps whatever this account was allowed to read — for the coach that
   * is every player record and every private note — and Firebase does not clear it on sign
   * out. On a shared laptop the next person signing in shares the browser profile and could
   * read it straight out of IndexedDB. So: sign out, tear the cache down, and let the caller
   * reload into a fresh Firestore instance.
   *
   * Best effort by design. Clearing fails if another tab still holds the database open, and
   * a failure here must never leave someone still signed in — the sign-out has already
   * happened by then.
   */
  async logout() {
    await signOut(auth);
    // Bounded as well as best effort. The caller reloads the page once this returns, so a
    // cleanup that hung would leave someone pressing a Sign out button that does nothing.
    // 2.5 seconds is plenty for a healthy clear; past that, the reload wins. The sign-out
    // itself has already happened either way.
    await Promise.race([
      (async () => {
        try {
          await terminate(db);
          await clearIndexedDbPersistence(db);
        } catch {
          // Another tab has it open, or persistence never started. The reload still follows.
        }
      })(),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  },

  async sendReset(email) {
    await sendPasswordResetEmail(auth, email.trim());
  },

  async resendVerification() {
    if (!auth.currentUser) {
      throw Object.assign(new Error('not signed in'), { code: 'auth/null-user' });
    }
    try {
      await sendEmailVerification(auth.currentUser);
      lastVerificationError = null;
    } catch (err) {
      lastVerificationError = err;
      throw err;      // the banner shows this; it used to be swallowed
    }
  },

  /**
   * Is this user an admin? True only when `admins/{uid}` exists.
   * A denied read (a normal player) simply means no.
   */
  async isAdmin(uid) {
    try {
      const snap = await getDoc(doc(db, 'admins', uid));
      return snap.exists();
    } catch {
      return false;
    }
  },

  // ------------------------------------------------------- changing the account

  /**
   * Firebase refuses to change an email or a password on a session that has been sitting
   * open for hours, which is correct: a walk-past at a laptop should not be able to take
   * an account over. The player types his current password and we prove it here first.
   */
  async reauthenticate(currentPassword) {
    const user = auth.currentUser;
    if (!user?.email) throw Object.assign(new Error('not signed in'), { code: 'auth/null-user' });
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
  },

  /** The display name on the Auth account. The record's `profile.fullName` is written separately. */
  async setDisplayName(fullName) {
    if (!auth.currentUser) return;
    await updateProfile(auth.currentUser, { displayName: (fullName || '').trim() });
  },

  async changePassword(currentPassword, newPassword) {
    await this.reauthenticate(currentPassword);
    await updatePassword(auth.currentUser, newPassword);
  },

  /**
   * Change the sign-in email.
   *
   * `verifyBeforeUpdateEmail`, not `updateEmail`: the link goes to the NEW address and the
   * change only happens when he clicks it. So a typo cannot lock him out of his own account,
   * and nobody can move an account to an address they do not control. It is also the only
   * one of the two that still works with email-enumeration protection switched on.
   *
   * The record's `profile.email` is deliberately NOT changed here — it catches up by itself
   * on his next sign-in (see PlayerContext), once the change has actually happened.
   */
  async changeEmail(currentPassword, newEmail) {
    await this.reauthenticate(currentPassword);
    await verifyBeforeUpdateEmail(auth.currentUser, newEmail.trim());
  },

  subscribe(callback) {
    return onAuthStateChanged(auth, callback);
  },
};
