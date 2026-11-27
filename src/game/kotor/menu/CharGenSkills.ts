import { GameState } from "@/GameState";
import { GameMenu } from "@/gui";
import type { GUIListBox, GUILabel, GUIButton } from "@/gui";
import { GameEngineType } from "@/enums/engine";
import { SkillType } from "@/enums/nwscript/SkillType";

/**
 * Per-skill control name prefixes (skchrgen.gui / skchrgen_p.gui), indexed by
 * SkillType (skills.2da row): <labelKey>_LBL, <labelKey>_POINTS_BTN,
 * <key>_MINUS_BTN and <key>_PLUS_BTN.
 */
const SKILL_ROWS: { skill: SkillType; key: string; labelKey: string }[] = [
  { skill: SkillType.COMPUTER_USE, key: 'COM', labelKey: 'COMPUTER_USE' },
  { skill: SkillType.DEMOLITIONS,  key: 'DEM', labelKey: 'DEMOLITIONS' },
  { skill: SkillType.STEALTH,      key: 'STE', labelKey: 'STEALTH' },
  { skill: SkillType.AWARENESS,    key: 'AWA', labelKey: 'AWARENESS' },
  { skill: SkillType.PERSUADE,     key: 'PER', labelKey: 'PERSUADE' },
  { skill: SkillType.REPAIR,       key: 'REP', labelKey: 'REPAIR' },
  { skill: SkillType.SECURITY,     key: 'SEC', labelKey: 'SECURITY' },
  { skill: SkillType.TREAT_INJURY, key: 'TRE', labelKey: 'TREAT_INJURY' },
];

/** K1 dialog.tlk: 38152 'Class Skill', 38153 'Cross-class Skill' (verified against the vanilla K1 TLK) */
const TLK_CLASS_SKILL = 38152;
const TLK_CROSS_CLASS_SKILL = 38153;

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
  DEM_MINUS_BTN: GUIButton;
  DEMOLITIONS_LBL: GUILabel;
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

  /** The skill row currently being hovered/clicked; drives the cost/class-skill/description feedback */
  focusedSkill: SkillType = SkillType.COMPUTER_USE;

  /** Skill whose description is currently loaded into LB_DESC (avoids rebuilding the list on every refresh) */
  protected describedSkill: number = -1;

  constructor(){
    super();
    this.gui_resref = 'skchrgen';
    this.background = '1600x1200back';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.wireControls();
      resolve();
    });
  }

  /**
   * Wires the listeners shared by the K1 and TSL versions of this screen.
   * The TSL subclass skips the K1 initializer (skipInit) and calls this itself.
   */
  protected wireControls(){
    if(this.BTN_BACK){
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        //Discard the working copy; the next show() reloads it from the creature
        this.close();
      });
    }

    if(this.BTN_ACCEPT){
      this.BTN_ACCEPT.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.CharGenManager.commitSkillPoints();
        this.close();
      });
    }

    if(this.BTN_RECOMMENDED){
      this.BTN_RECOMMENDED.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.CharGenManager.applyRecommendedSkills();
        this.updateButtonStates();
        this.setFocusedSkill(this.focusedSkill);
      });
    }

    for(let i = 0; i < SKILL_ROWS.length; i++){
      this.wireSkillRow(SKILL_ROWS[i].skill, SKILL_ROWS[i].key, SKILL_ROWS[i].labelKey);
    }
  }

  /**
   * Wires the +/- buttons and the hover/click focus feedback for one skill row.
   * The *_POINTS_BTN only gets a hover listener: its extent overlaps the +/-
   * buttons and click routing hands the click to the first control (in tree
   * order) with a click listener, so a click listener on it would swallow
   * clicks meant for the +/- buttons. Clicking the row label focuses the skill.
   */
  protected wireSkillRow(skill: SkillType, key: string, labelKey: string){
    const label = this.getControlByName(`${labelKey}_LBL`);
    const pointsBtn = this.getControlByName(`${labelKey}_POINTS_BTN`);
    const minusBtn = this.getControlByName(`${key}_MINUS_BTN`);
    const plusBtn = this.getControlByName(`${key}_PLUS_BTN`);

    const focus = () => {
      this.setFocusedSkill(skill);
    };

    if(label){
      label.addEventListener('hover', focus);
      label.addEventListener('click', (e) => {
        e.stopPropagation();
        focus();
      });
    }

    if(pointsBtn){
      pointsBtn.addEventListener('hover', focus);
    }

    if(minusBtn){
      minusBtn.addEventListener('hover', focus);
      minusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.CharGenManager.decreaseSkill(skill);
        this.updateButtonStates();
        focus();
      });
    }

    if(plusBtn){
      plusBtn.addEventListener('hover', focus);
      plusBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        GameState.CharGenManager.increaseSkill(skill);
        this.updateButtonStates();
        focus();
      });
    }
  }

  show() {
    super.show();
    //Working copy from the accepted ranks; pool from the current class + INT
    GameState.CharGenManager.loadSkillPointsFromCreature();
    this.updateButtonStates();
    this.setFocusedSkill(this.focusedSkill);
  }

  updateButtonStates() {
    for(let i = 0; i < SKILL_ROWS.length; i++){
      const row = SKILL_ROWS[i];
      const rank = GameState.CharGenManager.getWorkingSkillRank(row.skill);
      const pointsBtn = this.getControlByName(`${row.labelKey}_POINTS_BTN`);
      const minusBtn = this.getControlByName(`${row.key}_MINUS_BTN`);
      const plusBtn = this.getControlByName(`${row.key}_PLUS_BTN`);

      if(pointsBtn){
        pointsBtn.setText(rank);
      }

      if(minusBtn){
        if(GameState.CharGenManager.canDecreaseSkill(row.skill)){
          minusBtn.show();
        }else{
          minusBtn.hide();
        }
      }

      if(plusBtn){
        if(GameState.CharGenManager.canIncreaseSkill(row.skill)){
          plusBtn.show();
        }else{
          plusBtn.hide();
        }
      }
    }

    if(this.REMAINING_SELECTIONS_LBL){
      this.REMAINING_SELECTIONS_LBL.setText(GameState.CharGenManager.availSkillPoints);
    }
  }

  /**
   * Updates the cost / class-skill / description feedback for the hovered or clicked skill.
   */
  setFocusedSkill(skill: SkillType){
    const row = SKILL_ROWS.find((r) => r.skill === skill) || SKILL_ROWS[0];
    this.focusedSkill = row.skill;

    if(this.COST_POINTS_LBL){
      this.COST_POINTS_LBL.setText(GameState.CharGenManager.getSkillPointCost(row.skill));
    }

    if(this.CLASSSKL_LBL){
      this.CLASSSKL_LBL.setText(this.getClassSkillText(GameState.CharGenManager.isClassSkill(row.skill)));
    }

    if(this.LB_DESC && this.describedSkill !== row.skill){
      const talent = GameState.SWRuleSet.skills[row.skill];
      const description = talent ? this.getTLKString(talent.description) : '';
      if(description){
        this.LB_DESC.setItem(description);
        this.describedSkill = row.skill;
      }
    }
  }

  /**
   * Text for CLASSSKL_LBL. K1 uses dialog.tlk 38152/38153.
   * UNCERTAIN (TSL): the TSL dialog.tlk was not available to verify those
   * strrefs (the K1 38k range holds unrelated strings in TSL), so TSL falls
   * back to the English text until the TSL strrefs are confirmed.
   */
  getClassSkillText(isClassSkill: boolean): string {
    if(GameState.GameKey == GameEngineType.KOTOR){
      const text = this.getTLKString(isClassSkill ? TLK_CLASS_SKILL : TLK_CROSS_CLASS_SKILL);
      if(text){
        return text;
      }
    }
    return isClassSkill ? 'Class Skill' : 'Cross-class Skill';
  }

  getTLKString(strRef: number): string {
    if(typeof strRef !== 'number' || strRef < 0){ return ''; }
    const tlkString = GameState.TLKManager?.TLKStrings?.[strRef];
    return tlkString ? tlkString.Value : '';
  }

  reset() {
    GameState.CharGenManager.resetSkillPoints();
    this.focusedSkill = SkillType.COMPUTER_USE;
    this.describedSkill = -1;
  }

}
