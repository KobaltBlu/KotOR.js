import * as THREE from "three";
import type { AudioEmitter } from "@/audio/AudioEmitter";
import { AudioEngineMode } from "@/enums/audio/AudioEngineMode";
import { IAreaAudioProperties } from "@/interface/area/IAreaAudioProperties";
import { AmbientAudioEmitter } from "@/audio/AmbientAudioEmitter";
import { BackgroundMusicMode } from "@/enums/audio/BackgroundMusicMode";
import { BackgroundMusicState } from "@/enums/audio/BackgroundMusicState";
import { AudioEngineChannel } from "@/enums/audio/AudioEngineChannel";
import { SoundMode } from "@/enums/audio/SoundMode";
import { ReverbEngine } from "@/audio/ReverbEngine";
import { AudioPriorityManager } from "@/audio/AudioPriorityManager";
import { AudioPriorityGroup } from "@/enums/audio/AudioPriorityGroup";
import {
  OBSTRUCTION_REUSE_AGE_MS,
  OBSTRUCTION_REUSE_DIST,
} from "@/engine/pathfinding/get-obstruction-factor";

/** Retail SetSoundMode stack size (+0xf4 … +0x11c, max depth 9). */
const SOUND_MODE_STACK_MAX = 9;

class AudioChannel {

  audioCtx: AudioContext;

  /* the last gain value before the SFX channel was muted */
  #gainCached: number;

  #gain: number;

  /** Retail MuteSound/UnMuteSound bus scale (dialog/sfx/music sliders). */
  #busScale: number = 1;

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
    this.applyGain();
  }

  /** Multiplier for MuteSound fade (1 = full, 0 = silent). Does not change user gain. */
  setBusScale(scale: number){
    this.#busScale = Number.isFinite(scale) ? Math.max(0, Math.min(1, scale)) : 1;
    this.applyGain();
  }

  getBusScale(){
    return this.#busScale;
  }

  getGainNode(){
    return this.#gainNode;
  }

  private applyGain(){
    if(this.muted){ return; }
    this.#gainNode.gain.value = this.#gain * this.#busScale;
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
    this.applyGain();
    this.getGainNode().connect( this.audioCtx.destination );
  }
}

type BackgroundAudioType = 'BACKGROUND_MUSIC_DAY' | 'BACKGROUND_MUSIC_NIGHT' | 'BATTLE' | 'BATTLE_STINGER' | 'DIALOG' | 'AMBIENT_DAY' | 'AMBIENT_NIGHT'

/** Retail FadeAndStop duration used by PlayBattleMusic / PlayMusic (ms). */
export const BATTLE_MUSIC_FADE_MS = 800;

/** Retail Update delay before starting battle track after fade (ms). */
const BATTLE_MUSIC_START_DELAY_MS = 10;

/**
 * Retail CExoSoundInternal::MuteSound / UnMuteSound fade duration (ms).
 * MuteSound @ 00638aa0 / UnMuteSound @ 00638b00 set +0x58 / +0x60 = 500.
 */
export const SOUND_MUTE_FADE_MS = 500;

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

  /**
   * Retail prioritygroups.2da voice allocator (maxplaying / interrupt / fadetime).
   */
  priorityManager: AudioPriorityManager;

  /** Cached listener position for priority distance steal. */
  listenerPosition = { x: 0, y: 0, z: 0 };

  /**
   * Retail OcclusionRender amortizes obstruction samples across frames.
   * Round-robin index into emitters; process a few GetObstructionFactor calls per update.
   */
  private occlusionCursor: number = 0;

  /** Max fresh GetObstructionFactor calls per AudioEngine.update (budget stand-in). */
  static OCCLUSION_SAMPLES_PER_FRAME = 4;

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

  /**
   * Retail CExoSoundInternal desired_ambient_scale (ARE room AmbientScale).
   * Lerped toward target each update (~1 second to catch up, matching Render).
   */
  desiredAmbientScale: number = 1;
  currentAmbientScale: number = 1;
  private ambientScaleLerpFrom: number = 1;

  /**
   * Retail +0x24 SetDesiredEnvironment / +0x14 SetCurrentEnvironment (EnvAudio index).
   * Render applies when current != desired.
   */
  desiredEnvironment: number = 0;
  currentEnvironment: number = -1;

  /**
   * Retail MuteSound flag (+0x10). When true, Render fades dialog/sfx/music to 0.
   * GUI and movie buses are not part of that fade.
   */
  static soundMuted: boolean = false;

  /** Current bus scale applied by MuteSound/UnMuteSound (1 = full, 0 = silent). */
  private static muteBusScale: number = 1;

  /** Fade-out duration ms (+0x58); 0 = inactive. */
  private static muteFadeOutMs: number = 0;

  /** Fade-in duration ms (+0x60); 0 = inactive. */
  private static muteFadeInMs: number = 0;

  /** Fade start timestamp ms (+0x54). */
  private static muteFadeStartMs: number = 0;

  /**
   * Soft pause for SetSoundMode 2/3/4/5 → PauseAllSounds (bus-level approx).
   * Instant zero on selected buses; movie/gui stay active. VO is left alone.
   */
  private static soundsPausedForMovie: boolean = false;
  /** When paused, whether SFX bus is held at 0 (always true while paused today). */
  private static pauseSfxBus: boolean = false;
  /**
   * When paused, whether Music bus is held at 0.
   * Retail GetPauseable @ 006393e0: modes 2/4 keep streaming music (groups 1/2/11; mode 2 also 4).
   * Mode 3 (movie/load) pauses music streams.
   */
  private static pauseMusicBus: boolean = false;

  /**
   * Retail CExoSoundInternal +0xf4 mode stack / +0x11c depth / +0x120 movie flag.
   * stack[0] is the idle baseline (SoundMode.POP); depth starts at 0.
   */
  private static soundModeStack: number[] = new Array(SOUND_MODE_STACK_MAX + 1).fill(SoundMode.POP);
  private static soundModeDepth: number = 0;
  /** Retail +0x120 — set by mode 5, cleared by mode 6 / pop of 5. */
  private static soundModeMovieFlag: boolean = false;

  /**
   * Retail CExoSoundInternal offset 0 — StartDuckingMusicAndAmbientSounds sets 0.2,
   * StopDucking restores 1.0. Applied to music streams + ambient groups 4/5 in SetVolume.
   */
  musicAmbientDuckScale: number = 1;

  /** Retail StartDuckingMusicAndAmbientSounds @ 00633cb0 (0x3e4ccccd = 0.2). */
  static DIALOG_MUSIC_AMBIENT_DUCK = 0.2;

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
    this.priorityManager = new AudioPriorityManager();
    this.bgmTimer = 0;
    this.ambientAudioDayEmitter = new AmbientAudioEmitter(this);
    this.ambientAudioNightEmitter = new AmbientAudioEmitter(this);
    this.areaMusicDayAudioEmitter = new AmbientAudioEmitter(this);
    this.areaMusicNightAudioEmitter = new AmbientAudioEmitter(this);
    this.battleMusicAudioEmitter = new AmbientAudioEmitter(this);
    this.battleStingerAudioEmitter = new AmbientAudioEmitter(this);
    this.dialogMusicAudioEmitter = new AmbientAudioEmitter(this);

    // Retail CSWCAmbientSound SetPriorityGroup:
    // PlayAmbientSound → 4, PlayMusic/PlayBattleMusic → 2, PlayStinger → 1.
    // Dialog music uses the area music streaming source path (group 2).
    this.ambientAudioDayEmitter.setPriorityGroupId(AudioPriorityGroup.LOOPING_AREAWIDE_AMBIENTS);
    this.ambientAudioNightEmitter.setPriorityGroupId(AudioPriorityGroup.LOOPING_AREAWIDE_AMBIENTS);
    this.areaMusicDayAudioEmitter.setPriorityGroupId(AudioPriorityGroup.MUSIC_STREAMS);
    this.areaMusicNightAudioEmitter.setPriorityGroupId(AudioPriorityGroup.MUSIC_STREAMS);
    this.battleMusicAudioEmitter.setPriorityGroupId(AudioPriorityGroup.MUSIC_STREAMS);
    this.battleStingerAudioEmitter.setPriorityGroupId(AudioPriorityGroup.MUSIC_STINGERS);
    this.dialogMusicAudioEmitter.setPriorityGroupId(AudioPriorityGroup.MUSIC_STREAMS);

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
      this.areaMusicNightAudioEmitter.stop();
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

  /**
   * Retail GetClosestRecentSound @ 00636980 — reuse obstruction if another emitter
   * sampled near the same source/listener within 175ms.
   */
  findRecentObstruction(
    sx: number, sy: number, sz: number,
    lx: number, ly: number, lz: number,
    nowMs: number
  ): number | null {
    if(!this.emitters?.length) return null;
    const distSq = OBSTRUCTION_REUSE_DIST * OBSTRUCTION_REUSE_DIST;
    for(let i = 0, il = this.emitters.length; i < il; i++){
      const sample = this.emitters[i]?.getObstructionSample?.();
      if(!sample) continue;
      if(nowMs - sample.ms >= OBSTRUCTION_REUSE_AGE_MS) continue;
      const dsx = sx - sample.sx;
      const dsy = sy - sample.sy;
      const dsz = sz - sample.sz;
      if(dsx * dsx + dsy * dsy + dsz * dsz >= distSq) continue;
      const dlx = lx - sample.lx;
      const dly = ly - sample.ly;
      const dlz = lz - sample.lz;
      if(dlx * dlx + dly * dly + dlz * dlz >= distSq) continue;
      return sample.factor;
    }
    return null;
  }

  /**
   * Retail OcclusionRender — walk playing positional sources with a soft per-frame budget.
   */
  private updateOcclusion(): void {
    if(!this.emitters?.length) return;
    const n = this.emitters.length;
    let computed = 0;
    const budget = AudioEngine.OCCLUSION_SAMPLES_PER_FRAME;
    for(let visited = 0; visited < n && computed < budget; visited++){
      if(this.occlusionCursor >= n) this.occlusionCursor = 0;
      const em = this.emitters[this.occlusionCursor++];
      if(!em || em.isDestroyed) continue;
      if(em.updateObstruction?.(false)){
        computed++;
      }
    }
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

  /**
   * Retail CExoSound::SetDesiredEnvironment @ 0063aba0 — room EnvAudio from UpdateRoom.
   * Applied on next update via SetCurrentEnvironment (Render).
   */
  setDesiredEnvironment(index: number){
    const next = Number.isFinite(index) ? Math.trunc(index) : 0;
    this.desiredEnvironment = next;
  }

  /**
   * Retail CExoSoundInternal::SetCurrentEnvironment @ 00638930 — stores +0x14 and applies EAX.
   */
  setCurrentEnvironment(index: number){
    const next = Number.isFinite(index) ? Math.trunc(index) : 0;
    if(next === this.currentEnvironment){ return; }
    this.currentEnvironment = next;
    if(next < 0){
      this.setReverbState(false);
      return;
    }
    this.setReverbState(true);
    this.reverbEngine.loadPreset(next);
  }

  /**
   * Retail Render @ 00634cf0 — if current env != desired, SetCurrentEnvironment(desired).
   */
  applyDesiredEnvironment(){
    if(this.currentEnvironment !== this.desiredEnvironment){
      this.setCurrentEnvironment(this.desiredEnvironment);
    }
  }

  /**
   * Apply EnvAudio immediately (forge / tools). Gameplay uses setDesiredEnvironment.
   * Pass -1 to disable reverb.
   */
  setReverbProfile(index = 0){
    if(index === -1){
      this.setDesiredEnvironment(-1);
      this.setCurrentEnvironment(-1);
      return;
    }
    this.setDesiredEnvironment(index);
    this.setCurrentEnvironment(index);
  }

  /**
   * Retail CExoSound::SetDesiredAmbientScale — room AmbientScale from ARE.
   * Applied as a volume multiplier on ambient emitters while lerping in update().
   */
  setDesiredAmbientScale(scale: number){
    const next = Number.isFinite(scale) ? Math.max(0, scale) : 1;
    if(next === this.desiredAmbientScale){ return; }
    this.ambientScaleLerpFrom = this.currentAmbientScale;
    this.desiredAmbientScale = next;
  }

  /**
   * Retail StartDuckingMusicAndAmbientSounds — CSWSDialog ctor.
   * Multiplies music + areawide ambient streaming volumes by 0.2.
   */
  startDuckingMusicAndAmbientSounds(){
    this.setMusicAmbientDuckScale(AudioEngine.DIALOG_MUSIC_AMBIENT_DUCK);
  }

  /**
   * Retail StopDuckingMusicAndAmbientSounds — CSWSDialog dtor.
   */
  stopDuckingMusicAndAmbientSounds(){
    this.setMusicAmbientDuckScale(1);
  }

  setMusicAmbientDuckScale(scale: number){
    const next = Number.isFinite(scale) ? Math.max(0, Math.min(1, scale)) : 1;
    if(next === this.musicAmbientDuckScale){ return; }
    this.musicAmbientDuckScale = next;
    this.applyMusicAmbientDuckScale();
  }

  private applyMusicAmbientDuckScale(){
    const ambientEmitters = [
      this.ambientAudioDayEmitter,
      this.ambientAudioNightEmitter,
      this.areaMusicDayAudioEmitter,
      this.areaMusicNightAudioEmitter,
      this.battleMusicAudioEmitter,
      this.battleStingerAudioEmitter,
      this.dialogMusicAudioEmitter,
    ];
    for(let i = 0; i < ambientEmitters.length; i++){
      const em = ambientEmitters[i];
      if(em?.gainNode){
        em.gainNode.gain.value = em.getEffectiveVolume();
      }
    }
    // Retail SetVolume also ducks oneshot/positional sources in groups 4 and 5.
    if(this.emitters){
      for(let i = 0, il = this.emitters.length; i < il; i++){
        const em = this.emitters[i];
        if(!em?.gainNode) continue;
        if(em.priority === AudioPriorityGroup.LOOPING_AREAWIDE_AMBIENTS ||
           em.priority === AudioPriorityGroup.LOOPING_POSITIONAL_AMBIENTS){
          em.gainNode.gain.value = em.getVolume();
        }
      }
    }
  }

  update ( delta: number, position = new THREE.Vector3(), rotation = new THREE.Euler(), forward = new THREE.Vector3() ) {
    this.listenerPosition.x = position.x;
    this.listenerPosition.y = position.y;
    this.listenerPosition.z = position.z;

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

    // Retail CExoSoundInternal::Render ambient-scale lerp (dt * (desired - origin) per frame).
    const dt = Math.min(0.1, Math.max(0, delta));
    AudioEngine.updateMuteFade();
    // Retail Render: SetCurrentEnvironment when desired (+0x24) != current (+0x14).
    this.applyDesiredEnvironment();
    if(this.currentAmbientScale !== this.desiredAmbientScale){
      let next = this.currentAmbientScale + dt * (this.desiredAmbientScale - this.ambientScaleLerpFrom);
      if(this.ambientScaleLerpFrom < this.desiredAmbientScale){
        next = Math.min(next, this.desiredAmbientScale);
      }else{
        next = Math.max(next, this.desiredAmbientScale);
      }
      this.currentAmbientScale = next;
      this.ambientAudioDayEmitter.setVolume(this.currentAmbientScale);
      this.ambientAudioNightEmitter.setVolume(this.currentAmbientScale);
      // Refresh SFX emitter gains so ambient scale applies while they play.
      if(this.emitters){
        for(let i = 0, il = this.emitters.length; i < il; i++){
          const em = this.emitters[i];
          if(em?.gainNode && em.channel === AudioEngineChannel.SFX){
            em.gainNode.gain.value = em.getVolume();
          }
        }
      }
    }

    // Retail GetWithinRangeOfListener cull for positional emitters (0063e820).
    if(this.emitters){
      for(let i = 0, il = this.emitters.length; i < il; i++){
        this.emitters[i]?.updateListenerRange?.();
      }
    }

    // Retail OcclusionRender @ 00635fd0 — amortized obstruction for positional sources.
    this.updateOcclusion();

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
    this.priorityManager.clear();

    //Clean up the background music emitters
    this.areaMusicDayAudioEmitter.dispose();
    this.battleMusicAudioEmitter.dispose();
    this.battleStingerAudioEmitter.dispose();
    this.dialogMusicAudioEmitter.dispose();

    AudioEngine.resetSoundModeState();
  }

  /** Clear SetSoundMode stack / pause / mute fade (area unload / engine reset). */
  static resetSoundModeState(){
    if(AudioEngine.soundsPausedForMovie || AudioEngine.pauseSfxBus || AudioEngine.pauseMusicBus){
      AudioEngine.ResumeAllSoundsFromMovie();
    }
    if(AudioEngine.soundMuted){
      AudioEngine.UnMuteSound();
    }
    AudioEngine.soundModeStack = new Array(SOUND_MODE_STACK_MAX + 1).fill(SoundMode.POP);
    AudioEngine.soundModeDepth = 0;
    AudioEngine.soundModeMovieFlag = false;
    AudioEngine.pauseSfxBus = false;
    AudioEngine.pauseMusicBus = false;
    AudioEngine.muteFadeOutMs = 0;
    AudioEngine.muteFadeInMs = 0;
    AudioEngine.muteFadeStartMs = 0;
    AudioEngine.muteBusScale = 1;
    AudioEngine.soundMuted = false;
    AudioEngine.applyMuteBusScale(1);
  }

  static GetAudioEngine(){
    if(!this.engines.length) new AudioEngine();
    return this.engines[0];
  }

  private static applyMuteBusScale(scale: number){
    AudioEngine.muteBusScale = scale;
    if(AudioEngine.pauseSfxBus){
      if(AudioEngine.sfxChannel) AudioEngine.sfxChannel.setBusScale(0);
    }else if(AudioEngine.sfxChannel){
      AudioEngine.sfxChannel.setBusScale(scale);
    }
    if(AudioEngine.pauseMusicBus){
      if(AudioEngine.musicChannel) AudioEngine.musicChannel.setBusScale(0);
    }else if(AudioEngine.musicChannel){
      AudioEngine.musicChannel.setBusScale(scale);
    }
    if(AudioEngine.voChannel) AudioEngine.voChannel.setBusScale(scale);
  }

  /**
   * Retail MuteSound @ 00638aa0 — if not muted, start 500ms fade of dialog/sfx/music to 0.
   */
  static MuteSound(){
    if(AudioEngine.soundMuted){ return; }
    AudioEngine.soundMuted = true;
    AudioEngine.muteFadeInMs = 0;
    AudioEngine.muteFadeOutMs = SOUND_MUTE_FADE_MS;
    AudioEngine.muteFadeStartMs = performance.now();
  }

  /**
   * Retail UnMuteSound @ 00638b00 — if muted, start 500ms fade back to user slider gains.
   */
  static UnMuteSound(){
    if(!AudioEngine.soundMuted){ return; }
    AudioEngine.soundMuted = false;
    AudioEngine.muteFadeOutMs = 0;
    AudioEngine.muteFadeInMs = SOUND_MUTE_FADE_MS;
    AudioEngine.muteFadeStartMs = performance.now();
  }

  /**
   * Retail Render mute fade (+0x58 fade-out / +0x60 fade-in over stored baselines).
   */
  private static updateMuteFade(){
    const now = performance.now();
    if(AudioEngine.muteFadeOutMs > 0){
      const elapsed = now - AudioEngine.muteFadeStartMs;
      const t = Math.min(1, Math.max(0, elapsed / AudioEngine.muteFadeOutMs));
      AudioEngine.applyMuteBusScale(1 - t);
      if(t >= 1){
        AudioEngine.muteFadeOutMs = 0;
        AudioEngine.muteFadeStartMs = 0;
      }
      return;
    }
    if(AudioEngine.muteFadeInMs > 0){
      const elapsed = now - AudioEngine.muteFadeStartMs;
      const t = Math.min(1, Math.max(0, elapsed / AudioEngine.muteFadeInMs));
      AudioEngine.applyMuteBusScale(t);
      if(t >= 1){
        AudioEngine.muteFadeInMs = 0;
        AudioEngine.muteFadeStartMs = 0;
      }
    }
  }

  /**
   * Retail PauseAllSounds — bus-level approx of per-source Pause + GetPauseable.
   * @param pauseMusic When true, zero Music bus (mode 3 / movie). When false, SFX only
   *   (modes 2/4 keep streaming music groups audible).
   */
  static PauseAllSounds(pauseMusic: boolean = true){
    AudioEngine.soundsPausedForMovie = true;
    AudioEngine.pauseSfxBus = true;
    AudioEngine.pauseMusicBus = pauseMusic;
    if(AudioEngine.sfxChannel) AudioEngine.sfxChannel.setBusScale(0);
    if(pauseMusic){
      if(AudioEngine.musicChannel) AudioEngine.musicChannel.setBusScale(0);
    }else if(AudioEngine.musicChannel){
      // Ensure music is not left at 0 from a prior movie pause.
      const scale = AudioEngine.muteBusScale > 0 ? AudioEngine.muteBusScale : 1;
      AudioEngine.musicChannel.setBusScale(scale);
    }
  }

  /** @deprecated Prefer PauseAllSounds(true) — kept for movie callers. */
  static PauseAllSoundsForMovie(){
    AudioEngine.PauseAllSounds(true);
  }

  /** Retail ResumeAllSounds after pause / SetSoundMode pop. */
  static ResumeAllSoundsFromMovie(){
    if(!AudioEngine.soundsPausedForMovie && !AudioEngine.pauseSfxBus && !AudioEngine.pauseMusicBus){
      AudioEngine.ensureGameBusesAudible();
      return;
    }
    AudioEngine.soundsPausedForMovie = false;
    AudioEngine.pauseSfxBus = false;
    AudioEngine.pauseMusicBus = false;
    AudioEngine.applyMuteBusScale(AudioEngine.muteBusScale);
  }

  /**
   * Whether this sound mode should pause the Music bus (GetPauseable inverse for streams).
   * Mode 3 → yes; modes 2/4 → no; keepStreamingMusic → no.
   */
  private static shouldPauseMusicForMode(mode: number, keepStreamingMusic: number): boolean {
    if(keepStreamingMusic){ return false; }
    return mode === SoundMode.PAUSE_LOAD || mode === SoundMode.MOVIE;
  }

  /**
   * Retail CExoSound::GetSoundMode @ 0063ac30 — top of mode stack.
   */
  static GetSoundMode(): number {
    return AudioEngine.soundModeStack[AudioEngine.soundModeDepth] ?? SoundMode.POP;
  }

  /**
   * Retail CExoSoundInternal::SetSoundMode @ 006395a0.
   * @param mode SoundMode value (0 pops; 1 mute; 2/3/4 pause; 5/6 movie path)
   * @param keepStreamingMusic When non-zero, retail uses PauseAllButStreamingMusicForMovie.
   */
  static SetSoundMode(mode: number, keepStreamingMusic: number = 0){
    if(mode === SoundMode.MOVIE || mode === SoundMode.RESUME_MOVIE){
      if(mode === SoundMode.MOVIE){
        AudioEngine.PauseAllSounds(AudioEngine.shouldPauseMusicForMode(SoundMode.MOVIE, keepStreamingMusic));
        AudioEngine.soundModeMovieFlag = true;
      }else{
        AudioEngine.soundModeMovieFlag = false;
        AudioEngine.ResumeAllSoundsFromMovie();
        const top = AudioEngine.soundModeStack[AudioEngine.soundModeDepth] ?? SoundMode.POP;
        if(AudioEngine.soundModeDepth !== 0){
          AudioEngine.soundModeDepth--;
          AudioEngine.SetSoundMode(top, 0);
        }
      }
      return;
    }

    const current = AudioEngine.soundModeStack[AudioEngine.soundModeDepth] ?? SoundMode.POP;
    if(mode !== SoundMode.POP && mode === current){
      return;
    }

    // Undo current top effects before pop / push.
    if(current === SoundMode.MUTE){
      AudioEngine.UnMuteSound();
    }
    if(current === SoundMode.PAUSE || current === SoundMode.PAUSE_LOAD || current === SoundMode.PAUSE_GUI){
      AudioEngine.ResumeAllSoundsFromMovie();
    }

    let applyMode = mode;
    if(mode === SoundMode.POP){
      AudioEngine.soundModeDepth--;
      if(AudioEngine.soundModeDepth < 0){
        AudioEngine.soundModeDepth = 0;
      }
      applyMode = AudioEngine.soundModeStack[AudioEngine.soundModeDepth] ?? SoundMode.POP;
    }else{
      AudioEngine.soundModeDepth++;
      if(AudioEngine.soundModeDepth > SOUND_MODE_STACK_MAX){
        AudioEngine.soundModeDepth = SOUND_MODE_STACK_MAX;
      }
      AudioEngine.soundModeStack[AudioEngine.soundModeDepth] = mode;
      applyMode = mode;
    }

    if(applyMode === SoundMode.MUTE){
      AudioEngine.MuteSound();
    }
    if(applyMode === SoundMode.PAUSE || applyMode === SoundMode.PAUSE_LOAD || applyMode === SoundMode.PAUSE_GUI){
      AudioEngine.PauseAllSounds(
        AudioEngine.shouldPauseMusicForMode(applyMode, keepStreamingMusic)
      );
    }
  }

  /**
   * Retail BusyWaitMuteSound @ 0044cc30 — SetSoundMode(1) then wait ~500ms while Render runs.
   */
  static async BusyWaitMuteSound(): Promise<void> {
    AudioEngine.SetSoundMode(SoundMode.MUTE, 0);
    const start = performance.now();
    while(performance.now() - start < SOUND_MUTE_FADE_MS){
      AudioEngine.updateMuteFade();
      await new Promise<void>((resolve) => setTimeout(resolve, 16));
    }
    AudioEngine.updateMuteFade();
  }

  /** Pop sound modes until idle (retail MainLoop double SetSoundMode(0) after load). */
  static clearSoundModeStack(){
    let guard = SOUND_MODE_STACK_MAX + 2;
    while(guard-- > 0 && AudioEngine.GetSoundMode() !== SoundMode.POP){
      AudioEngine.SetSoundMode(SoundMode.POP, 0);
    }
    if(AudioEngine.soundModeDepth > 0){
      AudioEngine.soundModeDepth = 0;
    }
  }

  /**
   * Ensure SFX/Music/VO buses are not stuck silent after movie pause / mute fade.
   * Does not clear an intentional MuteSound (soundMuted).
   */
  static ensureGameBusesAudible(){
    if(AudioEngine.soundMuted || AudioEngine.muteFadeOutMs > 0){ return; }
    if(AudioEngine.pauseSfxBus || AudioEngine.pauseMusicBus){ return; }
    const scale = AudioEngine.muteBusScale > 0 ? AudioEngine.muteBusScale : 1;
    AudioEngine.muteBusScale = scale;
    if(AudioEngine.sfxChannel) AudioEngine.sfxChannel.setBusScale(scale);
    if(AudioEngine.musicChannel) AudioEngine.musicChannel.setBusScale(scale);
    if(AudioEngine.voChannel) AudioEngine.voChannel.setBusScale(scale);
  }

  static ToggleMute(){
    if(AudioEngine.soundMuted || AudioEngine.muteFadeOutMs > 0){
      AudioEngine.UnMuteSound();
    }else{
      AudioEngine.MuteSound();
    }
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
