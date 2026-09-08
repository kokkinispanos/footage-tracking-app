import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { dbService, PLAYER_OWNED_KEYS } from '../services/db';
import { useAuth } from './AuthContext';

const PlayerContext = createContext();

/**
 * The player's own record, kept live.
 *
 * Two things the old version got wrong, both fixed here:
 *  1. It read the record ONCE. Two devices open at the same time meant the last save won
 *     and the other device's work vanished. Now we listen (`onSnapshot`), so a clip added
 *     on the phone appears on the laptop by itself.
 *  2. It wrote the WHOLE document on every change, password and role included. Now only
 *     the section that actually changed is written.
 *
 * While a section has an unsaved local edit it is "dirty": incoming remote data is applied
 * to every OTHER section, never on top of what the player is typing right now.
 */
export function PlayerProvider({ children }) {
  const { user } = useAuth();

  // Which document is his. Identity only — set from an async callback, never mid-render.
  const [target, setTarget] = useState(null);   // { uid, docId, missing }
  const [data, setData] = useState(null);       // the document contents
  const [saveStatus, setSaveStatus] = useState('idle');

  const dirtyRef = useRef(new Set());
  const timersRef = useRef({});
  const latestRef = useRef(null);

  // 1. Find his document: id = auth uid for new records, an older uuid for legacy ones.
  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;

    dbService.getMyPlayerRecord(user.uid)
      .then((record) => {
        if (cancelled) return;
        setTarget({ uid: user.uid, docId: record?.id ?? null, missing: !record });
      })
      .catch(() => {
        if (!cancelled) setTarget({ uid: user.uid, docId: null, missing: true });
      });

    return () => { cancelled = true; };
  }, [user]);

  const resolved = !!user && target?.uid === user.uid;
  const docId = resolved ? target.docId : null;

  // 2. Stay subscribed to it.
  useEffect(() => {
    if (!docId) return undefined;

    const unsubscribe = onSnapshot(
      doc(db, 'players', docId),
      (snap) => {
        if (!snap.exists()) return;
        const remote = { id: snap.id, ...snap.data() };
        setData((local) => {
          if (!local) {
            latestRef.current = remote;
            return remote;
          }
          const merged = { ...remote };
          for (const key of dirtyRef.current) merged[key] = local[key];
          latestRef.current = merged;
          return merged;
        });
      },
      () => setSaveStatus('error'),
    );

    return () => {
      unsubscribe();
      setData(null);
      latestRef.current = null;
    };
  }, [docId]);

  // 3. If the tab closes mid-edit, push whatever is still pending.
  useEffect(() => {
    const flush = () => {
      for (const key of Object.keys(timersRef.current)) {
        clearTimeout(timersRef.current[key]);
        const value = latestRef.current?.[key];
        if (docId && value !== undefined) {
          dbService.savePlayerSections(docId, { [key]: value }).catch(() => {});
        }
      }
      timersRef.current = {};
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [docId]);

  /**
   * Change one section of the record.
   * `sectionKey` is a top-level field the player owns; `updaterFn` receives that section only.
   */
  const updateSection = useCallback((sectionKey, updaterFn) => {
    if (!PLAYER_OWNED_KEYS.includes(sectionKey)) {
      console.warn(`Refusing to write "${sectionKey}" — not a player-owned section.`);
      return;
    }
    if (!docId) return;

    dirtyRef.current.add(sectionKey);
    setSaveStatus('saving');

    setData((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [sectionKey]: updaterFn(prev[sectionKey]) };
      latestRef.current = next;
      return next;
    });

    clearTimeout(timersRef.current[sectionKey]);
    timersRef.current[sectionKey] = setTimeout(async () => {
      const value = latestRef.current?.[sectionKey];
      try {
        await dbService.savePlayerSections(docId, { [sectionKey]: value });
        dirtyRef.current.delete(sectionKey);
        delete timersRef.current[sectionKey];
        if (dirtyRef.current.size === 0) {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
        }
      } catch {
        setSaveStatus('error');
      }
    }, 700);
  }, [docId]);

  const loading = !!user && (!resolved || (!!docId && !data));
  const notFound = resolved && target.missing;

  return (
    <PlayerContext.Provider value={{
      playerData: user ? data : null,
      docId,
      loading,
      notFound,
      saveStatus,
      updateSection,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
