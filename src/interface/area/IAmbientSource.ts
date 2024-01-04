/**
 * IAmbientSource interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IAmbientSource.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IAmbientSource {
  /**
   * ambient light color (BGR format)
   */
  ambientColor: number;

  /**
   * diffuse light color (BGR format)
   */
  diffuseColor: number;

  /**
   * fog amount (0-15)
   */
  fogAmount: number;

  /**
   * fog color (BGR format)
   */
  fogColor: number;

  /**
   * fogNear
   */
  fogNear: number;

  /**
   * fogFar
   */
  fogFar: number;

  /**
   * fogOn
   */
  fogOn: boolean;

  /**
   * 1 if shadows appear at night, 0 otherwise
   */
  shadows: boolean;
}