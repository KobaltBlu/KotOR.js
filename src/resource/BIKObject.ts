import * as THREE from "three";
import { AudioEngine } from "../audio/AudioEngine";
import { AudioEngineChannel } from "../enums/audio/AudioEngineChannel";
import { BinkWorkerHeader, WorkerRequest, WorkerResponse } from "../worker/bink-worker";
import { YUVFrame } from "../video/binkvideo";
import { GameFileSystem } from "../utility/GameFileSystem";
import { FadeOverlayManager } from "../managers/FadeOverlayManager";

/**
 * BIKObject class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file BIKObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class BIKObject {
  abs_path: any;
  frames: any[];
  frameIndex: number;
  width: number;
  height: number;
  fps: number;
  yTex: any;
  uTex: any;
  vTex: any;
  min_buffer: number;
  max_buffer: number;
  geometry: THREE.PlaneGeometry;
  material: THREE.RawShaderMaterial;
  videoPlane: THREE.Mesh;
  backPlane: THREE.Mesh;
  backPlaneMaterial: THREE.MeshBasicMaterial;
  audio_array: any[];
  audio_nodes: any[];
  frame_array: any[];
  file: string;
  audioCtx: any;
  onComplete: any;
  decode_complete: boolean;
  demuxer: any;
  video_decoder: any;
  hasAudio: boolean;
  audio_decoder: any;
  audio: { playback_rate: any; channels: any; };
  nextAudioTime: number;
  playbackPosition: number;
  timer: number;
  needsRenderUpdate: boolean;
  isPlaying: boolean;
  nextPacket: any;
  disposed: boolean;

  // Worker-related properties
  worker: Worker | null;
  workerReady: boolean;
  header: BinkWorkerHeader | null;
  currentFrameIndex: number;
  pendingFrames: Map<number, { resolve: Function; reject: Function }>;

  constructor(args: any = {}){

    args = Object.assign({
      abs_path: false
    }, args);

    this.abs_path = args.abs_path;

    this.frames = [];
    this.frameIndex = 0;

    this.width = 640;
    this.height = 480;
    this.fps = 29.97;

    this.yTex = undefined;
    this.uTex = undefined;
    this.vTex = undefined;

    this.min_buffer = 10;
    this.max_buffer = 20;

    this.geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
    this.material = new THREE.RawShaderMaterial({
      vertexShader: `
        precision highp float;
        uniform mat4 modelViewMatrix; // optional
        uniform mat4 projectionMatrix; // optional
        attribute vec3 position;
        attribute vec4 color;
        attribute vec2 uv;
        varying vec2 v_texCoord;
        varying mat3 trans;
        void main()	{
          v_texCoord = vec2(uv.x, 1.0 - uv.y);
          trans = mat3(
            1.0, 1.0, 1.0,
            0.0, -0.34414, 1.772,
            1.402, -0.71414, 0.0
          );
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
      `,
      fragmentShader: `
        precision highp float;

        varying vec2 v_texCoord;
        uniform sampler2D yTex;
        uniform sampler2D uTex;
        uniform sampler2D vTex;

        //https://www.roxlu.com/2014/039/decoding-h264-and-yuv420p-playback

        void main() {
          vec3 R_cf = vec3(1.164383,  0.000000,  1.596027);
          vec3 G_cf = vec3(1.164383, -0.391762, -0.812968);
          vec3 B_cf = vec3(1.164383,  2.017232,  0.000000);
          vec3 offset = vec3(-0.0625, -0.5, -0.5);

          float y = texture2D(yTex, v_texCoord).r;
          float u = texture2D(uTex, v_texCoord).r;
          float v = texture2D(vTex, v_texCoord).r;
          vec3 yuv = vec3(y,u,v);
          yuv += offset;
          vec4 fragcolor = vec4(0.0, 0.0, 0.0, 1.0);
          fragcolor.r = dot(yuv, R_cf);
          fragcolor.g = dot(yuv, G_cf);
          fragcolor.b = dot(yuv, B_cf);
          gl_FragColor = fragcolor;
        }


      `,
      uniforms: {
        yTex: { value: this.yTex },
        uTex: { value: this.uTex },
        vTex: { value: this.vTex },
      }
    });

    // Video plane - rendered in scene_movie with the orthographic camera.
    // renderOrder above FadeOverlayManager so the fade overlay can never cover the video.
    this.videoPlane = new THREE.Mesh(this.geometry, this.material);
    this.videoPlane.position.z = 498; // Just below FadeOverlayManager (499)
    // this.videoPlane.renderOrder = FadeOverlayManager.FADE_RENDER_ORDER + 2; // Above fade, below cursor
    this.videoPlane.visible = false;

    // Black background plane behind the video
    this.backPlaneMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    this.backPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1, 1, 1),
      this.backPlaneMaterial,
    );
    this.backPlane.position.z = 497; // Behind the video plane
    // this.backPlane.renderOrder = FadeOverlayManager.FADE_RENDER_ORDER + 1; // Above fade, below video plane
    this.backPlane.visible = false;

    this.resize();

    this.audio_array = [];
    this.audio_nodes = [];
    this.frame_array = [];

    // Initialize worker properties
    this.worker = null;
    this.workerReady = false;
    this.header = null;
    this.currentFrameIndex = 0;
    this.pendingFrames = new Map();

  }

  resize(width?: number, height?: number){

    if(!width)
      width = window.innerWidth;

    if(!height)
      height = window.innerHeight;

    // Scale video to fit inside the viewport while maintaining aspect ratio (contain).
    // Plane is centered at (0,0); orthographic camera viewport is [-width/2, width/2] x [-height/2, height/2].
    const videoAspect = this.width / this.height;
    const windowAspect = width / height;
    if (videoAspect >= windowAspect) {
      // Video is wider or same as window — fit to width
      this.videoPlane.scale.x = width;
      this.videoPlane.scale.y = width / videoAspect;
    } else {
      // Video is taller than window — fit to height
      this.videoPlane.scale.y = height;
      this.videoPlane.scale.x = height * videoAspect;
    }

    // Back plane covers the full viewport (letterbox/pillarbox visible behind video)
    this.backPlane.scale.x = width;
    this.backPlane.scale.y = height;
  }

  private async loadBikFile(file: string): Promise<ArrayBuffer> {
    const buffer = await GameFileSystem.readFile(`Movies/${file}.bik`);
    return buffer.buffer as ArrayBuffer;
  }

  private initializeWorker(buffer: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      this.worker = new Worker('/bink-worker.js', { type: 'module' });
      this.workerReady = false;
      this.header = null;
      this.currentFrameIndex = 0;
      this.pendingFrames.clear();

      this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        this.handleWorkerMessage(e.data);
      };

      this.worker.onerror = (error) => {
        reject(new Error(`Worker error: ${error.message}`));
      };

      // Send init message
      const initMessage: WorkerRequest = { type: 'init', buffer };
      this.worker.postMessage(initMessage, [buffer]);

      // Wait for ready message
      const checkReady = () => {
        if (this.workerReady && this.header) {
          resolve();
        } else {
          setTimeout(checkReady, 10);
        }
      };
      checkReady();
    });
  }

  private handleWorkerMessage(message: WorkerResponse): void {
    if (this.disposed) return;

    switch (message.type) {
      case 'ready':
        this.workerReady = true;
        this.header = message.header;
        this.width = message.header.width;
        this.height = message.header.height;
        this.fps = message.header.fpsNum / message.header.fpsDen;
        this.resize();
        this.initVideoTexture();
        break;

      case 'frame':
        const pendingFrame = this.pendingFrames.get(message.frameIndex);
        if (pendingFrame) {
          this.pendingFrames.delete(message.frameIndex);
          if (message.video && 'yuv' in message.video) {
            // Handle YUV frame data
            this.updateFrameFromYUV(message.video.yuv);
          }
          if (message.audio) {
            // Handle audio data
            this.handleAudioData(message.audio);
          }
          pendingFrame.resolve(message);
        }
        break;

      case 'error':
        console.error('Bink worker error:', message.message);
        const pendingFrameError = this.pendingFrames.get(this.currentFrameIndex);
        if (pendingFrameError) {
          this.pendingFrames.delete(this.currentFrameIndex);
          pendingFrameError.reject(new Error(message.message));
        }
        break;
    }
  }

  initVideoTexture(){
    // Use same block-aligned sizes as binkvideo decoder to avoid RangeError when copying frame data
    const yStride = this.width;
    const cStride = (this.width + 1) >> 1;
    const yBh = ((this.height + 7) >> 3) << 3;
    const cBh = ((this.height + 15) >> 4) << 3;

    let yBuffer = new Uint8Array(yStride * yBh);
    let uBuffer = new Uint8Array(cStride * cBh);
    let vBuffer = new Uint8Array(cStride * cBh);

    uBuffer.fill(128);
    vBuffer.fill(128);

    if(this.yTex)
      this.yTex.dispose()

    if(this.uTex)
      this.uTex.dispose()

    if(this.vTex)
      this.vTex.dispose()

    this.yTex = new THREE.DataTexture(yBuffer, yStride, yBh, THREE.LuminanceFormat, THREE.UnsignedByteType, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.LinearFilter, THREE.LinearFilter);
    this.uTex = new THREE.DataTexture(uBuffer, cStride, cBh, THREE.LuminanceFormat, THREE.UnsignedByteType, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.LinearFilter, THREE.LinearFilter);
    this.vTex = new THREE.DataTexture(vBuffer, cStride, cBh, THREE.LuminanceFormat, THREE.UnsignedByteType, THREE.UVMapping, THREE.ClampToEdgeWrapping, THREE.ClampToEdgeWrapping, THREE.LinearFilter, THREE.LinearFilter);

    // Only update material uniforms if material exists (not disposed)
    if (this.material && this.material.uniforms) {
      this.material.uniforms.yTex.value = this.yTex;
      this.material.uniforms.uTex.value = this.uTex;
      this.material.uniforms.vTex.value = this.vTex;

      this.yTex.needsUpdate = true;
      this.uTex.needsUpdate = true;
      this.vTex.needsUpdate = true;

      this.material.uniformsNeedUpdate = true;
    }
  }

  async play(file: string = '', onComplete?: Function) {
    if (!file || this.disposed) return;

    this.file = file;
    this.stop();
    this.onComplete = onComplete;

    AudioEngine.Mute(AudioEngineChannel.ALL);
    AudioEngine.Unmute(AudioEngineChannel.MOVIE);

    try {
      // Load BIK file
      const buffer = await this.loadBikFile(file);

      // Initialize worker
      await this.initializeWorker(buffer);

      // Set up audio context
      this.audioCtx = AudioEngine.GetAudioEngine().audioCtx;

      // Initialize playback state
      this.audio_array = [];
      this.audio_nodes = [];
      this.frame_array = [];

      this.nextAudioTime = 0;
      this.playbackPosition = 0;
      this.timer = 0;
      this.needsRenderUpdate = false;
      this.currentFrameIndex = 0;

      // Show the video and background planes
      this.videoPlane.visible = true;
      this.backPlane.visible = true;

      this.isPlaying = true;

      // Start playback loop
      this.decode();

    } catch (error) {
      console.error('Failed to play BIK file:', error);
      if (this.onComplete) {
        this.onComplete();
      }
    }
  }

  stop(){
    AudioEngine.Unmute(AudioEngineChannel.ALL);
    AudioEngine.Mute(AudioEngineChannel.MOVIE);

    this.isPlaying = false;
    this.timer = 0;

    // Hide the video and background planes
    this.videoPlane.visible = false;
    this.backPlane.visible = false;

    // Stop worker
    if (this.worker) {
      this.worker.postMessage({ type: 'stop' } as WorkerRequest);
      this.worker.terminate();
      this.worker = null;
    }

    this.workerReady = false;
    this.header = null;
    this.currentFrameIndex = 0;
    this.pendingFrames.clear();

    //clean up audio nodes
    while(this.audio_nodes.length){
      let node = this.audio_nodes.shift();
      node.disconnect();
      node.buffer = undefined;
      node = undefined;
    }

    if(typeof this.onComplete === 'function')
      this.onComplete();

    this.onComplete = undefined;
  }

  async seek(time = 0){
    this.stop();
    await this.demuxer.seek({ time: time });
    this.audio_array = [];
    this.audio_nodes = [];
    this.frame_array = [];
    await this.fetchNextPackets();
    this.decode();
  }

  updateFrame(frame: any){
    if(!frame) return;
    let ySize = frame.linesize[0] * this.height;
    let uSize = frame.linesize[1] * this.height/2;
    let vSize = frame.linesize[2] * this.height/2;

    this.yTex.image.data = new Uint8Array(frame.data[0]);
    this.uTex.image.data = new Uint8Array(frame.data[1]);
    this.vTex.image.data = new Uint8Array(frame.data[2]);

    this.yTex.image.width = frame.linesize[0];
    this.uTex.image.width = frame.linesize[1];
    this.vTex.image.width = frame.linesize[2];

    this.yTex.needsUpdate = true;
    this.uTex.needsUpdate = true;
    this.vTex.needsUpdate = true;

    if (this.material) {
      this.material.uniformsNeedUpdate = true;
    }
  }

  private updateFrameFromYUV(yuv: YUVFrame): void {
    // Use same block-aligned heights as initVideoTexture / decoder so buffer size matches
    const yBh = ((this.height + 7) >> 3) << 3;
    const cBh = ((this.height + 15) >> 4) << 3;

    // Update Y texture
    this.yTex.image.data.set(yuv.y);
    this.yTex.image.width = yuv.linesizeY;
    this.yTex.image.height = yBh;

    // Update U texture
    this.uTex.image.data.set(yuv.u);
    this.uTex.image.width = yuv.linesizeU;
    this.uTex.image.height = cBh;

    // Update V texture
    this.vTex.image.data.set(yuv.v);
    this.vTex.image.width = yuv.linesizeV;
    this.vTex.image.height = cBh;

    this.yTex.needsUpdate = true;
    this.uTex.needsUpdate = true;
    this.vTex.needsUpdate = true;

    if (this.material) {
      this.material.uniformsNeedUpdate = true;
    }
  }

  private handleAudioData(audio: { pcm: ArrayBuffer[]; sampleRate: number; channels: number; frameLen: number; overlapLen: number; isFirst: boolean }): void {
    if (audio.pcm.length === 0) return;

    // Create audio buffer from PCM data
    const audioCtx = AudioEngine.GetAudioEngine().audioCtx;
    const buffer = audioCtx.createBuffer(audio.channels, audio.frameLen, audio.sampleRate);

    // Copy channel data
    for (let channel = 0; channel < audio.channels; channel++) {
      const pcmData = new Float32Array(audio.pcm[channel]);
      buffer.copyToChannel(pcmData, channel, 0);
    }

    this.audio_array.push(buffer);
  }

  private async decodeFrame(frameIndex: number): Promise<void> {
    if (!this.worker || !this.workerReady) {
      throw new Error('Worker not initialized');
    }

    return new Promise((resolve, reject) => {
      this.pendingFrames.set(frameIndex, { resolve, reject });

      const decodeMessage: WorkerRequest = {
        type: 'decode',
        frameIndex,
        outputFormat: 'yuv' // Use YUV format to maintain compatibility with existing texture setup
      };

      this.worker!.postMessage(decodeMessage);
    });
  }

  async getAllPackets(){
    while(!this.decode_complete){
      await this.decodeNextPacket();
    }
  }

  async decodeNextPacket(){

    if(this.decode_complete)
      return;

    this.nextPacket = await this.demuxer.read(); // Read next frame. Note: returns null for EOF
    if (this.nextPacket && this.nextPacket.stream_index == 0) {
      //VIDEO_FRAME
      const frames = await this.video_decoder.decode(this.nextPacket);
      if(frames.frames.length){
        for(let i = 0, len = frames.frames.length; i < len; i++){
          this.frame_array.push(frames.frames[i]);
        }
      }
    }else if (this.nextPacket && this.nextPacket.stream_index == 1) {
      //AUDIO
      const frames = await this.audio_decoder.decode(this.nextPacket);
      if(frames.frames.length){
        const frameLength = frames.frames[0].data[0].length/4;
        const buffer = this.audioCtx.createBuffer(this.audio.channels, frames.frames.length * frameLength, this.audio.playback_rate);

        for(let i = 0, len = frames.frames.length; i < len; i++){
          for(let channel = 0; channel < this.audio.channels; channel++){
            buffer.copyToChannel(
              this.toFloat32Array(frames.frames[i].data[channel]),
              channel,
              i * frameLength
            );
          }
        }

        this.audio_array.push(buffer);
      }
    }else{
      console.log('nextPacket', this.nextPacket);
      this.decode_complete = true;
    }
  }

  async fetchNextPackets(){
    if(this.frame_array.length < this.min_buffer){
      let count = this.max_buffer - this.frame_array.length;
      for(let i = 0; i < count; i++){
        await this.decodeNextPacket();
        if(this.demuxer.streams.length == 2)
          await this.decodeNextPacket();
      }
    }
  }

  async update(delta = 0){
    if (this.disposed) return;

    this.playbackPosition += delta;
    const frameTimer = (this.fps/1000);

    AudioEngine.Mute(AudioEngineChannel.ALL);
    AudioEngine.Unmute(AudioEngineChannel.MOVIE);

    //Process audio buffer queue
    this.processAudioQueue();

    if( this.timer >= frameTimer){
      this.timer = 0;
      await this.decode();
    }else{
      this.needsRenderUpdate = false;
    }
    this.timer += delta;
  }

  processAudioQueue(){
    //Process audio buffer queue
    if(this.audio_array.length){

      let buffered = this.audio_array.shift();

      while(this.audio_array.length){
        const nextBuffer = this.audio_array.shift();
        buffered = this.appendBuffer(buffered, nextBuffer);
      }

      const bufferedNode = this.audioCtx.createBufferSource();
      bufferedNode.buffer = buffered;
      bufferedNode.loop = false;
      bufferedNode.connect( AudioEngine.movieChannel.getGainNode() );
      bufferedNode.onended = function(){
        bufferedNode.buffer = undefined;
        bufferedNode.disconnect();
      };

      const current_time = this.audioCtx.currentTime;
      if(!this.nextAudioTime)
        this.nextAudioTime = current_time;

      bufferedNode.start( this.nextAudioTime, 0 );
      this.nextAudioTime = this.nextAudioTime + bufferedNode.buffer.duration;
    }
  }

  //https://stackoverflow.com/questions/14143652/web-audio-api-append-concatenate-different-audiobuffers-and-play-them-as-one-son
  appendBuffer(buffer1: any, buffer2: any) {
    const numberOfChannels = Math.min( buffer1.numberOfChannels, buffer2.numberOfChannels );
    const tmp = this.audioCtx.createBuffer( numberOfChannels, (buffer1.length + buffer2.length), buffer1.sampleRate );
    for (let i=0; i<numberOfChannels; i++) {
      const channel = tmp.getChannelData(i);
      channel.set( buffer1.getChannelData(i), 0);
      channel.set( buffer2.getChannelData(i), buffer1.length);
    }
    return tmp;
  }

  async decode(){
    if (this.disposed) return;

    this.isPlaying = true;

    try {
      // Decode current frame
      if (this.currentFrameIndex < (this.header?.frameCount || 0)) {
        await this.decodeFrame(this.currentFrameIndex);
        this.currentFrameIndex++;
        this.needsRenderUpdate = true;
      } else {
        // End of video
        this.stop();
      }
    } catch (error) {
      console.error('Error decoding frame:', error);
      this.stop();
    }
  }

  toFloat32Array(channel: Uint8Array){
    if(channel instanceof Uint8Array){
      let i, l = channel.length/4;
      const buffer = new Buffer(channel);
      const float32 = new Float32Array(l);

      for(i = 0; i < l; i++){
        float32[i] = buffer.readFloatLE(i*4);
      }
      return float32;
    }
    throw 'toFloat32Array missing Uint8Array';
  }


  dispose(){

    this.disposed = true;

    // Stop and clean up worker
    if (this.worker) {
      this.worker.postMessage({ type: 'stop' } as WorkerRequest);
      this.worker.terminate();
      this.worker = null;
    }

    this.workerReady = false;
    this.header = null;
    this.currentFrameIndex = 0;
    this.pendingFrames.clear();

    // Remove planes from their parent scene (scene_movie)
    if (this.videoPlane.parent) {
      this.videoPlane.parent.remove(this.videoPlane);
    }
    if (this.backPlane.parent) {
      this.backPlane.parent.remove(this.backPlane);
    }

    this.geometry.dispose();
    this.material.dispose();
    this.backPlaneMaterial.dispose();

    if (this.yTex) this.yTex.dispose();
    if (this.uTex) this.uTex.dispose();
    if (this.vTex) this.vTex.dispose();

    this.geometry = undefined;
    this.material = undefined;
    this.yTex = undefined;
    this.uTex = undefined;
    this.vTex = undefined;

    //clean up audio nodes
    while(this.audio_nodes.length){
      let node = this.audio_nodes.shift();
      node.disconnect();
      node.buffer = undefined;
      node = undefined;
    }

    this.audio_array = [];
    this.frame_array = [];

  }

}