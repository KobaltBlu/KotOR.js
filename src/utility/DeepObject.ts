/**
 * DeepObject class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file DeepObject.ts
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class DeepObject {
  /**
   * Simple object check.
   * @param item
   * @returns {boolean}
   */
  static _isObject(item: unknown): item is Record<string, unknown> {
    return Boolean(item && typeof item === 'object' && !Array.isArray(item));
  }

  /**
   * Deep merge two objects.
   */
  static Merge<T extends Record<string, unknown>>(target: T, ...sources: Record<string, unknown>[]): T {
    if (!sources.length) return target;
    const source = sources.shift();
    if (!source) return target;

    if (DeepObject._isObject(target) && DeepObject._isObject(source)) {
      for (const key in source) {
        if (DeepObject._isObject(source[key])) {
          if (!target[key] || !DeepObject._isObject(target[key])) {
            (target as Record<string, unknown>)[key] = {};
          }
          DeepObject.Merge(
            (target as Record<string, unknown>)[key] as Record<string, unknown>,
            source[key] as Record<string, unknown>
          );
        } else {
          (target as Record<string, unknown>)[key] = source[key];
        }
      }
    }

    return DeepObject.Merge(target, ...sources);
  }
}
