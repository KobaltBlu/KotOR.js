/**
 * AudioEmitterType enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file AudioEmitterType.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum AudioEmitterType {
  GLOBAL = 0,      //Plays everywhere
  RANDOM = 1,      //Plays from a random position
  POSITIONAL = 2,  //Plays from a specific position
};