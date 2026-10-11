import type { Area } from "@engine/module/Area";

/**
 * Storage for precomputed PTH static-blocked bits (see pth-edge-clear.ts).
 * Kept separate so invalidateStaticBlockerGrid can clear without importing
 * static-walk-blockers (avoids a circular module graph).
 *
 * @file pth-static-edge-table.ts
 */

export type PthStaticEdgeTable = Map<string, boolean>;

const _tables = new WeakMap<Area, PthStaticEdgeTable>();

export function getPthStaticEdgeTable(area: Area): PthStaticEdgeTable | undefined {
  return _tables.get(area);
}

export function setPthStaticEdgeTable(area: Area, table: PthStaticEdgeTable): void {
  _tables.set(area, table);
}

/** Drop precomputed PTH static bits (doors / placeables changed). */
export function invalidatePthStaticEdgeTable(area: Area | undefined): void {
  if(!area) return;
  _tables.delete(area);
}
