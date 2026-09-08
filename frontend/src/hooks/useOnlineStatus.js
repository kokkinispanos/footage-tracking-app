import { useEffect, useState } from 'react';

/**
 * Is the browser online?
 *
 * Used only to TELL the player what is happening. It is not used to decide whether to save —
 * Firestore's cache handles that (see services/firebase.js), and a player who sees "Saving…"
 * followed by silence assumes he has lost his work. He hasn't, and this is how he knows.
 *
 * `navigator.onLine` is honest about "no network at all" and optimistic about everything else
 * (captive wifi at a ground will report online). That is the right way round: we would rather
 * say nothing than wrongly tell him he is offline.
 */
export function useOnlineStatus() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine !== false
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}
