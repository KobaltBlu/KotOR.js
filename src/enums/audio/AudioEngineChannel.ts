/**
 * AudioEngineChannel enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file AudioEngineChannel.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum AudioEngineChannel {
  SFX   = 0x01,
  VO    = 0x02,
  MUSIC = 0x04,
  GUI   = 0x08,
  MOVIE = 0x10,

  ALL   = 0xFF
}