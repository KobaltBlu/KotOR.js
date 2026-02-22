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
  file: string;
  width: number;
  height: number;
  fps: number;
  audioCtx: AudioContext;
  onComplete: Function;
  /** Called when BIK header is ready (width, height known); VideoManager uses this to init textures. */
  onReady: ((width: number, height: number) => void) | undefined;
  hasAudio: boolean = true;
  audio_nodes: AudioBufferSourceNode[] = [];
  /** Stream time 0 in audio context time; set from first buffer PTS so video and audio share the same clock. */
  audioStartTime: number = 0;
  playbackPosition: number = 0;
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

  /**
   * Creates a BIKObject. Initializes frame/audio state and worker-related fields; actual worker is created in play().
   */
  constructor(){

    this.width = 640;
    this.height = 480;
    this.fps = 29.97;
    this.audio_nodes = [];
    this.audioStartTime = 0;
    this.worker = null;
    this.workerReady = false;
    this.header = null;
    this.frameBuffer = new Map();
    this.nextFrameToRequest = 0;
    this.decodeInFlight = 0;
    this.lastDisplayedFrameIndex = -1;
    this.lastDisplayedYuv = null;
  }

  /**
   * Returns the last displayed YUV frame for VideoManager to upload to textures.
   * Called each frame by VideoManager; may be null if no frame is ready yet.
   */
  getCurrentFrame(): YUVFrame | null {
    return this.lastDisplayedYuv;
  }

  /**
   * Loads a BIK file from the game filesystem (Movies/{file}.bik) and returns its ArrayBuffer.
   * @param file - Resource name without extension (e.g. "logo" for logo.bik).
   */
  private async loadBikFile(file: string): Promise<ArrayBuffer> {
    const buffer = await GameFileSystem.readFile(`Movies/${file}.bik`);
    return buffer.buffer as ArrayBuffer;
  }

  /**
   * Spawns the Bink worker, transfers the file buffer, and waits for a 'ready' response with header.
   * Sets up onmessage/onerror and clears frame buffer state. Resolves when workerReady and header are set.
   */
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

  /**
   * Handles all messages from the Bink worker: 'ready' (apply header, dimensions, fps), 'frame' (push video YUV, schedule audio by PTS), 'error' (log and decrement decodeInFlight).
   * No-op if this.disposed.
   */
  private handleWorkerMessage(message: WorkerResponse): void {
    if (this.disposed) return;

    switch (message.type) {
      case 'ready':
        this.workerReady = true;
        this.header = message.header;
        this.width = message.header.width;
        this.height = message.header.height;
        this.fps = message.header.fpsNum / message.header.fpsDen;
        this.hasAudio = message.header.audioTracks.length > 0;
        this.onReady?.(this.width, this.height);
        break;

      case 'frame':
        this.decodeInFlight = Math.max(0, this.decodeInFlight - 1);

        if (message.video && 'yuv' in message.video) {
          this.pushFrameToBuffer(message.frameIndex, message.video.yuv);
        }
        if (message.audio) {
          this.handleAudioData(message.frameIndex, message.audio);
        }

        break;

      case 'error':
        console.error('Bink worker error:', message.message);
        this.decodeInFlight = Math.max(0, this.decodeInFlight - 1);
        break;
    }
  }

  /**
   * Adds a decoded YUV frame to the frame buffer by index.
   * Prunes frames already displayed and enforces FRAME_BUFFER_MAX by dropping the oldest displayed frame when over capacity.
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

  /**
   * Loads and plays a BIK movie: loads file, initializes worker, mutes other channels and unmutes MOVIE, resets playback state, and kicks off initial decode requests.
   * Calls onReady when header is available; calls onComplete when playback reaches the end or on error.
   * @param file - BIK resource name without extension.
   */
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
      this.audio_nodes = [];
      this.audioStartTime = 0;
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

  /**
   * Plays a BIK movie from an in-memory buffer (e.g. Forge editor). Same as play() but skips loading from filesystem.
   * @param buffer - Full BIK file contents (ArrayBuffer).
   */
  async playFromBuffer(buffer: ArrayBuffer, onComplete?: Function, onReady?: (width: number, height: number) => void): Promise<void> {
    if (!buffer || this.disposed) return;

    this.onReady = onReady;
    this.stop();
    this.onComplete = onComplete;

    AudioEngine.Mute(AudioEngineChannel.ALL);
    AudioEngine.Unmute(AudioEngineChannel.MOVIE);

    try {
      await this.initializeWorker(buffer);
      this.audioCtx = AudioEngine.GetAudioEngine().audioCtx;
      this.audio_nodes = [];
      this.audioStartTime = 0;
      this.playbackPosition = 0;
      this.frameBuffer.clear();
      this.nextFrameToRequest = 0;
      this.decodeInFlight = 0;
      this.lastDisplayedFrameIndex = -1;
      this.lastDisplayedYuv = null;
      this.isPlaying = true;
      const frameCount = this.header?.frameCount ?? 0;
      for (let i = 0; i < Math.min(BIKObject.MAX_DECODE_IN_FLIGHT, frameCount); i++) {
        this.requestDecode(this.nextFrameToRequest);
        this.nextFrameToRequest++;
      }
    } catch (error) {
      console.error('Failed to play BIK from buffer:', error);
      if (this.onComplete) this.onComplete();
    }
  }

  /**
   * Stops playback: unmutes other channels, mutes MOVIE, sets isPlaying false, terminates the worker, clears frame buffer and decode state, and stops/disconnects all scheduled audio nodes.
   */
  stop(){
    AudioEngine.Unmute(AudioEngineChannel.ALL);
    AudioEngine.Mute(AudioEngineChannel.MOVIE);

    this.isPlaying = false;

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
  }

  /**
   * Schedules one decoded audio buffer at its PTS-derived time (demuxer PTS in samples).
   * On the first buffer, sets audioStartTime so stream time 0 aligns with the demuxer timeline; video uses the same clock.
   * Skips scheduling if start time is more than 1ms in the past to avoid overlap. Creates a BufferSource, connects to movie channel, and starts at startTime.
   */
  private handleAudioData(_frameIndex: number, audio: { pcm: ArrayBuffer[]; sampleRate: number; channels: number; frameLen: number; overlapLen: number; isFirst: boolean; ptsSamples: number }): void {
    if (audio.pcm.length === 0 || audio.sampleRate <= 0) return;

    const audioCtx = AudioEngine.GetAudioEngine().audioCtx;
    const buffer = audioCtx.createBuffer(audio.channels, audio.frameLen - audio.overlapLen, audio.sampleRate);
    for (let channel = 0; channel < audio.channels; channel++) {
      buffer.copyToChannel(new Float32Array(audio.pcm[channel]), channel, 0);
    }

    const currentTime = audioCtx.currentTime;
    if (!this.audioStartTime) {
      this.audioStartTime = currentTime - audio.ptsSamples / audio.sampleRate;
    }
    const startTime = this.audioStartTime + audio.ptsSamples / audio.sampleRate;
    const pastTolerance = 0.001;
    if (startTime < currentTime - pastTolerance) return;

    const node = audioCtx.createBufferSource();
    node.buffer = buffer;
    node.loop = false;
    node.connect(AudioEngine.movieChannel.getGainNode());
    node.onended = () => {
      node.buffer = undefined;
      node.disconnect();
      const i = this.audio_nodes.indexOf(node);
      if (i >= 0) this.audio_nodes.splice(i, 1);
    };
    node.start(startTime, 0);
    this.audio_nodes.push(node);
  }

  /**
   * Requests a single frame decode from the worker (fire-and-forget). The decoded frame will appear in frameBuffer when the worker replies with a 'frame' message.
   * Increments decodeInFlight; worker response decrements it. No-op if worker not ready or frameIndex out of range.
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

  /**
   * Per-frame update: advances playback position from audio clock (when audio has started) or delta (no-audio / pre-audio), mutes/unmutes channels, picks display frame from frameBuffer by playback time, prunes passed frames, requests more decodes to keep buffer fed, and stops + calls onComplete when past the last frame.
   * @param delta - Time in seconds since last update; used only when there is no audio or before the first audio buffer.
   */
  update(delta = 0): void {
    if (this.disposed) return;

    // Use same clock as audio when we've started streaming so video and audio stay in sync
    if (this.audioStartTime > 0 && this.audioCtx && this.hasAudio) {
      this.playbackPosition = this.audioCtx.currentTime - this.audioStartTime;
    } else if (!this.hasAudio) {
      this.playbackPosition += delta;
    }

    const frameCount = this.header?.frameCount ?? 0;
    const fps = this.fps;

    // AudioEngine.Mute(AudioEngineChannel.ALL);
    // AudioEngine.Unmute(AudioEngineChannel.MOVIE);

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

  /**
   * Disposes the BIKObject: sets disposed, stops and terminates the worker, clears header and frame buffer, and stops/disconnects all audio nodes. VideoManager is responsible for removing planes/textures.
   */
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

  }

}