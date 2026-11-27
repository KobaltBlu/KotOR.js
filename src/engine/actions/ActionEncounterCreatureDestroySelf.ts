import { Action } from "@engine/actions/Action";
import { ActionStatus } from "@core/enums/actions/ActionStatus";
import { ActionType } from "@core/enums/actions/ActionType";
import { isCreature } from "@engine/module/guards/isCreature";

/**
 * ActionEncounterCreatureDestroySelf class.
 * encounter destroy-self:
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

    //PARAMS
    // none
  }

  update(delta: number = 0): ActionStatus {
    if(!isCreature(this.owner)){
      return ActionStatus.ERROR;
    }

    if(this.owner.isDead?.()){
      return ActionStatus.ERROR;
    }

    // : unlink from encounter active list, then mark encounter-unlinked
    this.owner.unlinkFromEncounter(true);

    // clears commandable and queues destroy in 5000ms
    this.owner.setCommandable(false);
    this.owner.setWillDestroy?.(true);

    const creature = this.owner;
    setTimeout(() => {
      if(!creature.destroyed){
        creature.destroy();
      }
    }, ActionEncounterCreatureDestroySelf.DESTROY_DELAY_MS);

    return ActionStatus.COMPLETE;
  }

}
