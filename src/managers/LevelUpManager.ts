import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import {
  beginLevelUpDraft,
  validateLevelUpDraft,
  type LevelUpDraft,
  LevelUpAbilityIndex,
} from "@/engine/rules/level-up";
import { CharGenAttribute } from "@/enums/chargen/CharGenAttribute";

/**
 * Session state for the in-game level-up wizard (CSWGuiLevelUpPanel).
 */
export class LevelUpManager {
  static creature: ModuleCreature | null = null;
  static draft: LevelUpDraft | null = null;
  static active = false;
  static abilityStepDone = false;
  static skillsStepDone = false;
  static featsStepDone = false;
  static powersStepDone = false;

  static clear() {
    LevelUpManager.creature = null;
    LevelUpManager.draft = null;
    LevelUpManager.active = false;
    LevelUpManager.abilityStepDone = false;
    LevelUpManager.skillsStepDone = false;
    LevelUpManager.featsStepDone = false;
    LevelUpManager.powersStepDone = false;
  }

  static begin(creature: ModuleCreature): boolean {
    if(!creature?.canLevelUp?.()) return false;
    const draft = beginLevelUpDraft(creature, GameState.GameKey);
    if(!draft) return false;
    LevelUpManager.creature = creature;
    LevelUpManager.draft = draft;
    LevelUpManager.active = true;
    LevelUpManager.abilityStepDone = !draft.hasAbilityStep;
    LevelUpManager.skillsStepDone = !draft.hasSkillsStep;
    LevelUpManager.featsStepDone = !draft.hasFeatsStep;
    LevelUpManager.powersStepDone = !draft.hasPowersStep;
    return true;
  }

  static charGenAttrToLevelUpIndex(attr: CharGenAttribute): LevelUpAbilityIndex {
    switch(attr){
      case CharGenAttribute.STR: return LevelUpAbilityIndex.STR;
      case CharGenAttribute.DEX: return LevelUpAbilityIndex.DEX;
      case CharGenAttribute.CON: return LevelUpAbilityIndex.CON;
      case CharGenAttribute.INT: return LevelUpAbilityIndex.INT;
      case CharGenAttribute.WIS: return LevelUpAbilityIndex.WIS;
      case CharGenAttribute.CHA: return LevelUpAbilityIndex.CHA;
      default: return LevelUpAbilityIndex.NONE;
    }
  }

  static levelUpIndexToCharGenAttr(index: LevelUpAbilityIndex): CharGenAttribute {
    switch(index){
      case LevelUpAbilityIndex.STR: return CharGenAttribute.STR;
      case LevelUpAbilityIndex.DEX: return CharGenAttribute.DEX;
      case LevelUpAbilityIndex.CON: return CharGenAttribute.CON;
      case LevelUpAbilityIndex.INT: return CharGenAttribute.INT;
      case LevelUpAbilityIndex.WIS: return CharGenAttribute.WIS;
      case LevelUpAbilityIndex.CHA: return CharGenAttribute.CHA;
      default: return CharGenAttribute.STR;
    }
  }

  static canAccept(): boolean {
    const d = LevelUpManager.draft;
    if(!d) return false;
    if(d.hasAbilityStep && !LevelUpManager.abilityStepDone) return false;
    if(d.hasSkillsStep && !LevelUpManager.skillsStepDone) return false;
    if(d.hasFeatsStep && !LevelUpManager.featsStepDone) return false;
    if(d.hasPowersStep && !LevelUpManager.powersStepDone) return false;
    return validateLevelUpDraft(d);
  }

  static commit(): boolean {
    const creature = LevelUpManager.creature;
    const draft = LevelUpManager.draft;
    if(!creature || !draft) return false;
    if(!LevelUpManager.canAccept()) return false;
    const ok = creature.applyLevelUp(draft);
    LevelUpManager.clear();
    return ok;
  }

  /**
   * Open the level-up wizard. Returns TRUE if shown (NWScript ShowLevelUpGUI).
   */
  static async showLevelUpGUIAsync(creature?: ModuleCreature): Promise<boolean> {
    const target = creature || GameState.getCurrentPlayer?.() || GameState.PartyManager?.party?.[0];
    if(!target || !target.canLevelUp()) return false;
    await GameState.MenuManager.EnsureLevelUpMenus();
    if(!LevelUpManager.begin(target)) return false;
    const menu = GameState.MenuManager?.MenuLevelUp;
    if(!menu){
      LevelUpManager.clear();
      return false;
    }
    menu.openFor?.(target);
    return true;
  }

  static showLevelUpGUI(creature?: ModuleCreature): boolean {
    const target = creature || GameState.getCurrentPlayer?.() || GameState.PartyManager?.party?.[0];
    if(!target || !target.canLevelUp()) return false;
    // Fire-and-forget ensure + open; NWScript gets optimistic TRUE if canLevelUp
    void LevelUpManager.showLevelUpGUIAsync(target);
    return true;
  }
}
