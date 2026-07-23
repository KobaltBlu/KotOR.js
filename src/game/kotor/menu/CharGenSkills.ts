import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton, GUIControl } from "@/gui";
import {
  canDecreaseSkillRank,
  canIncreaseSkillRank,
  getSkillPointCost,
  isClassSkill,
  isSkillBlockedForCreature,
  STRREF_CLASS_SKILL,
  STRREF_CROSS_CLASS_SKILL,
} from "@/engine/rules/skill-points";
import { SkillType } from "@/enums/nwscript/SkillType";

/**
 * CharGenSkills class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CharGenSkills.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CharGenSkills extends GameMenu {

  MAIN_TITLE_LBL: GUILabel;
  SUB_TITLE_LBL: GUILabel;
  REMAINING_SELECTIONS_LBL: GUILabel;
  SELECTIONS_REMAINING_LBL: GUILabel;
  COMPUTER_USE_POINTS_BTN: GUIButton;
  COMPUTER_USE_LBL: GUILabel;
  COM_MINUS_BTN: GUIButton;
  COM_PLUS_BTN: GUIButton;
  DEMOLITIONS_POINTS_BTN: GUIButton;
  DEMOLITIONS_LBL: GUILabel;
  DEM_MINUS_BTN: GUIButton;
  DEM_PLUS_BTN: GUIButton;
  STEALTH_POINTS_BTN: GUIButton;
  STEALTH_LBL: GUILabel;
  STE_MINUS_BTN: GUIButton;
  STE_PLUS_BTN: GUIButton;
  AWARENESS_POINTS_BTN: GUIButton;
  AWARENESS_LBL: GUILabel;
  AWA_MINUS_BTN: GUIButton;
  AWA_PLUS_BTN: GUIButton;
  PERSUADE_POINTS_BTN: GUIButton;
  PER_PLUS_BTN: GUIButton;
  PERSUADE_LBL: GUILabel;
  PER_MINUS_BTN: GUIButton;
  REPAIR_POINTS_BTN: GUIButton;
  REPAIR_LBL: GUILabel;
  REP_MINUS_BTN: GUIButton;
  REP_PLUS_BTN: GUIButton;
  DESC_LBL: GUILabel;
  COST_LBL: GUILabel;
  COST_POINTS_LBL: GUILabel;
  SECURITY_POINTS_BTN: GUIButton;
  SEC_PLUS_BTN: GUIButton;
  SEC_MINUS_BTN: GUIButton;
  SECURITY_LBL: GUILabel;
  TREAT_INJURY_POINTS_BTN: GUIButton;
  TRE_MINUS_BTN: GUIButton;
  TREAT_INJURY_LBL: GUILabel;
  LB_DESC: GUIListBox;
  CLASSSKL_LBL: GUILabel;
  BTN_RECOMMENDED: GUIButton;
  BTN_ACCEPT: GUIButton;
  BTN_BACK: GUIButton;
  TRE_PLUS_BTN: GUIButton;

  selectedSkillIndex: number = SkillType.COMPUTER_USE;
  levelUpMode: boolean = false;
  levelUpAcceptCallback?: () => void;

  constructor(){
    super();
    this.gui_resref = 'skchrgen';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve) => {
      
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });

      this.BTN_ACCEPT.addEventListener('click', (e) => {
        e.stopPropagation();
        if(this.levelUpMode){
          this.levelUpAcceptCallback?.();
          this.levelUpAcceptCallback = undefined;
          this.levelUpMode = false;
          this.close();
          return;
        }
        GameState.CharGenManager.applyTempSkillsToCreature();
        this.manager.CharGenCustomPanel?.skillCreationCompleted?.();
        this.manager.CharGenMain?.updateAttributes?.();
        this.close();
      });

      this.BTN_RECOMMENDED.addEventListener('click', (e) => {
        e.stopPropagation();
        this.applyRecommendedSkills();
        this.updateButtonStates();
        this.selectSkill(this.selectedSkillIndex);
      });

      this.bindSkillControls();
      resolve();
    });
  }

  private bindSkillControls() {
    const plusButtons = [
      this.COM_PLUS_BTN, this.DEM_PLUS_BTN, this.STE_PLUS_BTN, this.AWA_PLUS_BTN,
      this.PER_PLUS_BTN, this.REP_PLUS_BTN, this.SEC_PLUS_BTN, this.TRE_PLUS_BTN,
    ];
    const minusButtons = [
      this.COM_MINUS_BTN, this.DEM_MINUS_BTN, this.STE_MINUS_BTN, this.AWA_MINUS_BTN,
      this.PER_MINUS_BTN, this.REP_MINUS_BTN, this.SEC_MINUS_BTN, this.TRE_MINUS_BTN,
    ];
    const pointButtons = [
      this.COMPUTER_USE_POINTS_BTN, this.DEMOLITIONS_POINTS_BTN, this.STEALTH_POINTS_BTN,
      this.AWARENESS_POINTS_BTN, this.PERSUADE_POINTS_BTN, this.REPAIR_POINTS_BTN,
      this.SECURITY_POINTS_BTN, this.TREAT_INJURY_POINTS_BTN,
    ];
    const labels = [
      this.COMPUTER_USE_LBL, this.DEMOLITIONS_LBL, this.STEALTH_LBL, this.AWARENESS_LBL,
      this.PERSUADE_LBL, this.REPAIR_LBL, this.SECURITY_LBL, this.TREAT_INJURY_LBL,
    ];

    for(let i = 0; i < SkillType.MAX_SKILLS; i++){
      const skillId = i;
      plusButtons[i]?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectSkill(skillId);
        this.tryIncreaseSkill(skillId);
      });
      minusButtons[i]?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectSkill(skillId);
        this.tryDecreaseSkill(skillId);
      });

      const select = () => this.selectSkill(skillId);
      pointButtons[i]?.addEventListener('click', (e) => {
        e.stopPropagation();
        select();
      });
      labels[i]?.addEventListener('click', (e) => {
        e.stopPropagation();
        select();
      });

      if(pointButtons[i]){
        pointButtons[i].onHover = () => select();
      }
      if(labels[i]){
        labels[i].onHover = () => select();
      }
    }
  }

  private getCreature() {
    if(this.levelUpMode && GameState.LevelUpManager?.creature){
      return GameState.LevelUpManager.creature;
    }
    return GameState.CharGenManager.selectedCreature;
  }

  tryIncreaseSkill(skillId: number) {
    const creature = this.getCreature();
    if(!creature) return;

    const mgr = GameState.CharGenManager;
    const rank = mgr.getTempSkillRank(skillId);
    if(!canIncreaseSkillRank(creature, skillId, rank, mgr.availSkillPoints)){
      return;
    }

    const cost = getSkillPointCost(creature, skillId, true);
    mgr.setTempSkillRank(skillId, rank + 1);
    mgr.availSkillPoints -= cost;
    this.updateButtonStates();
    this.selectSkill(skillId);
  }

  tryDecreaseSkill(skillId: number) {
    const creature = this.getCreature();
    if(!creature) return;

    const mgr = GameState.CharGenManager;
    const rank = mgr.getTempSkillRank(skillId);
    const baseline = mgr.skillRankBaseline[skillId] | 0;
    if(!canDecreaseSkillRank(rank, baseline)){
      return;
    }

    const cost = getSkillPointCost(creature, skillId, true);
    mgr.setTempSkillRank(skillId, rank - 1);
    mgr.availSkillPoints += cost;
    this.updateButtonStates();
    this.selectSkill(skillId);
  }

  applyRecommendedSkills() {
    const creature = this.getCreature();
    if(!creature) return;

    const mgr = GameState.CharGenManager;
    mgr.resetSkillPoints();
    mgr.availSkillPoints = mgr.getMaxSkillPoints();
    const skillOrder = mgr.getRecommendedOrder();

    let guard = 0;
    const maxIterations = mgr.availSkillPoints * SkillType.MAX_SKILLS + 8;
    let spent = true;
    while(mgr.availSkillPoints > 0 && spent && guard < maxIterations){
      spent = false;
      guard++;
      for(let i = 0; i < SkillType.MAX_SKILLS; i++){
        const skillIndex = skillOrder[i];
        if(skillIndex < 0) continue;
        if(mgr.availSkillPoints <= 0) break;
        if(isSkillBlockedForCreature(creature, skillIndex)) continue;

        const rank = mgr.getTempSkillRank(skillIndex);
        if(!canIncreaseSkillRank(creature, skillIndex, rank, mgr.availSkillPoints)){
          continue;
        }
        const cost = getSkillPointCost(creature, skillIndex, true);
        mgr.setTempSkillRank(skillIndex, rank + 1);
        mgr.availSkillPoints -= cost;
        spent = true;
      }
    }
  }

  selectSkill(skillId: number) {
    this.selectedSkillIndex = skillId;
    const creature = this.getCreature();
    if(!creature) return;

    const skill = creature.skills[skillId];
    const classSkill = isClassSkill(creature, skillId);
    const cost = getSkillPointCost(creature, skillId, true);

    this.COST_POINTS_LBL?.setText(String(cost > 0 ? cost : 0));

    const classStrRef = classSkill ? STRREF_CLASS_SKILL : STRREF_CROSS_CLASS_SKILL;
    const classText = GameState.TLKManager.GetStringById(classStrRef)?.Value
      ?? GameState.TLKManager.TLKStrings?.[classStrRef]?.Value
      ?? '';
    this.CLASSSKL_LBL?.setText(classText);

    const description = skill?.getDescription?.() || '';
    this.LB_DESC?.setItem?.(description);
  }

  show() {
    super.show();
    const mgr = GameState.CharGenManager;
    const creature = this.getCreature();
    // CharGen baseline is always 0; reload any previously accepted ranks into temps.
    mgr.skillRankBaseline = [0, 0, 0, 0, 0, 0, 0, 0];
    if(creature?.skills){
      for(let i = 0; i < SkillType.MAX_SKILLS; i++){
        mgr.setTempSkillRank(i, creature.skills[i]?.rank | 0);
      }
    }else{
      mgr.resetSkillPoints();
    }

    const maxPoints = mgr.getMaxSkillPoints();
    let spent = 0;
    if(creature){
      for(let i = 0; i < SkillType.MAX_SKILLS; i++){
        const rank = mgr.getTempSkillRank(i);
        const cost = getSkillPointCost(creature, i, true);
        if(cost > 0){
          spent += cost * rank;
        }
      }
    }
    mgr.availSkillPoints = Math.max(0, maxPoints - spent);
    this.selectedSkillIndex = SkillType.COMPUTER_USE;
    this.updateButtonStates();
    this.selectSkill(this.selectedSkillIndex);
  }

  updateButtonStates() {
    const mgr = GameState.CharGenManager;
    const creature = this.getCreature();

    this.COMPUTER_USE_POINTS_BTN?.setText(mgr.computerUse);
    this.DEMOLITIONS_POINTS_BTN?.setText(mgr.demolitions);
    this.STEALTH_POINTS_BTN?.setText(mgr.stealth);
    this.AWARENESS_POINTS_BTN?.setText(mgr.awareness);
    this.PERSUADE_POINTS_BTN?.setText(mgr.persuade);
    this.REPAIR_POINTS_BTN?.setText(mgr.repair);
    this.SECURITY_POINTS_BTN?.setText(mgr.security);
    this.TREAT_INJURY_POINTS_BTN?.setText(mgr.treatInjury);
    this.REMAINING_SELECTIONS_LBL?.setText(mgr.availSkillPoints);

    if(!creature) return;

    const plusButtons: (GUIControl | undefined)[] = [
      this.COM_PLUS_BTN, this.DEM_PLUS_BTN, this.STE_PLUS_BTN, this.AWA_PLUS_BTN,
      this.PER_PLUS_BTN, this.REP_PLUS_BTN, this.SEC_PLUS_BTN, this.TRE_PLUS_BTN,
    ];
    const minusButtons: (GUIControl | undefined)[] = [
      this.COM_MINUS_BTN, this.DEM_MINUS_BTN, this.STE_MINUS_BTN, this.AWA_MINUS_BTN,
      this.PER_MINUS_BTN, this.REP_MINUS_BTN, this.SEC_MINUS_BTN, this.TRE_MINUS_BTN,
    ];

    for(let i = 0; i < SkillType.MAX_SKILLS; i++){
      const rank = mgr.getTempSkillRank(i);
      const baseline = mgr.skillRankBaseline[i] | 0;
      const canPlus = canIncreaseSkillRank(creature, i, rank, mgr.availSkillPoints);
      const canMinus = canDecreaseSkillRank(rank, baseline);

      if(plusButtons[i]){
        if(canPlus) plusButtons[i].show();
        else plusButtons[i].hide();
      }
      if(minusButtons[i]){
        if(canMinus) minusButtons[i].show();
        else minusButtons[i].hide();
      }
    }
  }

  reset() {
    const mgr = GameState.CharGenManager;
    mgr.resetSkillPoints();
    mgr.skillRankBaseline = [0, 0, 0, 0, 0, 0, 0, 0];
    mgr.availSkillPoints = mgr.getMaxSkillPoints();
  }
  
}
