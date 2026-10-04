import { AudioLoader } from "@/audio/AudioLoader";
import { AudioEngine } from "@/audio/AudioEngine";
import type { AmbientAudioEmitter } from "@/audio/AmbientAudioEmitter";
import { BackgroundMusicMode } from "@/enums/audio/BackgroundMusicMode";
import { BackgroundMusicState } from "@/enums/audio/BackgroundMusicState";
import type { ModuleCreature } from "@/module";

type MusicBufferType = 'BACKGROUND_MUSIC_DAY' | 'BACKGROUND_MUSIC_NIGHT' | 'BATTLE' | 'BATTLE_STINGER' | 'DIALOG' | 'MENU';

export class MusicManager {

  static initialized = false;
  private static playbackRequest = 0;
  private static loadGeneration = 0;
  private static trackRequests = new Map<MusicBufferType, number>();

  static area = {
    day: '',
    night: '',
    delay: 30000,
  };

  static battle = {
    track: '',
    stinger: '',
  };

  static dialog = {
    track: '',
  };

  static menu = {
    track: '',
    volume: 1,
    loop: true,
  };

  static currentMode: BackgroundMusicMode = BackgroundMusicMode.NONE;
  static currentTrack = '';
  static loopTimer = 0;

  static get engine(){
    return AudioEngine.GetAudioEngine();
  }

  static Initialize(){
    if(this.initialized){
      return;
    }

    const audioEngine = this.engine;

    audioEngine.areaMusicDayAudioEmitter.addEventListener('ended', () => {
      if(this.currentMode !== BackgroundMusicMode.AREA){ return; }
      const trackName = this.area.day || audioEngine.areaMusicDayAudioEmitter.name;
      if(!trackName){
        return;
      }

      this.area.day = trackName;
      this.setState(BackgroundMusicMode.AREA, BackgroundMusicState.ENDED, trackName);
      if(AudioEngine.loopBGM){
        if(this.area.delay <= 0){
          void this.playAreaMusic(true);
        }else{
          this.loopTimer = this.area.delay;
        }
      }
    });

    audioEngine.battleStingerAudioEmitter.addEventListener('ended', () => {
      if(this.currentMode !== BackgroundMusicMode.BATTLE_STINGER){
        return;
      }
      void this.resumeAreaMusic();
    });

    audioEngine.dialogMusicAudioEmitter.addEventListener('ended', () => {
      if(this.currentMode !== BackgroundMusicMode.DIALOG){
        return;
      }
      void this.resumeAreaMusic();
    });

    audioEngine.menuMusicAudioEmitter.addEventListener('ended', () => {
      if(this.currentMode !== BackgroundMusicMode.MENU){
        return;
      }
      this.engine.bgmState = BackgroundMusicState.ENDED;
    });

    this.initialized = true;
    this.Reset();
  }

  static Reset(){
    this.playbackRequest++;
    this.loadGeneration++;
    this.trackRequests.clear();
    this.stopPrimaryMusic();
    this.area.day = '';
    this.area.night = '';
    this.area.delay = 30000;
    this.battle.track = '';
    this.battle.stinger = '';
    this.dialog.track = '';
    this.menu.track = '';
    this.menu.volume = 1;
    this.menu.loop = true;
    this.loopTimer = 0;
    this.setState(BackgroundMusicMode.NONE, BackgroundMusicState.UNLOADED, '');
  }

  static Update(delta = 0){
    if(this.currentMode !== BackgroundMusicMode.AREA){
      return;
    }

    if(this.engine.bgmState !== BackgroundMusicState.ENDED){
      return;
    }

    if(!AudioEngine.loopBGM || this.loopTimer <= 0){
      return;
    }

    this.loopTimer -= delta * 1000;
    if(this.loopTimer <= 0){
      this.loopTimer = 0;
      void this.playAreaMusic(true);
    }
  }

  static UpdateAreaMusicState(oPC: ModuleCreature){
    if(!oPC){
      return;
    }

    if(oPC.excitedDuration > 0 && this.currentMode === BackgroundMusicMode.AREA && (this.battle.track || this.engine.battleMusicLoaded)){
      void this.playBattleMusic(false);
    }else if(oPC.excitedDuration <= 0 && this.currentMode === BackgroundMusicMode.BATTLE){
      void this.endBattleMusic();
    }
  }

  static setState(mode: BackgroundMusicMode, state: BackgroundMusicState, track = ''){
    this.currentMode = mode;
    this.currentTrack = track;
    this.engine.bgmMode = mode;
    this.engine.bgmState = state;
  }

  static normalizeTrackName(track = ''){
    return track.toLocaleLowerCase().trim();
  }

  static isEmitterPlayingTrack(emitter: AmbientAudioEmitter, trackName = ''){
    return !!(emitter?.playing && this.normalizeTrackName(emitter.playingName || emitter.name) === this.normalizeTrackName(trackName));
  }

  static getEmitter(type: MusicBufferType){
    switch(type){
      case 'BACKGROUND_MUSIC_DAY':
        return this.engine.areaMusicDayAudioEmitter;
      case 'BACKGROUND_MUSIC_NIGHT':
        return this.engine.areaMusicNightAudioEmitter;
      case 'BATTLE':
        return this.engine.battleMusicAudioEmitter;
      case 'BATTLE_STINGER':
        return this.engine.battleStingerAudioEmitter;
      case 'DIALOG':
        return this.engine.dialogMusicAudioEmitter;
      case 'MENU':
        return this.engine.menuMusicAudioEmitter;
    }
  }

  static async ensureTrackLoaded(type: MusicBufferType, trackName = ''){
    if(!trackName || trackName === '****'){
      return false;
    }

    const emitter = this.getEmitter(type);
    if(emitter?.data && this.normalizeTrackName(emitter.name) === this.normalizeTrackName(trackName)){
      return true;
    }

    const generation = this.loadGeneration;
    const requestId = (this.trackRequests.get(type) || 0) + 1;
    this.trackRequests.set(type, requestId);
    let data: Uint8Array;
    switch(type){
      case 'BATTLE_STINGER':
        data = await AudioLoader.LoadStreamSound(trackName);
        break;
      default:
        data = await AudioLoader.LoadMusic(trackName);
        break;
    }

    if(!data || generation !== this.loadGeneration || requestId !== this.trackRequests.get(type)){
      return false;
    }

    this.engine.setAudioBuffer(type, data.buffer as ArrayBuffer, trackName);
    return true;
  }

  static stopPrimaryMusic(except?: AmbientAudioEmitter){
    const emitters = [
      this.engine.areaMusicDayAudioEmitter,
      this.engine.areaMusicNightAudioEmitter,
      this.engine.battleMusicAudioEmitter,
      this.engine.battleStingerAudioEmitter,
      this.engine.dialogMusicAudioEmitter,
      this.engine.menuMusicAudioEmitter,
    ];

    for(let i = 0; i < emitters.length; i++){
      const emitter = emitters[i];
      if(emitter && emitter !== except){
        emitter.stop();
      }
    }
  }

  static stopMusic(){
    this.playbackRequest++;
    this.loadGeneration++;
    this.setState(BackgroundMusicMode.NONE, BackgroundMusicState.UNLOADED, '');
    this.stopPrimaryMusic();
  }

  static async setAreaDayTrack(trackName = ''){
    this.Initialize();
    this.area.day = trackName || '';
    if(!trackName || trackName === '****'){
      return false;
    }
    return await this.ensureTrackLoaded('BACKGROUND_MUSIC_DAY', trackName);
  }

  static async setAreaNightTrack(trackName = ''){
    this.Initialize();
    this.area.night = trackName || '';
    if(!trackName || trackName === '****'){
      return false;
    }
    return await this.ensureTrackLoaded('BACKGROUND_MUSIC_NIGHT', trackName);
  }

  static setAreaMusicDelay(delay = 30000){
    this.area.delay = Math.max(0, delay || 0);
    this.engine.bgmLoopTime = this.area.delay;
  }

  static async playAreaMusicTrack(trackName: string, restartIfSame = false){
    this.Initialize();
    const requestId = ++this.playbackRequest;
    this.area.day = trackName || '';

    if(!trackName || trackName === '****'){
      return false;
    }

    if(!restartIfSame && this.currentMode === BackgroundMusicMode.AREA && this.isEmitterPlayingTrack(this.engine.areaMusicDayAudioEmitter, trackName)){
      this.setState(BackgroundMusicMode.AREA, BackgroundMusicState.PLAYING, trackName);
      return true;
    }

    const loaded = await this.ensureTrackLoaded('BACKGROUND_MUSIC_DAY', trackName);
    if(!loaded || requestId !== this.playbackRequest){
      return false;
    }

    this.setState(BackgroundMusicMode.AREA, BackgroundMusicState.PLAYING, trackName);
    this.loopTimer = 0;
    this.stopPrimaryMusic(this.engine.areaMusicDayAudioEmitter);
    await this.engine.areaMusicDayAudioEmitter.play(false);
    return true;
  }

  static async playAreaMusic(restartIfSame = true){
    if(!this.area.day){
      return false;
    }
    return await this.playAreaMusicTrack(this.area.day, restartIfSame);
  }

  static async resumeAreaMusic(){
    if(this.area.day){
      return await this.playAreaMusic(false);
    }

    this.setState(BackgroundMusicMode.NONE, BackgroundMusicState.UNLOADED, '');
    return false;
  }

  static stopAreaMusic(){
    this.playbackRequest++;
    this.setState(BackgroundMusicMode.NONE, BackgroundMusicState.UNLOADED, '');
    this.engine.areaMusicDayAudioEmitter.stop();
  }

  static async setBattleTrack(trackName = ''){
    this.Initialize();
    this.battle.track = trackName || '';
    if(!trackName || trackName === '****'){
      return false;
    }
    return await this.ensureTrackLoaded('BATTLE', trackName);
  }

  static async setBattleStinger(trackName = ''){
    this.Initialize();
    this.battle.stinger = trackName || '';
    if(!trackName || trackName === '****'){
      return false;
    }
    return await this.ensureTrackLoaded('BATTLE_STINGER', trackName);
  }

  static async playBattleMusic(restartIfSame = true){
    this.Initialize();
    const requestId = ++this.playbackRequest;

    const trackName = this.battle.track || this.engine.battleMusicAudioEmitter.name;
    if(!trackName){
      return false;
    }

    if(!restartIfSame && this.currentMode === BackgroundMusicMode.BATTLE && this.isEmitterPlayingTrack(this.engine.battleMusicAudioEmitter, trackName)){
      this.setState(BackgroundMusicMode.BATTLE, BackgroundMusicState.PLAYING, trackName);
      return true;
    }

    const loaded = await this.ensureTrackLoaded('BATTLE', trackName);
    if(!loaded || requestId !== this.playbackRequest){
      return false;
    }

    this.battle.track = trackName;
    this.setState(BackgroundMusicMode.BATTLE, BackgroundMusicState.PLAYING, trackName);
    this.stopPrimaryMusic(this.engine.battleMusicAudioEmitter);
    await this.engine.battleMusicAudioEmitter.play(true);
    return true;
  }

  static async endBattleMusic(){
    this.Initialize();
    this.playbackRequest++;

    if(this.battle.stinger && this.engine.battleStingerLoaded){
      this.setState(BackgroundMusicMode.BATTLE_STINGER, BackgroundMusicState.PLAYING, this.battle.stinger);
      this.stopPrimaryMusic(this.engine.battleStingerAudioEmitter);
      await this.engine.battleStingerAudioEmitter.play(false);
      return true;
    }

    this.engine.battleMusicAudioEmitter.stop();
    return await this.resumeAreaMusic();
  }

  static async stopBattleMusic(){
    this.playbackRequest++;
    if(this.currentMode === BackgroundMusicMode.BATTLE || this.engine.battleMusicAudioEmitter.playing){
      return await this.endBattleMusic();
    }

    this.engine.battleMusicAudioEmitter.stop();
    return false;
  }

  static async playDialogMusicTrack(trackName: string, restartIfSame = false, skipIfAreaTrackIsPlaying = true){
    this.Initialize();
    const requestId = ++this.playbackRequest;
    this.dialog.track = trackName || '';

    if(!trackName || trackName === '****'){
      return false;
    }

    if(skipIfAreaTrackIsPlaying && this.isEmitterPlayingTrack(this.engine.areaMusicDayAudioEmitter, trackName)){
      return true;
    }

    if(!restartIfSame && this.currentMode === BackgroundMusicMode.DIALOG && this.isEmitterPlayingTrack(this.engine.dialogMusicAudioEmitter, trackName)){
      this.setState(BackgroundMusicMode.DIALOG, BackgroundMusicState.PLAYING, trackName);
      return true;
    }

    const loaded = await this.ensureTrackLoaded('DIALOG', trackName);
    if(!loaded || requestId !== this.playbackRequest){
      return false;
    }

    this.setState(BackgroundMusicMode.DIALOG, BackgroundMusicState.PLAYING, trackName);
    this.stopPrimaryMusic(this.engine.dialogMusicAudioEmitter);
    await this.engine.dialogMusicAudioEmitter.play(false);
    return true;
  }

  static async stopDialogMusic(resumeArea = true){
    this.playbackRequest++;
    const shouldResumeArea = resumeArea && (this.currentMode === BackgroundMusicMode.DIALOG || this.engine.dialogMusicAudioEmitter.playing);
    if(shouldResumeArea){
      return await this.resumeAreaMusic();
    }

    this.setState(BackgroundMusicMode.NONE, BackgroundMusicState.UNLOADED, '');
    this.engine.dialogMusicAudioEmitter.stop();
    return false;
  }

  static async playMenuMusicTrack(trackName: string, restartIfSame = false, loop = true, volume = 1){
    this.Initialize();
    const requestId = ++this.playbackRequest;
    this.menu.track = trackName || '';
    this.menu.loop = loop;
    this.menu.volume = volume;
    this.engine.menuMusicAudioEmitter.setVolume(volume);

    if(!trackName || trackName === '****'){
      return false;
    }

    if(!restartIfSame && this.currentMode === BackgroundMusicMode.MENU && this.isEmitterPlayingTrack(this.engine.menuMusicAudioEmitter, trackName)){
      this.setState(BackgroundMusicMode.MENU, BackgroundMusicState.PLAYING, trackName);
      return true;
    }

    const loaded = await this.ensureTrackLoaded('MENU', trackName);
    if(!loaded || requestId !== this.playbackRequest){
      return false;
    }

    this.setState(BackgroundMusicMode.MENU, BackgroundMusicState.PLAYING, trackName);
    this.stopPrimaryMusic(this.engine.menuMusicAudioEmitter);
    await this.engine.menuMusicAudioEmitter.play(loop);
    return true;
  }

  static stopMenuMusic(){
    this.playbackRequest++;
    this.setState(BackgroundMusicMode.NONE, BackgroundMusicState.UNLOADED, '');
    this.engine.menuMusicAudioEmitter.stop();
  }

  static setMenuMusicVolume(volume = 1){
    this.menu.volume = volume;
    this.engine.menuMusicAudioEmitter.setVolume(volume);
  }
}
