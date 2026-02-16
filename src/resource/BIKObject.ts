import { AudioEngine } from "../audio/AudioEngine";
import { AudioEngineChannel } from "../enums/audio/AudioEngineChannel";
import { BinkWorkerHeader, WorkerRequest, WorkerResponse } from "../worker/bink-worker";
import { YUVFrame } from "../video/binkvideo";
import { GameFileSystem } from "../utility/GameFileSystem";

/**
 * BIKObject class.
 * Decodes and streams BIK video/audio. Does not own any Three.js state;
 * VideoManager owns planes and textures and pulls current frame via getCurrentFrame().
 *
 * @file BIKObject.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class BIKObject {
  abs_path: any;
  frames: YUVFrame[];
  frameIndex: number;
  width: number;
  height: number;
  fps: number;
  frame_array: YUVFrame[];
  file: string;
  audioCtx: AudioContext;
  onComplete: Function;
  /** Called when BIK header is ready (width, height known); VideoManager uses this to init textures. */
  onReady: ((width: number, height: number) => void) | undefined;
  decode_complete: boolean;
  hasAudio: boolean;
  audio: { playback_rate: any; channels: any; };
  audio_array: AudioBuffer[];
  audio_nodes: AudioBufferSourceNode[];
  nextAudioTime: number;
  playbackPosition: number;
  timer: number;
  needsRenderUpdate: boolean;
  isPlaying: boolean;
  disposed: boolean;

  worker: Worker | null;
  workerReady: boolean;
  header: BinkWorkerHeader | null;
  frameBuffer: Map<number, YUVFrame>;
  nextFrameToRequest: number;
  decodeInFlight: number;
  lastDisplayedFrameIndex: number;
  /** Last YUV frame we decided to display; VideoManager reads this in update(). */
  lastDisplayedYuv: YUVFrame | null;

  private static readonly FRAME_BUFFER_MAX = 8;
  private static readonly MAX_DECODE_IN_FLIGHT = 4;

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
    this.audio_array = [];
    this.audio_nodes = [];
    this.frame_array = [];
    this.worker = null;
    this.workerReady = false;
    this.header = null;
    this.frameBuffer = new Map();
    this.nextFrameToRequest = 0;
    this.decodeInFlight = 0;
    this.lastDisplayedFrameIndex = -1;
    this.lastDisplayedYuv = null;
  }

  /** Returns the last displayed YUV frame for VideoManager to upload to textures. */
  getCurrentFrame(): YUVFrame | null {
    return this.lastDisplayedYuv;
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
      this.frameBuffer.clear();
      this.nextFrameToRequest = 0;
      this.decodeInFlight = 0;
      this.lastDisplayedFrameIndex = -1;

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
        this.onReady?.(this.width, this.height);
        break;

      case 'frame':
        this.decodeInFlight = Math.max(0, this.decodeInFlight - 1);

        if (message.video && 'yuv' in message.video) {
          this.pushFrameToBuffer(message.frameIndex, message.video.yuv);
        }
        if (message.audio) {
          this.handleAudioData(message.audio);
        }
        break;

      case 'error':
        console.error('Bink worker error:', message.message);
        this.decodeInFlight = Math.max(0, this.decodeInFlight - 1);
        break;
    }
  }

  /**
   * Add a decoded frame to the buffer. Prunes frames we've already displayed
   * and enforces a max buffer size.
   */
  private pushFrameToBuffer(frameIndex: number, yuv: YUVFrame): void {
    const frameCount = this.header?.frameCount ?? 0;
    if (frameIndex < 0 || frameIndex >= frameCount) return;

    this.frameBuffer.set(frameIndex, yuv);

    // Prune: drop frames we've already displayed
    for (const idx of this.frameBuffer.keys()) {
      if (idx < this.lastDisplayedFrameIndex) this.frameBuffer.delete(idx);
    }
    // Cap size: only drop frames we've already displayed (never drop frame we haven't shown yet)
    while (this.frameBuffer.size > BIKObject.FRAME_BUFFER_MAX) {
      const candidates = [...this.frameBuffer.keys()].filter(idx => idx < this.lastDisplayedFrameIndex);
      if (candidates.length === 0) break;
      const oldest = Math.min(...candidates);
      this.frameBuffer.delete(oldest);
    }
  }

  async play(file: string = '', onComplete?: Function, onReady?: (width: number, height: number) => void) {
    if (!file || this.disposed) return;

    this.file = file;
    this.onReady = onReady;
    this.stop();
    this.onComplete = onComplete;

    AudioEngine.Mute(AudioEngineChannel.ALL);
    AudioEngine.Unmute(AudioEngineChannel.MOVIE);

    try {
      const buffer = await this.loadBikFile(file);
      await this.initializeWorker(buffer);

      this.audioCtx = AudioEngine.GetAudioEngine().audioCtx;
      this.audio_array = [];
      this.audio_nodes = [];
      this.frame_array = [];
      this.nextAudioTime = 0;
      this.playbackPosition = 0;
      this.frameBuffer.clear();
      this.nextFrameToRequest = 0;
      this.decodeInFlight = 0;
      this.lastDisplayedFrameIndex = -1;
      this.lastDisplayedYuv = null;

      this.isPlaying = true;

      // Kick off initial decode requests so frames are buffered before first update()
      const frameCount = this.header?.frameCount ?? 0;
      for (let i = 0; i < Math.min(BIKObject.MAX_DECODE_IN_FLIGHT, frameCount); i++) {
        this.requestDecode(this.nextFrameToRequest);
        this.nextFrameToRequest++;
      }

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

    // Stop worker
    if (this.worker) {
      this.worker.postMessage({ type: 'stop' } as WorkerRequest);
      this.worker.terminate();
      this.worker = null;
    }

    this.workerReady = false;
    this.header = null;
    this.frameBuffer.clear();
    this.nextFrameToRequest = 0;
    this.decodeInFlight = 0;

    // Stop and disconnect all scheduled/playing audio nodes so skip/stop mutes immediately
    while (this.audio_nodes.length) {
      const node = this.audio_nodes.shift()!;
      try { node.stop(0); } catch (_) { /* already stopped */ }
      node.disconnect();
      node.buffer = undefined;
    }
    this.audio_array = [];
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

  /**
   * Request a single frame from the worker. Fire-and-forget; the frame
   * will appear in frameBuffer when the worker replies.
   */
  private requestDecode(frameIndex: number): void {
    if (!this.worker || !this.workerReady || !this.header) return;
    if (frameIndex < 0 || frameIndex >= this.header.frameCount) return;

    this.decodeInFlight++;
    this.worker.postMessage({
      type: 'decode',
      frameIndex,
      outputFormat: 'yuv',
    } as WorkerRequest);
  }

  update(delta = 0): void {
    if (this.disposed) return;

    this.playbackPosition += delta;
    const frameCount = this.header?.frameCount ?? 0;
    const fps = this.fps;

    AudioEngine.Mute(AudioEngineChannel.ALL);
    AudioEngine.Unmute(AudioEngineChannel.MOVIE);

    this.processAudioQueue();

    if (frameCount === 0) return;

    // Which frame we should be showing based on playback time
    const displayFrameIndex = Math.min(
      Math.floor(this.playbackPosition * fps),
      frameCount - 1
    );

    // Display frame from buffer: use exact index if available, else latest we have that's <= displayFrameIndex
    let yuv = this.frameBuffer.get(displayFrameIndex);
    if (!yuv && this.frameBuffer.size > 0) {
      const indices = [...this.frameBuffer.keys()].filter(i => i <= displayFrameIndex);
      if (indices.length > 0) {
        const best = Math.max(...indices);
        yuv = this.frameBuffer.get(best)!;
        this.lastDisplayedFrameIndex = best;
      }
    } else if (yuv) {
      this.lastDisplayedFrameIndex = displayFrameIndex;
    }
    if (yuv) {
      this.lastDisplayedYuv = yuv;
      // Prune frames we've passed
      for (const idx of this.frameBuffer.keys()) {
        if (idx < this.lastDisplayedFrameIndex) this.frameBuffer.delete(idx);
      }
    }

    // End of video: we've passed the last frame
    if (this.playbackPosition * fps >= frameCount) {
      this.stop();
      if (this.onComplete) {
        this.onComplete();
        this.onComplete = undefined;
      }
      return;
    }

    // Keep buffer fed: request more frames up to the limit
    while (
      this.decodeInFlight < BIKObject.MAX_DECODE_IN_FLIGHT &&
      this.nextFrameToRequest < frameCount
    ) {
      this.requestDecode(this.nextFrameToRequest);
      this.nextFrameToRequest++;
    }
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
      bufferedNode.onended = () => {
        bufferedNode.buffer = undefined;
        bufferedNode.disconnect();
        const i = this.audio_nodes.indexOf(bufferedNode);
        if (i >= 0) this.audio_nodes.splice(i, 1);
      };

      const current_time = this.audioCtx.currentTime;
      if (!this.nextAudioTime)
        this.nextAudioTime = current_time;

      bufferedNode.start( this.nextAudioTime, 0 );
      this.nextAudioTime = this.nextAudioTime + bufferedNode.buffer.duration;
      this.audio_nodes.push(bufferedNode);
    }
  }

  //https://stackoverflow.com/questions/14143652/web-audio-api-append-concatenate-different-audiobuffers-and-play-them-as-one-son
  appendBuffer(buffer1: AudioBuffer, buffer2: AudioBuffer) {
    const numberOfChannels = Math.min( buffer1.numberOfChannels, buffer2.numberOfChannels );
    const tmp = this.audioCtx.createBuffer( numberOfChannels, (buffer1.length + buffer2.length), buffer1.sampleRate );
    for (let i=0; i < numberOfChannels; i++) {
      const channel = tmp.getChannelData(i);
      channel.set( buffer1.getChannelData(i), 0);
      channel.set( buffer2.getChannelData(i), buffer1.length);
    }
    return tmp;
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
    this.frameBuffer.clear();
    this.nextFrameToRequest = 0;
    this.decodeInFlight = 0;

    // Planes and textures are owned by VideoManager; it removes them on cleanup.

    // Stop and disconnect all scheduled/playing audio nodes
    while (this.audio_nodes.length) {
      const node = this.audio_nodes.shift()!;
      try { node.stop(0); } catch (_) { /* already stopped */ }
      node.disconnect();
      node.buffer = undefined;
    }
    this.audio_array = [];
    this.frame_array = [];

  }

}