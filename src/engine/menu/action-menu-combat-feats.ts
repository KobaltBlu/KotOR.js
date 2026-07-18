const MELEE_FEAT_CHAINS = [
  [81, 19, 8],   // Master / Improved / Critical Strike
  [53, 91, 11],  // Master / Improved / Flurry
  [83, 17, 28],  // Master / Improved / Power Attack
];

const RANGED_FEAT_CHAINS = [
  [82, 18, 29],  // Master / Improved / Power Blast
  [26, 92, 30],  // Master / Improved / Rapid Shot
  [77, 20, 31],  // Master / Improved / Sniper Shot
];

/**
 * Retail GetCombatFeatsSkills → CheckFeat: one highest-owned feat per chain,
 * in the fixed menu order used by K1.
 */
export function getCombatMenuFeatIds(
  hasFeat: (id: number) => boolean,
  ranged: boolean
): number[] {
  const chains = ranged ? RANGED_FEAT_CHAINS : MELEE_FEAT_CHAINS;
  const result: number[] = [];
  for(let i = 0; i < chains.length; i++){
    const chain = chains[i];
    for(let j = 0; j < chain.length; j++){
      if(hasFeat(chain[j])){
        result.push(chain[j]);
        break;
      }
    }
  }
  return result;
}
