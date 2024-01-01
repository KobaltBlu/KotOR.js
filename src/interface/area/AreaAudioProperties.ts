export interface AreaAudioProperties {
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