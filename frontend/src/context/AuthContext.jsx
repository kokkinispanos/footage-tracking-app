import React, { createContext, useContext, useState, useEffect } from 'react';
import { dbService } from '../services/db';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage directly (in Firebase this would be onAuthStateChanged)
  useEffect(() => {
    const session = localStorage.getItem('auth_session');
    if (session) {
      setUser(JSON.parse(session));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const u = await dbService.login(email, password);
    setUser(u);
    localStorage.setItem('auth_session', JSON.stringify(u));
  };

  const register = async (fullName, email, password, position) => {
    const u = await dbService.registerPlayer(fullName, email, password, position);
    setUser(u);
    localStorage.setItem('auth_session', JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_session');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
