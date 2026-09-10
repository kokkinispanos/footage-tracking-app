/** Link helpers. The app stores links, so a bad link is a bad record. */

/**
 * Everything here takes whatever it is given.
 *
 * `(raw || '').trim()` looks safe and is not: these run over stored records, and a record
 * written before the rules checked types can hold anything. The case that caught this was a
 * `photos` map saved as an ARRAY — then `item?.link` reads `String.prototype.link`, a legacy
 * DOM method, and hands a *function* to the URL parser. Coercing first is the whole fix.
 */
const asString = (raw) => (typeof raw === 'string' ? raw : '');

/** Add https:// when the player pastes "drive.google.com/..." without it. */
export function normalizeUrl(raw) {
  const value = asString(raw).trim();
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
  // The specific complaints come first, because "that is not a web address" is true of a
  // localhost link but tells the player nothing he can act on.
  if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(value)) return 'That link only works on your own computer.';
  if (!isValidUrl(value)) return 'That does not look like a web address.';
  if (/drive\.google\.com\/drive\/u\/\d+\//i.test(value)) {
    return 'This is your personal Drive view. Use "Share" then "Copy link" instead, or we cannot open it.';
  }
  if (/^file:\/\//i.test(value)) return 'That is a file on your device, not a link we can open.';
  return null;
}

/** A short, readable version of a long URL for display. */
export function prettyUrl(raw, max = 52) {
  const value = asString(raw).replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/**
 * What kind of link is this, and what is the one thing likely to go wrong with it?
 *
 * Both YouTube and Google Drive are first-class here, deliberately. A player filming three
 * full games in 4K will not have the Drive space for them, and telling him "Drive only"
 * would just stop him sending anything. YouTube is free and unlimited.
 *
 * The sharing note matters more than the platform. Every one of these can be uploaded
 * perfectly and still be unopenable by the editor, and that failure is silent: the player
 * pastes a link that works fine for HIM and hears nothing back for a week.
 */
export function describeLink(raw) {
  const value = normalizeUrl(raw);
  if (!value || !isValidUrl(value)) return null;

  let host = '';
  try { host = new URL(value).hostname.replace(/^www\./, '').toLowerCase(); } catch { return null; }

  if (host.endsWith('youtube.com') || host === 'youtu.be') {
    return {
      kind: 'youtube',
      label: 'YouTube',
      note: 'Set it to Unlisted or Public. Private means only you can watch it, and your editor will not be able to open it.',
    };
  }
  if (host.endsWith('drive.google.com') || host.endsWith('docs.google.com')) {
    return {
      kind: 'drive',
      label: 'Google Drive',
      note: 'Press Share and set it to "Anyone with the link". Otherwise it asks us for permission and we cannot get in.',
    };
  }
  if (host.endsWith('vimeo.com')) {
    return { kind: 'vimeo', label: 'Vimeo', note: 'Make sure it is not password locked.' };
  }
  if (host.endsWith('veo.co') || host.includes('veo')) {
    return { kind: 'veo', label: 'Veo', note: 'Use the share link, not the one from your own dashboard.' };
  }
  if (host.endsWith('hudl.com')) {
    return { kind: 'hudl', label: 'Hudl', note: 'Use the share link so anyone can open it.' };
  }
  if (host.endsWith('dropbox.com')) {
    return { kind: 'dropbox', label: 'Dropbox', note: 'Use a share link that anyone can open.' };
  }
  return {
    kind: 'other',
    label: host,
    note: 'Open it in a private browser window first. If it asks you to log in, we cannot see it either.',
  };
}
