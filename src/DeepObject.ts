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
  static _isObject(item: any) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }

  /**
   * Deep merge two objects.
   * @param target
   * @param ...sources
   */
  static Merge(target: any, ...sources: any): any {
    if (!sources.length) return target;
    const source = sources.shift();

    if (DeepObject._isObject(target) && DeepObject._isObject(source)) {
      for (const key in source) {
        if (DeepObject._isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          DeepObject.Merge(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return DeepObject.Merge(target, ...sources);
  }

}
