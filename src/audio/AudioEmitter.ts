import { AudioEmitterType } from "@/enums/audio/AudioEmitterType";
import { AudioEngineChannel } from "@/enums/audio/AudioEngineChannel";
import { AudioPriorityGroup } from "@/enums/audio/AudioPriorityGroup";
import { AudioEngine } from "@/audio/AudioEngine";
import { AudioLoader } from "@/audio/AudioLoader";
import { GameState } from "@/GameState";
import {
  getPathBlockageWeight,
  obstructionVolumeScale,
  OBSTRUCTION_REUSE_AGE_MS,
  OBSTRUCTION_REUSE_DIST,
} from "@/engine/pathfinding/path-blockage-weight";

const GAIN_RAMP_TIME = 0.25;
const PRIORITY_GROUP_DEFAULT = 23;

enum AudioEmitterState {
  STOPPED = 0,
  PLAYING = 1,
  FADING_OUT = 2,
  FADING_IN = 3,
}

/**
 * AudioEmitter class.
 * 
 * The AudioEmitter class is used in conjunction with AudioEngine class manage global and positional audio emitters in the game.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file AudioEmitter.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class AudioEmitter {
  isDestroyed: boolean;
  position: { x: number; y: number; z: number; } = {x: 0, y: 0, z: 0};
  engine: AudioEngine;
  gainNode: GainNode;
  pannerNode: PannerNode;
  mainNode: AudioNode;
  state: AudioEmitterState = AudioEmitterState.STOPPED;

  name: string = '';
  sounds: string[] = [];
  isActive: boolean = true;
  isLooping: boolean = false;
  /**
   * UTS Continuous. When false, sequence stops after last sound
   * and deactivates (GetNextSound → SetIsActive(0)). Default true matches
   * prior wrap behavior for non-UTS emitters.
   */
  isContinuous: boolean = true;
  isRandom: boolean = false;
  isRandomPosition: boolean = false;
  randomX: number = 0;
  randomY: number = 0;
  randomZ: number = 0;
  interval: number = 0;
  intervalVariation: number = 0;
  minDistance: number = 0;
  maxDistance: number = 1;
  volume: number = 127;
  volumeVariation: number = 0;
  soundIndex: number = 0;
  playbackRate: number = 1;
  playbackRateVariation: number = 0;
  /**
   * FixedVariance (UTS / SoundObjectSetFixedVariance).
   * Playback-rate multiplier in [0.5, 2]; when set, random pitch variance is ignored
   * (SetFixedVariance clears fixed-variance).
   */
  fixedVariance: number = 1;
  elevation: number = 0;

  priority: number = PRIORITY_GROUP_DEFAULT;
  priorityGroupVolume: number = 127;

  /** Held for sequenced/looping playback (start/playNextSound). */
  currentVoiceId: number = undefined;
  currentSound: AudioBufferSourceNode = undefined;
  /**
   * Bumped on each playStreamWave call so in-flight async loads that lose the
   * race do not start orphan BufferSources (bark/dialog VO pile-up).
   */
  private streamWaveGeneration: number = 0;
  buffers: Map<string, AudioBuffer> = new Map<string, AudioBuffer>();
  channel: AudioEngineChannel = AudioEngineChannel.SFX;
  type: AudioEmitterType = AudioEmitterType.GLOBAL;
  interationCount: number = 0;

  disabled: boolean = false;

  /**
   * GetWithinRangeOfListener: positional sources are in range when
   * distance-to-listener <= maxDistance. Globals (2D) are always in range.
   */
  inListenerRange: boolean = true;

  /** Looping/sequenced emitter was culled or disabled and should restart when eligible. */
  pendingResume: boolean = false;

  /**
   * Miles obstruction factor [0,1] on positional / streaming sources.
   * Gain multiplies by (1 − factor) — approximates AIL_set_sample_obstruction.
   */
  obstructionFactor: number = 0;

  /** Listener position used when obstructionFactor was last computed (reuse cache). */
  private obstructionListener = { x: 0, y: 0, z: 0 };

  /** Timestamp (ms) of last obstruction sample. */
  private obstructionSampleMs: number = 0;

  constructor (audioEngine: AudioEngine, channel: AudioEngineChannel = AudioEngineChannel.SFX) {
    this.isDestroyed = false;

    this.engine = audioEngine;
    this.channel = channel;

    this.position = {x: 0, y: 0, z: 0};
    this.gainNode = this.engine.audioCtx.createGain();
    this.pannerNode = this.engine.audioCtx.createPanner();
  }

  setVolume(volume: number = 127): AudioEmitter {
    this.volume = Math.max(0, Math.min(127, volume));
    if(this.gainNode){
      this.gainNode.gain.value = this.getVolume();
    }
    return this;
  }

  setPosition(x = 0, y = 0, z = 0): void {
    x = isNaN(x) ? this.position.x : x;
    y = isNaN(y) ? this.position.y : y;
    z = isNaN(z) ? this.position.z : z;

    // We need to cache the values below because setPosition stores the floats in a higher precision than THREE.Vector3
    // which could keep them from matching when compared
    if(this.position.x != x || this.position.y != y || this.position.z != z){
      this.position.x = x;
      this.position.y = y;
      this.position.z = z + this.elevation;
    }

    if(this.mainNode instanceof PannerNode && (
      this.mainNode.positionX.value != this.position.x ||
      this.mainNode.positionY.value != this.position.y ||
      this.mainNode.positionZ.value != this.position.z + this.elevation
    )){
      this.mainNode.positionX.value = this.position.x;
      this.mainNode.positionY.value = this.position.y;
      this.mainNode.positionZ.value = this.position.z + this.elevation;
    }

    if(this.currentVoiceId != null){
      this.engine?.priorityManager?.updateDistance(this.currentVoiceId, this.getListenerDistanceSq());
    }
  }

  setDisabled(disabled: boolean): void {
    if(disabled == this.disabled){
      return;
    }
    this.disabled = disabled;
    if(disabled){
      // Room hide / disable: hard-stop and free priority slots (ShutDownSource).
      const wantsResume = this.isLooping || this.sounds.length > 0;
      this.suspendForCullOrDisable(wantsResume);
      return;
    }
    if(this.gainNode && this.engine){
      const now = this.engine.audioCtx.currentTime;
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
      this.gainNode.gain.linearRampToValueAtTime(this.getVolume(), now + GAIN_RAMP_TIME);
    }
    this.tryResumeAfterCullOrDisable();
  }

  setPriorityGroupId(priorityGroupId: number): void {
    this.priority = priorityGroupId;
    const priorityGroup = GameState.SWRuleSet.getPriorityGroupById(priorityGroupId);
    this.priorityGroupVolume = Math.max(0, Math.min(127, priorityGroup?.volume ?? 127));
    if(this.gainNode){
      this.gainNode.gain.value = this.getVolume();
    }
    this.playbackRateVariation = priorityGroup?.playbackvariance ?? 0;
    this.setMinDistance(priorityGroup?.maxvolumedist ?? 0);
    this.setMaxDistance(priorityGroup?.minvolumedist ?? 0);
  }

  setMinDistance(minDistance: number): void {
    this.minDistance = Math.max(0, minDistance);
    this.applyPannerDistances();
  }

  setMaxDistance(maxDistance: number): void {
    this.maxDistance = Math.max(this.minDistance, maxDistance);
    this.applyPannerDistances();
  }

  /**
   * Miles-like 3D falloff via Web Audio linear distance model:
   * full level until refDistance (min), silent at maxDistance.
   * SetDistance stores min/max range; range gate uses max.
   */
  applyPannerDistances(): void {
    if(!(this.mainNode instanceof PannerNode)){ return; }
    const minD = Math.max(0.01, this.minDistance || 0.01);
    const maxD = Math.max(minD, this.maxDistance || minD);
    this.mainNode.panningModel = 'equalpower';
    this.mainNode.distanceModel = 'linear';
    this.mainNode.refDistance = minD;
    this.mainNode.maxDistance = maxD;
    this.mainNode.rolloffFactor = 1;
  }

  getPriorityFadeTime(): number {
    return this.engine?.priorityManager?.getGroupFadeTimeSeconds(this.priority)
      ?? GameState.SWRuleSet.getPriorityGroupById(this.priority)?.getFadeTimeSeconds?.()
      ?? 0;
  }

  getListenerDistanceSq(): number {
    const lx = this.engine?.listenerPosition?.x ?? 0;
    const ly = this.engine?.listenerPosition?.y ?? 0;
    const lz = this.engine?.listenerPosition?.z ?? 0;
    const dx = this.position.x - lx;
    const dy = this.position.y - ly;
    const dz = (this.position.z + this.elevation) - lz;
    return dx * dx + dy * dy + dz * dz;
  }

  /**
   * GetWithinRangeOfListener.
   * Non-positional (2D) always true; else distance <= maxDistance.
   */
  isWithinListenerRange(): boolean {
    if(this.type !== AudioEmitterType.POSITIONAL){
      return true;
    }
    const maxD = Math.max(0, this.maxDistance);
    return this.getListenerDistanceSq() <= maxD * maxD;
  }

  /**
   * Called from AudioEngine.update — cull / resume positional emitters.
   */
  updateListenerRange(): void {
    if(this.isDestroyed || this.type !== AudioEmitterType.POSITIONAL){
      return;
    }
    const inRange = this.isWithinListenerRange();
    if(inRange === this.inListenerRange){
      if(inRange && this.pendingResume && !this.disabled && this.isActive){
        this.tryResumeAfterCullOrDisable();
      }
      return;
    }
    this.inListenerRange = inRange;
    if(!inRange){
      const wantsResume = this.isLooping || this.sounds.length > 0;
      this.suspendForCullOrDisable(wantsResume);
    }else if(!this.disabled && this.isActive){
      this.tryResumeAfterCullOrDisable();
    }
  }

  /**
   * OcclusionRender / PlaySourceOn3DVoice obstruction sample.
   * Non-positional sources stay at factor 0.
   * @returns true if a fresh GetObstructionFactor was run (for per-frame budget).
   */
  updateObstruction(force = false): boolean {
    if(this.isDestroyed || this.type !== AudioEmitterType.POSITIONAL){
      if(this.obstructionFactor !== 0){
        this.obstructionFactor = 0;
        if(this.gainNode) this.gainNode.gain.value = this.getVolume();
      }
      return false;
    }
    if(this.disabled || !this.inListenerRange){
      return false;
    }

    const lx = this.engine?.listenerPosition?.x ?? 0;
    const ly = this.engine?.listenerPosition?.y ?? 0;
    const lz = this.engine?.listenerPosition?.z ?? 0;
    const now = performance.now();

    // GetClosestRecentSound: reuse if positions within 0.5 and age < 175ms.
    if(!force && this.obstructionSampleMs > 0){
      const age = now - this.obstructionSampleMs;
      if(age < OBSTRUCTION_REUSE_AGE_MS){
        const dLx = lx - this.obstructionListener.x;
        const dLy = ly - this.obstructionListener.y;
        const dLz = lz - this.obstructionListener.z;
        if(dLx * dLx + dLy * dLy + dLz * dLz < OBSTRUCTION_REUSE_DIST * OBSTRUCTION_REUSE_DIST){
          return false;
        }
      }
    }

    // Prefer a nearby emitter's recent sample (GetClosestRecentSound across playing list).
    const reused = this.engine?.findRecentObstruction?.(
      this.position.x, this.position.y, this.position.z + this.elevation,
      lx, ly, lz, now
    );
    let factor: number;
    let computed = false;
    if(reused != null){
      factor = reused;
    }else{
      const area = GameState.module?.area;
      factor = getPathBlockageWeight(
        area,
        { x: this.position.x, y: this.position.y, z: this.position.z + this.elevation },
        { x: lx, y: ly, z: lz }
      );
      computed = true;
    }

    this.obstructionListener.x = lx;
    this.obstructionListener.y = ly;
    this.obstructionListener.z = lz;
    this.obstructionSampleMs = now;
    if(factor !== this.obstructionFactor){
      this.obstructionFactor = factor;
      if(this.gainNode){
        this.gainNode.gain.value = this.getVolume();
      }
    }else{
      this.obstructionFactor = factor;
    }
    return computed;
  }

  /** Expose last sample for GetClosestRecentSound reuse across emitters. */
  getObstructionSample(): {
    sx: number; sy: number; sz: number;
    lx: number; ly: number; lz: number;
    ms: number; factor: number;
  } | null {
    if(this.obstructionSampleMs <= 0) return null;
    return {
      sx: this.position.x,
      sy: this.position.y,
      sz: this.position.z + this.elevation,
      lx: this.obstructionListener.x,
      ly: this.obstructionListener.y,
      lz: this.obstructionListener.z,
      ms: this.obstructionSampleMs,
      factor: this.obstructionFactor,
    };
  }

  private suspendForCullOrDisable(wantsResume: boolean): void {
    if(wantsResume && (this.state === AudioEmitterState.PLAYING || this.currentSound || this.pendingResume)){
      this.pendingResume = true;
    }
    this.stop(0);
    this.stopAllFireAndForget();
    this.releaseCurrentVoice();
    this.engine?.priorityManager?.releaseAllForOwner(this);
    if(this.gainNode && this.engine){
      this.gainNode.gain.cancelScheduledValues(this.engine.audioCtx.currentTime);
      this.gainNode.gain.value = 0;
    }
  }

  private tryResumeAfterCullOrDisable(): void {
    if(this.isDestroyed || this.disabled || !this.isActive){ return; }
    if(this.type === AudioEmitterType.POSITIONAL && !this.isWithinListenerRange()){ return; }
    if(!this.pendingResume && this.state === AudioEmitterState.PLAYING){ return; }
    if(!this.sounds.length){ return; }
    this.pendingResume = false;
    this.inListenerRange = true;
    if(this.gainNode){
      this.gainNode.gain.value = this.getVolume();
    }
    this.start();
  }

  private stopAllFireAndForget(): void {
    for(let i = this.ffsounds.length - 1; i >= 0; i--){
      const sound = this.ffsounds[i];
      try{
        sound.onended = undefined;
        sound.disconnect();
        sound.stop(0);
      }catch(e){}
      this.releaseVoiceId((sound as any).__priorityVoiceId);
    }
    this.ffsounds.length = 0;
  }

  async load(): Promise<void> {
    this.gainNode.gain.value = this.getVolume();

    switch(this.type){
      case AudioEmitterType.POSITIONAL:
        this.mainNode = this.engine.audioCtx.createPanner();
        this.setPosition( this.position.x, this.position.y, this.position.z + this.elevation );
        this.applyPannerDistances();
        this.mainNode.connect(this.gainNode);
      break;
      case AudioEmitterType.GLOBAL:
        this.mainNode = this.gainNode;
        this.inListenerRange = true;
      break;
    }

    this.setChannel(this.channel);

    if(this.engine){
      this.engine.addEmitter(this);
    }

    for(let i = 0; i < this.sounds.length; i++){
      await this.loadSounds(i);
    }
    if(this.isActive && this.isWithinListenerRange() && !this.disabled){
      this.start();
    }else if(this.isActive && this.sounds.length){
      this.pendingResume = true;
      this.inListenerRange = this.isWithinListenerRange();
    }
  }

  setChannel(channel: AudioEngineChannel): void {
    this.channel = channel;

    if(!this.gainNode){ return; }

    try{
      this.gainNode.disconnect();
    }catch(e){
      console.error(e);
    }

    switch(this.channel){
      case AudioEngineChannel.VO:
        this.gainNode.connect(AudioEngine.voChannel.getGainNode());
      break;
      case AudioEngineChannel.MUSIC:
        this.gainNode.connect(AudioEngine.musicChannel.getGainNode());
      break;
      case AudioEngineChannel.MOVIE:
        this.gainNode.connect(AudioEngine.movieChannel.getGainNode());
      break;
      case AudioEngineChannel.GUI:
        this.gainNode.connect(AudioEngine.guiChannel.getGainNode());
      break;
      default:
        this.gainNode.connect(AudioEngine.sfxChannel.getGainNode());
      break;
    }
  }

  /**
   * Mode-2 GetPauseable: route group-4 emitters past a muted SFX bus onto Music,
   * without changing this.channel (restore reconnects to the original bus).
   */
  setOutputBypassMutedSfx(bypass: boolean): void {
    if(!this.gainNode){ return; }
    if(bypass){
      try{
        this.gainNode.disconnect();
      }catch(_e){ /* already disconnected */ }
      const musicGain = AudioEngine.musicChannel?.getGainNode?.();
      if(musicGain){
        this.gainNode.connect(musicGain);
      }
      return;
    }
    this.setChannel(this.channel);
  }

  async loadSounds(soundIndex = 0): Promise<void> {
    if(soundIndex >= this.sounds.length){
      return;
    }

    const resRef = this.sounds[soundIndex];
    try{
      const data = await AudioLoader.LoadSound(resRef);
      try{
        await this.addSound(resRef, data);
      }catch(e){
        console.error('AudioEmitter', 'Sound not added to emitter', resRef);
      }
    }catch(e){
      console.error('AudioEmitter', 'Sound not found', resRef);
    }
  }

  ffsounds: AudioBufferSourceNode[] = [];

  private acquireVoice(
    holdAcrossSequence: boolean,
    onStolen?: () => void
  ): { ok: boolean; voiceId?: number } {
    const manager = this.engine?.priorityManager;
    if(!manager){ return { ok: true }; }

    if(holdAcrossSequence && this.currentVoiceId != null){
      manager.updateDistance(this.currentVoiceId, this.getListenerDistanceSq());
      return { ok: true, voiceId: this.currentVoiceId };
    }

    const result = manager.tryAcquire({
      owner: this,
      groupId: this.priority,
      distanceSq: this.getListenerDistanceSq(),
      is3D: this.type === AudioEmitterType.POSITIONAL,
      onStolen: onStolen ?? (() => {
        // InterruptPlayingSound → ShutDownSource: hard stop, no fade.
        if(holdAcrossSequence){
          this.stop(0);
        }else{
          this.disposeCurrentSound();
          this.releaseCurrentVoice();
        }
      }),
    });
    if(!result.allowed){
      return { ok: false };
    }
    if(holdAcrossSequence){
      this.currentVoiceId = result.voiceId;
    }
    return { ok: true, voiceId: result.voiceId };
  }

  private releaseCurrentVoice(): void {
    if(this.currentVoiceId == null){ return; }
    this.engine?.priorityManager?.release(this.currentVoiceId);
    this.currentVoiceId = undefined;
  }

  private releaseVoiceId(voiceId: number | undefined): void {
    if(voiceId == null){ return; }
    if(voiceId === this.currentVoiceId){
      this.releaseCurrentVoice();
      return;
    }
    this.engine?.priorityManager?.release(voiceId);
  }

  private stopFireAndForgetByVoiceId(voiceId: number | undefined): void {
    if(voiceId == null){ return; }
    for(let i = this.ffsounds.length - 1; i >= 0; i--){
      const sound = this.ffsounds[i];
      if((sound as any).__priorityVoiceId !== voiceId){ continue; }
      try{
        sound.onended = undefined;
        sound.disconnect();
        sound.stop(0);
      }catch(e){}
      this.ffsounds.splice(i, 1);
      break;
    }
    this.releaseVoiceId(voiceId);
  }

  async playSoundFireAndForget(resRef = ''): Promise<AudioBufferSourceNode>{
    if(resRef == '****' || !resRef?.length){ return; }
    if(this.disabled || !this.isWithinListenerRange()){ return; }
    // PlaySourceOn3DVoice obstruction sample for oneshots.
    this.updateObstruction(true);
    try{
      let buffer: AudioBuffer = (this.buffers.has(resRef)) ? this.buffers.get(resRef) : undefined;
      if(!buffer){
        let data = await AudioLoader.LoadSound(resRef);
        buffer = await this.addSound(resRef, data);
      }

      if(!buffer){
        console.error('AudioEmitter', 'Sound not found', resRef);
        return;
      }

      const holder: { voiceId?: number; sound?: AudioBufferSourceNode; dead?: boolean } = {};
      const acquired = this.acquireVoice(false, () => {
        holder.dead = true;
        if(holder.sound){
          this.stopFireAndForgetByVoiceId(holder.voiceId);
        }else{
          this.releaseVoiceId(holder.voiceId);
        }
      });
      if(!acquired.ok || holder.dead){
        return;
      }
      holder.voiceId = acquired.voiceId;
      if(holder.dead){
        this.releaseVoiceId(holder.voiceId);
        return;
      }

      const sound: AudioBufferSourceNode = this.engine.audioCtx.createBufferSource();
      (sound as any).name = resRef;
      (sound as any).__priorityVoiceId = holder.voiceId;
      holder.sound = sound;

      if(holder.dead){
        this.releaseVoiceId(holder.voiceId);
        return;
      }

      this.ffsounds.push(sound);

      sound.buffer = buffer;
      sound.connect(this.mainNode);
      sound.start(this.engine.audioCtx.currentTime);

      sound.onended = () => {
        sound.disconnect();
        try{ sound.stop(0); }catch(e){}
        this.ffsounds.splice(this.ffsounds.indexOf(sound), 1);
        this.releaseVoiceId((sound as any).__priorityVoiceId);
      }
      return sound;
    }catch(e){
      console.error('AudioEmitter', 'Failed to play sound', resRef);
      console.error(e);
    }
    return;
  }

  async playSound(resRef = ''): Promise<AudioBufferSourceNode>{
    if(resRef == '****' || !resRef?.length){ return; }
    if(this.disabled || !this.isWithinListenerRange()){ return; }
    this.disposeCurrentSound();
    this.releaseCurrentVoice();

    const acquired = this.acquireVoice(false);
    if(!acquired.ok){
      return;
    }
    this.currentVoiceId = acquired.voiceId;

    //attempt to load from the buffer cache
    if(this.buffers.has(resRef)){
      this.currentSound = this.engine.audioCtx.createBufferSource();
      this.currentSound.buffer = this.buffers.get(resRef);
      (this.currentSound as any).name = resRef;
      this.currentSound.loop = this.isLooping;
      this.currentSound.connect(this.mainNode);
      this.currentSound.start(this.engine.audioCtx.currentTime);
      if(!this.isLooping){
        this.currentSound.onended = () => {
          this.releaseCurrentVoice();
          this.currentSound = null;
        };
      }
      return this.currentSound;
    }
    
    //load from disk
    try{
      const data = await AudioLoader.LoadSound(resRef);
      try{
        const buffer = await this.addSound(resRef, data);
        this.currentSound = this.engine.audioCtx.createBufferSource();
        this.currentSound.buffer = buffer;
        (this.currentSound as any).name = resRef;
        this.currentSound.loop = this.isLooping;
        this.currentSound.connect(this.mainNode);
        this.currentSound.start(this.engine.audioCtx.currentTime);
        if(!this.isLooping){
          this.currentSound.onended = () => {
            this.releaseCurrentVoice();
            this.currentSound = null;
          };
        }
        return this.currentSound;
      }catch(e){
        console.log('AudioEmitter', 'Sound not added to emitter', resRef);
        console.error(e);
        this.releaseCurrentVoice();
      }
    }catch(e){
      console.log('AudioEmitter', 'Sound not found', resRef);
      this.releaseCurrentVoice();
    }
  }

  async playStreamWave(resRef =''): Promise<AudioBufferSourceNode> {
    const generation = ++this.streamWaveGeneration;
    this.disposeCurrentSound();
    this.releaseCurrentVoice();

    const acquired = this.acquireVoice(false);
    if(!acquired.ok){
      console.warn('AudioEmitter', 'playStreamWave denied by priority manager', resRef, 'group', this.priority);
      return;
    }
    this.currentVoiceId = acquired.voiceId;

    // Ensure emitter gain is current (load may have been long ago; duck/mute may have changed buses).
    if(this.gainNode){
      this.gainNode.gain.value = this.getVolume();
    }

    const begin = (buffer: AudioBuffer) => {
      if(generation !== this.streamWaveGeneration){
        // Newer playStreamWave already released our voice at call start.
        return;
      }
      if(!this.mainNode){
        console.warn('AudioEmitter', 'playStreamWave: mainNode not loaded', resRef);
        this.releaseCurrentVoice();
        return;
      }
      // Drop any source that slipped in while we were awaiting load.
      this.disposeCurrentSound();
      this.currentSound = this.engine.audioCtx.createBufferSource();
      this.currentSound.buffer = buffer;
      (this.currentSound as any).name = resRef;
      this.currentSound.start(this.engine.audioCtx.currentTime);
      this.currentSound.connect(this.mainNode);
      this.currentSound.onended = () => {
        if(generation === this.streamWaveGeneration){
          this.releaseCurrentVoice();
          this.currentSound = null;
        }
      };
      return this.currentSound;
    };

    //attempt to load from the buffer cache
    if(this.buffers.has(resRef)){
      return begin(this.buffers.get(resRef));
    }
    
    //load from disk
    try{
      const data = await AudioLoader.LoadStreamWave(resRef);
      if(generation !== this.streamWaveGeneration){
        return;
      }
      try{
        const buffer = await this.addSound(resRef, data);
        if(generation !== this.streamWaveGeneration){
          return;
        }
        return begin(buffer);
      }catch(e: any){
        if(generation === this.streamWaveGeneration){
          console.log('AudioEmitter', 'Sound not added to emitter', resRef);
          this.releaseCurrentVoice();
        }
        throw e;
      }
    }catch(e){
      if(generation === this.streamWaveGeneration){
        console.log('AudioEmitter', 'Failed to locate StreamWave', resRef);
        this.releaseCurrentVoice();
      }
      throw e;
    }
  }

  start(): void {
    if(!this.sounds.length){
      return;
    }
    if(this.disabled || !this.isWithinListenerRange()){
      this.pendingResume = true;
      return;
    }
    this.pendingResume = false;
    this.inListenerRange = true;
    this.state = AudioEmitterState.PLAYING;
    this.disposeCurrentSound();
    this.releaseCurrentVoice();
    this.interationCount = 0;
    // PlaySourceOn3DVoice samples obstruction before resume.
    this.updateObstruction(true);
    this.gainNode.gain.setValueAtTime(this.getVolume(), this.getCurrentTime());
    this.playNextSound();
  }

  getRandomVariation(value: number): number {
    return ( Math.random() * (value * 2) ) - value;
  }

  /**
   * Advance playlist index after a oneshot ends.
   * @returns false when Continuous=0 and the list is exhausted (empty resref).
   */
  advanceToNextSound(): boolean {
    if(!this.sounds.length){ return false; }
    if(this.isRandom){
      this.soundIndex = Math.floor(Math.random() * this.sounds.length);
      return true;
    }
    this.soundIndex++;
    if(this.soundIndex >= this.sounds.length){
      if(!this.isContinuous){
        this.soundIndex = Math.max(0, this.sounds.length - 1);
        return false;
      }
      this.soundIndex = 0;
    }
    return true;
  }

  getNextSoundIndex(): number {
    this.advanceToNextSound();
    return this.soundIndex;
  }

  getDelayInSeconds(): number {
    return this.interationCount == 0 ? 0 : (this.interval + this.getRandomVariation(this.intervalVariation))/1000;
  }

  getPlaybackRate(): number {
    // : FixedVariance in [0.5, 2] replaces random pitch (helper).
    const fv = this.fixedVariance;
    if(Number.isFinite(fv) && fv >= 0.5 && fv <= 2 && fv !== 1){
      return this.playbackRate * fv;
    }
    return this.playbackRate + this.getRandomVariation(this.playbackRateVariation);
  }

  getVolume(): number {
    if(this.disabled){
      return 0;
    }
    let gain = (this.volume + this.getRandomVariation(this.volumeVariation)) / 127;
    gain *= this.priorityGroupVolume / 127;
    // Render multiplies playing/streaming sources by ambient scale.
    // Apply to SFX channel emitters (area AmbientScale from UpdateRoom).
    if(this.channel === AudioEngineChannel.SFX && this.engine){
      gain *= this.engine.currentAmbientScale;
    }
    // oneshot SetVolume does not multiply by K2 music/ambient duck scale
    // (only streaming SetVolume does for music/4/5).
    // DoObstructionWork / AIL_set_sample_obstruction → volume × (1 − factor).
    if(this.type === AudioEmitterType.POSITIONAL){
      gain *= obstructionVolumeScale(this.obstructionFactor);
    }
    return gain;
  }

  getCurrentSoundName(): string {
    return this.currentSound ? (this.currentSound as any).name || '' : '';
  }

  isPlayingSound(resRef: string): boolean {
    return this.getCurrentSoundName() == resRef;
  }

  playNextSound(): void {
    if(this.isDestroyed || this.state == AudioEmitterState.FADING_OUT)
      return;

    if(this.disabled || !this.isWithinListenerRange()){
      this.pendingResume = true;
      this.suspendForCullOrDisable(true);
      return;
    }
    
    this.disposeCurrentSound();

    if(!this.sounds.length){
      return;
    }

    const acquired = this.acquireVoice(true);
    if(!acquired.ok){
      this.state = AudioEmitterState.STOPPED;
      this.releaseCurrentVoice();
      return;
    }

    const resRef = this.sounds[this.soundIndex];
    const delay = this.getDelayInSeconds();
    this.interationCount++;
    this.currentSound = this.engine.audioCtx.createBufferSource();
    this.currentSound.buffer = this.buffers.get(resRef);
    this.currentSound.loop = (this.sounds.length == 1 && this.isLooping);
    (this.currentSound as any).name = resRef;
    this.currentSound.playbackRate.value = this.getPlaybackRate();
    this.gainNode.gain.value = this.getVolume();

    if(this.type == AudioEmitterType.POSITIONAL && (this.mainNode instanceof PannerNode)){
      this.mainNode.positionX.value = this.position.x;
      this.mainNode.positionY.value = this.position.y;
      this.mainNode.positionZ.value = this.position.z + this.elevation;
      if(this.isRandomPosition){
        this.mainNode.positionX.value += this.getRandomVariation(this.randomX);
        this.mainNode.positionY.value += this.getRandomVariation(this.randomY);
      }
    }

    const canExecuteCallback = !this.currentSound?.loop;
    this.currentSound.onended = canExecuteCallback ? () => {
      if(!!this.currentSound?.loop || !this.isActive || this.isDestroyed){
        return;
      }
      if(!this.advanceToNextSound()){
        // Continuous=0 at end of list → SetIsActive(0).
        this.isActive = false;
        this.state = AudioEmitterState.STOPPED;
        this.disposeCurrentSound();
        this.releaseCurrentVoice();
        return;
      }
      this.playNextSound();
    } : undefined;
    this.currentSound.start(this.engine.audioCtx.currentTime + delay);
    this.currentSound.connect(this.mainNode);
  }

  async addSound(resRef: string, data: Uint8Array): Promise<AudioBuffer> {
    if(!data){
      console.error('AudioEmitter.addSound: No audio data present');
      throw new Error('No audio data present');
    }
    
    try{
      const buffer: AudioBuffer = await this.engine.audioCtx.decodeAudioData(data.buffer as ArrayBuffer );
      this.buffers.set(resRef, buffer);
      return buffer;
    }catch(e: any){
      console.error('AudioEmitter.addSound: Failed to decodeAudioData');
      if (e.name === 'DataCloneError') {
        console.error('AudioEmitter.addSound: ArrayBuffer is detached. This usually happens when the buffer was transferred to another context.');
      }
      console.error(e);
      throw e;
    }
  }

  disposeCurrentSound(): void {
    if(!this.currentSound){
      return;
    }
    try{
      this.currentSound.onended = undefined;
      this.currentSound.disconnect();
      this.currentSound.stop(0);
    }catch(e: any) { 
      console.error('Failed to disconnect sound', e);
    }
    this.currentSound = null;
  }

  getCurrentTime(): number {
    return this.engine.audioCtx.currentTime;
  }

  stop(fadeTime: number = 0): void {
    fadeTime = Math.max(0, fadeTime);
    const isInstant = fadeTime <= 0;

    if(this.isDestroyed)
      return;
    
    if(!this.currentSound){
      this.releaseCurrentVoice();
      this.state = AudioEmitterState.STOPPED;
      this.interationCount = 0;
      return;
    }

    if(isInstant){
      this.state = AudioEmitterState.STOPPED;
      this.interationCount = 0;
      this.disposeCurrentSound();
      this.releaseCurrentVoice();
      return;
    }
    this.state = AudioEmitterState.FADING_OUT;
    const now = this.getCurrentTime();
    const fadeEndTime = now + fadeTime;
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    this.gainNode.gain.linearRampToValueAtTime(0, fadeEndTime);
      
    if(this.currentSound){
      this.currentSound.onended = () => {
        this.state = AudioEmitterState.STOPPED;
        this.interationCount = 0;
        this.disposeCurrentSound();
        this.releaseCurrentVoice();
      };
      this.currentSound.stop(fadeEndTime);
    }
  }

  destroy(): void {
    this.buffers.clear();
    this.interationCount = 0;
    this.isDestroyed = true;
    this.pendingResume = false;
    this.disposeCurrentSound();
    this.stopAllFireAndForget();
    this.releaseCurrentVoice();
    this.engine?.priorityManager?.releaseAllForOwner(this);
    if(!this.engine){ return; }
    this.engine.removeEmitter(this);
  }

}
