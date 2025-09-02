import * as THREE from "three";
import type { AudioEmitter } from "./AudioEmitter";
import { AudioEngineMode } from "../enums/audio/AudioEngineMode";
import { IAreaAudioProperties } from "../interface/area/IAreaAudioProperties";
import { AmbientAudioEmitter } from "./AmbientAudioEmitter";
import { EAXPresets } from "./EAXPresets";
import { BackgroundMusicMode } from "../enums/audio/BackgroundMusicMode";
import { BackgroundMusicState } from "../enums/audio/BackgroundMusicState";


type BackgroundAudioType = 'BACKGROUND_MUSIC' | 'BATTLE' | 'BATTLE_STINGER' | 'DIALOG' | 'AMBIENT'

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
  static _gainSfxVol: number;
  static _gainMusicVol: number;
  static _gainVoVol: number;
  static Mode: AudioEngineMode = AudioEngineMode.Software;

  static AUDIO_BUFFER_CACHE: Map<string, AudioBuffer> = new Map<string, AudioBuffer>();

  audioCtx: AudioContext;
  // reverbLF: any;
  // reverbHF: any;
  sfxGain: GainNode;
  musicGain: GainNode;
  voGain: GainNode;
  movieGain: GainNode;
  emitters: AudioEmitter[];

  ambientAudioEmitter: AmbientAudioEmitter;
  areaMusicAudioEmitter: AmbientAudioEmitter;
  battleMusicAudioEmitter: AmbientAudioEmitter;
  battleStingerAudioEmitter: AmbientAudioEmitter;
  dialogMusicAudioEmitter: AmbientAudioEmitter;

  battleMusicLoaded: boolean = false;
  battleStingerLoaded: boolean = false;
  areaMusicLoaded: boolean = false;
  dialogMusicLoaded: boolean = false;
  ambientLoaded: boolean = false;

  bgmTimer: number = 0;
  bgmLoopTime: number = 30000;
  bgmState: BackgroundMusicState = BackgroundMusicState.UNLOADED;
  bgmMode: BackgroundMusicMode = BackgroundMusicMode.NONE;

  mode: AudioEngineMode = AudioEngine.Mode;
  areaProperies: IAreaAudioProperties;

  constructor () {

    this.audioCtx = new AudioEngine.AudioCtx();

    // this.reverbLF = new Reverb(this.audioCtx);
    // this.reverbHF = new Reverb(this.audioCtx);
    // this.reverbLF.filterType = 'highpass';
    // this.reverbHF.filterType = 'lowpass';

    this.sfxGain = this.audioCtx.createGain();
    this.sfxGain.gain.value = AudioEngine.GAIN_SFX;
    this.sfxGain.connect(this.audioCtx.destination);

    this.musicGain = this.audioCtx.createGain();
    this.musicGain.gain.value = AudioEngine.GAIN_MUSIC;
    this.musicGain.connect(this.audioCtx.destination);

    this.voGain = this.audioCtx.createGain();
    this.voGain.gain.value = AudioEngine.GAIN_VO;
    this.voGain.connect(this.audioCtx.destination);

    this.movieGain = this.audioCtx.createGain();
    this.movieGain.gain.value = AudioEngine.GAIN_MOVIE;
    this.movieGain.connect(this.audioCtx.destination);

    this.emitters = [];
    this.bgmTimer = 0;
    this.ambientAudioEmitter = new AmbientAudioEmitter(this);
    this.areaMusicAudioEmitter = new AmbientAudioEmitter(this);
    this.battleMusicAudioEmitter = new AmbientAudioEmitter(this);
    this.battleStingerAudioEmitter = new AmbientAudioEmitter(this);
    this.dialogMusicAudioEmitter = new AmbientAudioEmitter(this);

    this.ambientAudioEmitter.setDestination(this.sfxGain);
    this.areaMusicAudioEmitter.setDestination(this.musicGain);
    this.battleMusicAudioEmitter.setDestination(this.musicGain);
    this.battleStingerAudioEmitter.setDestination(this.musicGain);
    this.dialogMusicAudioEmitter.setDestination(this.musicGain);

    this.areaMusicAudioEmitter.addEventListener('play', () => {
      this.bgmMode = BackgroundMusicMode.AREA;
    });

    this.battleMusicAudioEmitter.addEventListener('play', () => {
      this.bgmMode = BackgroundMusicMode.BATTLE;
    });

    this.battleStingerAudioEmitter.addEventListener('play', () => {
      this.bgmMode = BackgroundMusicMode.BATTLE_STINGER;
    });

    this.dialogMusicAudioEmitter.addEventListener('play', () => {
      this.bgmMode = BackgroundMusicMode.DIALOG;
      this.areaMusicAudioEmitter.stop();
    });

    this.areaMusicAudioEmitter.addEventListener('ended', () => {
      this.bgmState = BackgroundMusicState.ENDED;
      if(AudioEngine.loopBGM){
        this.bgmTimer = this.bgmLoopTime;
      }
    });

    this.battleMusicAudioEmitter.addEventListener('stop', () => {
      if(this.battleStingerLoaded){
        this.battleStingerAudioEmitter.play();
      }else{
        this.areaMusicAudioEmitter.play();
      }
    });

    this.battleStingerAudioEmitter.addEventListener('ended', () => {
      this.bgmState = BackgroundMusicState.PLAYING;
      this.areaMusicAudioEmitter.play();
    });

    this.dialogMusicAudioEmitter.addEventListener('ended', () => {
      this.bgmState = BackgroundMusicState.ENDED;
      this.bgmMode = BackgroundMusicMode.AREA;
      if(AudioEngine.loopBGM){
        this.bgmTimer = this.bgmLoopTime;
      }
    });

    AudioEngine.engines.push(this);

  }

  setReverbState(state = false){
    this.sfxGain.disconnect();
    //this.musicGain.disconnect();
    this.voGain.disconnect();
    // this.reverbLF.disconnect();
    // this.reverbHF.disconnect();
    if(state){
      // this.sfxGain.connect(this.reverbLF);
      // this.sfxGain.connect(this.reverbHF);
      //this.musicGain.connect(this.reverbLF);
      //this.musicGain.connect(this.reverbHF);
      // this.voGain.connect(this.reverbLF);
      // this.voGain.connect(this.reverbHF);
      //Connect the reverb node to the audio output node
      // this.reverbLF.connect(this.audioCtx.destination);
      // this.reverbHF.connect(this.audioCtx.destination);
    }else{
      this.sfxGain.connect(this.audioCtx.destination);
      //this.musicGain.connect(this.audioCtx.destination);
      this.voGain.connect(this.audioCtx.destination);
    }
  }

  setReverbProfile(index = 0){
    this.setReverbState(false);
    return;
    console.log('setReverbProfile:', index);

    const software_mode = (this.mode == AudioEngineMode.Software);
    if(software_mode){
      console.warn('setReverbProfile:', 'Reverb can\'t be set because Force Software mode is on');
    }

    if(index >= 0){
      let data = EAXPresets.PresetFromIndex(index);
      console.log('setReverbProfile:', data);
      // this.reverbHF.gain.value = data.gainHF;
      // this.reverbLF.gain.value = data.gainLF;

      // this.reverbHF.decay = data.decayTime;
      // this.reverbLF.decay = data.decayTime;

      // this.reverbHF.cutoff.value = data.hfReference;
      // this.reverbLF.cutoff.value = data.lfReference;

      // this.reverbHF.wet.value = data.reflectionsGain * data.diffusion;
      // this.reverbLF.wet.value = data.reflectionsGain * data.diffusion;

      // this.reverbHF.dry.value = 1;
      // this.reverbLF.dry.value = 1;
      
      this.setReverbState(!software_mode);
    }else{
      this.setReverbState(false);
    }
  }

  update ( delta: number, position = new THREE.Vector3(), rotation = new THREE.Euler() ) {
    if(typeof this.audioCtx.listener.setPosition === 'function'){
      this.audioCtx.listener.setPosition(position.x, position.y, position.z);
    }else{
      this.audioCtx.listener.positionX.value = position.x;
      this.audioCtx.listener.positionY.value = position.y;
      this.audioCtx.listener.positionZ.value = position.z;
    }

    if(typeof this.audioCtx.listener.setOrientation === 'function'){
      this.audioCtx.listener.setOrientation(rotation.x, rotation.y, rotation.z, 0, 0, 1);
    }else{
      this.audioCtx.listener.forwardX.value = rotation.x;
      this.audioCtx.listener.forwardY.value = rotation.y;
      this.audioCtx.listener.forwardZ.value = rotation.z;
      this.audioCtx.listener.upX.value = 0;
      this.audioCtx.listener.upY.value = 0;
      this.audioCtx.listener.upZ.value = 1;
    }

    //Handle the background music loop
    if(this.areaMusicLoaded && this.bgmState == BackgroundMusicState.ENDED && this.bgmMode == BackgroundMusicMode.AREA){
      if(this.bgmTimer > 0 && AudioEngine.loopBGM){
        this.bgmTimer -= delta * 1000;
        if(this.bgmTimer <= 0){
          this.bgmTimer = 0;
          this.areaMusicAudioEmitter.play();
          this.bgmState = BackgroundMusicState.PLAYING;
        }
      }
    }

  }

  addEmitter(emitter: AudioEmitter){
    this.emitters.push(emitter);
  }

  setAudioBuffer(type: BackgroundAudioType, data: ArrayBuffer, name: string){
    switch(type){
      case 'BACKGROUND_MUSIC':
        this.areaMusicAudioEmitter.setData(data);
        this.areaMusicAudioEmitter.name = name;
        this.areaMusicLoaded = true;
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
      case 'AMBIENT':
        this.ambientAudioEmitter.setData(data);
        this.ambientAudioEmitter.name = name;
        this.ambientLoaded = true;
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
    for(let i = 0; i < this.emitters.length; i++)
      this.emitters[i].destroy();

    this.emitters = [];

    //Clean up the background music emitters
    this.areaMusicAudioEmitter.dispose();
    this.battleMusicAudioEmitter.dispose();
    this.battleStingerAudioEmitter.dispose();
    this.dialogMusicAudioEmitter.dispose();
  }

  static GetAudioEngine(){
    if(!this.engines.length) this.engines.push(new AudioEngine());
    return this.engines[0];
  }

  static SetEngineMode(mode: AudioEngineMode){
    this.Mode = mode;
    for(let i = 0; i < this.engines.length; i++){
      this.engines[i].mode = this.Mode;
    }
  }

  static ToggleMute(){
    if(AudioEngine.isMuted)
      AudioEngine.Unmute();
    else
      AudioEngine.Mute();
  }

  static Mute() {
    AudioEngine.isMuted = true;
    AudioEngine._gainSfxVol = AudioEngine.GAIN_SFX;
    AudioEngine._gainMusicVol = AudioEngine.GAIN_MUSIC;
    AudioEngine._gainVoVol = AudioEngine.GAIN_VO;
    AudioEngine.GAIN_SFX = AudioEngine.GAIN_MUSIC = AudioEngine.GAIN_VO = 0;
  }

  static Unmute() {
    AudioEngine.isMuted = false;
    AudioEngine.GAIN_SFX = AudioEngine._gainSfxVol;
    AudioEngine.GAIN_MUSIC = AudioEngine._gainMusicVol;
    AudioEngine.GAIN_VO = AudioEngine._gainVoVol;
  }

  static get GAIN_MUSIC(){
    return AudioEngine._GAIN_MUSIC;
  }

  static get GAIN_VO(){
    return AudioEngine._GAIN_VO;
  }

  static get GAIN_SFX(){
    return AudioEngine._GAIN_SFX;
  }

  static get GAIN_MOVIE(){
    return AudioEngine._GAIN_MOVIE;
  }

  static set GAIN_MUSIC(value){
    AudioEngine._GAIN_MUSIC = value;
    //console.log('set gain music', this, AudioEngine);
    for(let i = 0; i < AudioEngine.engines.length; i++){
      AudioEngine.engines[i].musicGain.gain.value = AudioEngine._GAIN_MUSIC;
    }
  }

  static set GAIN_VO(value){
    AudioEngine._GAIN_VO = value;
    for(let i = 0; i < AudioEngine.engines.length; i++){
      AudioEngine.engines[i].voGain.gain.value = AudioEngine._GAIN_VO;
    }
  }

  static set GAIN_SFX(value){
    AudioEngine._GAIN_SFX = value;
    //console.log('set gain sfx', this, AudioEngine);
    for(let i = 0; i < AudioEngine.engines.length; i++){
      AudioEngine.engines[i].sfxGain.gain.value = AudioEngine._GAIN_SFX;
    }
  }

  static set GAIN_MOVIE(value){
    AudioEngine._GAIN_MOVIE = value;
  }

  static AudioCtx = (global.AudioContext || (global as any).webkitAudioContext);
  
  static engines: AudioEngine[] = [];
  
  static _GAIN_MUSIC = 0.25;
  static _GAIN_VO = 0.5;
  static _GAIN_SFX = 0.17;
  static _GAIN_MOVIE = 0.17;
  
  static loopBGM = true;
  
  static isMuted = false;

}
