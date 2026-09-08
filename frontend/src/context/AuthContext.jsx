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
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);          // the Firebase user, or null
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
      setUser(fbUser);
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
    await authService.logout();
  }, []);

  const sendReset = useCallback(async (email) => {
    await authService.sendReset(email);
  }, []);

  const resendVerification = useCallback(async () => {
    await authService.resendVerification();
  }, []);

  /** After a player clicks the verification link, refresh without making him sign in again. */
  const refreshUser = useCallback(async () => {
    if (!authService.currentUser) return;
    await authService.currentUser.reload();
    setUser({ ...authService.currentUser });
  }, []);

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
