import { useCallback } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { getIn, setIn } from '../../utils/nested';

export { getIn, setIn };

/**
 * One hub section's data, and the two ways to change it.
 *
 * Every write goes through `updateSection`, so it inherits what the footage sections
 * already have: only the section that changed is written, edits are held for 700ms so a
 * name is one save and not twelve, and a save in flight cannot be overwritten by an
 * incoming update from the player's other device.
 *
 * In admin mode nothing is editable. The coach reads a player's record; he does not fill it
 * in for him. The two exceptions are on the deliverables section and are explicit there.
 */
export function useHubSection(sectionKey, { adminMode = false, overrideData = null } = {}) {
  const context = usePlayer();
  const record = adminMode ? overrideData : context.playerData;
  const data = record?.[sectionKey] && typeof record[sectionKey] === 'object'
    ? record[sectionKey]
    : {};

  const setPath = useCallback((path, value) => {
    if (adminMode) return;
    context.updateSection(sectionKey, (current) => setIn(current, path, value));
  }, [adminMode, context, sectionKey]);

  const set = useCallback((key, value) => setPath([key], value), [setPath]);

  /** Same as setPath, but written straight away and awaited. For uploads, not for typing. */
  const setPathNow = useCallback(async (path, value) => {
    if (adminMode) return;
    await context.savePathNow(sectionKey, path, value);
  }, [adminMode, context, sectionKey]);

  return { data, set, setPath, setPathNow, readOnly: adminMode };
}
