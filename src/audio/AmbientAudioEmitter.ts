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

  destination: AudioNode;
  loaded: boolean = false;
  playing: boolean = false;

  onendedFired: boolean = false;

  constructor(engine: AudioEngine){
    super();
    this.engine = engine;
  }

  /**
   * Set the data for the audio
   * @param data 
   */
  setData(data: ArrayBuffer){
    this.data = data;
  }

  /**
   * Set the destination for the audio
   * @param destination 
   */
  setDestination(destination: AudioNode){
    this.destination = destination;
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

    this.onendedFired = false;
    this.loaded = false;
    this.node = this.engine.audioCtx.createBufferSource();
    this.node.buffer = await this.engine.audioCtx.decodeAudioData(this.data.slice(0));
    this.node.loop = loop;
    this.node.start(0, 0);
    this.node.connect(this.destination);
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
    if(wasPlaying){
      this.processEventListener('stop');
    }
    if(!this.onendedFired){
      this.onendedFired = true;
      this.processEventListener('ended');
    }
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
      this.stop();
    }
  }
}