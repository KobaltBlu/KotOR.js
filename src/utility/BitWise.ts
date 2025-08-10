/**
 * BitWise class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file BitWise.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class BitWise {
  /**
   * Checks if a value is an instance of a mask.
   * 
   * @example
   * ```ts
   * BitWise.InstanceOf(obj.objectType, ModuleObjectTypes.CREATURE); // true
   * BitWise.InstanceOf(obj.objectType, ModuleObjectTypes.ITEM); // false
   * ```
   * 
   * @param value - The value to check.
   * @param mask - The mask to check against.
   * @returns True if the value is an instance of the mask, false otherwise.
   */
  static InstanceOf(value: number, mask: number): boolean {
    if(typeof value === 'undefined') return false;
    return (value & mask) == mask;
  }

  /**
   * Checks if a value is an instance of a mask.
   * 
   * @example
   * ```ts
   * BitWise.InstanceOfObject(obj, ModuleObjectTypes.CREATURE); // obj
   * BitWise.InstanceOfObject(obj, ModuleObjectTypes.ITEM); // undefined
   * ```
   * 
   * @param value - The value to check.
   * @param mask - The mask to check against.
   * @returns True if the value is an instance of the mask, false otherwise.
   */
  static InstanceOfObject(value: any, mask: number): any {
    if(typeof value !== 'object') return false;
    return (value?.objectType & mask) == mask ? value : undefined;
  }
}