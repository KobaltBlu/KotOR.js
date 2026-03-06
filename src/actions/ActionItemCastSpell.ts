import { GameState } from "../GameState";
import { ActionStatus } from "../enums/actions/ActionStatus";
import { ActionParameterType } from "../enums/actions/ActionParameterType";
import { ActionType } from "../enums/actions/ActionType";
import { ModuleObjectType } from "../enums/module/ModuleObjectType";
import { SpellCastInstance } from "../combat";
import type { ModuleObject } from "../module/ModuleObject";
import type { ModuleItem } from "../module/ModuleItem";
import { BitWise } from "../utility/BitWise";
import { Action } from "./Action";

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

    //PARAMS
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

  update(delta: number = 0): ActionStatus {
    if(!this.owner){ return ActionStatus.FAILED; }

    const oTarget = this.getParameter<ModuleObject>(0);
    const spellId = this.getParameter<number>(5);
    const oItem = this.getParameter<ModuleItem>(10);

    // Build the TalentSpell from spellId
    const spell = new GameState.TalentSpell(spellId);
    if(!spell){ return ActionStatus.FAILED; }

    // Override the impact script if parameter 11 is provided
    const overrideScript = this.getParameter<string>(11);
    if(overrideScript){
      spell.impactscript = overrideScript;
    }

    const target = oTarget || (BitWise.InstanceOfObject(this.owner, ModuleObjectType.ModuleCreature) ? this.owner as ModuleObject : undefined);
    if(!target){ return ActionStatus.FAILED; }

    // Create and attach the spell cast instance
    const spellInstance = new SpellCastInstance(this.owner, target, spell);
    if(this.owner.area){
      this.owner.area.attachSpellInstance(spellInstance);
    }
    spellInstance.init();

    // Consume one use of the item from inventory (party member uses consumable)
    if(oItem && BitWise.InstanceOfObject(oItem, ModuleObjectType.ModuleItem)){
      if(oItem.getStackSize() <= 1){
        GameState.InventoryManager.removeItem(oItem);
      }else{
        oItem.setStackSize(oItem.getStackSize() - 1);
      }
    }

    return ActionStatus.COMPLETE;
  }

}
