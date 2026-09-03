/**
 * Resolve encdifficulty.2da VALUE for DifficultyIndex. The VALUE field is obsolete but must match.
 *
 * @file encounterDifficultyValue.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export interface EncounterDifficultyValueRow {
  value?: number;
}

export function encounterDifficultyValueAt(
  index: number,
  rows?: Array<EncounterDifficultyValueRow | undefined | null>
): number {
  const value = rows?.[index]?.value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return Number.isFinite(index) ? index : 0;
}
