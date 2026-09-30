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
 * threshold use MessageChannel instead so uncapped mode is not paced by the clamp.
 */
export const MESSAGE_CHANNEL_YIELD_MS = 4;

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

  /**
   * Clear any prior handle, then arm exactly one RAF (vsync), MessageChannel
   * (short uncapped yield), or adaptive timeout (longer uncapped yield).
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
    }else{
      const yieldMs = uncappedYieldMs(workMs);
      if(yieldMs <= MESSAGE_CHANNEL_YIELD_MS){
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
      }else{
        this.timeoutId = setTimeout(() => {
          this.timeoutId = 0;
          if(generation !== this.generation) return;
          onTick();
        }, yieldMs) as unknown as number;
      }
    }
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
