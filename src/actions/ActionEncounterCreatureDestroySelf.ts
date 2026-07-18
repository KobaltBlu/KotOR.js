import { Action } from "@/actions/Action";
import { ActionStatus } from "@/enums/actions/ActionStatus";
import { ActionType } from "@/enums/actions/ActionType";
import { ModuleObjectType } from "@/enums/module/ModuleObjectType";
import type { ModuleCreature } from "@/module/ModuleCreature";
import { BitWise } from "@/utility/BitWise";

/**
 * ActionEncounterCreatureDestroySelf class.
 * Retail: CSWSCreature::AIActionEncounterCreatureDestroySelf @ 00510c20 —
 * unregisters from encounter, clears commandable, schedules destroy +5s.
 *
 * @file ActionEncounterCreatureDestroySelf.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionEncounterCreatureDestroySelf extends Action {

  private static DESTROY_DELAY_MS = 5000;

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionEncounterCreatureDestroySelf;
  }

  update(delta: number = 0): ActionStatus {
    if(!BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature)){
      return ActionStatus.ERROR;
    }

    const owner = this.owner as ModuleCreature;
    if(owner.isDead?.()){
      return ActionStatus.ERROR;
    }

    // Retail @ 00510c20: RemoveFromActiveCreatureCount(cr, 1) then field408=1
    owner.unlinkFromEncounter(true);

    // Retail clears commandable (field49_0xe8=0) and queues destroy in 5000ms
    owner.setCommandable(false);
    owner.setWillDestroy?.(true);

    const creature = owner;
    setTimeout(() => {
      if(!creature.destroyed){
        creature.destroy();
      }
    }, ActionEncounterCreatureDestroySelf.DESTROY_DELAY_MS);

    return ActionStatus.COMPLETE;
  }

}
