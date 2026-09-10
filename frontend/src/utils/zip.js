/**
 * A minimal ZIP writer, so "give me everything in one file" is one click.
 *
 * Written by hand rather than pulled from npm on purpose. Everything going in here is
 * already compressed (JPEGs and PDFs), so DEFLATE would buy nothing, and the store method
 * is about sixty lines. That is a smaller thing to own than a dependency sitting in the
 * bundle of an app that holds passports.
 *
 * Store method only (compression 0). No ZIP64, which caps the archive at 4 GB and 65,535
 * files. A player hub bundle is a handful of files and a few megabytes, and the limits are
 * now checked rather than assumed: past them a classic ZIP does not fail, it wraps the field
 * modulo 2^32 and writes a corrupt archive that looks fine until somebody opens it.
 */

/** Classic ZIP field widths. Past any of these the format silently lies. */
const MAX_ENTRIES = 65535;
const MAX_NAME_BYTES = 65535;
const MAX_SIZE = 0xFFFFFFFE;        // 0xFFFFFFFF is the ZIP64 sentinel, so stop below it

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** DOS date and time, which is what a ZIP header wants. Seconds have two-second resolution. */
function dosStamp(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function writeU16(view, offset, value) { view.setUint16(offset, value, true); }
function writeU32(view, offset, value) { view.setUint32(offset, value, true); }

/**
 * Build the archive.
 *
 * @param {Array<{name: string, bytes: Uint8Array}>} files
 * @returns {Blob}
 */
export function makeZip(files) {
  if (!Array.isArray(files)) throw new Error('makeZip needs a list of files.');
  if (files.length > MAX_ENTRIES) {
    throw new Error(`Too many files for one archive (${files.length}, limit ${MAX_ENTRIES}).`);
  }
  const encoder = new TextEncoder();
  const stamp = dosStamp(new Date());
  const parts = [];
  const central = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const data = file.bytes;
    if (nameBytes.length > MAX_NAME_BYTES) throw new Error(`File name too long: ${file.name}`);
    if (data.length > MAX_SIZE) throw new Error(`File too big for a classic zip: ${file.name}`);
    const crc = crc32(data);

    // Local file header: 30 bytes, then the name, then the data.
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    writeU32(lv, 0, 0x04034b50);
    writeU16(lv, 4, 20);              // version needed
    writeU16(lv, 6, 0x0800);          // UTF-8 names
    writeU16(lv, 8, 0);               // stored, no compression
    writeU16(lv, 10, stamp.time);
    writeU16(lv, 12, stamp.day);
    writeU32(lv, 14, crc);
    writeU32(lv, 18, data.length);    // compressed size
    writeU32(lv, 22, data.length);    // uncompressed size
    writeU16(lv, 26, nameBytes.length);
    writeU16(lv, 28, 0);              // extra field length
    local.set(nameBytes, 30);

    parts.push(local, data);

    // Central directory entry: 46 bytes, then the name.
    const entry = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(entry.buffer);
    writeU32(cv, 0, 0x02014b50);
    writeU16(cv, 4, 20);              // version made by
    writeU16(cv, 6, 20);              // version needed
    writeU16(cv, 8, 0x0800);
    writeU16(cv, 10, 0);
    writeU16(cv, 12, stamp.time);
    writeU16(cv, 14, stamp.day);
    writeU32(cv, 16, crc);
    writeU32(cv, 20, data.length);
    writeU32(cv, 24, data.length);
    writeU16(cv, 28, nameBytes.length);
    writeU16(cv, 30, 0);              // extra
    writeU16(cv, 32, 0);              // comment
    writeU16(cv, 34, 0);              // disk number
    writeU16(cv, 36, 0);              // internal attributes
    writeU32(cv, 38, 0);              // external attributes
    writeU32(cv, 42, offset);         // where the local header is
    entry.set(nameBytes, 46);
    central.push(entry);

    offset += local.length + data.length;
  });

  const centralSize = central.reduce((sum, e) => sum + e.length, 0);
  // The central directory's own size and the offset it starts at are both 32 bit fields.
  if (offset > MAX_SIZE || centralSize > MAX_SIZE) {
    throw new Error('Archive is too large for a classic zip. Export fewer files.');
  }

  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  writeU32(ev, 0, 0x06054b50);
  writeU16(ev, 4, 0);
  writeU16(ev, 6, 0);
  writeU16(ev, 8, files.length);
  writeU16(ev, 10, files.length);
  writeU32(ev, 12, centralSize);
  writeU32(ev, 16, offset);
  writeU16(ev, 20, 0);

  return new Blob([...parts, ...central, end], { type: 'application/zip' });
}

/**
 * Turn a `data:` URL, which is how files come back out of Firestore, into raw bytes.
 *
 * It THROWS on anything malformed rather than returning empty bytes. Returning an empty
 * array was worse than useless: the caller then wrote a zero byte file into the archive and
 * listed it as included, so a bundle claiming to hold a passport held nothing and said so
 * nowhere. A named error lets the caller say which file is damaged.
 */
export function dataUrlToBytes(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    throw new Error('That is not a stored file.');
  }
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error('The stored file is damaged (no data separator).');

  const meta = dataUrl.slice(0, comma);
  const body = dataUrl.slice(comma + 1);

  if (!meta.includes(';base64')) {
    try {
      return new TextEncoder().encode(decodeURIComponent(body));
    } catch {
      throw new Error('The stored file is damaged (bad percent encoding).');
    }
  }
  let binary;
  try {
    binary = atob(body);
  } catch {
    throw new Error('The stored file is damaged (bad base64).');
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** The extension a stored file should get back, from the type we recorded with it. */
export function extensionFor(type) {
  if (type === 'application/pdf') return 'pdf';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  return 'jpg';
}
