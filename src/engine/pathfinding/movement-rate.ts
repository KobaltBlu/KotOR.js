/**
 * Movement-rate resolution — retail GetWalkRate / WalkRate==7 MOVERATE lookup.
 *
 * World speeds come from `creaturespeed.2da` (WALKRATE / RUNRATE). Appearance
 * `walkdist` / `rundist` / driveanim* are animation pacing only.
 *
 * WalkRate token 7 (DEFAULT) → appearance.MOVERATE → creaturespeed 2DANAME.
 *
 * @file movement-rate.ts
 */

export const WALK_RATE_DEFAULT = 7;
export const WALK_RATE_PLAYER = 0;

/** Retail defaults when appearance drive columns are missing / zero. */
export const DEFAULT_DRIVE_ACCL = 25;
export const DEFAULT_DRIVE_MAX_SPEED = 6;
export const DEFAULT_DRIVE_ANIM_WALK = 2;
export const DEFAULT_DRIVE_ANIM_RUN = 4;

export type CreatureSpeedRow = {
  walkrate?: string | number;
  runrate?: string | number;
  '2daname'?: string;
  twodaname?: string;
  label?: string;
};

export type CreatureSpeedTable = {
  rows: Record<string | number, CreatureSpeedRow> | CreatureSpeedRow[];
};

/**
 * Case-insensitive match of appearance MOVERATE token to creaturespeed.2da
 * 2DANAME / label. Falls back to PLAYER (row 0) then NORM.
 */
export function resolveMoverateRowIndex(
  table: CreatureSpeedTable | undefined,
  moverateToken: string | undefined
): number {
  if(!table?.rows) return WALK_RATE_PLAYER;
  const rows = table.rows as Record<string | number, CreatureSpeedRow>;
  const token = (moverateToken || 'NORM').toUpperCase().trim();
  const aliases: Record<string, string> = {
    WEE_FOLK: 'WEE_FOLK',
    WEEFOLK: 'WEE_FOLK',
  };
  const want = aliases[token] || token;

  for(const key of Object.keys(rows)){
    const row = rows[key];
    if(!row) continue;
    const name = String(row['2daname'] ?? row.twodaname ?? row.label ?? '').toUpperCase().trim();
    if(name === want){
      const idx = parseInt(String(key), 10);
      return Number.isFinite(idx) ? idx : WALK_RATE_PLAYER;
    }
  }

  // Prefer PLAYER then NORM then 0
  for(const fallback of ['PLAYER', 'NORM', 'DEFAULT']){
    for(const key of Object.keys(rows)){
      const row = rows[key];
      const name = String(row?.['2daname'] ?? row?.twodaname ?? '').toUpperCase().trim();
      if(name === fallback){
        const idx = parseInt(String(key), 10);
        if(Number.isFinite(idx)) return idx;
      }
    }
  }
  return WALK_RATE_PLAYER;
}

/**
 * Resolve creaturespeed row index for a creature WalkRate id.
 * WalkRate 7 → appearance MOVERATE lookup.
 */
export function resolveCreatureSpeedRowIndex(
  walkRateId: number,
  moverateToken: string | undefined,
  table: CreatureSpeedTable | undefined
): number {
  const id = walkRateId | 0;
  if(id === WALK_RATE_DEFAULT){
    return resolveMoverateRowIndex(table, moverateToken);
  }
  return id;
}

export function getCreatureSpeedRates(
  walkRateId: number,
  moverateToken: string | undefined,
  table: CreatureSpeedTable | undefined,
  fallbackWalk = 1.7,
  fallbackRun = 5.4
): { walk: number; run: number; rowIndex: number } {
  const rowIndex = resolveCreatureSpeedRowIndex(walkRateId, moverateToken, table);
  const rows = table?.rows as Record<string | number, CreatureSpeedRow> | undefined;
  const row = rows?.[rowIndex] ?? rows?.[String(rowIndex)];
  if(!row){
    return { walk: fallbackWalk, run: fallbackRun, rowIndex };
  }
  const walk = parseFloat(String(row.walkrate));
  const run = parseFloat(String(row.runrate));
  return {
    walk: Number.isFinite(walk) ? walk : fallbackWalk,
    run: Number.isFinite(run) ? run : fallbackRun,
    rowIndex,
  };
}

/** Coalesce zero/NaN appearance drive fields to retail defaults. */
export function coalesceDriveAccl(value: number): number {
  return value > 0 && Number.isFinite(value) ? value : DEFAULT_DRIVE_ACCL;
}

export function coalesceDriveMaxSpeed(value: number): number {
  return value > 0 && Number.isFinite(value) ? value : DEFAULT_DRIVE_MAX_SPEED;
}

export function coalesceDriveAnimWalk(value: number): number {
  return value > 0 && Number.isFinite(value) ? value : DEFAULT_DRIVE_ANIM_WALK;
}

export function coalesceDriveAnimRun(value: number): number {
  return value > 0 && Number.isFinite(value) ? value : DEFAULT_DRIVE_ANIM_RUN;
}
