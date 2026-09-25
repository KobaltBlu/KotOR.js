/**
 * Update-loop arming helpers for GameState.
 * Keeps at most one live RAF/timeout and derives uncapped yield from JS-thread work.
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

  clear(): void {
    if(this.rafId){
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    if(this.timeoutId){
      clearTimeout(this.timeoutId);
      this.timeoutId = 0;
    }
  }

  get armedCount(): number {
    return (this.rafId ? 1 : 0) + (this.timeoutId ? 1 : 0);
  }

  /**
   * Clear any prior handle, then arm exactly one RAF (vsync) or adaptive timeout.
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
      this.timeoutId = setTimeout(() => {
        this.timeoutId = 0;
        if(generation !== this.generation) return;
        onTick();
      }, yieldMs) as unknown as number;
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
