/**
 * AudioFileWaveEncoding enum.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file AudioFileWaveEncoding.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 * @enum
 */
export enum AudioFileWaveEncoding {
  'PCM' = 0x01,
  'ADPCM' = 0x11 //Not supported by webkit. Must be converted to PCM
}