import type { AudioEngine } from "./AudioEngine";
import { EventListener } from "../utility/EventListener";

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
      this.node.onended = undefined;
      this.stop();
    }

    if(this.gainNode){
      this.gainNode.disconnect();
    }else{
      this.gainNode = this.engine.audioCtx.createGain();
    }

    this.onendedFired = false;
    this.loaded = false;
    this.node = this.engine.audioCtx.createBufferSource();
    this.node.buffer = await this.engine.audioCtx.decodeAudioData(this.data.slice(0));
    this.node.loop = loop;
    this.node.start(0, 0);
    this.node.connect(this.gainNode);
    this.gainNode.connect(this.destination);
    this.gainNode.gain.value = this.volume;
    this.playing = true;
    this.loaded = true;
    this.node.onended = () => {
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
   */
  stop(){
    const wasPlaying = this.playing;
    this.playing = false;
    if(this.node){
      this.node.disconnect();
      try{ this.node.stop(0); }catch(e){}
      this.node = null;
    }
    if(this.gainNode){
      this.gainNode.disconnect();
      this.gainNode = null;
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
    this.gainNode.gain.setValueAtTime(currentGain, currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0, currentTime + duration);
    return this;
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