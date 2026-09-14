/**
 * animations.2da flag columns are 0/1 in the table; SWAnimation exposes them
 * as booleans. Call sites historically compared String(value) === '1', which
 * fails for boolean `true`. Accept all retail/JS shapes.
 */
export function isAnimation2DAFlagSet(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}
