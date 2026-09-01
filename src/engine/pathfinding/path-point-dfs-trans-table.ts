/**
 * Approximate PathPointDFSTransTable*.
 *
 * 512 slots (256 primary + 256 overflow), 16 bytes each = 0x2000.
 * Slot: { x, y, gCost, remainingBudget }.
 * Hash: (trunc(x)*0x11 + 6000 + trunc(y)*0x17) & 0xff
 *
 * @file path-point-dfs-trans-table.ts
 */

const SLOT_COUNT = 512;
const FLT_MAX = 3.402823466e+38;

export type TransTableEntry = {
  g: number;
  remaining: number;
};

export class PathPointDfsTransTable {
  private readonly x = new Float32Array(SLOT_COUNT);
  private readonly y = new Float32Array(SLOT_COUNT);
  private readonly g = new Float32Array(SLOT_COUNT);
  private readonly remaining = new Float32Array(SLOT_COUNT);

  reset(): void {
    for(let i = 0; i < SLOT_COUNT; i++){
      this.x[i] = 0;
      this.y[i] = 0;
      this.g[i] = FLT_MAX;
      this.remaining[i] = 0;
    }
  }

  private hash(px: number, py: number): number {
    const hx = (Math.trunc(px) * 0x11 + 6000 + Math.trunc(py) * 0x17) & 0xff;
    return hx < 0 ? ((hx - 1) | 0xffffff00) + 1 : hx;
  }

  /**
   * Retail Get: match primary then overflow.
   * Returns stored g/remaining, or undefined on miss.
   */
  get(px: number, py: number): TransTableEntry | undefined {
    const h = this.hash(px, py);
    if(this.x[h] === px && this.y[h] === py){
      return { g: this.g[h], remaining: this.remaining[h] };
    }
    const o = h + 0x100;
    if(this.x[o] === px && this.y[o] === py){
      return { g: this.g[o], remaining: this.remaining[o] };
    }
    return undefined;
  }

  /**
   * Retail Put: write primary, or overflow when primary occupied by worse entry.
   */
  put(px: number, py: number, gCost: number, remainingBudget: number): void {
    let h = this.hash(px, py);
    const same = this.x[h] === px && this.y[h] === py;
    if(
      (!same && this.g[h] <= gCost) &&
      (this.g[h] !== gCost || this.remaining[h] <= remainingBudget)
    ){
      h = h + 0x100;
    }
    this.x[h] = px;
    this.y[h] = py;
    this.g[h] = gCost;
    this.remaining[h] = remainingBudget;
  }

  /**
   * Retail prune: stored_g < current_g OR current_remaining <= stored_remaining.
   */
  shouldPrune(px: number, py: number, gCost: number, remainingBudget: number): boolean {
    const prev = this.get(px, py);
    if(!prev) return false;
    return prev.g < gCost || remainingBudget <= prev.remaining;
  }
}
