/**
 * Reading and writing a value that lives a few levels down, without assuming the levels
 * above it exist. The hub stores answers in shapes like `identity.passportOne.country`,
 * and a record written before that question existed simply has none of those branches.
 *
 * Pure on purpose: the completion maths imports these, and that has to stay runnable
 * outside React so it can be checked on its own.
 */

/** Set a nested value without changing the original object. */
export function setIn(target, path, value) {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  const base = (target && typeof target === 'object' && !Array.isArray(target)) ? target : {};
  return { ...base, [head]: setIn(base[head], rest, value) };
}

/** Read a nested value, giving back the fallback rather than throwing on a missing branch. */
export function getIn(target, path, fallback = '') {
  let cursor = target;
  for (const key of path) {
    if (cursor == null || typeof cursor !== 'object') return fallback;
    cursor = cursor[key];
  }
  return cursor ?? fallback;
}
