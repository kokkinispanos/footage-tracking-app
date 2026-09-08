/**
 * Reading a record without trusting its shape.
 *
 * `firestore.rules` now checks types on the way in, but two kinds of record predate that:
 * the six made by the old app, when the database was writable by anyone on the internet,
 * and anything written between then and the rules being republished. The admin list renders
 * every record at once, so ONE with a map where a name should be would throw during render
 * and leave the coach looking at a blank page with no way to reach the other players.
 *
 * These helpers are not paranoia about our own code. They are about data we did not write.
 */

/** Whatever it is, hand back a string. */
export function text(value, fallback = '') {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

/** Trimmed, or the fallback if there is nothing left. */
export function label(value, fallback = '') {
  const out = text(value).trim();
  return out || fallback;
}

/** The first character, for an avatar. Never throws, never returns undefined. */
export function initial(value, fallback = '?') {
  const out = text(value).trim();
  return out ? out.charAt(0).toUpperCase() : fallback;
}

/** An array, whatever was actually stored. */
export function list(value) {
  return Array.isArray(value) ? value : [];
}
