/**
 * Spatial acceleration helpers for large-module picking.
 *
 * @file SpatialPickIndex.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

import type { ForgeGameObject } from "@/apps/forge/module-editor/ForgeGameObject";

export interface SpatialCell {
  key: string;
  objects: ForgeGameObject[];
}

/**
 * Uniform grid over XY for coarse pick culling before ray tests.
 */
export class SpatialPickIndex {
  private cellSize: number;
  private cells = new Map<string, ForgeGameObject[]>();

  constructor(cellSize = 16) {
    this.cellSize = Math.max(1, cellSize);
  }

  clear(): void {
    this.cells.clear();
  }

  rebuild(objects: ForgeGameObject[]): void {
    this.clear();
    for (const object of objects) {
      const x = object.position?.x ?? 0;
      const y = object.position?.y ?? 0;
      const key = this.keyFor(x, y);
      const list = this.cells.get(key) || [];
      list.push(object);
      this.cells.set(key, list);
    }
  }

  queryRadius(x: number, y: number, radius: number): ForgeGameObject[] {
    const minCx = Math.floor((x - radius) / this.cellSize);
    const maxCx = Math.floor((x + radius) / this.cellSize);
    const minCy = Math.floor((y - radius) / this.cellSize);
    const maxCy = Math.floor((y + radius) / this.cellSize);
    const results: ForgeGameObject[] = [];
    const seen = new Set<ForgeGameObject>();
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const list = this.cells.get(`${cx}:${cy}`);
        if (!list) continue;
        for (const object of list) {
          if (seen.has(object)) continue;
          seen.add(object);
          results.push(object);
        }
      }
    }
    return results;
  }

  private keyFor(x: number, y: number): string {
    return `${Math.floor(x / this.cellSize)}:${Math.floor(y / this.cellSize)}`;
  }
}
