import { AudioEmitterType } from "../enums/audio/AudioEmitterType";
import { AudioEngineChannel } from "../enums/audio/AudioEngineChannel";
import { AudioEngine } from "./AudioEngine";
import { AudioLoader } from "./AudioLoader";

const GAIN_RAMP_TIME = 0.25;

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

  name: string = '';
  sounds: string[] = [];
  isActive: boolean = true;
  isLooping: boolean = false;
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
  elevation: number = 0;

  currentSound: AudioBufferSourceNode = undefined;
  currentTimeout: NodeJS.Timeout = undefined;
  buffers: Map<string, AudioBuffer> = new Map<string, AudioBuffer>();
  channel: AudioEngineChannel = AudioEngineChannel.SFX;
  type: AudioEmitterType = AudioEmitterType.GLOBAL;

  disabled: boolean = false;

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

    this.gainNode.gain.value = (this.volume + this.getRandomVariation(this.volumeVariation)) / 127;

    switch(this.type){
      case AudioEmitterType.POSITIONAL:
        this.mainNode = this.engine.audioCtx.createPanner();
        this.setPosition( this.position.x, this.position.y, this.position.z + this.elevation );
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

    for(let i = 0; i < this.sounds.length; i++){
      await this.loadSounds(i);
    }
    if(this.isActive){
      this.start();
    }
  }

  setDisabled(disabled: boolean): void {
    if(disabled == this.disabled){
      return;
    }
    return;
    this.disabled = disabled;
    this.gainNode.gain.linearRampToValueAtTime(disabled ? 0 : 1, this.engine.audioCtx.currentTime + GAIN_RAMP_TIME);
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

  ffsounds: AudioBufferSourceNode[] = [];

  async playSoundFireAndForget(resRef = ''): Promise<AudioBufferSourceNode>{
    if(resRef == '****' || !resRef?.length){ return; }
    try{
      const sound: AudioBufferSourceNode = this.engine.audioCtx.createBufferSource();
      (sound as any).name = resRef;
      let buffer: AudioBuffer = (this.buffers.has(resRef)) ? this.buffers.get(resRef) : undefined;
      if(!buffer){
        let data = await AudioLoader.LoadSound(resRef);
        buffer = await this.addSound(resRef, data);
      }

      if(!buffer){
        console.error('AudioEmitter', 'Sound not found', resRef);
        return;
      }

      this.ffsounds.push(sound);

      sound.buffer = buffer;
      sound.connect(this.mainNode);
      sound.start(this.engine.audioCtx.currentTime);

      sound.onended = () => {
        sound.disconnect();
        sound.stop(0);
        this.ffsounds.splice(this.ffsounds.indexOf(sound), 1);
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
    this.disposeCurrentSound();

    //attempt to load from the buffer cache
    if(this.buffers.has(resRef)){
      this.currentSound = this.engine.audioCtx.createBufferSource();
      this.currentSound.buffer = this.buffers.get(resRef);
      (this.currentSound as any).name = resRef;
      this.currentSound.loop = this.isLooping;
      this.currentSound.connect(this.mainNode);
      this.currentSound.start(this.engine.audioCtx.currentTime);
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
    this.disposeCurrentSound();

    //attempt to load from the buffer cache
    if(this.buffers.has(resRef)){
      this.stop();
      this.currentSound = this.engine.audioCtx.createBufferSource();
      this.currentSound.buffer = this.buffers.get(resRef);
      // this.currentSound.buffer.onEnd = onEnd;
      (this.currentSound as any).name = resRef;
      this.currentSound.start(this.engine.audioCtx.currentTime);
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
        this.currentSound.start(this.engine.audioCtx.currentTime);
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
  }

  start(): void {
    if(!this.sounds.length){
      return;
    }
    this.playNextSound();
  }

  getRandomVariation(value: number): number {
    return ( Math.random() * (value * 2) ) - value;
  }

  getNextSoundIndex(): number {
    if(this.isRandom){
      return Math.floor(Math.random() * this.sounds.length);
    }else{
      this.soundIndex++;
      if(this.soundIndex >= this.sounds.length)
        this.soundIndex = 0;
    }
    return this.soundIndex;
  }

  playNextSound(): void {
    if(this.isDestroyed)
      return;
    
    this.disposeCurrentSound();

    if(!this.sounds.length){
      return;
    }

    const resRef = this.sounds[this.soundIndex];
    const delay = (this.interval + this.getRandomVariation(this.intervalVariation))/1000;
    this.currentSound = this.engine.audioCtx.createBufferSource();
    this.currentSound.buffer = this.buffers.get(resRef);
    this.currentSound.loop = (this.sounds.length == 1 && this.isLooping);
    (this.currentSound as any).name = resRef;
    this.currentSound.playbackRate.value = this.playbackRate + this.getRandomVariation(this.playbackRateVariation);
    this.gainNode.gain.value = (this.volume + this.getRandomVariation(this.volumeVariation)) / 127;

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
      this.getNextSoundIndex();
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
    }catch(e){
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

  stop(): void {
    if(this.isDestroyed)
      return;
    
    if(!this.currentSound){
      return;
    }

    this.disposeCurrentSound();
  }

  destroy(): void {
    this.buffers.clear();
    this.isDestroyed = true;
    if(!this.engine){ return; }
    this.engine.removeEmitter(this);
  }

}
