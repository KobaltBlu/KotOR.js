import { Action } from "@/actions/Action";
import { ActionType } from "@/enums/actions/ActionType";


/**
 * ActionItemCastSpell class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionItemCastSpell.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionItemCastSpell extends Action {

  spell: any = {}

  constructor( actionId: number = -1, groupId: number = -1 ){
    super(actionId, groupId);
    this.type = ActionType.ActionItemCastSpell;

    //PARAMS - need to verify!! https://github.com/nwnxee/unified/blob/2f732e7f5e278e4de848d119bf3689dc928f2ab2/Plugins/Creature/Creature.cpp#L2846
    // 0 - dword: oTarget
    // 1 - dword: oArea
    // 2 - float: x
    // 3 - float: y
    // 4 - float: z
    // 5 - int: spellId
    // 6 - int: casterLevel
    // 7 - float: delay
    // 8 - int: projectilePath
    // 9 - int: projectileSpellId
    // 10 - dword: oItem
    // 11 - string: impactScript
  }

}
