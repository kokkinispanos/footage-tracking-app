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
      return 'Your connection dropped. Try again when you have better signal.';
    case 'storage/quota-exceeded':
      return 'Our storage is full. Tell Pro Placement, this one is on us.';
    case 'storage/unknown':
      return 'File storage is not switched on yet. Tell Pro Placement, this one is on us.';
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
  const { confirm, dialog } = useConfirm();

  // An object URL is a live handle on real bytes. Let it go the moment it is not on screen.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

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
    try {
      const saved = await fileService.upload(uid, slot, file, setPercent);
      onChange(saved);
    } catch (err) {
      setError(readableUploadError(err));
    } finally {
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
      await fileService.remove(uid, slot);
      onChange(null);
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
      setPreview(await fileService.openBlobUrl(uid, slot));
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

      {busy && percent > 0 && (
        <div className="mt-3">
          <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
            <div className="h-full bg-brand-sheen rounded-full transition-all" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-xs text-ink-faint mt-1.5">
            <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
            Sending it up. {percent}% done. Keep this page open.
          </p>
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
