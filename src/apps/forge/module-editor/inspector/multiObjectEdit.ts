/**
 * Helpers for multi-object inspector editing.
 *
 * @file multiObjectEdit.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

export type MixedValue<T> = { mixed: true } | { mixed: false; value: T };

export function resolveCommonValue<T>(values: T[]): MixedValue<T> {
  if (!values.length) {
    return { mixed: true };
  }
  const first = values[0];
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== first) {
      return { mixed: true };
    }
  }
  return { mixed: false, value: first };
}

export function formatMixedDisplay(value: MixedValue<string | number | boolean>): string {
  if (value.mixed === true) {
    return "(multiple values)";
  }
  return String(value.value);
}

/**
 * Apply a scalar property to every selected object when the setter succeeds.
 */
export function applyToMany<T extends object>(
  objects: T[],
  apply: (object: T) => void,
): number {
  let count = 0;
  for (const object of objects) {
    apply(object);
    count += 1;
  }
  return count;
}
