import { GameState } from "../../../GameState";
import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";

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
      
      this.BTN_BACK.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });

      this.BTN_ACCEPT.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('CharGenSkills', 'Assigning skillpoints')
        GameState.CharGenManager.selectedCreature.skills[0].rank = GameState.CharGenManager.computerUse;
        GameState.CharGenManager.selectedCreature.skills[1].rank = GameState.CharGenManager.demolitions;
        GameState.CharGenManager.selectedCreature.skills[2].rank = GameState.CharGenManager.stealth;
        GameState.CharGenManager.selectedCreature.skills[3].rank = GameState.CharGenManager.awareness;
        GameState.CharGenManager.selectedCreature.skills[4].rank = GameState.CharGenManager.persuade;
        GameState.CharGenManager.selectedCreature.skills[5].rank = GameState.CharGenManager.repair;
        GameState.CharGenManager.selectedCreature.skills[6].rank = GameState.CharGenManager.security;
        GameState.CharGenManager.selectedCreature.skills[7].rank = GameState.CharGenManager.treatInjury;
        this.close();
      });

      this.BTN_RECOMMENDED.addEventListener('click', (e) => {

        GameState.CharGenManager.resetSkillPoints();
        GameState.CharGenManager.availSkillPoints = GameState.CharGenManager.getMaxSkillPoints();
        let skillOrder = GameState.CharGenManager.getRecommendedOrder();
        
        while(GameState.CharGenManager.availSkillPoints > 0){
          for(let i = 0; i < 8; i++){
            let skillIndex = skillOrder[i];

            if(!GameState.CharGenManager.availSkillPoints)
              break;

            switch(skillIndex){
              case 0:
                GameState.CharGenManager.computerUse++;
              break;
              case 1:
                GameState.CharGenManager.demolitions++;
              break;
              case 2:
                GameState.CharGenManager.stealth++;
              break;
              case 3:
                GameState.CharGenManager.awareness++;
              break;
              case 4:
                GameState.CharGenManager.persuade++;
              break;
              case 5:
                GameState.CharGenManager.repair++;
              break;
              case 6:
                GameState.CharGenManager.security++;
              break;
              case 7:
                GameState.CharGenManager.treatInjury++;
              break;
            }
            
            if(skillIndex >= 0){
              GameState.CharGenManager.availSkillPoints -= 1;
            }
          }
        }

        this.updateButtonStates();

      });

      // Wire up individual skill +/- buttons
      this.wireSkillButtons();

      resolve();
    });
  }

  /**
   * Wire up the +/- buttons for each skill.
   * Plus adds one rank (deducting cost from availSkillPoints).
   * Minus removes one rank (refunding cost to availSkillPoints),
   * but never drops below the base value (existing rank before this level-up).
   */
  wireSkillButtons() {
    const pairs: [GUIButton, GUIButton, () => number, (v: number) => void, number][] = [
      [this.COM_PLUS_BTN,  this.COM_MINUS_BTN,  () => GameState.CharGenManager.computerUse,  (v) => { GameState.CharGenManager.computerUse = v; },  0],
      [this.DEM_PLUS_BTN,  this.DEM_MINUS_BTN,  () => GameState.CharGenManager.demolitions,   (v) => { GameState.CharGenManager.demolitions = v; },   1],
      [this.STE_PLUS_BTN,  this.STE_MINUS_BTN,  () => GameState.CharGenManager.stealth,       (v) => { GameState.CharGenManager.stealth = v; },       2],
      [this.AWA_PLUS_BTN,  this.AWA_MINUS_BTN,  () => GameState.CharGenManager.awareness,     (v) => { GameState.CharGenManager.awareness = v; },     3],
      [this.PER_PLUS_BTN,  this.PER_MINUS_BTN,  () => GameState.CharGenManager.persuade,      (v) => { GameState.CharGenManager.persuade = v; },      4],
      [this.REP_PLUS_BTN,  this.REP_MINUS_BTN,  () => GameState.CharGenManager.repair,        (v) => { GameState.CharGenManager.repair = v; },        5],
      [this.SEC_PLUS_BTN,  this.SEC_MINUS_BTN,  () => GameState.CharGenManager.security,      (v) => { GameState.CharGenManager.security = v; },      6],
      [this.TRE_PLUS_BTN,  this.TRE_MINUS_BTN,  () => GameState.CharGenManager.treatInjury,   (v) => { GameState.CharGenManager.treatInjury = v; },   7],
    ];

    for(const [plusBtn, minusBtn, getter, setter, skillIndex] of pairs){
      plusBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const cost = GameState.CharGenManager.getSkillCost(skillIndex);
        if(GameState.CharGenManager.availSkillPoints >= cost){
          setter(getter() + 1);
          GameState.CharGenManager.availSkillPoints -= cost;
          this.updateButtonStates();
        }
      });

      minusBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const floor = GameState.CharGenManager.isLevelUpMode
          ? (GameState.CharGenManager.baseSkillValues[skillIndex] ?? 0)
          : 0;
        if(getter() > floor){
          const refund = GameState.CharGenManager.getSkillRefund(skillIndex);
          setter(getter() - 1);
          GameState.CharGenManager.availSkillPoints += refund;
          this.updateButtonStates();
        }
      });
    }
  }

  show() {
    super.show();
    this.updateButtonStates();
  }

  updateButtonStates() {
    this.COMPUTER_USE_POINTS_BTN.setText(GameState.CharGenManager.computerUse);
    this.DEMOLITIONS_POINTS_BTN.setText(GameState.CharGenManager.demolitions);
    this.STEALTH_POINTS_BTN.setText(GameState.CharGenManager.stealth);
    this.AWARENESS_POINTS_BTN.setText(GameState.CharGenManager.awareness);
    this.PERSUADE_POINTS_BTN.setText(GameState.CharGenManager.persuade);
    this.REPAIR_POINTS_BTN.setText(GameState.CharGenManager.repair);
    this.SECURITY_POINTS_BTN.setText(GameState.CharGenManager.security);
    this.TREAT_INJURY_POINTS_BTN.setText(GameState.CharGenManager.treatInjury);
    this.REMAINING_SELECTIONS_LBL.setText(GameState.CharGenManager.availSkillPoints);
  }

  reset() {
    GameState.CharGenManager.availSkillPoints = GameState.CharGenManager.getMaxSkillPoints();
    GameState.CharGenManager.resetSkillPoints();
  }
  
}
