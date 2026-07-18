import type { AudioEngine } from "@/audio/AudioEngine";
import { EventListener } from "@/utility/EventListener";

/**
 * AmbientAudioEmitter class.
 * 
 * The AmbientAudioEmitter class is used to play ambient audio in the game.
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

  volume: number = 1;

  constructor(engine: AudioEngine){
    super();
    this.engine = engine;
    this.gainNode = this.engine?.audioCtx.createGain();
  }

  setVolume(volume: number){
    this.volume = volume;
    if(this.gainNode){
      this.gainNode.gain.value = this.volume;
    }
    return this;
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
    this.destination = destination;
    this.gainNode.connect(this.destination);
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

    if(this.gainNode){
      this.gainNode.disconnect();
    }else{
      this.gainNode = this.engine.audioCtx.createGain();
    }

    this.onendedFired = false;
    this.loaded = false;
    // Keep a local source so a concurrent stop()/play() during decode can't null this.node mid-setup
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
    this.gainNode.gain.value = this.volume;
    this.playing = true;
    this.loaded = true;
    node.onended = () => {
      if(this.node !== node) return;
      this.onendedFired = true;
      this.playing = false;
      this.loaded = false;
      this.node = null;
      this.processEventListener('ended');
    };
    this.processEventListener('play');
    return this;
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
    
    // Set up the fade out curve
    this.gainNode.gain.cancelScheduledValues(currentTime);
    this.gainNode.gain.setValueAtTime(currentGain, currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0, currentTime + duration);
    return this;
  }

  /**
   * Retail CExoStreamingSoundSource::FadeAndStop — fade then hard-stop.
   * Default 800ms matches PlayBattleMusic / PlayMusic transitions @ 0068e610 / 0068e1f0.
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
    
    // Set up the fade in curve
    this.gainNode.gain.setValueAtTime(currentGain, currentTime);
    this.gainNode.gain.linearRampToValueAtTime(this.volume, currentTime + duration);
    return this;
  }

  /**
   * Dispose of the audio
   */
  dispose(){
    this.playing = false;
    this.loaded = false;
    this.data = null;
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