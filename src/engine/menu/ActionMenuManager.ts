import { GameState } from "@/GameState";
import { ActionMenuPanel } from "@/engine/menu/ActionMenuPanel";
import { ActionMenuItem } from "@/engine/menu/ActionMenuItem";
import type { ModuleObject } from "@/module/ModuleObject";
import type { ModuleCreature } from "@/module/ModuleCreature";
import type { ModuleItem } from "@/module/ModuleItem";
import { IActionPanelLists } from "@/interface/gui/IActionPanelLists";
import { GameEngineType } from "@/enums/engine/GameEngineType";
import { ActionType } from "@/enums/actions/ActionType";
import { SkillType } from "@/enums/nwscript/SkillType";
import { ActionParameterType, ModuleObjectConstant, ModuleTriggerType } from "@/enums";
import { TalentObject } from "@/talents/TalentObject";
import { TalentSpell } from "@/talents/TalentSpell";
import {
  UsableItemMask,
  getUsableItemMenuName,
  isGrenadeHostileItem,
  isLeaderUsableItem,
  isUsableItemActive,
} from "@/engine/menu/action-menu-usable";
import { getCombatMenuFeatIds } from "@/engine/menu/action-menu-combat-feats";
import {
  buildEquipmentForceMenuSpellList,
  buildForceMenuSpellList,
  getHostileTargetExclusionFlags,
  isDroidForceMenuCaster,
  isForceMenuSpellEnabled,
} from "@/engine/menu/action-menu-force-powers";

/**
 * ActionMenuManager class.
 *
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * Populates mipc personal/target action slots like retail
 * CSWCCreature::{GetPersonalActions,GetTargetActions}.
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

  static areaIsRestricted(): boolean {
    return !!ActionMenuManager.oPC?.area?.restrictMode;
  }

  /** True if acting PC has a lightsaber in either hand (TSL DoorSaber gate). */
  static oPCHasLightsaber(): boolean {
    const pc = ActionMenuManager.oPC;
    if(!pc) return false;
    const rh = pc.equipment?.RIGHTHAND;
    const lh = pc.equipment?.LEFTHAND;
    return !!(rh?.isLightsaber?.() || lh?.isLightsaber?.());
  }

  /** Retail GetSelfForcePowers → personal slot 0. */
  static populateSelfForcePowers(){
    if(!ActionMenuManager.oPC) return;
    // ClassInfo::GetMenuInfo returns empty while area restrict_mode != 0.
    if(ActionMenuManager.areaIsRestricted()) return;

    const resource = ActionMenuManager.oPC.getForceMenuResource();
    const forceItemMask = ActionMenuManager.oPC.getForceItemMask();
    // Self uses known class spells only (not armband CastSpell props).
    const entries = buildForceMenuSpellList(
      ActionMenuManager.oPC.getClassSpells(),
      'friendly'
    );

    for(let i = 0; i < entries.length; i++){
      const { spell } = entries[i];
      const cost = ActionMenuManager.oPC.getAdjustedForcePointCost(spell);
      // Retail GetSelfForcePowers passes distanceSq = 0.0001
      const enabled = isForceMenuSpellEnabled(spell, {
        resource,
        cost,
        distanceSq: 0.0001,
        forceItemMask,
      });
      ActionMenuManager.ActionPanels.selfPanels[0].addAction(new GameState.ActionMenuManager.ActionMenuItem({
        talent: spell,
        target: ActionMenuManager.oPC,
        icon: spell.iconresref,
        enabled,
        name: spell.name || spell.label || '',
      }));
    }
  }

  /** Retail GetHostileForcePowers → target slot 1. */
  static populateHostileForcePowers(){
    if(!ActionMenuManager.oPC || !ActionMenuManager.oTarget) return;
    if(ActionMenuManager.areaIsRestricted()) return;

    const exclusionFlags = getHostileTargetExclusionFlags(ActionMenuManager.oTarget);
    const resource = ActionMenuManager.oPC.getForceMenuResource();
    const forceItemMask = ActionMenuManager.oPC.getForceItemMask();
    const dx = ActionMenuManager.oTarget.position.x - ActionMenuManager.oPC.position.x;
    const dy = ActionMenuManager.oTarget.position.y - ActionMenuManager.oPC.position.y;
    const dz = ActionMenuManager.oTarget.position.z - ActionMenuManager.oPC.position.z;
    const distanceSq = dx * dx + dy * dy + dz * dz;

    const entries = isDroidForceMenuCaster(ActionMenuManager.oPC)
      ? buildEquipmentForceMenuSpellList(ActionMenuManager.oPC, exclusionFlags)
      : buildForceMenuSpellList(
          ActionMenuManager.oPC.getClassSpells(),
          'hostile',
          exclusionFlags
        );

    for(let i = 0; i < entries.length; i++){
      const entry = entries[i];
      const spell = entry.spell;
      let enabled: boolean;
      if(entry.item){
        // GetEquipmentForcePowers: charges + item masks (no FP gate).
        enabled = isUsableItemActive(ActionMenuManager.oPC, entry.item)
          && isForceMenuSpellEnabled(spell, {
            resource: Number.POSITIVE_INFINITY,
            cost: 0,
            distanceSq,
            forceItemMask,
          });
      }else{
        const cost = ActionMenuManager.oPC.getAdjustedForcePointCost(spell);
        enabled = isForceMenuSpellEnabled(spell, {
          resource,
          cost,
          distanceSq,
          forceItemMask,
        });
      }
      ActionMenuManager.ActionPanels.targetPanels[1].addAction(new GameState.ActionMenuManager.ActionMenuItem({
        talent: spell,
        item: entry.item,
        target: ActionMenuManager.oTarget,
        icon: spell.iconresref || entry.item?.getIcon?.() || '',
        enabled,
        name: spell.name || spell.label || '',
      }));
    }
  }

  /** Retail GetUsableItems(mask) for a personal slot. */
  static populateUsableItems(panelIndex: number, mask: number){
    if(!ActionMenuManager.oPC) return;
    const panel = ActionMenuManager.ActionPanels.selfPanels[panelIndex];
    if(!panel) return;

    // Retail skips equipped bands/belt in restricted areas, but still scans
    // inventory so plot items can pass IsLeaderUsableItem.
    if(!ActionMenuManager.areaIsRestricted()){
      const equipSlots: (keyof ModuleCreature['equipment'])[] = ['LEFTARMBAND', 'RIGHTARMBAND', 'BELT'];
      for(let i = 0; i < equipSlots.length; i++){
        const item = ActionMenuManager.oPC.equipment[equipSlots[i]] as ModuleItem;
        if(!item) continue;
        if(!isLeaderUsableItem(ActionMenuManager.oPC, item, true, mask)) continue;
        panel.addAction(new GameState.ActionMenuManager.ActionMenuItem({
          item,
          target: ActionMenuManager.oPC,
          icon: item.getIcon(),
          enabled: isUsableItemActive(ActionMenuManager.oPC, item, true),
          name: getUsableItemMenuName(item),
        }));
      }
    }

    const inventory = ActionMenuManager.oPC.getInventory() || [];
    for(let i = 0; i < inventory.length; i++){
      const item = inventory[i];
      if(!item) continue;
      if(!isLeaderUsableItem(ActionMenuManager.oPC, item, false, mask)) continue;
      panel.addAction(new GameState.ActionMenuManager.ActionMenuItem({
        item,
        target: ActionMenuManager.oPC,
        icon: item.getIcon(),
        enabled: isUsableItemActive(ActionMenuManager.oPC, item, false),
        name: getUsableItemMenuName(item),
      }));
    }
  }

  /** Retail GetHostileItems — grenades on hostile creature target slot 2. */
  static populateHostileItems(){
    if(!ActionMenuManager.oPC || !ActionMenuManager.oTarget || ActionMenuManager.areaIsRestricted()) return;
    const inventory = ActionMenuManager.oPC.getInventory() || [];
    for(let i = 0; i < inventory.length; i++){
      const item = inventory[i];
      if(!isGrenadeHostileItem(item)) continue;
      ActionMenuManager.ActionPanels.targetPanels[2].addAction(new GameState.ActionMenuManager.ActionMenuItem({
        item,
        target: ActionMenuManager.oTarget,
        icon: item.getIcon(),
        enabled: isUsableItemActive(ActionMenuManager.oPC, item),
        name: item.getName(),
      }));
    }
  }

  static UpdateMenuActions(){
    for(let i = 0; i < ActionMenuManager.TARGET_MENU_COUNT; i++){
      ActionMenuManager.ActionPanels.targetPanels[i].clearActions();
    }

    for(let i = 0; i < ActionMenuManager.SELF_MENU_COUNT; i++){
      ActionMenuManager.ActionPanels.selfPanels[i].clearActions();
    }

    if(!ActionMenuManager.oPC){
      return ActionMenuManager.ActionPanels;
    }

    const securityTalent = ActionMenuManager.oPC.skills[SkillType.SECURITY];
    const bCanUseSecurity = ActionMenuManager.oPC.getCanUseSkill(SkillType.SECURITY);
    const bCanUseDemolitions = ActionMenuManager.oPC.getCanUseSkill(SkillType.DEMOLITIONS);

    const restricted = ActionMenuManager.areaIsRestricted();

    if(ActionMenuManager.oTarget instanceof GameState.Module.ModuleArea.ModuleObject){

      if(ActionMenuManager.oTarget instanceof GameState.Module.ModuleArea.ModulePlaceable){
        // Retail placeable slot 1: Security when locked + useable + can use skill.
        if(
          ActionMenuManager.oTarget.isLocked() &&
          ActionMenuManager.oTarget.isUseable() &&
          bCanUseSecurity
        ){
          const action = new GameState.ActionFactory.ActionUnlockObject();
          action.setOwner(ActionMenuManager.oPC as ModuleObject);
          action.setParameter(0, ActionParameterType.DWORD, this.oTarget);
          action.setParameter(1, ActionParameterType.DWORD, ModuleObjectConstant.OBJECT_INVALID);
          ActionMenuManager.ActionPanels.targetPanels[1].addAction(new GameState.ActionMenuManager.ActionMenuItem({
            action: action,
            icon: securityTalent.getIcon()
          }));
        }
        // Retail placeable slot 0: Bash when closed/useable/not blastable and
        // area restrict_mode == 0 (independent of lock state).
        if(
          !restricted &&
          !ActionMenuManager.oTarget.isOpen() &&
          ActionMenuManager.oTarget.isUseable() &&
          !ActionMenuManager.oTarget.notBlastable
        ){
          const player = GameState.PartyManager.Player;
          // Retail dims Bash on a locked placeable when a companion is acting,
          // the player creature is dead/in-party, and PartyInteract is false.
          const bashEnabled = (
            !ActionMenuManager.oTarget.isLocked() ||
            !player ||
            ActionMenuManager.oPC === player ||
            !player.isPartyMember() ||
            !player.isDead() ||
            !!ActionMenuManager.oTarget.partyInteract
          );
          ActionMenuManager.ActionPanels.targetPanels[0].addAction(new GameState.ActionMenuManager.ActionMenuItem({
            action: {
              type: ActionType.ActionPhysicalAttacks,
              object: ActionMenuManager.oTarget,
              talent: undefined
            },
            target: ActionMenuManager.oTarget,
            icon: 'i_attack',
            name: 'Bash',
            enabled: bashEnabled,
          }));
        }
        // Retail GetTargetActions TARGET_SWITCHING path: an unlocked hostile
        // placeable redirects slot 1 to hostile force powers (reputation < 11).
        if(
          !ActionMenuManager.oTarget.isLocked() &&
          ActionMenuManager.oTarget.isHostile(ActionMenuManager.oPC as ModuleObject)
        ){
          ActionMenuManager.populateHostileForcePowers();
        }
      }else if(ActionMenuManager.oTarget instanceof GameState.Module.ModuleArea.ModuleDoor){
        // Retail door slot 1: Security when useable, KeyRequired == 0, and
        // GetCanUseSkill(Security). Unlock action itself still needs locked.
        if(
          ActionMenuManager.oTarget.isUseable() &&
          !ActionMenuManager.oTarget.keyRequired &&
          bCanUseSecurity
        ){
          const action = new GameState.ActionFactory.ActionUnlockObject();
          action.setOwner(ActionMenuManager.oPC as ModuleObject);
          action.setParameter(0, ActionParameterType.DWORD, this.oTarget);
          action.setParameter(1, ActionParameterType.DWORD, ModuleObjectConstant.OBJECT_INVALID);

          ActionMenuManager.ActionPanels.targetPanels[1].addAction(new GameState.ActionMenuManager.ActionMenuItem({
            action: action,
            icon: securityTalent.getIcon()
          }));
        }
        // TSL DoorSaber (engine 0x43): locked door + lightsaber in either hand
        if(
          GameState.GameKey === GameEngineType.TSL &&
          ActionMenuManager.oTarget.isLocked() &&
          ActionMenuManager.oTarget.isUseable() &&
          !ActionMenuManager.oTarget.isOpen() &&
          ActionMenuManager.oPCHasLightsaber()
        ){
          const saber = new GameState.ActionFactory.ActionDoorSaber();
          saber.setOwner(ActionMenuManager.oPC as ModuleObject);
          saber.setParameter(0, ActionParameterType.DWORD, this.oTarget);
          ActionMenuManager.ActionPanels.targetPanels[2].addAction(new GameState.ActionMenuManager.ActionMenuItem({
            action: saber,
            icon: 'i_attack',
            name: 'Cut Open',
          }));
        }
        // Retail door slot 0: Bash when anim is not OPENED1/OPENED2, open
        // flag is clear, NotBlastable == 0, Useable, and restrict_mode == 0.
        if(
          !restricted &&
          !ActionMenuManager.oTarget.isOpen() &&
          ActionMenuManager.oTarget.isUseable() &&
          !ActionMenuManager.oTarget.notBlastable
        ){
          ActionMenuManager.ActionPanels.targetPanels[0].addAction(new GameState.ActionMenuManager.ActionMenuItem({
            action: {
              type: ActionType.ActionPhysicalAttacks,
              object: ActionMenuManager.oTarget,
              talent: undefined
            },
            target: ActionMenuManager.oTarget,
            icon: 'i_attack',
            name: 'Bash',
          }));
        }
      }else if(
        ActionMenuManager.oTarget instanceof GameState.Module.ModuleArea.ModuleCreature &&
        ActionMenuManager.oTarget.isHostile(ActionMenuManager.oPC as ModuleObject)
      ){
        // Retail GetTargetActions slot 0: GetCombatFeatsSkills then
        // GetHostileInterfaceActions(Attack). Both skip when restrict_mode.
        if(!restricted){
          // GetHostileInterfaceActions — Attack (i_attack). Listed first so
          // selectedIndex 0 stays Attack; retail appends it after feats.
          ActionMenuManager.ActionPanels.targetPanels[0].addAction(new GameState.ActionMenuManager.ActionMenuItem({
            action: {
              type: ActionType.ActionPhysicalAttacks,
              object: ActionMenuManager.oTarget,
              talent: undefined
            },
            icon: 'i_attack',
            name: 'Attack',
          }));

          // GetCombatFeatsSkills/CheckFeat — one highest-owned feat per chain.
          const featIds = getCombatMenuFeatIds(
            id => ActionMenuManager.oPC.getHasFeat(id),
            ActionMenuManager.oPC.isRangedEquipped()
          );
          for(let i = 0; i < featIds.length; i++){
            // Bonus-feat effects pass CheckFeat even when not in the base feat list.
            const feat = ActionMenuManager.oPC.getFeat(featIds[i])
              || new GameState.TalentFeat(featIds[i]);
            ActionMenuManager.ActionPanels.targetPanels[0].addAction(new GameState.ActionMenuManager.ActionMenuItem({
              talent: feat,
              target: ActionMenuManager.oTarget,
              icon: feat.icon,
              name: feat.name || feat.label || '',
            }));
          }

          ActionMenuManager.populateHostileForcePowers();
          ActionMenuManager.populateHostileItems();
        }

      }else if(ActionMenuManager.oTarget instanceof GameState.Module.ModuleArea.ModuleTrigger){
        if(ActionMenuManager.oTarget.type == ModuleTriggerType.TRAP){
          if(bCanUseDemolitions && ActionMenuManager.oTarget.trapDisarmable){
            const action = new GameState.ActionFactory.ActionDisarmMine();
            action.setOwner(ActionMenuManager.oPC as ModuleObject);
            action.setParameter(0, ActionParameterType.DWORD, this.oTarget);
            ActionMenuManager.ActionPanels.targetPanels[0].addAction(new GameState.ActionMenuManager.ActionMenuItem({
              action: action,
              target: ActionMenuManager.oTarget,
              icon: 'i_disablemine',
              name: 'Disable Mine',
            }));
          }

          if(bCanUseDemolitions){
            const action = new GameState.ActionFactory.ActionRecoverMine();
            action.setOwner(ActionMenuManager.oPC as ModuleObject);
            action.setParameter(0, ActionParameterType.DWORD, this.oTarget);
            ActionMenuManager.ActionPanels.targetPanels[1].addAction(new GameState.ActionMenuManager.ActionMenuItem({
              action: action,
              target: ActionMenuManager.oTarget,
              icon: 'i_recovermine',
              name: 'Recover Mine',
            }));
          }
        }
      }

    }

    // Retail GetPersonalActions slots 0–3
    ActionMenuManager.populateSelfForcePowers();
    ActionMenuManager.populateUsableItems(1, UsableItemMask.MEDICAL);
    ActionMenuManager.populateUsableItems(2, UsableItemMask.OTHER);
    ActionMenuManager.populateUsableItems(3, UsableItemMask.MINES);

    return ActionMenuManager.ActionPanels;
  }

  static targetActionCount(){
    return ActionMenuManager.ActionPanels.targetPanels.reduce(
      (previousValue, currentValue) => {
        return previousValue += currentValue.actions.length;
      }, 0
    );
  }

  static selfActionCount(){
    return ActionMenuManager.ActionPanels.selfPanels.reduce(
      (previousValue, currentValue) => {
        return previousValue += currentValue.actions.length;
      }, 0
    );
  }

  /**
   * Retail player input: ActionManager(1) clears the queue, then UseItem / CastSpell /
   * AddAttackActions (HandlePlayerToServerInputMessage cases 2/9/0x12).
   */
  static activateMenuItem(menuItem: ActionMenuItem, defaultTarget?: ModuleObject){
    if(!ActionMenuManager.oPC || !menuItem) return;
    if(menuItem.enabled === false) return;

    const target = menuItem.target || defaultTarget || ActionMenuManager.oTarget;
    const pc = ActionMenuManager.oPC;

    if(menuItem.action?.type === ActionType.ActionCounterSpell){
      GameState.ActionFactory.AddCounterSpellActions(
        pc as any,
        target as any,
        { clear: true }
      );
      return;
    }

    // Mirror CSWSCreature::ActionManager(1) before UseItem / CastSpell / Attack
    pc.clearAllActions(true);

    if(menuItem.action && menuItem.action.type == ActionType.ActionPhysicalAttacks){
      pc.attackCreature(target as ModuleCreature, undefined);
      return;
    }

    // Explicit target actions (security, disable/recover mine) take precedence
    // over their optional item metadata. Retail dispatches the action callback.
    if(menuItem.action){
      pc.actionQueue.addFront(menuItem.action);
      return;
    }

    if(menuItem.item){
      const useTarget = target || pc;
      menuItem.item.useItemOnObject(pc, useTarget as ModuleObject, { isUserAction: true });
      return;
    }

    if(menuItem.talent instanceof TalentObject){
      if(menuItem.talent instanceof TalentSpell){
        menuItem.talent.useTalentOnObject(target || pc, pc, { isUserAction: true });
      }else{
        menuItem.talent.useTalentOnObject(target || pc, pc);
      }
    }
  }

  static onTargetMenuAction(index: number = 0){
    if(!ActionMenuManager.oPC){ return; }

    const action = ActionMenuManager.ActionPanels.targetPanels[index].getSelectedAction();
    if(action){
      ActionMenuManager.activateMenuItem(action, ActionMenuManager.oTarget);
    }
  }

  static onSelfMenuAction(index: number = 0){
    if(!ActionMenuManager.oPC){ return; }

    const action = ActionMenuManager.ActionPanels.selfPanels[index].getSelectedAction();
    if(!action){ return; }

    ActionMenuManager.activateMenuItem(action, ActionMenuManager.oPC);
  }

  /**
   * Inventory BTN_USEITEM — retail InstantUseItem (not animated UseItem).
   * Target is ignored; impact applies on the controlled PC.
   */
  static useInventoryItem(item: ModuleItem, _target?: ModuleObject){
    if(!ActionMenuManager.oPC || !item) return;
    item.instantUseItem(ActionMenuManager.oPC);
  }

}
