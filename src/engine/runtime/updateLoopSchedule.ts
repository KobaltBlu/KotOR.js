/**
 * Update-loop arming helpers for GameState.
 * Keeps at most one live RAF/timeout/MessageChannel and derives uncapped yield from JS-thread work.
 *
 * Uncapped (V-Sync off) pacing has three layers of back-pressure:
 *  1. Render-step starvation: a no-op RAF heartbeat records when the browser
 *     last got a rendering opportunity (which is also when rAF-aligned input
 *     such as pointermove/wheel is dispatched). If it has been missed, the next
 *     tick waits for a RAF instead of a task.
 *  2. Adaptive yield: the idle gap after each tick scales with smoothed work
 *     times a back-off ratio that doubles on starvation and decays while healthy.
 *  3. GPU fences: never queue more than MAX_GPU_FRAMES_IN_FLIGHT unfinished
 *     frames, so slow GPUs do not fill the command buffer and block JS inside
 *     WebGL calls.
 */

/**
 * Yield after uncapped Update work so the browser gets a real idle boundary.
 * workMs is JS-thread occupancy for this tick (not Clock/sim delta).
 * Browsers may clamp nested timeouts; 1ms is a lower bound, not a promise.
 */
export function uncappedYieldMs(workMs: number): number {
  return Math.min(8, Math.max(1, Math.ceil(workMs / 8)));
}

/**
 * Nested setTimeout is clamped to ~4ms in browsers. Yields at or below that
 * threshold use MessageChannel when the tick was busy, so gameplay is not
 * paced by the clamp. Idle / near-empty ticks always use setTimeout(0) so
 * input and painting are not starved by a MessageChannel spin.
 */
export const MESSAGE_CHANNEL_YIELD_MS = 4;

/**
 * Below this workMs the uncapped loop is spinning (main menu / init).
 * Always arm setTimeout(0) — MessageChannel chains starve mouse/pointer events.
 * Nested timer clamp caps idle FPS around ~250, which still feels uncapped
 * while keeping the event loop responsive.
 */
export const IDLE_WORK_MS = 4;

/**
 * Even on busy MessageChannel frames, force a setTimeout(0) at least this often
 * so input is not queued behind an unbroken port-message chain.
 */
export const INPUT_BREATH_INTERVAL_MS = 16;

/** Base back-off ratio: idle gap = work / 8 (matches uncappedYieldMs). */
export const BACKOFF_BASE_RATIO = 1 / 8;
/** Ceiling: idle gap may grow to equal the tick's own work (50% duty). */
export const BACKOFF_MAX_RATIO = 1;
/** Per healthy rendering opportunity, ratio decays toward base by this factor. */
export const BACKOFF_DECAY = 0.95;
/** Largest adaptive timeout gap, so back-off never drops below ~60 ticks/s on its own. */
export const MAX_BACKOFF_YIELD_MS = 16;

/** Missed-render threshold, in multiples of the measured display frame interval. */
export const RENDER_STARVED_FRAMES = 2;
/** Absolute floor for the starvation threshold (high-refresh displays). */
export const RENDER_STARVED_MIN_MS = 20;
/** Default display frame interval before the heartbeat has measured one. */
export const DEFAULT_FRAME_INTERVAL_MS = 1000 / 60;

/** Frames the CPU may run ahead of the GPU while uncapped. */
export const MAX_GPU_FRAMES_IN_FLIGHT = 2;
/** Give up waiting on a GPU fence after this long (driver stall / lost context). */
export const MAX_GPU_FENCE_WAIT_MS = 100;

/** Minimum slack added to the predicted tick length when aiming a draw at the next refresh. */
export const PRESENT_MARGIN_MS = 2;
/**
 * Per on-time draw, the adaptive margin decays toward PRESENT_MARGIN_MS by this
 * factor (~2–3 s half-life at 60 Hz), slower than misses recur on noisy machines.
 */
export const PRESENT_MARGIN_DECAY = 0.995;
/** Each missed refresh widens the margin by this fraction of a refresh interval. */
export const PRESENT_MARGIN_GROW_FRAMES = 0.25;

/** Smoothing for the work-time EWMA (weight of the newest sample). */
const WORK_EWMA_ALPHA = 0.2;
/** Smoothing for the display frame interval EWMA. */
const FRAME_EWMA_ALPHA = 0.1;

/**
 * Graphics Options.V-Sync — defaults on (RAF-paced). Missing/empty → enabled;
 * existing V-Sync=0 stays uncapped until the user changes it.
 */
export function isVSyncEnabledRaw(raw: unknown, hasConfig: boolean): boolean {
  if(!hasConfig) return true;
  if(raw === undefined || raw === null || raw === '') return true;
  return String(raw) !== '0';
}

/** Adaptive idle gap: ceil(work * ratio), clamped to 1..MAX_BACKOFF_YIELD_MS. */
export function backoffYieldMs(workMs: number, ratio: number): number {
  return Math.min(MAX_BACKOFF_YIELD_MS, Math.max(1, Math.ceil(workMs * ratio)));
}

/**
 * Bounds how far the CPU runs ahead of the GPU. Each uncapped tick inserts a
 * fence after its draw calls; the next tick may start only while fewer than
 * MAX_GPU_FRAMES_IN_FLIGHT fences are unsignaled. Status queries never block.
 */
export class GpuFrameFence {
  private gl: WebGL2RenderingContext | null = null;
  private fences: WebGLSync[] = [];
  private waitStartedAt = 0;

  attach(gl: WebGL2RenderingContext | null): void {
    if(gl === this.gl) return;
    this.reset();
    this.gl = gl;
  }

  /** Record the end of this frame's GPU work. */
  insert(): void {
    const gl = this.gl;
    if(!gl || gl.isContextLost()) return;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if(!sync) return;
    this.fences.push(sync);
    // Bound the queue even if ticks run without consulting isReady().
    while(this.fences.length > MAX_GPU_FRAMES_IN_FLIGHT + 1){
      gl.deleteSync(this.fences.shift()!);
    }
  }

  /** True when another frame may be queued. */
  isReady(now: number): boolean {
    const gl = this.gl;
    if(!gl) return true;
    if(gl.isContextLost()){
      this.fences.length = 0;
      return true;
    }
    while(this.fences.length){
      const status = gl.getSyncParameter(this.fences[0], gl.SYNC_STATUS);
      if(status !== gl.SIGNALED) break;
      gl.deleteSync(this.fences.shift()!);
    }
    if(this.fences.length < MAX_GPU_FRAMES_IN_FLIGHT){
      this.waitStartedAt = 0;
      return true;
    }
    if(this.waitStartedAt === 0){
      this.waitStartedAt = now;
      return false;
    }
    if(now - this.waitStartedAt >= MAX_GPU_FENCE_WAIT_MS){
      // Fence never signaled in time; stop tracking it rather than freeze.
      this.reset();
      return true;
    }
    return false;
  }

  reset(): void {
    const gl = this.gl;
    if(gl && !gl.isContextLost()){
      for(const sync of this.fences) gl.deleteSync(sync);
    }
    this.fences.length = 0;
    this.waitStartedAt = 0;
  }
}

/**
 * Owns the pending Update callback. Invariant: at most one valid future tick.
 */
export class UpdateLoopArm {
  rafId = 0;
  timeoutId = 0;
  generation = 0;
  /** True while a MessageChannel port message is outstanding (cannot cancel). */
  channelPending = false;

  /** Current uncapped back-off ratio (BACKOFF_BASE_RATIO..BACKOFF_MAX_RATIO). */
  backoffRatio = BACKOFF_BASE_RATIO;
  /** Smoothed JS work per tick, ms. */
  workEwmaMs = -1;
  /** Measured display frame interval, ms. */
  frameIntervalMs = DEFAULT_FRAME_INTERVAL_MS;
  /** performance.now() of the last rendering opportunity seen by the heartbeat. */
  lastRenderAt = 0;

  /** Optional GPU back-pressure gate, consulted before each uncapped tick. */
  gpuFence: GpuFrameFence | null = null;

  /** Rendering opportunities seen by the heartbeat. */
  renderSeq = 0;
  /** renderSeq at the last tick that drew a frame. */
  private presentedSeq = -1;
  /** Smoothed work of ticks that drew a frame (they cost more than sim-only ticks). */
  presentWorkEwmaMs = -1;
  /** Slack before the predicted refresh; grows on missed refreshes, decays when on time. */
  presentMarginMs = PRESENT_MARGIN_MS;
  /** Smoothed time between successive uncapped tick ends (≈ tick start spacing). */
  tickSpacingEwmaMs = 0;
  private lastArmAt = 0;
  private tickPresented = false;

  /** performance.now() of last setTimeout input breath (idle or interval). */
  private lastInputBreathAt = 0;

  private channel: MessageChannel | undefined;
  private channelToken = 0;
  private heartbeatId = 0;

  private ensureChannel(): MessageChannel {
    if(!this.channel){
      this.channel = new MessageChannel();
    }
    return this.channel;
  }

  clear(): void {
    if(this.rafId){
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    if(this.timeoutId){
      clearTimeout(this.timeoutId);
      this.timeoutId = 0;
    }
    // Posted messages cannot be cancelled — bump token so stale handlers no-op.
    if(this.channelPending){
      this.channelToken++;
      this.channelPending = false;
    }
  }

  get armedCount(): number {
    return (this.rafId ? 1 : 0) + (this.timeoutId ? 1 : 0) + (this.channelPending ? 1 : 0);
  }

  get heartbeatRunning(): boolean {
    return this.heartbeatId !== 0;
  }

  /**
   * No-op RAF loop while uncapped. Each firing marks a rendering opportunity
   * (style/paint and rAF-aligned input ran) and relaxes the back-off ratio.
   */
  private startHeartbeat(now: number): void {
    if(this.heartbeatId) return;
    this.lastRenderAt = now;
    const beat = (frameTime?: number) => {
      // rAF's timestamp is the refresh-aligned frame start; the callback itself
      // can run late behind a long task, which would skew refresh prediction.
      const now = performance.now();
      const t = (typeof frameTime === 'number' && frameTime > 0 && frameTime <= now) ? frameTime : now;
      const interval = t - this.lastRenderAt;
      // Only learn the display rate from beats that were not themselves starved.
      if(interval > 0 && interval < this.renderStarvedThresholdMs()){
        this.frameIntervalMs += (interval - this.frameIntervalMs) * FRAME_EWMA_ALPHA;
      }
      this.lastRenderAt = t;
      this.renderSeq++;
      this.backoffRatio = Math.max(BACKOFF_BASE_RATIO, this.backoffRatio * BACKOFF_DECAY);
      this.heartbeatId = requestAnimationFrame(beat);
    };
    this.heartbeatId = requestAnimationFrame(beat);
  }

  stopHeartbeat(): void {
    if(this.heartbeatId){
      cancelAnimationFrame(this.heartbeatId);
      this.heartbeatId = 0;
    }
  }

  renderStarvedThresholdMs(): number {
    return Math.max(RENDER_STARVED_MIN_MS, this.frameIntervalMs * RENDER_STARVED_FRAMES);
  }

  /**
   * Uncapped only: the browser composites the canvas once per display refresh,
   * so drawing on every tick throws most frames away. Draw at most once per
   * refresh, on the last tick that can still finish its draw before the
   * refresh: i.e. draw now when the *next* tick would start too late. The
   * window is at least one tick wide, so some tick always lands in it. If a
   * refresh still passed with no draw, draw on the first tick after it.
   */
  shouldPresentFrame(vsync: boolean, now: number): boolean {
    if(vsync || !this.heartbeatId) return true;
    if(this.presentedSeq === this.renderSeq) return false;
    const missedRefresh = this.renderSeq - this.presentedSeq >= 2;
    const nextRefreshAt = this.lastRenderAt + this.frameIntervalMs;
    const drawTickMs = this.presentWorkEwmaMs >= 0 ? this.presentWorkEwmaMs : this.workEwmaMs;
    const lead = Math.max(0, drawTickMs) + this.presentMarginMs;
    const nextTickStart = now + Math.max(0, this.tickSpacingEwmaMs);
    if(!missedRefresh && nextTickStart + lead < nextRefreshAt) return false;
    if(missedRefresh && this.presentedSeq >= 0){
      // A refresh went out with no new frame: aim earlier from now on.
      this.presentMarginMs = Math.min(
        this.frameIntervalMs,
        this.presentMarginMs + this.frameIntervalMs * PRESENT_MARGIN_GROW_FRAMES
      );
    }else{
      this.presentMarginMs = Math.max(PRESENT_MARGIN_MS, this.presentMarginMs * PRESENT_MARGIN_DECAY);
    }
    this.presentedSeq = this.renderSeq;
    this.tickPresented = true;
    return true;
  }

  isRenderStarved(now: number): boolean {
    return this.heartbeatId !== 0 && now - this.lastRenderAt > this.renderStarvedThresholdMs();
  }

  private recordWork(workMs: number): void {
    this.workEwmaMs = this.workEwmaMs < 0
      ? workMs
      : this.workEwmaMs + (workMs - this.workEwmaMs) * WORK_EWMA_ALPHA;
    if(this.tickPresented){
      this.tickPresented = false;
      this.presentWorkEwmaMs = this.presentWorkEwmaMs < 0
        ? workMs
        : this.presentWorkEwmaMs + (workMs - this.presentWorkEwmaMs) * WORK_EWMA_ALPHA;
    }
  }

  /**
   * Wrap onTick so a tick only runs once the GPU has room for another frame.
   * While waiting, re-arm a short timeout (keeps the one-handle invariant).
   */
  private gated(generation: number, onTick: () => void): () => void {
    const run = () => {
      if(generation !== this.generation) return;
      const fence = this.gpuFence;
      if(fence && !fence.isReady(performance.now())){
        this.armTimeout(generation, 1, run);
        return;
      }
      onTick();
    };
    return run;
  }

  private armRaf(generation: number, onTick: () => void): void {
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      if(generation !== this.generation) return;
      onTick();
    });
  }

  private armMessageChannel(generation: number, onTick: () => void): void {
    const token = this.channelToken;
    const channel = this.ensureChannel();
    this.channelPending = true;
    channel.port1.onmessage = () => {
      if(token !== this.channelToken) return;
      this.channelPending = false;
      if(generation !== this.generation) return;
      onTick();
    };
    channel.port2.postMessage(null);
  }

  private armTimeout(generation: number, delayMs: number, onTick: () => void): void {
    this.lastInputBreathAt = performance.now();
    this.timeoutId = setTimeout(() => {
      this.timeoutId = 0;
      if(generation !== this.generation) return;
      onTick();
    }, delayMs) as unknown as number;
  }

  /**
   * Clear any prior handle, then arm exactly one RAF (vsync or render-starved),
   * MessageChannel (busy short uncapped), idle/interval setTimeout breath, or
   * adaptive timeout.
   *
   * Do not chain MessageChannel (or scheduler.yield) on idle ticks — that
   * monopolizes the task queue and starves mouse input.
   */
  schedule(vsync: boolean, workMs: number, onTick: () => void): void {
    this.arm(vsync, workMs, onTick, true);
  }

  private arm(vsync: boolean, workMs: number, onTick: () => void, measured: boolean): void {
    const generation = this.generation;
    this.clear();
    if(vsync){
      this.stopHeartbeat();
      this.gpuFence?.reset();
      this.backoffRatio = BACKOFF_BASE_RATIO;
      this.armRaf(generation, onTick);
      return;
    }

    const now = performance.now();
    if(measured){
      this.recordWork(workMs);
      if(this.lastArmAt > 0){
        const spacing = now - this.lastArmAt;
        // Ignore gaps from pauses / hidden tabs; they are not the tick cadence.
        if(spacing > 0 && spacing < this.renderStarvedThresholdMs()){
          this.tickSpacingEwmaMs += (spacing - this.tickSpacingEwmaMs) * WORK_EWMA_ALPHA;
        }
      }
      this.lastArmAt = now;
    }
    this.startHeartbeat(now);
    const tick = this.gated(generation, onTick);

    // The browser has missed rendering opportunities (and with them rAF-aligned
    // input). Back off harder and let this tick ride the next frame.
    if(this.isRenderStarved(now)){
      this.backoffRatio = Math.min(BACKOFF_MAX_RATIO, this.backoffRatio * 2);
      this.lastInputBreathAt = now;
      this.armRaf(generation, tick);
      return;
    }

    const sizedWork = Math.max(workMs, this.workEwmaMs);
    const yieldMs = backoffYieldMs(sizedWork, this.backoffRatio);
    if(yieldMs > MESSAGE_CHANNEL_YIELD_MS){
      this.armTimeout(generation, yieldMs, tick);
      return;
    }

    // Idle spin (menu / init): always timer-yield so input can drain.
    if(workMs < IDLE_WORK_MS){
      this.armTimeout(generation, 0, tick);
      return;
    }

    // Busy short tick: prefer MessageChannel, but breathe on a wall-clock
    // interval so port messages cannot form an unbroken input-starving chain.
    if(this.lastInputBreathAt === 0){
      this.lastInputBreathAt = now;
    }else if(now - this.lastInputBreathAt >= INPUT_BREATH_INTERVAL_MS){
      this.armTimeout(generation, 0, tick);
      return;
    }

    this.armMessageChannel(generation, tick);
  }

  /**
   * Invalidate pending ticks and re-arm. Safe mid-Update when the enclosing
   * finally also calls schedule() — schedule always clears first.
   */
  applyOption(vsync: boolean, onTick: () => void): void {
    this.generation++;
    this.clear();
    this.arm(vsync, 0, onTick, false);
  }
}

/**
 * Measure JS-thread occupancy for a tick body and schedule afterward (finally).
 */
export function runUpdateTick(
  body: () => void,
  schedule: (workMs: number) => void,
): void {
  const updateStart = performance.now();
  try {
    body();
  } finally {
    schedule(performance.now() - updateStart);
  }
}
