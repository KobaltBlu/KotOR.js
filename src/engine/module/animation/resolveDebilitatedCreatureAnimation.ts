/**
 * Debilitated SetState overlay poses for creature animation resolution.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 *
 * @file resolveDebilitatedCreatureAnimation.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
import type { SWAnimation } from '@engine/rules/SWAnimation';

export interface DebilitatedCreatureAnimationContext {
  simple: boolean;
  fp_push_played: boolean;
  fp_land_played: boolean;
  fp_getup_played: boolean;
}

/**
 * Resolve a debilitated SetState type to an overlay pose row.
 * Returns undefined when debilitatedState is 0, unknown, or force-push phases
 * have all completed (caller falls through to normal constant resolution).
 */
export function resolveDebilitatedCreatureAnimation(
  debilitatedState: number,
  context: DebilitatedCreatureAnimationContext,
  animations: readonly SWAnimation[],
): SWAnimation | undefined {
  if(!(debilitatedState > 0)){
    return undefined;
  }

  switch(debilitatedState){
    case 1: // Confused
      return animations[15];
    case 2: // Frightened
      return animations[73];
    case 3: // Droid Stun
      return animations[270];
    case 4: // Stunned
      return animations[78];
    case 5: // Paralyzed
      return animations[78];
    case 6: // Sleep
      return animations[76];
    case 7: // Choke
      return context.simple ? animations[264] : animations[72];
    case 8: // Horrified
      return animations[74];
    case 9: // Force Pushed
      if(!context.fp_push_played)
        return animations[84];
      if(!context.fp_land_played)
        return animations[85];
      if(!context.fp_getup_played)
        return animations[86];
      return undefined;
    case 10: // Whirlwind
      return animations[75];
    case 14: // Knockdown hold (K2 SetState 0x0E)
      return animations[85];
    case 15: // Crush (K2) — choke-like victim pose; ambient 16 set separately
      return context.simple ? animations[264] : animations[72];
    case 16: // Droid Confused — confused pose; not IsDebilitated in 
      return animations[15];
    case 17: // Held (K2 0x11) — choke-like lock
      return context.simple ? animations[264] : animations[72];
    case 18: // Mind Trick — stun cohort
    case 19: // Droid Scramble — stun cohort
      return animations[78];
  }

  return undefined;
}
