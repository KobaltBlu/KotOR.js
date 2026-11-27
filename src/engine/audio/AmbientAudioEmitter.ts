import type { AudioEngine } from "@engine/audio/AudioEngine";
import { EventListener } from "@core/utility/EventListener";
import { GameState } from "@engine/runtime/GameState";

/**
 * AmbientAudioEmitter class.
 *
 * Streaming-style ambient / music source. matches engine behavior
 * SetPriorityGroup: group id + volume byte.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file AmbientAudioEmitter.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class AmbientAudioEmitter extends EventListener {
  engine: AudioEngine;

  data: ArrayBuffer;
  name: string;

  node: AudioBufferSourceNode;
  gainNode: GainNode;

  destination: AudioNode;
  loaded: boolean = false;
  playing: boolean = false;

  onendedFired: boolean = false;

  /** Base gain 0–1 (ambient scale, script volume, etc.) before priority group volume. */
  volume: number = 1;

  /**
   * prioritygroups.2da row.
   * : ambient=4, area/battle music=2, stingers=1,
   * dialog AmbientTrack=4 (LoadAmbientTrackForDialog).
   */
  priorityGroupId: number = undefined;

  /** Group volume byte 0–127 from prioritygroups.2da. */
  priorityGroupVolume: number = 127;

  /**
   * SetStreamingMusicForMovie.
   * PauseAllButStreamingMusicForMovie skips streams with this set.
   */
  streamingMusicForMovie: boolean = false;

  private priorityVoiceId: number = undefined;

  constructor(engine: AudioEngine){
    super();
    this.engine = engine;
    this.gainNode = this.engine?.audioCtx.createGain();
  }

  /**
   * SetPriorityGroup — store group id and copy volume byte from the priority group.
   */
  setPriorityGroupId(priorityGroupId: number): this {
    this.priorityGroupId = priorityGroupId;
    this.refreshPriorityGroupVolume();
    this.applyEffectiveGain();
    return this;
  }

  refreshPriorityGroupVolume(): void {
    if(this.priorityGroupId == null){
      this.priorityGroupVolume = 127;
      return;
    }
    const group = GameState.SWRuleSet?.getPriorityGroupById?.(this.priorityGroupId);
    this.priorityGroupVolume = Math.max(0, Math.min(127, group?.volume ?? 127));
  }

  /**
   * volume × (groupVolume / 127) × dialog duck — streaming SetVolume compose.
   * Duck (K2) applies when slider type is music (groups 1/2) or group is 4/5.
   * Result is Miles volume_levels / Web Audio GainNode linear amplitude (0–1).
   */
  getEffectiveVolume(): number {
    let gain = this.volume * (this.priorityGroupVolume / 127);
    if(this.shouldApplyMusicAmbientDuck()){
      const duck = this.engine?.musicAmbientDuckScale;
      if(typeof duck === 'number' && duck !== 1){
        gain *= duck;
      }
    }
    return gain;
  }

  /** streaming SetVolume: music slider (groups 1/2) or priority 4/5. */
  shouldApplyMusicAmbientDuck(): boolean {
    const g = this.priorityGroupId;
    return g === 1 || g === 2 || g === 4 || g === 5;
  }

  setVolume(volume: number){
    this.volume = volume;
    this.applyEffectiveGain();
    return this;
  }

  /** Push getEffectiveVolume onto the GainNode (cancels fade automation). */
  applyEffectiveGain(){
    if(!this.gainNode || !this.engine?.audioCtx){ return; }
    const t = this.engine.audioCtx.currentTime;
    const g = this.gainNode.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(Math.max(0, this.getEffectiveVolume()), t);
  }

  /**
   * Set the data for the audio
   * @param data
   */
  setData(data: ArrayBuffer){
    this.data = data;
    return this;
  }

  /**
   * Set the destination for the audio
   * @param destination
   */
  setDestination(destination: AudioNode){
    if(this.gainNode && this.destination && this.destination !== destination){
      try{
        this.gainNode.disconnect(this.destination);
      }catch(_e){ /* already disconnected */ }
    }
    this.destination = destination;
    if(this.gainNode && this.destination){
      this.gainNode.connect(this.destination);
    }
    return this;
  }

  /**
   * Play the audio data
   * @param loop
   * @returns
   */
  async play(loop = false){
    if(!this.data){
      console.warn('AmbientAudioEmitter', 'No data to play');
      return;
    }

    if(!this.destination){
      console.warn('AmbientAudioEmitter', 'No destination to play to');
      return;
    }

    if(this.node || this.playing){
      if(this.node) this.node.onended = undefined;
      this.stop();
    }

    this.refreshPriorityGroupVolume();

    if(this.priorityGroupId != null && this.engine?.priorityManager){
      this.releasePriorityVoice();
      const acquired = this.engine.priorityManager.tryAcquire({
        owner: this,
        groupId: this.priorityGroupId,
        distanceSq: 0,
        is3D: false,
        onStolen: () => {
          // InterruptPlayingSound → hard stop (no fadetime).
          this.stop();
        },
      });
      if(!acquired.allowed){
        return;
      }
      this.priorityVoiceId = acquired.voiceId;
    }

    if(this.gainNode){
      this.gainNode.disconnect();
    }else{
      this.gainNode = this.engine.audioCtx.createGain();
    }

    this.onendedFired = false;
    this.loaded = false;
    // Keep a local source so a concurrent stop/play during decode can't null this.node mid-setup
    const node = this.engine.audioCtx.createBufferSource();
    this.node = node;
    let buffer: AudioBuffer;
    try{
      buffer = await this.engine.audioCtx.decodeAudioData(this.data.slice(0));
    }catch(e){
      if(this.node === node){
        this.node = null;
        this.playing = false;
        this.loaded = false;
        this.releasePriorityVoice();
      }
      console.warn('AmbientAudioEmitter', 'decodeAudioData failed', e);
      return;
    }
    // Superseded or stopped while decoding
    if(this.node !== node){
      try{ node.disconnect(); }catch(e){}
      return;
    }
    node.buffer = buffer;
    node.loop = loop;
    node.start(0, 0);
    node.connect(this.gainNode);
    this.gainNode.connect(this.destination);
    this.applyEffectiveGain();
    this.playing = true;
    this.loaded = true;
    node.onended = () => {
      if(this.node !== node) return;
      this.onendedFired = true;
      this.playing = false;
      this.loaded = false;
      this.node = null;
      this.releasePriorityVoice();
      this.processEventListener('ended');
    };
    this.processEventListener('play');
    return this;
  }

  private releasePriorityVoice(): void {
    if(this.priorityVoiceId == null){ return; }
    this.engine?.priorityManager?.release(this.priorityVoiceId);
    this.priorityVoiceId = undefined;
  }

  /**
   * Stop the audio
   * @param emitEvents - when false, skip stop/ended listeners (used after fade-out)
   */
  stop(emitEvents: boolean = true){
    const wasPlaying = this.playing;
    this.playing = false;
    if(this.node){
      this.node.onended = undefined;
      this.node.disconnect();
      try{ this.node.stop(0); }catch(e){}
      this.node = null;
    }
    if(this.gainNode){
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    this.releasePriorityVoice();
    if(!emitEvents){
      this.onendedFired = true;
      return this;
    }
    if(wasPlaying){
      this.processEventListener('stop');
    }
    if(!this.onendedFired){
      this.onendedFired = true;
      this.processEventListener('ended');
    }
    return this;
  }

  /**
   * Fade out the audio over a specified duration and then stop it
   * @param duration - Duration of the fade out in seconds (default: 1.0)
   */
  fadeOut(duration: number = 1.0){
    if(!this.playing || !this.gainNode){
      return;
    }

    const currentTime = this.engine.audioCtx.currentTime;
    const currentGain = this.gainNode.gain.value;

    this.gainNode.gain.cancelScheduledValues(currentTime);
    this.gainNode.gain.setValueAtTime(currentGain, currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0, currentTime + duration);
    return this;
  }

  /**
   * FadeAndStop — fade then hard-stop.
   * Default 800ms matches PlayBattleMusic / PlayMusic transitions.
   */
  fadeOutAndStop(duration: number = 0.8): Promise<void> {
    if(!this.playing){
      this.stop(false);
      return Promise.resolve();
    }
    if(this.node){
      this.node.onended = undefined;
    }
    this.fadeOut(duration);
    const ms = Math.max(0, duration * 1000) + 32;
    return new Promise((resolve) => {
      setTimeout(() => {
        this.stop(false);
        resolve();
      }, ms);
    });
  }

  /**
   * Fade in the audio over a specified duration
   * @param duration - Duration of the fade in in seconds (default: 1.0)
   */
  fadeIn(duration: number = 1.0){
    if(!this.playing || !this.gainNode){
      return;
    }

    const currentTime = this.engine.audioCtx.currentTime;
    const currentGain = this.gainNode.gain.value;
    const target = this.getEffectiveVolume();

    // Set up the fade in curve
    this.gainNode.gain.cancelScheduledValues(currentTime);
    this.gainNode.gain.setValueAtTime(currentGain, currentTime);
    this.gainNode.gain.linearRampToValueAtTime(target, currentTime + duration);
    return this;
  }

  /**
   * Dispose of the audio
   */
  dispose(){
    this.playing = false;
    this.loaded = false;
    this.data = null;
    this.releasePriorityVoice();
    this.engine?.priorityManager?.releaseAllForOwner(this);
    if(this.node){
      this.node.onended = undefined;
      this.node.disconnect();
      try{ this.node.stop(0); }catch(e){}
      this.node = null;
    }
    if(this.gainNode){
      this.gainNode.disconnect();
      this.gainNode = null;
    }
  }
}
