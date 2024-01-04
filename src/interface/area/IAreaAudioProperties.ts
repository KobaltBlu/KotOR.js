/**
 * IAreaAudioProperties interface.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file IAreaAudioProperties.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @interface
 */
export interface IAreaAudioProperties {
  ambient: {
    day: number;
    dayVolume: number;
    night: number;
    nightVolume: number;
  }

  music: {
    battle: number;
    day: number;
    night: number;
    delay: number;
  }

  environmentAudio: number;
}