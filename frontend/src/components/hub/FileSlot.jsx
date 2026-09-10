import { useRef, useState, useEffect } from 'react';
import { Upload, FileCheck2, Trash2, Eye, Loader2, AlertTriangle, X } from 'lucide-react';
import { fileService, fileProblem } from '../../services/files';
import { UPLOAD_SLOTS } from '../../utils/hubCatalog';
import { Button } from '../ui/Button';
import { useConfirm } from '../ui/ConfirmDialog';
import { cn } from '../../utils/cn';

/**
 * One file: a passport page, a CV, a photo.
 *
 * The file itself goes to Firebase Storage. What is stored in the player's record is only
 * the name, the size and the date, never a link, because a Firebase download link carries
 * its own access token and works for anyone who ever sees it. For a passport that is the
 * wrong trade, so viewing fetches the bytes with the signed-in user's own credentials and
 * throws them away when the window closes.
 */

/** Firebase's storage codes, in words a player can act on. */
function readableUploadError(err) {
  const code = err?.code || '';
  if (import.meta.env?.DEV) console.warn('[files]', code, err);
  switch (code) {
    case 'storage/unauthorized':
      return 'We could not save that. Sign out, sign back in, and try again.';
    case 'storage/canceled':
      return 'That upload stopped. Try again.';
    case 'storage/retry-limit-exceeded':
    case 'storage/server-file-wrong-size':
      // Bad signal gives this, and so does a project where file saving was never switched
      // on. The player cannot tell those apart and should not have to, so the message covers
      // both: try again, and tell us if trying again does not work.
      return 'That did not go through. It might be your signal. Try again, and tell Pro '
        + 'Placement if it keeps failing.';
    case 'storage/quota-exceeded':
      return 'Our storage is full. Tell Pro Placement, this one is on us.';
    case 'storage/unknown':
    case 'storage/project-not-found':
    case 'storage/bucket-not-found':
    case 'storage/invalid-argument':
      // The common cause by far: Storage has never been switched on for the project.
      return 'File saving is not switched on yet. Tell Pro Placement, this one is on us.';
    default:
      return err?.message || 'That did not work. Try again in a moment.';
  }
}

function prettySize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function FileSlot({
  slot,
  uid,
  label,
  hint,
  value,          // { name, size, type, uploadedAt } or nothing
  onChange,
  readOnly = false,
  isAdmin = false,
}) {
  const spec = UPLOAD_SLOTS[slot];
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);   // an object URL while the viewer is open
  const [opening, setOpening] = useState(false);
  const [slow, setSlow] = useState(false);
  const { confirm, dialog } = useConfirm();

  // An object URL is a live handle on real bytes. Let it go the moment it is not on screen.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const pick = () => inputRef.current?.click();

  const onPicked = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';           // so picking the same file twice still fires
    if (!file) return;

    const problem = fileProblem(file, slot);
    if (problem) { setError(problem); return; }

    setError('');
    setBusy(true);
    setPercent(0);
    setSlow(false);
    // Nothing moving after twelve seconds usually means bad signal, or that file saving was
    // never switched on. Either way he deserves to be told rather than watching a still bar.
    const slowTimer = setTimeout(() => setSlow(true), 12000);
    try {
      const saved = await fileService.upload(uid, slot, file, setPercent);
      // Awaited on purpose. The file is in Storage now; until the record says so the two
      // disagree, and the player would be looking at a screen that has forgotten his upload.
      await onChange(saved);
    } catch (err) {
      setError(readableUploadError(err));
    } finally {
      clearTimeout(slowTimer);
      setSlow(false);
      setBusy(false);
      setPercent(0);
    }
  };

  const removeFile = async () => {
    const ok = await confirm({
      title: `Delete ${label.toLowerCase()}?`,
      body: 'The file goes for good. You can always upload it again.',
      confirmText: 'Yes, delete it',
    });
    if (!ok) return;
    setError('');
    setBusy(true);
    try {
      // Record first, file second. If the second half fails we are left with an object
      // nobody points at, which is tidy-up. The other order leaves the record claiming a
      // file that is gone, which is a lie the coach acts on.
      await onChange(null);
      await fileService.remove(uid, slot);
    } catch (err) {
      setError(readableUploadError(err));
    } finally {
      setBusy(false);
    }
  };

  const view = async () => {
    setError('');
    setOpening(true);
    try {
      const url = await fileService.openBlobUrl(uid, slot);
      // He navigated away while it downloaded. The URL holds real bytes and nothing is going
      // to put it on screen now, so let it go rather than leaking it.
      if (!mountedRef.current) { URL.revokeObjectURL(url); return; }
      setPreview(url);
    } catch {
      // Reading the bytes needs CORS on the bucket. Rather than quietly minting a permanent
      // download link instead, say so. The coach has a way in that does not weaken anything.
      setError(isAdmin
        ? 'This browser cannot fetch the file directly. It is saved safely. Open it in the '
          + `Firebase console under Storage, players/${uid}/${slot}.`
        : 'We could not open it here, but it is saved safely. Your coach can see it.');
    } finally {
      setOpening(false);
    }
  };

  const has = !!value?.name;

  return (
    <div className={cn(
      'rounded-xl border p-4 transition-colors',
      has ? 'bg-success/[0.05] border-success/25' : 'bg-black/20 border-white/[0.07]',
    )}>
      {dialog}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3.5">
        <span className={cn(
          'w-10 h-10 rounded-xl border flex items-center justify-center flex-none',
          has ? 'bg-success/10 border-success/25' : 'bg-white/[0.04] border-white/10',
        )}>
          {has
            ? <FileCheck2 className="w-[18px] h-[18px] text-success" />
            : <Upload className="w-[18px] h-[18px] text-ink-faint" />}
        </span>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-ink">{label}</div>
          {has ? (
            <div className="text-xs text-ink-muted mt-0.5 truncate">
              {value.name}
              {value.size ? ` · ${prettySize(value.size)}` : ''}
              {value.uploadedAt ? ` · ${new Date(value.uploadedAt).toLocaleDateString()}` : ''}
            </div>
          ) : (
            <div className="text-xs text-ink-faint mt-0.5 leading-relaxed">{hint}</div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-none">
          {has && (
            <Button variant="ghost" size="sm" onClick={view} loading={opening} className="gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Look at it
            </Button>
          )}
          {!readOnly && (
            <>
              <Button variant={has ? 'secondary' : 'primary'} size="sm" onClick={pick} loading={busy}>
                {has ? 'Change it' : 'Add it'}
              </Button>
              {has && (
                <Button variant="danger" size="sm" onClick={removeFile} aria-label="Delete" className="px-2">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {busy && (
        <div className="mt-3">
          <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
            <div className="h-full bg-brand-sheen rounded-full transition-all" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-xs text-ink-faint mt-1.5">
            <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
            Sending it up. {percent}% done. Keep this page open.
          </p>
          {slow && (
            <p className="text-xs text-warning mt-1.5 leading-relaxed">
              This is taking a while. Your signal might be weak. If it keeps sitting here,
              tell Pro Placement and try again later.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="mt-3 flex items-start gap-2 text-[13px] text-error bg-error/10 border border-error/20 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 flex-none mt-px" /> {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={spec?.accept}
        onChange={onPicked}
        className="hidden"
      />

      {preview && (
        <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <button
            onClick={() => { URL.revokeObjectURL(preview); setPreview(null); }}
            aria-label="Close"
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 text-ink hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          {value?.type === 'application/pdf'
            ? <iframe title={label} src={preview} className="w-full h-full max-w-4xl rounded-xl bg-white" />
            : <img alt={label} src={preview} className="max-w-full max-h-full rounded-xl object-contain" />}
        </div>
      )}
    </div>
  );
}
