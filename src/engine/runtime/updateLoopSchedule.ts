/**
 * Update-loop arming helpers for GameState.
 * Keeps at most one live RAF/timeout/MessageChannel and derives uncapped yield from JS-thread work.
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

/**
 * Graphics Options.V-Sync — defaults on (RAF-paced). Missing/empty → enabled;
 * existing V-Sync=0 stays uncapped until the user changes it.
 */
export function isVSyncEnabledRaw(raw: unknown, hasConfig: boolean): boolean {
  if(!hasConfig) return true;
  if(raw === undefined || raw === null || raw === '') return true;
  return String(raw) !== '0';
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

  /** performance.now() of last setTimeout input breath (idle or interval). */
  private lastInputBreathAt = 0;

  private channel: MessageChannel | undefined;
  private channelToken = 0;

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
   * Clear any prior handle, then arm exactly one RAF (vsync), MessageChannel
   * (busy short uncapped), idle/interval setTimeout breath, or adaptive timeout.
   *
   * Do not chain MessageChannel (or scheduler.yield) on idle ticks — that
   * monopolizes the task queue and starves mouse input.
   */
  schedule(vsync: boolean, workMs: number, onTick: () => void): void {
    const generation = this.generation;
    this.clear();
    if(vsync){
      this.rafId = requestAnimationFrame(() => {
        this.rafId = 0;
        if(generation !== this.generation) return;
        onTick();
      });
      return;
    }

    const yieldMs = uncappedYieldMs(workMs);
    if(yieldMs > MESSAGE_CHANNEL_YIELD_MS){
      this.armTimeout(generation, yieldMs, onTick);
      return;
    }

    // Idle spin (menu / init): always timer-yield so input can drain.
    if(workMs < IDLE_WORK_MS){
      this.armTimeout(generation, 0, onTick);
      return;
    }

    // Busy short tick: prefer MessageChannel, but breathe on a wall-clock
    // interval so port messages cannot form an unbroken input-starving chain.
    const now = performance.now();
    if(this.lastInputBreathAt === 0){
      this.lastInputBreathAt = now;
    }else if(now - this.lastInputBreathAt >= INPUT_BREATH_INTERVAL_MS){
      this.armTimeout(generation, 0, onTick);
      return;
    }

    this.armMessageChannel(generation, onTick);
  }

  /**
   * Invalidate pending ticks and re-arm. Safe mid-Update when the enclosing
   * finally also calls schedule() — schedule always clears first.
   */
  applyOption(vsync: boolean, onTick: () => void): void {
    this.generation++;
    this.clear();
    this.schedule(vsync, 0, onTick);
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
