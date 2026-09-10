/**
 * The Cancel / Save row at the bottom of a form inside a Modal.
 *
 * Pinned, not just placed last. It used to be the final element of a scrolling body, so on a
 * short window, or a phone in landscape, or any form with a few fields in it, the player
 * scrolled to the bottom of a box and found nothing to press. He had filled the whole thing
 * in and could not save it.
 *
 * `sticky bottom-0` keeps it in view while the fields scroll behind it. The negative margins
 * cancel the body's own padding so the bar spans the full width of the sheet, and it stays
 * inside the `<form>` so `type="submit"` still works and Enter still saves.
 */
export function ModalActions({ children }) {
  return (
    <div
      className="sticky bottom-0 z-10 -mx-5 sm:-mx-6 -mb-5 px-5 sm:px-6 py-4
                 bg-elevated/95 backdrop-blur-xl border-t border-white/10
                 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 safe-bottom"
    >
      {children}
    </div>
  );
}
