import { useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

/**
 * A styled "are you sure?" instead of the browser's grey box.
 *
 * const { confirm, dialog } = useConfirm();
 * ... await confirm({ title, body, confirmText }) -> true / false
 * ... render {dialog}
 */
export function useConfirm() {
  const [state, setState] = useState(null);

  const confirm = useCallback((options) => new Promise((resolve) => {
    setState({ ...options, resolve });
  }), []);

  const close = (answer) => {
    state?.resolve(answer);
    setState(null);
  };

  const dialog = state ? (
    <Modal isOpen onClose={() => close(false)} title={state.title || 'Are you sure?'}>
      <div className="flex gap-3.5">
        <span className="w-10 h-10 rounded-xl bg-error/10 border border-error/25 flex items-center justify-center flex-none">
          <AlertTriangle className="w-5 h-5 text-error" />
        </span>
        <p className="text-sm text-ink-muted leading-relaxed pt-2">
          {state.body || 'This cannot be undone.'}
        </p>
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-6">
        <Button variant="ghost" onClick={() => close(false)}>Cancel</Button>
        <Button variant="danger" onClick={() => close(true)}>
          {state.confirmText || 'Delete'}
        </Button>
      </div>
    </Modal>
  ) : null;

  return { confirm, dialog };
}
