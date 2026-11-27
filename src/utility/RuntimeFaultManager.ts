export interface RuntimeFaultState {
  consecutiveFailures: number;
  totalFailures: number;
  suppressedUntil: number;
  lastLogAt: number;
  lastErrorKey: string;
  repeatCount: number;
}

export interface RuntimeFaultOptions<T = void> {
  fallback?: T;
  suppressAfterFailures?: number;
  cooldownMs?: number;
  logThrottleMs?: number;
  resetOnSuccess?: boolean;
  context?: Record<string, any> | (() => Record<string, any>);
  onError?: (error: any, state: RuntimeFaultState, context?: Record<string, any>) => void;
  onTrip?: (error: any, state: RuntimeFaultState, context?: Record<string, any>) => void;
}

export class RuntimeFaultManager {
  static #states: Map<string, RuntimeFaultState> = new Map();

  static getState(key: string): RuntimeFaultState {
    let state = this.#states.get(key);
    if (!state) {
      state = {
        consecutiveFailures: 0,
        totalFailures: 0,
        suppressedUntil: 0,
        lastLogAt: 0,
        lastErrorKey: '',
        repeatCount: 0,
      };
      this.#states.set(key, state);
    }
    return state;
  }

  static reset(key: string): void {
    this.#states.delete(key);
  }

  static isSuppressed(key: string): boolean {
    const state = this.getState(key);
    return state.suppressedUntil > this.now();
  }

  static run<T>(key: string, fn: () => T, options: RuntimeFaultOptions<T> = {}): T {
    const state = this.getState(key);
    const now = this.now();

    if (state.suppressedUntil > now) {
      return options.fallback as T;
    }

    try {
      const value = fn();
      if (options.resetOnSuccess !== false) {
        state.consecutiveFailures = 0;
      }
      this.#states.set(key, state);
      return value;
    } catch (error: any) {
      return this.handleFault(key, error, state, options);
    }
  }

  static report(key: string, error: any, options: RuntimeFaultOptions<void> = {}): void {
    const state = this.getState(key);
    this.handleFault<void>(key, error, state, options);
  }

  private static handleFault<T>(
    key: string,
    error: any,
    state: RuntimeFaultState,
    options: RuntimeFaultOptions<T>
  ): T {
    const now = this.now();
    const context = this.resolveContext(options.context);
    const errorKey = this.getErrorKey(error);

    state.totalFailures += 1;
    state.consecutiveFailures += 1;

    if (state.lastErrorKey === errorKey) {
      state.repeatCount += 1;
    } else {
      state.lastErrorKey = errorKey;
      state.repeatCount = 1;
    }

    const suppressAfterFailures = Math.max(1, options.suppressAfterFailures ?? Number.POSITIVE_INFINITY);
    const cooldownMs = Math.max(0, options.cooldownMs ?? 0);
    const logThrottleMs = Math.max(0, options.logThrottleMs ?? 2000);

    if (state.totalFailures === 1 || (now - state.lastLogAt) >= logThrottleMs) {
      state.lastLogAt = now;
      console.error(`[RuntimeFaultManager] ${key}`, {
        error,
        context,
        consecutiveFailures: state.consecutiveFailures,
        totalFailures: state.totalFailures,
        repeatCount: state.repeatCount,
        suppressedUntil: state.suppressedUntil,
      });
    }

    try {
      options.onError?.(error, state, context);
    } catch (callbackError) {
      console.error(`[RuntimeFaultManager] ${key} onError callback failed`, callbackError);
    }

    if (state.consecutiveFailures >= suppressAfterFailures && cooldownMs > 0) {
      state.suppressedUntil = now + cooldownMs;
      state.consecutiveFailures = 0;

      console.warn(`[RuntimeFaultManager] Suppressing ${key} for ${cooldownMs}ms`, {
        context,
        repeatCount: state.repeatCount,
      });

      try {
        options.onTrip?.(error, state, context);
      } catch (callbackError) {
        console.error(`[RuntimeFaultManager] ${key} onTrip callback failed`, callbackError);
      }
    }

    this.#states.set(key, state);
    return options.fallback as T;
  }

  private static resolveContext(
    context?: Record<string, any> | (() => Record<string, any>)
  ): Record<string, any> | undefined {
    if (!context) {
      return undefined;
    }

    try {
      return typeof context === 'function' ? context() : context;
    } catch (error) {
      return {
        contextResolutionFailed: true,
        error,
      };
    }
  }

  private static getErrorKey(error: any): string {
    const name = error?.name || 'Error';
    const message = error?.message || String(error);
    return `${name}:${message}`;
  }

  private static now(): number {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }
    return Date.now();
  }
}
