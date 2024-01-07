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
  static InstanceOf(value: number, mask: number): boolean {
    if(typeof value === 'undefined') return false;
    return (value & mask) == mask;
  }

  static InstanceOfObject(value: any, mask: number): any {
    if(typeof value !== 'object') return false;
    return (value?.objectType & mask) == mask ? value : undefined;
  }
}