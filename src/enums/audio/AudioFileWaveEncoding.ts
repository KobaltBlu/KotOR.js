
export enum AudioFileWaveEncoding {
  'PCM' = 0x01,
  'ADPCM' = 0x11 //Not supported by webkit. Must be converted to PCM
}