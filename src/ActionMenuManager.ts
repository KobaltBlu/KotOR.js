import { GameState } from "./GameState";
import { ActionMenuPanel } from "./ActionMenuPanel";
import { ActionMenuItem } from "./ActionMenuItem";
import type { ModuleObject } from "./module/ModuleObject";
import type { ModuleCreature } from "./module/ModuleCreature";
import { IActionPanelLists } from "./interface/gui/IActionPanelLists";
import { GameEngineType } from "./enums/engine/GameEngineType";
import { ActionType } from "./enums/actions/ActionType";

/**
 * ActionMenuManager class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file ActionMenuManager.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class ActionMenuManager {

  static ActionMenuPanel: typeof ActionMenuPanel = ActionMenuPanel;
  static ActionMenuItem: typeof ActionMenuItem = ActionMenuItem;

  static TARGET_MENU_COUNT = 3;
  static SELF_MENU_COUNT = 4;

  static oPC: ModuleCreature;
  static oTarget: ModuleObject;

  static ActionPanels: IActionPanelLists = {
    targetPanels: [],
    selfPanels: [],
  };
  
  static SetPC(oPC: ModuleCreature){
    ActionMenuManager.oPC = oPC;
  }
  
  static SetTarget(oTarget: ModuleObject){
    ActionMenuManager.oTarget = oTarget;
  }

  static InitActionMenuPanels(){
    ActionMenuManager.TARGET_MENU_COUNT = 3;
    ActionMenuManager.SELF_MENU_COUNT = (GameState.GameKey == GameEngineType.KOTOR ? 4 : 6);
    ActionMenuManager.ActionPanels = {
      targetPanels: [],
      selfPanels: [],
    };
    
    for(let i = 0; i < ActionMenuManager.TARGET_MENU_COUNT; i++){
      ActionMenuManager.ActionPanels.targetPanels[i] = new GameState.ActionMenuManager.ActionMenuPanel();
    }
    
    for(let i = 0; i < ActionMenuManager.SELF_MENU_COUNT; i++){
      ActionMenuManager.ActionPanels.selfPanels[i] = new GameState.ActionMenuManager.ActionMenuPanel();
    }
  }

  static UpdateMenuActions(){
    for(let i = 0; i < ActionMenuManager.TARGET_MENU_COUNT; i++){
      ActionMenuManager.ActionPanels.targetPanels[i].clearActions();
    }
    
    for(let i = 0; i < ActionMenuManager.SELF_MENU_COUNT; i++){
      ActionMenuManager.ActionPanels.selfPanels[i].clearActions();
    }

    if(ActionMenuManager.oTarget instanceof GameState.Module.ModuleArea.ModuleObject){

      if(ActionMenuManager.oTarget instanceof GameState.Module.ModuleArea.ModulePlaceable){
        if(ActionMenuManager.oTarget.isLocked() && !ActionMenuManager.oTarget.requiresKey()){
          const securityTalent = ActionMenuManager.oPC.getSkillList()[6];
          ActionMenuManager.ActionPanels.targetPanels[1].addAction(new GameState.ActionMenuManager.ActionMenuItem({
            talent: securityTalent,
            target: ActionMenuManager.oTarget,
            icon: securityTalent.icon
          }));

          ActionMenuManager.ActionPanels.targetPanels[0].addAction(new GameState.ActionMenuManager.ActionMenuItem({
            action: {
              type: ActionType.ActionPhysicalAttacks,
              object: ActionMenuManager.oTarget,
              talent: undefined
            },
            icon: 'i_attack'
          }));
        }
      }else if(ActionMenuManager.oTarget instanceof GameState.Module.ModuleArea.ModuleDoor){
        if(ActionMenuManager.oTarget.isLocked() && !ActionMenuManager.oTarget.requiresKey()){
          const securityTalent = ActionMenuManager.oPC.getSkillList()[6];
          ActionMenuManager.ActionPanels.targetPanels[1].addAction(new GameState.ActionMenuManager.ActionMenuItem({
            talent: securityTalent,
            target: ActionMenuManager.oTarget,
            icon: securityTalent.icon
          }));

          ActionMenuManager.ActionPanels.targetPanels[0].addAction(new GameState.ActionMenuManager.ActionMenuItem({
            action: {
              type: ActionType.ActionPhysicalAttacks,
              object: ActionMenuManager.oTarget,
              talent: undefined
            },
            icon: 'i_attack'
          }));
        }
      }else if(ActionMenuManager.oTarget instanceof GameState.Module.ModuleArea.ModuleCreature && ActionMenuManager.oTarget.isHostile(GameState.player)){
        ActionMenuManager.ActionPanels.targetPanels[0].addAction(new GameState.ActionMenuManager.ActionMenuItem({
          action: {
            type: ActionType.ActionPhysicalAttacks,
            object: ActionMenuManager.oTarget,
            talent: undefined
          },
          icon: 'i_attack'
        }));

        if(ActionMenuManager.oPC.getEquippedWeaponType() == 1){
          //category = 0x1104
          const feats = ActionMenuManager.oPC.getFeats().filter( (f: any, i:number, array: any[]) => { 
            return f.category == 0x1104 && (
              f.successor == '****' || 
              (!array.find( (f2: any) => f2.__index == f.successor))
            ) 
          });

          for(let i = 0, len = feats.length; i < len; i++){
            const feat = feats[i];
            ActionMenuManager.ActionPanels.targetPanels[0].addAction(new GameState.ActionMenuManager.ActionMenuItem({
              talent: feat,
              icon: feat.icon
            }));
          }

        }

        if(ActionMenuManager.oPC.getEquippedWeaponType() == 4){
          //category = 0x1111
          const feats = ActionMenuManager.oPC.getFeats().filter( (f: any, i:number, array: any[]) => { 
            return f.category == 0x1111 && (
              f.successor == '****' || 
              (!array.find( (f2: any) => f2.__index == f.successor))
            ) 
          });

          for(let i = 0, len = feats.length; i < len; i++){
            const feat = feats[i];
            ActionMenuManager.ActionPanels.targetPanels[0].addAction(new GameState.ActionMenuManager.ActionMenuItem({
              talent: feat,
              icon: feat.icon
            }));
          }

        }

        const hostileSpells = ActionMenuManager.oPC.getSpells().filter( (s: any) => {
          return !isNaN(parseInt(s.forcehostile));
        });

        for(let i = 0; i < hostileSpells.length; i++){
          ActionMenuManager.ActionPanels.targetPanels[1].addAction(new GameState.ActionMenuManager.ActionMenuItem({
            talent: hostileSpells[i],
            target: ActionMenuManager.oTarget,
            icon: hostileSpells[i].iconresref
          }));
        }

      }

    }

    const friendlySpells = ActionMenuManager.oPC.getSpells().filter( (s: any) => {
      return !isNaN(parseInt(s.forcefriendly));
    });

    for(let i = 0; i < friendlySpells.length; i++){
      ActionMenuManager.ActionPanels.selfPanels[1].addAction(new GameState.ActionMenuManager.ActionMenuItem({
        talent: friendlySpells[i],
        target: ActionMenuManager.oPC,
        icon: friendlySpells[i].iconresref
      }));
    }

    return ActionMenuManager.ActionPanels;
  }

  static targetActionCount(){
    return ActionMenuManager.ActionPanels.targetPanels.reduce(
      (previousValue, currentValue, currentIndex, panels) => {
        return previousValue += currentValue.actions.length;
      }, 0
    );
  }

  static selfActionCount(){
    return ActionMenuManager.ActionPanels.selfPanels.reduce(
      (previousValue, currentValue, currentIndex, panels) => {
        return previousValue += currentValue.actions.length;
      }, 0
    );
  }

}
