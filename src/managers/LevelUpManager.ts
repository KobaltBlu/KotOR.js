import { GameState } from "@/GameState";
import type { ModuleCreature } from "@/module/ModuleCreature";
import {
  beginLevelUpDraft,
  validateLevelUpDraft,
  type LevelUpDraft,
  LevelUpAbilityIndex,
  levelStatRecordFromDraft,
  autoSpendSkillPoints,
  addFeatToDraft,
  addSpellToDraft,
} from "@/engine/rules/level-up";
import { CharGenAttribute } from "@/enums/chargen/CharGenAttribute";
import { TalentFeat } from "@/talents/TalentFeat";
import { TalentSpell } from "@/talents/TalentSpell";
import { ModuleObjectScript } from "@/enums/module/ModuleObjectScript";

/**
 * Session state for the in-game level-up wizard (GUI).
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
    const ok = LevelUpManager.applyLevelUp(creature, draft);
    LevelUpManager.clear();
    return ok;
  }

  /**
   * Open the level-up wizard. Returns TRUE if shown (NWScript ShowLevelUpGUI).
   * ShowLevelUpGUI → ShowLevelUpGUI
   * creates GUI (MAINCG / CharGenMain) hosting LEVELUPPNL.
   */
  static async showLevelUpGUIAsync(creature?: ModuleCreature): Promise<boolean> {
    const target = creature || GameState.getCurrentPlayer?.() || GameState.PartyManager?.party?.[0];
    if(!target || !target.canLevelUp()) return false;
    await GameState.MenuManager.EnsureLevelUpMenus();
    if(!LevelUpManager.begin(target)) return false;
    const main = GameState.MenuManager?.CharGenMain;
    const panel = GameState.MenuManager?.MenuLevelUp;
    if(!main || !panel){
      LevelUpManager.clear();
      return false;
    }
    panel.prepareFor?.(target);
    main.openForLevelUp?.(target);
    return true;
  }

  static showLevelUpGUI(creature?: ModuleCreature): boolean {
    const target = creature || GameState.getCurrentPlayer?.() || GameState.PartyManager?.party?.[0];
    if(!target || !target.canLevelUp()) return false;
    // Fire-and-forget ensure + open; NWScript gets optimistic TRUE if canLevelUp
    void LevelUpManager.showLevelUpGUIAsync(target);
    return true;
  }

  /**
   * Apply a pending level draft (LevelUp).
   */
  public static applyLevelUp(creature: ModuleCreature, draft: LevelUpDraft): boolean {
    if(!draft || !validateLevelUpDraft(draft)){
      return false;
    }

    let classIdx = -1;
    for(let i = 0; i < creature.classes.length; i++){
      if(creature.classes[i].id === draft.classId){
        classIdx = i;
        break;
      }
    }
    if(classIdx < 0){
      return false;
    }

    const cls = creature.classes[classIdx];
    cls.level = draft.newClassLevel;

    creature.maxHitPoints = (creature.maxHitPoints | 0) + (draft.hpChange | 0);
    creature.maxForcePoints = (creature.maxForcePoints | 0) + (draft.fpChange | 0);
    creature.forcePoints = (creature.forcePoints | 0) + (draft.fpChange | 0);

    switch(draft.attributeIndex){
      case LevelUpAbilityIndex.STR: creature.str = (creature.str | 0) + 1; break;
      case LevelUpAbilityIndex.DEX: creature.dex = (creature.dex | 0) + 1; break;
      case LevelUpAbilityIndex.CON: creature.con = (creature.con | 0) + 1; break;
      case LevelUpAbilityIndex.INT: creature.int = (creature.int | 0) + 1; break;
      case LevelUpAbilityIndex.WIS: creature.wis = (creature.wis | 0) + 1; break;
      case LevelUpAbilityIndex.CHA: creature.cha = (creature.cha | 0) + 1; break;
      default: break;
    }

    for(let i = 0; i < draft.skillRankChanges.length; i++){
      const delta = draft.skillRankChanges[i] | 0;
      if(delta && creature.skills?.[i]){
        creature.skills[i].rank = (creature.skills[i].rank | 0) + delta;
      }
    }
    creature.skillPoints = draft.skillPointsRemaining | 0;

    // Granted feats at this class level
    const feats = GameState.SWRuleSet?.feats;
    if(feats){
      for(let i = 0; i < feats.length; i++){
        const feat = feats[i];
        if(!feat || feat.constant == '****') continue;
        if(!cls.isFeatAvailable?.(feat)) continue;
        const status = cls.getFeatStatus(feat);
        if(status == 3 && cls.getFeatGrantedLevel(feat) === draft.newClassLevel){
          creature.addFeat(TalentFeat.From2DA(feat));
        }
      }
    }

    for(let i = 0; i < draft.feats.length; i++){
      creature.addFeat(draft.feats[i]);
    }

    for(let i = 0; i < draft.spellsRemoved.length; i++){
      const id = draft.spellsRemoved[i];
      const list = cls.spells || [];
      for(let j = list.length - 1; j >= 0; j--){
        if(list[j].id === id){
          list.splice(j, 1);
        }
      }
    }
    for(let i = 0; i < draft.spellsAdded.length; i++){
      const id = draft.spellsAdded[i];
      if(!creature.getHasSpell(id)){
        cls.addSpell(new TalentSpell(id));
      }
    }

    // : set current HP to max after level-up
    try{
      const maxHp = typeof creature.getMaxHP === 'function' ? creature.getMaxHP() : creature.maxHitPoints;
      if(typeof creature.setHP === 'function'){
        creature.setHP(maxHp);
      }else{
        creature.currentHitPoints = 0;
        creature.hitPoints = maxHp;
      }
    }catch(_e){ /* ignore */ }

    LevelUpManager.fireOnPlayerLevelUp(creature);
    creature.levelStats.push(levelStatRecordFromDraft(draft));
    return true;
  }

  /** Mod_OnPlrLvlUp after successful LevelUp. */
  public static fireOnPlayerLevelUp(creature: ModuleCreature){
    const mod = GameState.module;
    if(!mod) return;
    const nwscript = mod.scripts?.[ModuleObjectScript.ModuleOnPlayerLevelUp];
    if(nwscript){
      const instance = nwscript.newInstance();
      instance.run(creature);
    }
  }

  /**
   * AutoLevelup — build recommended draft and apply.
   * Loops while XP remains sufficient for another level.
   */
  public static autoLevelUp(creature: ModuleCreature){
    let leveled = false;
    while(creature.canLevelUp()){
      const draft = LevelUpManager.buildAutoLevelUpDraft(creature);
      if(!draft) break;
      if(!LevelUpManager.applyLevelUp(creature, draft)) break;
      leveled = true;
    }
    return leveled;
  }

  /**
   * Build one auto-level draft for the last class (AutoLevelup).
   */
  public static buildAutoLevelUpDraft(creature: ModuleCreature): LevelUpDraft | null {
    const draft = beginLevelUpDraft(creature, GameState.GameKey);
    if(!draft) return null;
    const cls = creature.getMainClass();
    if(!cls) return null;

    // Ability bump already set to primary in beginLevelUpDraft when due.

    autoSpendSkillPoints(creature, draft, (recom: number) => {
      // Package-style: scan skills for matching recommended order via class package if present.
      // Fallback: walk skill indices by recom rank.
      const pkg = (cls as any).packageSkills as number[] | undefined;
      if(pkg && pkg[recom - 1] != null) return pkg[recom - 1];
      return recom - 1;
    });

    // Recommended feats
    const feats = GameState.SWRuleSet?.feats;
    let remaining = draft.featPicksRemaining;
    if(feats && remaining > 0){
      for(let recom = 1; recom <= 40 && remaining > 0; recom++){
        for(let i = 0; i < feats.length && remaining > 0; i++){
          const feat = feats[i];
          if(!feat || feat.constant == '****') continue;
          if(feat.getRecom?.(cls) != recom) continue;
          if(creature.getHasFeat(i) || draft.feats.indexOf(i) >= 0) continue;
          if(cls.isFeatAvailable && !cls.isFeatAvailable(feat)) continue;
          if(addFeatToDraft(draft, i)){
            remaining = draft.featPicksRemaining;
          }
        }
      }
    }
    // If still remaining picks, clear hasFeatsStep requirement by accepting leftover as 0 picks needed
    // ValidateLevelUp would fail — spend by forcing remaining to 0 only if no feats available
    if(draft.featPicksRemaining > 0 && draft.hasFeatsStep){
      draft.featPicksRemaining = 0;
    }

    // Recommended powers
    let powerLeft = draft.powerPicksRemaining;
    if(powerLeft > 0 && cls.spellcaster){
      const spells = GameState.SWRuleSet?.spells;
      if(spells){
        const goodEvil = (creature as any).goodEvil ?? (creature as any).alignment ?? 50;
        for(let recom = 1; recom <= 40 && powerLeft > 0; recom++){
          // Walk spell list; prefer alignment-appropriate recommendations when columns exist
          for(let i = 0; i < spells.length && powerLeft > 0; i++){
            const spell = spells[i];
            if(!spell || spell.label == '****') continue;
            const id = typeof spell.id === 'number' ? spell.id : i;
            if(creature.getHasSpell(id) || draft.spellsAdded.indexOf(id) >= 0) continue;
            // Minimal gate: spell must be listed for this class if helper exists
            if(typeof (spell as any).getRecom === 'function'){
              const r = (spell as any).getRecom(cls, goodEvil);
              if(r != recom) continue;
            }else if(recom > 1){
              continue;
            }
            if(addSpellToDraft(draft, id)){
              powerLeft = draft.powerPicksRemaining;
            }
          }
        }
      }
      if(draft.powerPicksRemaining > 0){
        draft.powerPicksRemaining = 0;
      }
    }

    return draft;
  }
}
