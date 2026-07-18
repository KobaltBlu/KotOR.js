import { GameState } from "@/GameState";

/**
 * Retail CSWSEncounter::CalculatePointsFromCR @ 005919e0.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file encounter-cr.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */

/**
 * Convert challenge rating to encounter spawn-pool points.
 * Fractional (0,1): fractionalcr.2da min ladder → 1.0 / 1.5^-1…^-4.
 * Else: 1.5^CR (retail uses powerLookUp table for CR∈[0,50)).
 */
export function calculatePointsFromCR(challengeRating: number): number {
  const cr = Number(challengeRating);
  if(!Number.isFinite(cr)){
    return 0;
  }

  if(cr > 0 && cr < 1){
    const table = GameState.TwoDAManager?.datatables?.get('fractionalcr');
    const mins: number[] = [];
    if(table){
      for(let i = 0, len = table.RowCount || 0; i < len; i++){
        const row = table.rows[i];
        const min = parseFloat(String(row?.min ?? row?.Min ?? ''));
        if(Number.isFinite(min)) mins.push(min);
      }
    }
    if(!mins.length){
      mins.push(0.4, 0.3, 0.2, 0.15, -99999);
    }
    // Retail: first min where min <= cr wins
    if(mins[0] !== undefined && mins[0] <= cr) return 1.0;
    if(mins[1] !== undefined && mins[1] <= cr) return Math.pow(1.5, -1);
    if(mins[2] !== undefined && mins[2] <= cr) return Math.pow(1.5, -2);
    if(mins[3] !== undefined && mins[3] <= cr) return Math.pow(1.5, -3);
    return Math.pow(1.5, -4);
  }

  if(cr < 0){
    return 0;
  }

  return Math.pow(1.5, cr);
}
