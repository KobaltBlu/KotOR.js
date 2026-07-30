/**
 * Retail CSWCObject::SetAnimation @ 0063e930 — when entering looping DEAD/DEAD1
 * from a non-dead pose, insert DIE/DIE1 fireforget before the corpse hold.
 *
 * @file enter-dead-transition.ts
 */

import { ModuleCreatureAnimState } from "@/enums/module/ModuleCreatureAnimState";

function isDeadFamily(index: ModuleCreatureAnimState | undefined | null): boolean {
  return (
    index === ModuleCreatureAnimState.DIE ||
    index === ModuleCreatureAnimState.DIE1 ||
    index === ModuleCreatureAnimState.DEAD ||
    index === ModuleCreatureAnimState.DEAD1
  );
}

/**
 * Remap a requested enter-DEAD SetAnimation to the DIE transition when needed.
 */
export function resolveEnterDeadTransition(
  requested: ModuleCreatureAnimState,
  current: ModuleCreatureAnimState | undefined | null,
): ModuleCreatureAnimState {
  if(requested === ModuleCreatureAnimState.DEAD){
    return isDeadFamily(current) ? requested : ModuleCreatureAnimState.DIE;
  }
  if(requested === ModuleCreatureAnimState.DEAD1){
    return isDeadFamily(current) ? requested : ModuleCreatureAnimState.DIE1;
  }
  return requested;
}
