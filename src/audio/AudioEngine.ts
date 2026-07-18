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
    this.#gain = value;
    this.#gainCached = this.#gain;
    if(this.muted){ return; }
    this.#gainNode.gain.value = value;
  }

  getGainNode(){
    return this.#gainNode;
  }

  mute(){
    if(this.muted){ return; }
    this.muted = true;
    this.#gainNode.gain.value = 0;
    this.getGainNode().disconnect();
  }

  unmute(){
    if(!this.muted){ return; }
    this.muted = false;
    this.#gainNode.gain.value = this.#gainCached;
    this.getGainNode().connect( this.audioCtx.destination );
  }
}

type BackgroundAudioType = 'BACKGROUND_MUSIC_DAY' | 'BACKGROUND_MUSIC_NIGHT' | 'BATTLE' | 'BATTLE_STINGER' | 'DIALOG' | 'AMBIENT_DAY' | 'AMBIENT_NIGHT'

/** Retail FadeAndStop duration used by PlayBattleMusic / PlayMusic (ms). */
export const BATTLE_MUSIC_FADE_MS = 800;

/** Retail Update delay before starting battle track after fade (ms). */
const BATTLE_MUSIC_START_DELAY_MS = 10;

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

  battleMusicLoaded: boolean = false;
  battleStingerLoaded: boolean = false;
  areaMusicLoaded: boolean = false;
  dialogMusicLoaded: boolean = false;
  ambientLoaded: boolean = false;

  /**
   * Retail CSWSAmbientSound::battle_music_playing — area-level want flag.
   * PlayBattleMusic no-ops when the requested state matches.
   */
  battleMusicPlaying: boolean = false;

  /** Loaded battle stinger buffers (ambientmusic Stinger1–3), for random pick. */
  battleStingerBuffers: ArrayBuffer[] = [];

  /** Pending battle-track start after area fade (retail field20_0xd0). */
  private battleMusicStartTimerMs: number = 0;
  private battleMusicTransitionToken: number = 0;

  bgmTimer: number = 0;
  bgmLoopTime: number = 30000;
  bgmState: BackgroundMusicState = BackgroundMusicState.UNLOADED;
  bgmMode: BackgroundMusicMode = BackgroundMusicMode.NONE;

  mode: AudioEngineMode = AudioEngine.Mode;
  areaProperies: IAreaAudioProperties;
  areaMusicNightLoaded: boolean;
  /** Prefer night BGM when neither day nor night emitter is currently playing. */
  areaMusicPreferNight = false;
  ambientNightLoaded: boolean;

  reverbEngine: ReverbEngine;
  reverbEnabled: boolean = false;

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

    // AudioEngine.sfxChannel.getGainNode().connect(this.audioCtx.destination);
    this.reverbEngine.connectSource(AudioEngine.sfxChannel.getGainNode());
    AudioEngine.musicChannel.getGainNode().connect(this.audioCtx.destination);
    // AudioEngine.voChannel.getGainNode().connect(this.audioCtx.destination);
    this.reverbEngine.connectSource(AudioEngine.voChannel.getGainNode());
    AudioEngine.movieChannel.getGainNode().connect(this.audioCtx.destination);
    AudioEngine.guiChannel.getGainNode().connect(this.audioCtx.destination);

    this.emitters = [];
    this.bgmTimer = 0;
    this.ambientAudioDayEmitter = new AmbientAudioEmitter(this);
    this.ambientAudioNightEmitter = new AmbientAudioEmitter(this);
    this.areaMusicDayAudioEmitter = new AmbientAudioEmitter(this);
    this.areaMusicNightAudioEmitter = new AmbientAudioEmitter(this);
    this.battleMusicAudioEmitter = new AmbientAudioEmitter(this);
    this.battleStingerAudioEmitter = new AmbientAudioEmitter(this);
    this.dialogMusicAudioEmitter = new AmbientAudioEmitter(this);

    this.ambientAudioDayEmitter.setDestination(AudioEngine.sfxChannel.getGainNode());
    this.ambientAudioNightEmitter.setDestination(AudioEngine.sfxChannel.getGainNode());
    this.areaMusicDayAudioEmitter.setDestination(AudioEngine.musicChannel.getGainNode());
    this.areaMusicNightAudioEmitter.setDestination(AudioEngine.musicChannel.getGainNode());
    this.battleMusicAudioEmitter.setDestination(AudioEngine.musicChannel.getGainNode());
    this.battleStingerAudioEmitter.setDestination(AudioEngine.musicChannel.getGainNode());
    this.dialogMusicAudioEmitter.setDestination(AudioEngine.musicChannel.getGainNode());

    this.areaMusicDayAudioEmitter.addEventListener('play', () => {
      this.bgmMode = BackgroundMusicMode.AREA;
    });

    this.battleMusicAudioEmitter.addEventListener('play', () => {
      this.bgmMode = BackgroundMusicMode.BATTLE;
    });

    // Stinger is a one-shot overlay on a separate source (retail field33_0x104);
    // it must not steal bgmMode from resumed area music.

    this.dialogMusicAudioEmitter.addEventListener('play', () => {
      this.bgmMode = BackgroundMusicMode.DIALOG;
      this.areaMusicDayAudioEmitter.stop();
    });

    this.areaMusicDayAudioEmitter.addEventListener('ended', () => {
      this.bgmState = BackgroundMusicState.ENDED;
      if(AudioEngine.loopBGM){
        this.bgmTimer = this.bgmLoopTime;
      }
    });

    // Stinger + area resume are driven by playBattleMusic(false), not battle stop events.
    // Retail PlayStinger uses a separate source and overlaps area music restart.

    this.dialogMusicAudioEmitter.addEventListener('ended', () => {
      this.bgmState = BackgroundMusicState.ENDED;
      this.bgmMode = BackgroundMusicMode.AREA;
      if(AudioEngine.loopBGM){
        this.bgmTimer = this.bgmLoopTime;
      }
    });

    AudioEngine.engines.push(this);

  }

  setReverbState(eaxEnabled = false){
    if(eaxEnabled == this.reverbEnabled) return;
    this.reverbEnabled = eaxEnabled;
    //reset the sfx and vo channels destinations
    AudioEngine.sfxChannel.getGainNode().disconnect();
    AudioEngine.voChannel.getGainNode().disconnect();
    if(eaxEnabled){
      //connect the sfx and vo channels to the reverb engine
      this.reverbEngine.connectSource(AudioEngine.sfxChannel.getGainNode());
      this.reverbEngine.connectSource(AudioEngine.voChannel.getGainNode());
    }else{
      //disconnect the sfx and vo channels from the reverb engine
      AudioEngine.sfxChannel.getGainNode().connect(this.audioCtx.destination);
      AudioEngine.voChannel.getGainNode().connect(this.audioCtx.destination);
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

    //Handle the background music loop
    if(this.areaMusicLoaded && this.bgmState == BackgroundMusicState.ENDED && this.bgmMode == BackgroundMusicMode.AREA){
      if(this.bgmTimer > 0 && AudioEngine.loopBGM){
        this.bgmTimer -= delta * 1000;
        if(this.bgmTimer <= 0){
          this.bgmTimer = 0;
          this.getActiveAreaMusicEmitter().play();
          this.bgmState = BackgroundMusicState.PLAYING;
        }
      }
    }

    // Retail CSWCAmbientSound::Update — after fade, delay then PlayBattleMusic(1)
    if(this.battleMusicStartTimerMs > 0 && this.battleMusicPlaying){
      this.battleMusicStartTimerMs -= delta * 1000;
      if(this.battleMusicStartTimerMs <= 0){
        this.battleMusicStartTimerMs = 0;
        if(!this.battleMusicAudioEmitter.playing && this.battleMusicLoaded){
          this.bgmMode = BackgroundMusicMode.BATTLE;
          this.battleMusicAudioEmitter.play(true);
        }
      }
    }

  }

  /**
   * Retail CSWSAmbientSound::PlayBattleMusic @ 005c9b90 / CSWCAmbientSound @ 0068e610.
   * @param play true = start battle BGM; false = fade out, stinger, resume area music
   */
  playBattleMusic(play: boolean){
    if(this.battleMusicPlaying === play){
      return;
    }
    this.battleMusicPlaying = play;
    this.battleMusicTransitionToken++;
    const token = this.battleMusicTransitionToken;

    if(play){
      void this.beginBattleMusic(token);
    }else{
      void this.endBattleMusic(token);
    }
  }

  /**
   * Active area BGM emitter based on which day/night track is currently playing,
   * falling back to the last preferred day/night selection.
   */
  getActiveAreaMusicEmitter(): AmbientAudioEmitter {
    if(this.areaMusicNightAudioEmitter.playing){
      return this.areaMusicNightAudioEmitter;
    }
    if(this.areaMusicDayAudioEmitter.playing){
      return this.areaMusicDayAudioEmitter;
    }
    if(this.areaMusicPreferNight && this.areaMusicNightLoaded){
      return this.areaMusicNightAudioEmitter;
    }
    return this.areaMusicDayAudioEmitter;
  }

  private async beginBattleMusic(token: number){
    if(!this.battleMusicLoaded){
      this.battleMusicPlaying = false;
      return;
    }
    // Fade area music if playing, then start battle after short delay
    const areaMusic = this.getActiveAreaMusicEmitter();
    if(areaMusic.playing){
      await areaMusic.fadeOutAndStop(BATTLE_MUSIC_FADE_MS / 1000);
      if(token !== this.battleMusicTransitionToken || !this.battleMusicPlaying){
        return;
      }
      this.battleMusicStartTimerMs = BATTLE_MUSIC_START_DELAY_MS;
      return;
    }
    if(this.battleMusicAudioEmitter.playing){
      return;
    }
    this.bgmMode = BackgroundMusicMode.BATTLE;
    this.bgmState = BackgroundMusicState.PLAYING;
    this.battleMusicAudioEmitter.play(true);
  }

  private async endBattleMusic(token: number){
    this.battleMusicStartTimerMs = 0;
    if(this.battleMusicAudioEmitter.playing){
      await this.battleMusicAudioEmitter.fadeOutAndStop(BATTLE_MUSIC_FADE_MS / 1000);
    }else{
      this.battleMusicAudioEmitter.stop(false);
    }
    if(token !== this.battleMusicTransitionToken || this.battleMusicPlaying){
      return;
    }
    // Retail: PlayStinger on a separate source, then PlayMusic(1) immediately
    this.playRandomBattleStinger();
    this.bgmMode = BackgroundMusicMode.AREA;
    this.bgmState = BackgroundMusicState.PLAYING;
    if(this.areaMusicLoaded || this.areaMusicNightLoaded){
      this.getActiveAreaMusicEmitter().play();
    }
  }

  /**
   * Retail CSWCAmbientSound::PlayStinger @ 0068db30 —
   * pick uniformly among non-empty Stinger1–3 on the battle music row.
   */
  playRandomBattleStinger(){
    const buffers = this.battleStingerBuffers;
    if(!buffers.length){
      return;
    }
    const pick = buffers[Math.floor(Math.random() * buffers.length)];
    if(!pick){
      return;
    }
    this.battleStingerAudioEmitter.setData(pick);
    this.battleStingerLoaded = true;
    this.battleStingerAudioEmitter.play(false);
  }

  /**
   * Replace loaded battle stingers (empty resource / **** skipped by caller).
   */
  setBattleStingerBuffers(buffers: ArrayBuffer[]){
    this.battleStingerBuffers = buffers.filter(Boolean);
    this.battleStingerLoaded = this.battleStingerBuffers.length > 0;
    if(this.battleStingerLoaded){
      this.battleStingerAudioEmitter.setData(this.battleStingerBuffers[0]);
    }
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
        // Prefer setBattleStingerBuffers for multi-stinger retail rows; single buffer fallback
        this.setBattleStingerBuffers([data]);
        this.battleStingerAudioEmitter.name = name;
        break;
      case 'DIALOG':
        this.dialogMusicAudioEmitter.setData(data);
        this.dialogMusicAudioEmitter.name = name;
        this.dialogMusicLoaded = true;
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
    this.battleStingerBuffers = [];
    this.battleMusicPlaying = false;
    this.battleMusicStartTimerMs = 0;
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
    this.areaMusicDayAudioEmitter.dispose();
    this.battleMusicAudioEmitter.dispose();
    this.battleStingerAudioEmitter.dispose();
    this.dialogMusicAudioEmitter.dispose();
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
    if(!focused){
      // Disconnect all channels
      AudioEngine.sfxChannel.getGainNode().disconnect();
      AudioEngine.musicChannel.getGainNode().disconnect();
      AudioEngine.voChannel.getGainNode().disconnect();
      AudioEngine.movieChannel.getGainNode().disconnect();
      AudioEngine.guiChannel.getGainNode().disconnect();
    }else{
      AudioEngine.engines[0].reverbEngine.connectSource(AudioEngine.sfxChannel.getGainNode());
      AudioEngine.engines[0].reverbEngine.connectSource(AudioEngine.voChannel.getGainNode());
      AudioEngine.musicChannel.getGainNode().connect(AudioEngine.engines[0].audioCtx.destination);
      AudioEngine.movieChannel.getGainNode().connect(AudioEngine.engines[0].audioCtx.destination);
      AudioEngine.guiChannel.getGainNode().connect(AudioEngine.engines[0].audioCtx.destination);
    }
  }

}
