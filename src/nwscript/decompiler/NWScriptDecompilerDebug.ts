/**
 * Verbose decompiler tracing. Enable with env var NWSCRIPT_DECOMPILER_DEBUG=1
 * (any non-empty value except "0" enables logging).
 */
export function nwscriptDecompilerDebugEnabled(): boolean {
  return envFlagEnabled(typeof process === 'undefined' ? undefined : process.env?.NWSCRIPT_DECOMPILER_DEBUG);
}

export function nwscriptDecompilerDebug(...args: unknown[]): void {
  if (!nwscriptDecompilerDebugEnabled()) return;
  console.log(...args);
}

/**
 * Phase timings. Enable console dump with NWSCRIPT_DECOMPILER_PROFILE=1.
 * {@link NWScriptDecompiler.lastProfile} is always recorded.
 */
export function nwscriptDecompilerProfileEnabled(): boolean {
  return envFlagEnabled(typeof process === 'undefined' ? undefined : process.env?.NWSCRIPT_DECOMPILER_PROFILE);
}

export function nwscriptDecompilerNowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

export type NWScriptDecompilerPhaseTimings = {
  scriptName: string;
  instructionCount: number;
  blockCount: number;
  totalMs: number;
  phases: Record<string, number>;
  cfg: Record<string, number>;
};

function envFlagEnabled(value: string | undefined): boolean {
  return value !== undefined && value !== '' && value !== '0';
}
