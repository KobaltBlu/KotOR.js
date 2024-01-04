/**
 * IOdysseyModelEmitterFlags interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IOdysseyModelEmitterFlags.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IOdysseyModelEmitterFlags {
  isP2P: boolean;
  isP2PSel: boolean;
  affectedByWind: boolean;
  isTinted: boolean;
  canBounce: boolean;
  isRandom: boolean;
  canInherit: boolean;
  canInheritVelocity: boolean;
  canInheritLocal: boolean;
  canSplat: boolean;
  canInheritPart: boolean;
  isDepthTexture: boolean;
}