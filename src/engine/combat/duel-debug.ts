/**
 * Duel / combat-round choreography debug logging.
 *
 * Toggle at runtime from the browser console:
 * window.__DUEL_DEBUG = false // silence
 * window.__DUEL_DEBUG = true // re-enable
 *
 * Per-owner consecutive-duplicate collapsing keeps per-frame wait states
 * (paused slave, slave waiting for master) from flooding the console.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file duel-debug.ts
 */

export const DuelDebug = {
  enabled: false,
};

declare global {
  interface Window { __DUEL_DEBUG?: boolean; }
}

const lastLineByOwner = new Map<number, string>();

function isEnabled(): boolean {
  if(typeof window !== 'undefined' && typeof window.__DUEL_DEBUG === 'boolean'){
    return window.__DUEL_DEBUG;
  }
  return DuelDebug.enabled;
}

/** Short identity string for log lines: tag#id */
export function duelWho(obj: any): string {
  if(!obj) return 'none';
  const tag = obj.getTag?.() || obj.tag || obj.constructor?.name || 'obj';
  return `${tag}#${obj.id ?? '?'}`;
}

/**
 * Log a duel event for a creature. Consecutive identical lines for the same
 * owner are collapsed (wait states repeat every frame).
 */
export function duelLog(owner: any, event: string, detail?: Record<string, any>){
  if(!isEnabled()) return;
  const key = (owner?.id ?? -1) as number;
  const line = `${duelWho(owner)} | ${event}${detail ? ' ' + JSON.stringify(detail) : ''}`;
  if(lastLineByOwner.get(key) === line) return;
  lastLineByOwner.set(key, line);
  const t = Math.round(typeof performance !== 'undefined' ? performance.now() : Date.now());
  console.log(`[DUEL ${t}] ${line}`);
}
