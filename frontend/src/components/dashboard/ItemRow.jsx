import { ChevronUp, ChevronDown, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '../ui/Button';
import { prettyUrl } from '../../utils/links';
import { cn } from '../../utils/cn';

/**
 * One saved link in a list, with working reorder in BOTH directions.
 * The old version only ever moved an item up: the down arrow did not exist, and the
 * control was a drag handle that could not be dragged.
 */
export function ItemRow({
  title,
  badge,
  link,
  note,
  index,
  total,
  onMove,
  onEdit,
  onDelete,
  readOnly = false,
  children,
  className,
}) {
  return (
    <div className={cn(
      "group rounded-xl bg-black/20 border border-white/[0.07] p-3.5 sm:p-4",
      "hover:border-brand/25 transition-colors",
      className
    )}>
      <div className="flex items-start gap-3">
        {!readOnly && onMove && (
          <div className="hidden sm:flex flex-col gap-0.5 pt-0.5 flex-none">
            <button
              onClick={() => onMove(index, -1)}
              disabled={index === 0}
              aria-label="Move up"
              className="p-1 rounded-md text-ink-faint hover:text-ink hover:bg-white/10 disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onMove(index, 1)}
              disabled={index === total - 1}
              aria-label="Move down"
              className="p-1 rounded-md text-ink-faint hover:text-ink hover:bg-white/10 disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {title && <h3 className="font-medium text-ink text-[15px] truncate">{title}</h3>}
            {badge}
          </div>

          {link && (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[13px] text-brand-light hover:underline break-all"
            >
              <ExternalLink className="w-3 h-3 flex-none" />
              {prettyUrl(link)}
            </a>
          )}

          {note && <p className="text-[13px] text-ink-muted mt-1.5 leading-relaxed">{note}</p>}
        </div>

        {!readOnly && (
          <div className="flex items-center gap-1.5 flex-none opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
            {onEdit && (
              <Button variant="secondary" size="sm" onClick={onEdit} aria-label="Edit" className="px-2">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button variant="danger" size="sm" onClick={onDelete} aria-label="Delete" className="px-2">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Reorder on a phone: full-width buttons under the row. */}
      {!readOnly && onMove && total > 1 && (
        <div className="flex sm:hidden gap-2 mt-3 pt-3 border-t border-white/[0.07]">
          <Button
            variant="ghost" size="sm" className="flex-1"
            onClick={() => onMove(index, -1)} disabled={index === 0}
          >
            <ChevronUp className="w-4 h-4" /> Up
          </Button>
          <Button
            variant="ghost" size="sm" className="flex-1"
            onClick={() => onMove(index, 1)} disabled={index === total - 1}
          >
            <ChevronDown className="w-4 h-4" /> Down
          </Button>
        </div>
      )}

      {children}
    </div>
  );
}
