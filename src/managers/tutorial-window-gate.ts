/**
 * Pure gate for ShowTutorialWindow (no GameState — Jest-safe).
 * Retail: script enable AND Options "Tutorial Popups" AND not yet seen.
 */
export function shouldShowTutorialWindow(
  windowsEnabled: boolean,
  tutorialPopups: boolean,
  alreadySeen: boolean,
): boolean {
  return !!windowsEnabled && !!tutorialPopups && !alreadySeen;
}
