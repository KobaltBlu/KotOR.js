/**
 * Verbose decompiler tracing. Enable with env var NWSCRIPT_DECOMPILER_DEBUG=1
 * (any non-empty value except "0" enables logging).
 */
export function nwscriptDecompilerDebugEnabled(): boolean {
  if (typeof process === 'undefined') return false;
  const v = process.env?.NWSCRIPT_DECOMPILER_DEBUG;
  return v !== undefined && v !== '' && v !== '0';
}

export function nwscriptDecompilerDebug(...args: unknown[]): void {
  if (!nwscriptDecompilerDebugEnabled()) return;
  console.log(...args);
}
