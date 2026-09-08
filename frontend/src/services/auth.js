import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
      return 'This account has been turned off. Contact Pro Placement.';
    case 'auth/operation-not-allowed':
      return 'Email sign-in is not switched on for this project yet. Tell Panos.';
    default:
      return err?.message?.replace('Firebase: ', '') || 'Something went wrong. Try again.';
  }
}

export const authService = {
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
    // Non-fatal: a failed verification mail must not block a working signup.
    await sendEmailVerification(cred.user).catch(() => {});
    return cred.user;
  },

  async login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return cred.user;
  },

  async logout() {
    await signOut(auth);
  },

  async sendReset(email) {
    await sendPasswordResetEmail(auth, email.trim());
  },

  async resendVerification() {
    if (auth.currentUser) await sendEmailVerification(auth.currentUser);
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

  subscribe(callback) {
    return onAuthStateChanged(auth, callback);
  },
};
