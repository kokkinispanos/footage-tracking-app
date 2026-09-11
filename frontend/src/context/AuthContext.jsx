import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/auth';
import { dbService } from '../services/db';

const AuthContext = createContext();

/**
 * Who is signed in.
 *
 * The old version kept `{uid, email, role}` in localStorage and believed it. A player could
 * open the browser console, change "player" to "admin", reload, and see everyone. Now the
 * signed-in user comes from Firebase itself on every page load, and `isAdmin` comes from a
 * document only the Firebase console can create. Nothing here can be edited by the visitor.
 */
/**
 * The fields the app actually reads off the signed-in user.
 *
 * Kept as a plain object rather than the Firebase `User`, because `reload()` mutates that
 * object in place: React would be handed the same reference and render nothing. Anything
 * needing the live object (re-authentication, changing a password) reaches for
 * `authService.currentUser` directly.
 */
function snapshot(fbUser) {
  return {
    uid: fbUser.uid,
    email: fbUser.email,
    emailVerified: fbUser.emailVerified,
    displayName: fbUser.displayName,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);          // a snapshot of the Firebase user, or null
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.subscribe(async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      const admin = await authService.isAdmin(fbUser.uid);
      setUser(snapshot(fbUser));
      setIsAdmin(admin);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async (email, password) => {
    await authService.login(email, password);
  }, []);

  const register = useCallback(async ({ fullName, email, password, position }) => {
    const fbUser = await authService.register({ fullName, email, password });
    // The record is created immediately so the player never lands on an empty dashboard.
    await dbService.createPlayerRecord({
      authUid: fbUser.uid,
      fullName,
      email,
      position,
    });
    return fbUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (err) {
      // signOut itself failed, so he is still signed in. Say so. A Sign out button that
      // silently does nothing is exactly the bug this replaced (2026-09-11).
      if (import.meta.env?.DEV) console.warn('[auth] sign out failed', err);
      window.alert('We could not sign you out. Check your connection and try again.');
      return;
    }
    // A hard reload, not a route change: authService.logout() tears down the Firestore
    // instance to empty its cache, and every screen after this needs a live one.
    window.location.replace('/login');
  }, []);

  const sendReset = useCallback(async (email) => {
    await authService.sendReset(email);
  }, []);

  const resendVerification = useCallback(async () => {
    await authService.resendVerification();
  }, []);

  /** After a player clicks the verification link, refresh without making him sign in again. */
  const refreshUser = useCallback(async () => {
    const current = authService.currentUser;
    if (!current) return;
    await current.reload();
    // reload() mutates the SAME object, so handing it back to setState would change nothing
    // on screen. The snapshot is a new object, which is what makes React notice.
    setUser((previous) => {
      const next = snapshot(current);
      const same = previous
        && previous.email === next.email
        && previous.emailVerified === next.emailVerified
        && previous.displayName === next.displayName;
      return same ? previous : next;    // don't re-render on every tab focus for no reason
    });
  }, []);

  /**
   * Ask Firebase again when he comes back to the tab.
   *
   * Verifying an email address and changing one both happen OUT of this tab — he clicks a
   * link in his inbox, often on his phone. Nothing tells this tab about it. Without this the
   * hub goes on showing the old address and the "confirm your email" banner forever, and
   * re-authentication keeps building credentials from the stale address, so his next password
   * change fails for no visible reason.
   */
  useEffect(() => {
    const recheck = () => {
      if (document.visibilityState === 'visible') refreshUser().catch(() => {});
    };
    document.addEventListener('visibilitychange', recheck);
    window.addEventListener('focus', recheck);
    return () => {
      document.removeEventListener('visibilitychange', recheck);
      window.removeEventListener('focus', recheck);
    };
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{
      user,
      isAdmin,
      loading,
      login,
      register,
      logout,
      sendReset,
      resendVerification,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
