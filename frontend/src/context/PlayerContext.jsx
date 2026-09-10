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
  // Which record `latestRef` is holding. A debounced save fires long after it was scheduled
  // and reads the value out of that shared ref, so without this stamp a timer left over from
  // one account could write the next account's data into the first one's document.
  const latestDocIdRef = useRef(null);
  // How many edits each section has had. A save that finishes after a newer edit has
  // started must not report itself as the current one — see updateSection.
  const editSeqRef = useRef({});

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

    // The Set is never replaced, only emptied — captured here so the cleanup is not reading
    // a ref at teardown time, which is the thing the exhaustive-deps rule warns about.
    const dirty = dirtyRef.current;

    const unsubscribe = onSnapshot(
      doc(db, 'players', docId),
      (snap) => {
        if (!snap.exists()) return;
        const remote = { id: snap.id, ...snap.data() };
        setData((local) => {
          if (!local) {
            latestRef.current = remote;
            latestDocIdRef.current = docId;
            return remote;
          }
          const merged = { ...remote };
          for (const key of dirty) merged[key] = local[key];
          latestRef.current = merged;
          latestDocIdRef.current = docId;
          return merged;
        });
      },
      () => setSaveStatus('error'),
    );

    return () => {
      unsubscribe();
      setData(null);
      latestRef.current = null;
      latestDocIdRef.current = null;
      // A different record (or none) is about to load: the old one's dirty marks and edit
      // counters mean nothing now. Timers already in flight still finish against the docId
      // they captured, which is what we want — an unsaved edit should still reach the server.
      dirty.clear();
      editSeqRef.current = {};
    };
  }, [docId]);

  // 3. If the tab closes mid-edit, push whatever is still pending.
  useEffect(() => {
    const flush = () => {
      if (latestDocIdRef.current !== docId) return;
      for (const key of Object.keys(timersRef.current)) {
        clearTimeout(timersRef.current[key]);
        const value = latestRef.current?.[key];
        if (docId && value !== undefined) {
          dbService.savePlayerSections(docId, { [key]: value }).catch(() => {});
        }
      }
      timersRef.current = {};
    };
    // `pagehide` alone is not enough on a phone: switching apps often fires only
    // `visibilitychange`, and the tab may never come back.
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [docId]);

  // 4. Stamp that he opened it, at most once an hour.
  //    This is what makes "who has gone quiet?" answerable on the admin side. It is thrown
  //    away silently on failure: a player must never see an error for a bookkeeping write.
  useEffect(() => {
    if (!docId) return;
    const key = `pph:lastSeen:${docId}`;
    let previous = 0;
    try { previous = Number(localStorage.getItem(key)) || 0; } catch { previous = 0; }
    if (Date.now() - previous < 3600000) return;
    dbService.touchLastSeen(docId)
      .then(() => { try { localStorage.setItem(key, String(Date.now())); } catch { /* private window */ } })
      .catch(() => {});
  }, [docId]);

  // 4b. Once Firebase says he has proved he owns his address, write it where the coach can
  //     match on it. Until then the record has no `authEmail` and no old record can be
  //     carried across to him — which is the point. See dbService.claimVerifiedEmail.
  const claimedRef = useRef(null);
  useEffect(() => {
    if (!docId || !user?.emailVerified || !user.email || !data) return;
    const real = user.email.trim().toLowerCase();
    if ((data.authEmail || '') === real) return;

    const attempt = `${docId}:${real}`;
    if (claimedRef.current === attempt) return;
    claimedRef.current = attempt;

    dbService.claimVerifiedEmail(docId, real)
      .catch(() => { claimedRef.current = null; });
  }, [docId, user?.emailVerified, user?.email, data]);

  // 5. If he changed his sign-in email, the record catches up here.
  //    The change itself happens in Firebase when he clicks the link in the new inbox, so
  //    this is the first moment the app can know about it.
  //
  //    `data.profile` is a fresh object on every snapshot, so this effect runs on every
  //    snapshot; the ref makes sure one mismatch produces one write attempt rather than one
  //    per snapshot. `touch: false` because copying his email across is not him adding
  //    something, and `updatedAt` is what the admin list reads as progress.
  const emailSyncedRef = useRef(null);
  useEffect(() => {
    if (!docId || !user?.email || !data?.profile) return;
    const stored = (data.profile.email || '').trim().toLowerCase();
    const real = user.email.trim().toLowerCase();
    if (!real || stored === real) return;

    const attempt = `${docId}:${real}`;
    if (emailSyncedRef.current === attempt) return;
    emailSyncedRef.current = attempt;

    dbService.updateProfileFields(docId, { email: real }, { touch: false })
      .catch(() => { emailSyncedRef.current = null; });   // let a failed write try again
  }, [docId, user?.email, data?.profile]);

  /**
   * Write one nested value NOW, with no debounce, and wait for it.
   *
   * For things that happen once rather than being typed. An upload is the case that matters:
   * the file is already in Storage, and until the record says so the two disagree. Through
   * the debounce that window is 700ms plus a round trip, and closing the tab inside it leaves
   * them disagreeing for good.
   */
  const savePathNow = useCallback(async (sectionKey, path, value) => {
    if (!PLAYER_OWNED_KEYS.includes(sectionKey)) return;
    if (!docId) return;
    setSaveStatus('saving');
    try {
      await dbService.savePlayerPath(docId, [sectionKey, ...path].join('.'), value);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
    } catch (err) {
      setSaveStatus('error');
      throw err;
    }
  }, [docId]);

  /** Name, position or email. Returns nothing; the snapshot brings the new value back. */
  const saveProfile = useCallback(async (fields) => {
    if (!docId) return;
    await dbService.updateProfileFields(docId, fields);
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

    // Stamp this edit. Everything below compares against it when the write comes back.
    const seq = (editSeqRef.current[sectionKey] || 0) + 1;
    editSeqRef.current[sectionKey] = seq;

    setData((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [sectionKey]: updaterFn(prev[sectionKey]) };
      latestRef.current = next;
      return next;
    });

    clearTimeout(timersRef.current[sectionKey]);
    timersRef.current[sectionKey] = setTimeout(async () => {
      // A different record is loaded now. Whatever is in the shared ref belongs to that
      // one, and writing it here would put one player's answers in another's document.
      if (latestDocIdRef.current !== docId) return;
      const value = latestRef.current?.[sectionKey];
      try {
        await dbService.savePlayerSections(docId, { [sectionKey]: value });

        // He kept typing while this write was in the air. Do NOT clear the dirty flag or
        // the timer handle: the flag is the only thing stopping the snapshot for THIS
        // write — which carries the older value — from landing on top of what he has
        // typed since, and the handle is what the pagehide flush uses to push the newer
        // edit if he closes the tab. Clearing either here silently loses the newer edit.
        if (editSeqRef.current[sectionKey] !== seq) return;

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
      savePathNow,
      saveProfile,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export const usePlayer = () => useContext(PlayerContext);
