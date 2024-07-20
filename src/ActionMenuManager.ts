import { GameState } from "./GameState";
import { ActionMenuPanel } from "./ActionMenuPanel";
import { ActionMenuItem } from "./ActionMenuItem";
import type { ModuleObject } from "./module/ModuleObject";
import type { ModuleCreature } from "./module/ModuleCreature";
import { IActionPanelLists } from "./interface/gui/IActionPanelLists";
import { GameEngineType } from "./enums/engine/GameEngineType";
import { ActionType } from "./enums/actions/ActionType";
import { SkillType } from "./enums/nwscript/SkillType";
import { ActionParameterType, ModuleObjectConstant, ModuleTriggerType } from "./enums";
import { TalentObject } from "./talents/TalentObject";

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

    const securityTalent = ActionMenuManager.oPC.getSkillList()[SkillType.SECURITY];
    const bHasSecuritySkill = ActionMenuManager.oPC.getSkillLevel(SkillType.SECURITY) >= 1;
    const bHasDemolitionsSkill = ActionMenuManager.oPC.getSkillLevel(SkillType.DEMOLITIONS) >= 1;

    if(ActionMenuManager.oTarget instanceof GameState.Module.ModuleArea.ModuleObject){

      if(ActionMenuManager.oTarget instanceof GameState.Module.ModuleArea.ModulePlaceable){
        if(ActionMenuManager.oTarget.isLocked()){
          if(bHasSecuritySkill){
            const action = new GameState.ActionFactory.ActionUnlockObject();
            action.setOwner(ActionMenuManager.oPC);
            action.setParameter(0, ActionParameterType.DWORD, this.oTarget);
            action.setParameter(1, ActionParameterType.DWORD, ModuleObjectConstant.OBJECT_INVALID);
            ActionMenuManager.ActionPanels.targetPanels[1].addAction(new GameState.ActionMenuManager.ActionMenuItem({
              action: action,
              icon: securityTalent.icon
            }));
          }

          const securityTunnelers = ActionMenuManager.oPC.getInventory().filter((item) => {
            return item.baseItemId == 59
          });

          if(securityTunnelers.length){
            const item = securityTunnelers[0];
            
            const action = new GameState.ActionFactory.ActionUnlockObject();
            action.setOwner(ActionMenuManager.oPC);
            action.setParameter(0, ActionParameterType.DWORD, this.oTarget);
            action.setParameter(1, ActionParameterType.DWORD, securityTunnelers[0]);
            ActionMenuManager.ActionPanels.targetPanels[1].addAction(new GameState.ActionMenuManager.ActionMenuItem({
              action: action,
              icon: item.getIcon()
            }));
          }
          
          if(!this.oTarget?.notBlastable){
            ActionMenuManager.ActionPanels.targetPanels[0].addAction(new GameState.ActionMenuManager.ActionMenuItem({
              action: {
                type: ActionType.ActionPhysicalAttacks,
                object: ActionMenuManager.oTarget,
                talent: undefined
              },
              icon: 'i_attack'
            }));
          }

          if(!ActionMenuManager.oTarget?.notBlastable){
            const mineList = ActionMenuManager.oPC.getInventory().filter((item) => {
              return item.baseItemId == 58
            });
            for(let i = 0, len = mineList.length; i < len; i++){
              const item = mineList[i];
              const setMine = new GameState.ActionFactory.ActionSetMine();
              setMine.setOwner(ActionMenuManager.oPC);
              setMine.setTarget(ActionMenuManager.oTarget);
              setMine.setParameter(0, ActionParameterType.DWORD, item);
              setMine.setParameter(1, ActionParameterType.DWORD, ActionMenuManager.oTarget);
              setMine.setParameter(2, ActionParameterType.FLOAT, ActionMenuManager.oTarget.position.x);
              setMine.setParameter(3, ActionParameterType.FLOAT, ActionMenuManager.oTarget.position.y);
              setMine.setParameter(4, ActionParameterType.FLOAT, ActionMenuManager.oTarget.position.z);
              ActionMenuManager.ActionPanels.targetPanels[2].addAction(new GameState.ActionMenuManager.ActionMenuItem({
                action: setMine,
                icon: item.getIcon()
              }));
            }
          }
        }
      }else if(ActionMenuManager.oTarget instanceof GameState.Module.ModuleArea.ModuleDoor){
        if(ActionMenuManager.oTarget.isLocked()){
          if(bHasSecuritySkill){
            const action = new GameState.ActionFactory.ActionUnlockObject();
            action.setOwner(ActionMenuManager.oPC);
            action.setParameter(0, ActionParameterType.DWORD, this.oTarget);
            action.setParameter(1, ActionParameterType.DWORD, ModuleObjectConstant.OBJECT_INVALID);

            ActionMenuManager.ActionPanels.targetPanels[1].addAction(new GameState.ActionMenuManager.ActionMenuItem({
              action: action,
              icon: securityTalent.icon
            }));
          }

          const securityTunnelers = this.oPC.getInventory().filter((item) => {
            return item.baseItemId == 59
          });

          if(securityTunnelers.length){
            const item = securityTunnelers[0];
            
            const action = new GameState.ActionFactory.ActionUnlockObject();
            action.setOwner(ActionMenuManager.oPC);
            action.setParameter(0, ActionParameterType.DWORD, this.oTarget);
            action.setParameter(1, ActionParameterType.DWORD, securityTunnelers[0]);
            ActionMenuManager.ActionPanels.targetPanels[1].addAction(new GameState.ActionMenuManager.ActionMenuItem({
              action: action,
              icon: item.getIcon()
            }));
          }
          
          if(!this.oTarget?.notBlastable){
            ActionMenuManager.ActionPanels.targetPanels[0].addAction(new GameState.ActionMenuManager.ActionMenuItem({
              action: {
                type: ActionType.ActionPhysicalAttacks,
                object: ActionMenuManager.oTarget,
                talent: undefined
              },
              icon: 'i_attack'
            }));
          }

          const mineList = this.oPC.getInventory().filter((item) => {
            return item.baseItemId == 58
          });

          if(!this.oTarget?.notBlastable){
            for(let i = 0, len = mineList.length; i < len; i++){
              const item = mineList[i];
              const setMine = new GameState.ActionFactory.ActionSetMine();
              setMine.setOwner(ActionMenuManager.oPC);
              setMine.setTarget(ActionMenuManager.oTarget);
              setMine.setParameter(0, ActionParameterType.DWORD, item);
              setMine.setParameter(1, ActionParameterType.DWORD, ActionMenuManager.oTarget);
              setMine.setParameter(2, ActionParameterType.FLOAT, ActionMenuManager.oTarget.position.x);
              setMine.setParameter(3, ActionParameterType.FLOAT, ActionMenuManager.oTarget.position.y);
              setMine.setParameter(4, ActionParameterType.FLOAT, ActionMenuManager.oTarget.position.z);
              ActionMenuManager.ActionPanels.targetPanels[2].addAction(new GameState.ActionMenuManager.ActionMenuItem({
                action: setMine,
                icon: item.getIcon()
              }));
            }
          }
        }
      }else if(ActionMenuManager.oTarget instanceof GameState.Module.ModuleArea.ModuleCreature && ActionMenuManager.oTarget.isHostile(GameState.PartyManager.party[0])){
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

      }else if(ActionMenuManager.oTarget instanceof GameState.Module.ModuleArea.ModuleTrigger){
        if(ActionMenuManager.oTarget.type == ModuleTriggerType.TRAP){
          /**
           * Disarm Mine
           */
          if(bHasDemolitionsSkill && ActionMenuManager.oTarget.trapDisarmable){
            const action = new GameState.ActionFactory.ActionDisarmMine();
            action.setOwner(ActionMenuManager.oPC);
            action.setParameter(0, ActionParameterType.DWORD, this.oTarget);
            ActionMenuManager.ActionPanels.targetPanels[0].addAction(new GameState.ActionMenuManager.ActionMenuItem({
              action: action,
              icon: 'gui_mp_dismined'
            }));
          }

          /**
           * Recover Mine
           */
          if(bHasDemolitionsSkill){
            const action = new GameState.ActionFactory.ActionRecoverMine();
            action.setOwner(ActionMenuManager.oPC);
            action.setParameter(0, ActionParameterType.DWORD, this.oTarget);
            ActionMenuManager.ActionPanels.targetPanels[1].addAction(new GameState.ActionMenuManager.ActionMenuItem({
              action: action,
              icon: 'gui_mp_recmined'
            }));
          }
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

  static onTargetMenuAction(index: number = 0){
    if(!ActionMenuManager.oPC){ return; }

    const action = ActionMenuManager.ActionPanels.targetPanels[index].getSelectedAction();
    if(action){
      if(index==0){
        if(action.action && action.action.type == ActionType.ActionPhysicalAttacks){
          ActionMenuManager.oPC.attackCreature(action.target, undefined);
        }else if(action.action){
          console.log('onTargetMenuAction', action);
          ActionMenuManager.oPC.actionQueue.addFront(
            action.action
          ); 
        }else if(action.talent instanceof TalentObject){
          action.talent.useTalentOnObject(action.target, ActionMenuManager.oPC);
        }
      }else if(action.talent){
        action.talent.useTalentOnObject(action.target, ActionMenuManager.oPC);
      }else if(action.action){
        console.log('onTargetMenuAction', action);
        ActionMenuManager.oPC.actionQueue.addFront(
          action.action
        );
      }
    }
  }

  static onSelfMenuAction(index: number = 0){
    if(!ActionMenuManager.oPC){ return; }
    
    const action = ActionMenuManager.ActionPanels.selfPanels[index].getSelectedAction();
    if(!action){ return; }

    if(action.talent instanceof TalentObject){
      //GameState.getCurrentPlayer().useTalent(action.talent, action.target);
      action.talent.useTalentOnObject(ActionMenuManager.oPC, ActionMenuManager.oPC);
    }
  }

}
