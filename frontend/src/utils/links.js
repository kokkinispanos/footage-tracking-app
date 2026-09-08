/** Link helpers. The app stores links, so a bad link is a bad record. */

/** Add https:// when the player pastes "drive.google.com/..." without it. */
export function normalizeUrl(raw) {
  const value = (raw || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[\w-]+(\.[\w-]+)+/.test(value)) return `https://${value}`;
  return value;
}

export function isValidUrl(raw) {
  const value = normalizeUrl(raw);
  if (!value) return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.');
  } catch {
    return false;
  }
}

/**
 * Mistakes we can actually catch in the browser. We cannot tell whether a Drive file is
 * shared — that is why the player is asked to confirm he opened it in a private window.
 */
export function linkWarning(raw) {
  const value = normalizeUrl(raw);
  if (!value) return null;
  if (!isValidUrl(value)) return 'That does not look like a web address.';
  if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(value)) return 'That link only works on your own computer.';
  if (/drive\.google\.com\/drive\/u\/\d+\//i.test(value)) {
    return 'This is your personal Drive view. Use "Share" then "Copy link" instead, or we cannot open it.';
  }
  if (/^file:\/\//i.test(value)) return 'That is a file on your device, not a link we can open.';
  return null;
}

/** A short, readable version of a long URL for display. */
export function prettyUrl(raw, max = 52) {
  const value = (raw || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
