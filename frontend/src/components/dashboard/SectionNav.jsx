import { Video, Star, Film, Image as ImageIcon, FolderUp } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Sticky section jump, phones only.
 *
 * He films on his phone and the hub is five long sections; without this, getting from the
 * photos back to the full games is a lot of thumb. Each button shows whether that section is
 * finished, so the bar doubles as the checklist. Asked for in the app guidelines
 * ("sticky bottom navigation") and missing until now.
 */
const ITEMS = [
  { anchor: 'full-games', key: 'fullGames', icon: Video, label: 'Games' },
  { anchor: 'top-clips', key: 'topThreeClips', icon: Star, label: 'Top 3' },
  { anchor: 'skill-clips', key: 'skillClips', icon: Film, label: 'Skills' },
  { anchor: 'photos', key: 'photos', icon: ImageIcon, label: 'Photos' },
  { anchor: 'drive-folder', key: 'driveFolder', icon: FolderUp, label: 'Drive' },
];

export function SectionNav({ stats, onGo }) {
  const doneFor = (key) => stats?.sections?.find((s) => s.key === key)?.complete;

  return (
    <nav
      aria-label="Jump to a section"
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/[0.07]
                 bg-background/95 backdrop-blur-xl safe-bottom"
    >
      <ul className="flex">
        {ITEMS.map(({ anchor, key, icon: Icon, label }) => {
          const complete = doneFor(key);
          return (
            <li key={anchor} className="flex-1">
              <button
                onClick={() => onGo(anchor)}
                className="w-full flex flex-col items-center gap-1 py-2.5 active:bg-white/[0.06] transition-colors"
              >
                <span className="relative">
                  <Icon className={cn('w-5 h-5', complete ? 'text-success' : 'text-ink-faint')} />
                  {complete && (
                    <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-success" />
                  )}
                </span>
                <span className={cn('text-[10px]', complete ? 'text-success' : 'text-ink-faint')}>
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
