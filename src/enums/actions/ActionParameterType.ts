/**
 * ActionParameterType enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionParameterType.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum ActionParameterType {
  /** Integer parameter type */
  INT     = 1,
  
  /** Floating point number parameter type */
  FLOAT   = 2,
  
  /** Double Word (32-bit unsigned integer) parameter type */
  DWORD   = 3,
  
  /** String parameter type */
  STRING  = 4,
  
  /** Script situation parameter type */
  SCRIPT_SITUATION = 5
};