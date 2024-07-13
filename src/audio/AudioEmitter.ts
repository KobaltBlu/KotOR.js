import { AudioEmitterType } from "../enums/audio/AudioEmitterType";
import { AudioEngineChannel } from "../enums/audio/AudioEngineChannel";
import { AudioEngine } from "./AudioEngine";
import { AudioLoader } from "./AudioLoader";

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

  sounds: string[] = [];
  isActive: boolean = true;
  isLooping: boolean = false;
  isRandom: boolean = false;
  isRandomPosition: boolean = false;
  interval: number = 0;
  intervalVariation: number = 0;
  maxDistance: number = 1;
  volume: number = 127;
  soundIndex: number = 0;

  currentSound: AudioBufferSourceNode = undefined;
  currentTimeout: NodeJS.Timeout = undefined;
  buffers: Map<string, AudioBuffer> = new Map<string, AudioBuffer>();
  channel: AudioEngineChannel = AudioEngineChannel.SFX;
  type: AudioEmitterType = AudioEmitterType.GLOBAL;

  constructor (audioEngine: AudioEngine, channel: AudioEngineChannel = AudioEngineChannel.SFX) {
    this.isDestroyed = false;

    this.engine = audioEngine;
    this.channel = channel;

    this.position = {x: 0, y: 0, z: 0};
    this.currentTimeout = undefined;
    this.gainNode = this.engine.audioCtx.createGain();
    this.pannerNode = this.engine.audioCtx.createPanner();
  }

  async load(): Promise<void> {
    for(let i = 0; i < this.sounds.length; i++){
      await this.loadSounds(i);
    }

    if(this.isActive){
      this.start();
    }

    // this.gainNode.gain.value = (Math.PI/2) * ( ( ( this.volume * 100 ) / 127 ) * 0.01 );

    this.gainNode.gain.value = this.volume / 127;

    switch(this.type){
      case AudioEmitterType.POSITIONAL:
        this.mainNode = this.engine.audioCtx.createPanner();
        this.setPosition( this.position.x, this.position.y, this.position.z );
        (this.mainNode as PannerNode).maxDistance = this.maxDistance;
        this.mainNode.connect(this.gainNode);
      break;
      case AudioEmitterType.GLOBAL:
        this.mainNode = this.gainNode;
      break;
    }

    this.setChannel(this.channel);

    if(this.engine){
      this.engine.addEmitter(this);
    }
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
        this.gainNode.connect(this.engine.voGain);
      break;
      default:
        this.gainNode.connect(this.engine.sfxGain);
      break;
    }
  }

  async playSound(resRef = ''): Promise<AudioBufferSourceNode>{
    if(resRef == '****' || !resRef?.length){ return; }
    if(!!this.currentSound){
      try{
        this.currentSound.disconnect();
        this.currentSound.stop(0);
        this.currentSound = null;
      }catch(e: any) { console.error('Failed to disconnect sound', e); this.currentSound = null; }
    }

    //attempt to load from the buffer cache
    if(this.buffers.has(resRef)){
      this.currentSound = this.engine.audioCtx.createBufferSource();
      this.currentSound.buffer = this.buffers.get(resRef);
      (this.currentSound as any).name = resRef;
      this.currentSound.connect(this.mainNode);
      this.currentSound.start(0, 0);
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
        this.currentSound.connect(this.mainNode);
        this.currentSound.start(0, 0);
        return this.currentSound;
      }catch(e){
        console.log('AudioEmitter', 'Sound not added to emitter', resRef);
        console.error(e);
      }
    }catch(e){
      console.log('AudioEmitter', 'Sound not found', resRef);
    }
  }

  async playStreamWave(resRef =''): Promise<AudioBufferSourceNode> {
    if(this.currentSound != null){
      try{
        this.currentSound.disconnect();
        this.currentSound.stop(0);
        this.currentSound = null;
      }catch(e: any) { console.error('Failed to disconnect sound', e); this.currentSound = null; }
    }

    //attempt to load from the buffer cache
    if(this.buffers.has(resRef)){
      this.stop();
      this.currentSound = this.engine.audioCtx.createBufferSource();
      this.currentSound.buffer = this.buffers.get(resRef);
      // this.currentSound.buffer.onEnd = onEnd;
      (this.currentSound as any).name = resRef;
      this.currentSound.start(0, 0);
      this.currentSound.connect(this.mainNode);
      return this.currentSound;
    }
    
    //load from disk
    try{
      const data = await AudioLoader.LoadStreamWave(resRef);
      try{
        const buffer = await this.addSound(resRef, data);
        this.stop();
        this.currentSound = this.engine.audioCtx.createBufferSource();
        this.currentSound.buffer = buffer;
        // this.currentSound.buffer.onEnd = onEnd;
        (this.currentSound as any).name = resRef;
        this.currentSound.start(0, 0);
        this.currentSound.connect(this.mainNode);

        return this.currentSound;
      }catch(e: any){
        console.log('AudioEmitter', 'Sound not added to emitter', resRef);
        throw e;
      }
    }catch(e){
      console.log('AudioEmitter', 'Failed to locate StreamWave', resRef);
      throw e;
    }
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
      this.position.z = z;

      if(this.mainNode instanceof PannerNode){
        this.mainNode.positionX.value = x;
        this.mainNode.positionY.value = y;
        this.mainNode.positionZ.value = z;
      }
    }
  }

  start(): void {
    if(this.sounds.length)
      this.playNextSound();
  }

  playNextSound(): void {
    if(this.isDestroyed)
      return;
    
    if(!!this.currentSound){
      try{
        this.currentSound.disconnect();
        this.currentSound.stop(0);
        this.currentSound = null;
      }catch(e: any) { 
        console.error('Failed to disconnect sound', e); 
        this.currentSound = null; 
      }
    }

    const resRef = this.sounds[this.soundIndex];
    const delay = ( Math.floor( Math.random() * this.interval ) + this.intervalVariation );
    this.currentSound = this.engine.audioCtx.createBufferSource();
    this.currentSound.buffer = this.buffers.get(resRef);
    this.currentSound.loop = (this.sounds.length == 1 && this.isLooping);
    (this.currentSound as any).name = this.soundIndex;
    this.currentSound.start(0, 0);
    this.currentSound.connect(this.mainNode);

    this.currentSound.onended = () => {
      if(!this.currentSound.loop){
        this.currentTimeout = global.setTimeout( () => {
          if(this.isRandom){
            this.soundIndex = Math.floor(Math.random() * this.sounds.length);
          }else{
            this.soundIndex++;
            if(this.soundIndex >= this.sounds.length)
              this.soundIndex = 0;
          }
          if(this.isActive)
            this.playNextSound();
        }, delay );
      }
    };
  }

  async addSound(resRef: string, data: ArrayBuffer): Promise<AudioBuffer> {
    if(!data){
      console.error('AudioEmitter.addSound: No audio data present');
      throw new Error('No audio data present');
    }
    
    try{
      const buffer = await this.engine.audioCtx.decodeAudioData( data );
      this.buffers.set(resRef, buffer);
      return buffer;
    }catch(e){
      console.error('AudioEmitter.addSound: Failed to decodeAudioData');
      console.error(e);
      throw e;
    }
  }

  stop(): void {
    if(this.isDestroyed)
      return;
    
    if(!this.currentSound){
      return;
    }

    try{
      this.currentSound.disconnect();
      this.currentSound.stop(0);
      this.currentSound = null;
    }catch(e: any) { console.error('Failed to disconnect sound', e); this.currentSound = null; }
  }

  destroy(): void {
    this.isDestroyed = true;
  }

}
