import * as THREE from "three";
import type { AudioEmitter } from "@/audio/AudioEmitter";
import { AudioEngineMode } from "@/enums/audio/AudioEngineMode";
import { IAreaAudioProperties } from "@/interface/area/IAreaAudioProperties";
import { AmbientAudioEmitter } from "@/audio/AmbientAudioEmitter";
import { EAXPresets } from "@/audio/EAXPresets";
import { BackgroundMusicMode } from "@/enums/audio/BackgroundMusicMode";
import { BackgroundMusicState } from "@/enums/audio/BackgroundMusicState";
import { AudioEngineChannel } from "@/enums/audio/AudioEngineChannel";
import { ReverbEngine } from "@/audio/ReverbEngine";

class AudioChannel {

  audioCtx: AudioContext;

  /* the last gain value before the SFX channel was muted */
  #gainCached: number;

  #gain: number;

  #channel: AudioEngineChannel;

  #gainNode: GainNode;

  #routeHandler: ((gainNode: GainNode) => void) | undefined;

  muted: boolean = false;

  constructor(channel: AudioEngineChannel, audioCtx: AudioContext){
    this.audioCtx = audioCtx;
    this.#channel = channel;
    this.#gain = 0;
    this.#gainCached = 0;
    this.#gainNode = audioCtx.createGain();
  }

  getGain(){
    return this.#gain;
  }

  setGain(value: number){
    this.#gain = AudioEngine.clampNormalizedGain(value);
    this.#gainCached = this.#gain;
    if(this.muted){ return; }
    this.#gainNode.gain.value = this.#gain;
  }

  getGainNode(){
    return this.#gainNode;
  }

  setRoute(routeHandler: (gainNode: GainNode) => void){
    this.#routeHandler = routeHandler;
    this.reconnect();
  }

  disconnect(){
    try{
      this.#gainNode.disconnect();
    }catch(e){}
  }

  reconnect(){
    this.disconnect();
    if(this.muted || !AudioEngine.focused || typeof this.#routeHandler !== 'function'){
      return;
    }
    this.#routeHandler(this.#gainNode);
  }

  mute(){
    if(this.muted){ return; }
    this.muted = true;
    this.#gainNode.gain.value = 0;
    this.disconnect();
  }

  unmute(){
    if(!this.muted){ return; }
    this.muted = false;
    this.#gainNode.gain.value = this.#gainCached;
    this.reconnect();
  }
}

type BackgroundAudioType = 'BACKGROUND_MUSIC_DAY' | 'BACKGROUND_MUSIC_NIGHT' | 'BATTLE' | 'BATTLE_STINGER' | 'DIALOG' | 'MENU' | 'AMBIENT_DAY' | 'AMBIENT_NIGHT'

/**
 * AudioEngine class.
 * 
 * The AudioEngine class manages audio levels and the AudioEmitters that are added to it.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file AudioEngine.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class AudioEngine {

  static focused: boolean = true;
  
  static engines: AudioEngine[] = [];
  
  static loopBGM = true;

  static sfxChannel: AudioChannel;

  static musicChannel: AudioChannel;

  static voChannel: AudioChannel;

  static movieChannel: AudioChannel;

  static guiChannel: AudioChannel;

  static Mode: AudioEngineMode = AudioEngineMode.Software;

  static AUDIO_BUFFER_CACHE: Map<string, AudioBuffer> = new Map<string, AudioBuffer>();

  audioCtx: AudioContext = new (global.AudioContext || (global as any).webkitAudioContext)();

  // reverbLF: any;
  // reverbHF: any;
  emitters: AudioEmitter[];

  ambientAudioDayEmitter: AmbientAudioEmitter;
  ambientAudioNightEmitter: AmbientAudioEmitter;
  areaMusicDayAudioEmitter: AmbientAudioEmitter;
  areaMusicNightAudioEmitter: AmbientAudioEmitter;
  battleMusicAudioEmitter: AmbientAudioEmitter;
  battleStingerAudioEmitter: AmbientAudioEmitter;
  dialogMusicAudioEmitter: AmbientAudioEmitter;
  menuMusicAudioEmitter: AmbientAudioEmitter;

  battleMusicLoaded: boolean = false;
  battleStingerLoaded: boolean = false;
  areaMusicLoaded: boolean = false;
  dialogMusicLoaded: boolean = false;
  menuMusicLoaded: boolean = false;
  ambientLoaded: boolean = false;

  bgmTimer: number = 0;
  bgmLoopTime: number = 30000;
  bgmState: BackgroundMusicState = BackgroundMusicState.UNLOADED;
  bgmMode: BackgroundMusicMode = BackgroundMusicMode.NONE;

  mode: AudioEngineMode = AudioEngine.Mode;
  areaProperies: IAreaAudioProperties;
  areaMusicNightLoaded: boolean;
  ambientNightLoaded: boolean;

  reverbEngine: ReverbEngine;
  reverbEnabled: boolean = false;

  static clampNormalizedGain(value: number){
    value = Number(value);
    if(!Number.isFinite(value)){
      return 0;
    }
    return Math.max(0, Math.min(1, value));
  }

  static percentageToNormalizedGain(value: number){
    value = Number(value);
    if(!Number.isFinite(value)){
      return 0;
    }
    return AudioEngine.clampNormalizedGain(value / 100);
  }

  static clampEmitterVolume(value: number){
    value = Number(value);
    if(!Number.isFinite(value)){
      return 0;
    }
    return Math.max(0, Math.min(127, value));
  }

  static emitterVolumeToNormalizedGain(value: number){
    return AudioEngine.clampEmitterVolume(value) / 127;
  }

  static get GAIN_MUSIC(){
    return AudioEngine.musicChannel.getGain();
  }

  static get GAIN_VO(){
    return AudioEngine.voChannel.getGain();
  }

  static get GAIN_SFX(){
    return AudioEngine.sfxChannel.getGain();
  }

  static get GAIN_MOVIE(){
    return AudioEngine.movieChannel.getGain();
  }

  static get GAIN_GUI(){
    return AudioEngine.guiChannel.getGain();
  }

  static set GAIN_MUSIC(value){
    AudioEngine.musicChannel.setGain(value);
  }

  static set GAIN_VO(value){
    AudioEngine.voChannel.setGain(value);
  }

  static set GAIN_SFX(value){
    AudioEngine.sfxChannel.setGain(value);
  }

  static set GAIN_GUI(value){
    AudioEngine.guiChannel.setGain(value);
  }

  static set GAIN_MOVIE(value){
    AudioEngine.movieChannel.setGain(value);
  }

  constructor () {

    // this.reverbLF = new Reverb(this.audioCtx);
    // this.reverbHF = new Reverb(this.audioCtx);
    // this.reverbLF.filterType = 'highpass';
    // this.reverbHF.filterType = 'lowpass';
    this.reverbEngine = new ReverbEngine(this.audioCtx);

    AudioEngine.sfxChannel = new AudioChannel(AudioEngineChannel.SFX, this.audioCtx);
    AudioEngine.musicChannel = new AudioChannel(AudioEngineChannel.MUSIC, this.audioCtx);
    AudioEngine.voChannel = new AudioChannel(AudioEngineChannel.VO, this.audioCtx);
    AudioEngine.movieChannel = new AudioChannel(AudioEngineChannel.MOVIE, this.audioCtx);
    AudioEngine.guiChannel = new AudioChannel(AudioEngineChannel.GUI, this.audioCtx);

    AudioEngine.sfxChannel.setGain(AudioEngine.GAIN_SFX);
    AudioEngine.musicChannel.setGain(AudioEngine.GAIN_MUSIC);
    AudioEngine.voChannel.setGain(AudioEngine.GAIN_VO);
    AudioEngine.movieChannel.setGain(AudioEngine.GAIN_MOVIE);
    AudioEngine.guiChannel.setGain(AudioEngine.GAIN_GUI);

    AudioEngine.sfxChannel.setRoute((gainNode) => {
      if(this.reverbEnabled){
        this.reverbEngine.connectSource(gainNode);
      }else{
        gainNode.connect(this.audioCtx.destination);
      }
    });
    AudioEngine.musicChannel.setRoute((gainNode) => {
      gainNode.connect(this.audioCtx.destination);
    });
    AudioEngine.voChannel.setRoute((gainNode) => {
      if(this.reverbEnabled){
        this.reverbEngine.connectSource(gainNode);
      }else{
        gainNode.connect(this.audioCtx.destination);
      }
    });
    AudioEngine.movieChannel.setRoute((gainNode) => {
      gainNode.connect(this.audioCtx.destination);
    });
    AudioEngine.guiChannel.setRoute((gainNode) => {
      gainNode.connect(this.audioCtx.destination);
    });

    this.emitters = [];
    this.bgmTimer = 0;
    this.ambientAudioDayEmitter = new AmbientAudioEmitter(this);
    this.ambientAudioNightEmitter = new AmbientAudioEmitter(this);
    this.areaMusicDayAudioEmitter = new AmbientAudioEmitter(this);
    this.areaMusicNightAudioEmitter = new AmbientAudioEmitter(this);
    this.battleMusicAudioEmitter = new AmbientAudioEmitter(this);
    this.battleStingerAudioEmitter = new AmbientAudioEmitter(this);
    this.dialogMusicAudioEmitter = new AmbientAudioEmitter(this);
    this.menuMusicAudioEmitter = new AmbientAudioEmitter(this);

    this.ambientAudioDayEmitter.setDestination(AudioEngine.sfxChannel.getGainNode());
    this.ambientAudioNightEmitter.setDestination(AudioEngine.sfxChannel.getGainNode());
    this.areaMusicDayAudioEmitter.setDestination(AudioEngine.musicChannel.getGainNode());
    this.areaMusicNightAudioEmitter.setDestination(AudioEngine.musicChannel.getGainNode());
    this.battleMusicAudioEmitter.setDestination(AudioEngine.musicChannel.getGainNode());
    this.battleStingerAudioEmitter.setDestination(AudioEngine.musicChannel.getGainNode());
    this.dialogMusicAudioEmitter.setDestination(AudioEngine.musicChannel.getGainNode());
    this.menuMusicAudioEmitter.setDestination(AudioEngine.musicChannel.getGainNode());

    AudioEngine.engines.push(this);

  }

  setReverbState(eaxEnabled = false){
    if(eaxEnabled == this.reverbEnabled) return;
    this.reverbEnabled = eaxEnabled;
    if(AudioEngine.focused){
      AudioEngine.sfxChannel.reconnect();
      AudioEngine.voChannel.reconnect();
    }else{
      AudioEngine.sfxChannel.disconnect();
      AudioEngine.voChannel.disconnect();
    }
  }

  setReverbProfile(index = 0){
    console.log('setReverbProfile:', index);
    if(index == -1){
      this.setReverbState(false);
      return;
    }
    this.setReverbState(true);
    this.reverbEngine.loadPreset(index);
    return;

    const software_mode = (this.mode == AudioEngineMode.Software);
    if(software_mode){
      console.warn('setReverbProfile:', 'Reverb can\'t be set because Force Software mode is on');
    }

    if(index >= 0){
      let data = EAXPresets.PresetFromIndex(index);
      console.log('setReverbProfile:', data);
      
      this.setReverbState(!software_mode);
    }else{
      this.setReverbState(false);
    }
  }

  update ( delta: number, position = new THREE.Vector3(), rotation = new THREE.Euler(), forward = new THREE.Vector3() ) {
    // Set listener position using modern AudioParam properties
    if(typeof this.audioCtx.listener.positionX !== 'undefined'){
      this.audioCtx.listener.positionX.value = position.x;
      this.audioCtx.listener.positionY.value = position.y;
      this.audioCtx.listener.positionZ.value = position.z;
    }else{
      this.audioCtx.listener.setPosition(position.x, position.y, position.z);
    }

    // Set listener orientation using modern AudioParam properties
    if(typeof this.audioCtx.listener.forwardX !== 'undefined'){
      this.audioCtx.listener.forwardX.value = forward.x;
      this.audioCtx.listener.forwardY.value = forward.y;
      this.audioCtx.listener.forwardZ.value = forward.z;
      this.audioCtx.listener.upX.value = 0;
      this.audioCtx.listener.upY.value = 0;
      this.audioCtx.listener.upZ.value = 1;
    }else{
      this.audioCtx.listener.setOrientation(forward.x, forward.y, forward.z, 0, 0, 1);
    }

    // Update reverb engine 3D positioning
    this.reverbEngine.updateListener(
      [position.x, position.y, position.z],
      [rotation.x, rotation.y, rotation.z]
    );

  }

  addEmitter(emitter: AudioEmitter){
    this.emitters.push(emitter);
  }

  removeEmitter(emitter: AudioEmitter){
    const index = this.emitters.indexOf(emitter);
    if(index == -1){ return; }
    this.emitters.splice(index, 1);
  }

  setAudioBuffer(type: BackgroundAudioType, data: ArrayBuffer, name: string){
    switch(type){
      case 'BACKGROUND_MUSIC_DAY':
        this.areaMusicDayAudioEmitter.setData(data);
        this.areaMusicDayAudioEmitter.name = name;
        this.areaMusicLoaded = true;
        break;
      case 'BACKGROUND_MUSIC_NIGHT':
        this.areaMusicNightAudioEmitter.setData(data);
        this.areaMusicNightAudioEmitter.name = name;
        this.areaMusicNightLoaded = true;
        break;
      case 'BATTLE':
        this.battleMusicAudioEmitter.setData(data);
        this.battleMusicAudioEmitter.name = name;
        this.battleMusicLoaded = true;
        break;
      case 'BATTLE_STINGER':
        this.battleStingerAudioEmitter.setData(data);
        this.battleStingerAudioEmitter.name = name;
        this.battleStingerLoaded = true;
        break;
      case 'DIALOG':
        this.dialogMusicAudioEmitter.setData(data);
        this.dialogMusicAudioEmitter.name = name;
        this.dialogMusicLoaded = true;
        break;
      case 'MENU':
        this.menuMusicAudioEmitter.setData(data);
        this.menuMusicAudioEmitter.name = name;
        this.menuMusicLoaded = true;
        break;
      case 'AMBIENT_DAY':
        this.ambientAudioDayEmitter.setData(data);
        this.ambientAudioDayEmitter.name = name;
        this.ambientLoaded = true;
        break;
      case 'AMBIENT_NIGHT':
        this.ambientAudioNightEmitter.setData(data);
        this.ambientAudioNightEmitter.name = name;
        this.ambientNightLoaded = true;
        break;
    }
  }

  setAreaAudioProperties(props: IAreaAudioProperties){
    this.areaProperies = props;
    this.bgmLoopTime = props.music.delay;
    this.areaMusicLoaded = false;
    this.battleMusicLoaded = false;
    this.battleStingerLoaded = false;
    this.dialogMusicLoaded = false;
    this.menuMusicLoaded = false;
    this.ambientLoaded = false;
  }

  /**
   * Destroy the AudioEngine
   * call when an area is unloaded
   */
  destroy(){
    this.reset();
    this.audioCtx.close();
  }

  /**
   * Reset the AudioEngine
   */
  reset(){
    //Clean up the emitters
    // destroy() removes its emitter from this list; iterate a snapshot.
    for(const emitter of [...this.emitters]){
      emitter.destroy();
    }

    this.emitters = [];

    this.ambientAudioDayEmitter.dispose();
    this.ambientAudioNightEmitter.dispose();

    //Clean up the background music emitters
    this.areaMusicDayAudioEmitter.dispose();
    this.areaMusicNightAudioEmitter.dispose();
    this.battleMusicAudioEmitter.dispose();
    this.battleStingerAudioEmitter.dispose();
    this.dialogMusicAudioEmitter.dispose();
    this.menuMusicAudioEmitter.dispose();

    this.areaMusicLoaded = false;
    this.areaMusicNightLoaded = false;
    this.battleMusicLoaded = false;
    this.battleStingerLoaded = false;
    this.dialogMusicLoaded = false;
    this.menuMusicLoaded = false;
    this.ambientLoaded = false;
    this.ambientNightLoaded = false;
    this.bgmTimer = 0;
    this.bgmMode = BackgroundMusicMode.NONE;
    this.bgmState = BackgroundMusicState.UNLOADED;
  }

  static GetAudioEngine(){
    if(!this.engines.length) new AudioEngine();
    return this.engines[0];
  }

  static ToggleMute(){
    console.warn('ToggleMute is unimplemented');
  }

  static Mute(channel: AudioEngineChannel = AudioEngineChannel.ALL) {
    if((channel & AudioEngineChannel.SFX) == AudioEngineChannel.SFX){
      AudioEngine.sfxChannel.mute();
    }

    if((channel & AudioEngineChannel.MUSIC) == AudioEngineChannel.MUSIC){
      AudioEngine.musicChannel.mute();
    }

    if((channel & AudioEngineChannel.VO) == AudioEngineChannel.VO){
      AudioEngine.voChannel.mute();
    }

    if((channel & AudioEngineChannel.GUI) == AudioEngineChannel.GUI){
      AudioEngine.guiChannel.mute();
    }

    if((channel & AudioEngineChannel.MOVIE) == AudioEngineChannel.MOVIE){
      AudioEngine.movieChannel.mute();
    }
  }

  static Unmute(channel: AudioEngineChannel = AudioEngineChannel.ALL) {
    if((channel & AudioEngineChannel.SFX) == AudioEngineChannel.SFX){
      AudioEngine.sfxChannel.unmute();
    }

    if((channel & AudioEngineChannel.MUSIC) == AudioEngineChannel.MUSIC){
      AudioEngine.musicChannel.unmute();
    }

    if((channel & AudioEngineChannel.VO) == AudioEngineChannel.VO){
      AudioEngine.voChannel.unmute();
    }

    if((channel & AudioEngineChannel.GUI) == AudioEngineChannel.GUI){
      AudioEngine.guiChannel.unmute();
    }

    if((channel & AudioEngineChannel.MOVIE) == AudioEngineChannel.MOVIE){
      AudioEngine.movieChannel.unmute();
    }
  }

  static OnWindowFocusChange(focused: boolean){
    if(focused == AudioEngine.focused) return;
    AudioEngine.focused = focused;
    if(!AudioEngine.engines.length){
      return;
    }

    const channels = [
      AudioEngine.sfxChannel,
      AudioEngine.musicChannel,
      AudioEngine.voChannel,
      AudioEngine.movieChannel,
      AudioEngine.guiChannel,
    ];

    if(!focused){
      for(let i = 0; i < channels.length; i++){
        channels[i].disconnect();
      }
    }else{
      for(let i = 0; i < channels.length; i++){
        channels[i].reconnect();
      }
    }
  }

}
