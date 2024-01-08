import { GameMenu } from "../../../gui";
import type { GUIListBox, GUILabel, GUIButton } from "../../../gui";
import { CharGenManager } from "../../../managers";

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
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer();
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      
      this.BTN_BACK.addEventListener('click', (e: any) => {
        e.stopPropagation();
        this.close();
      });

      this.BTN_ACCEPT.addEventListener('click', (e: any) => {
        e.stopPropagation();
        console.log('CharGenSkills', 'Assigning skillpoints')
        CharGenManager.selectedCreature.skills[0].rank = CharGenManager.computerUse;
        CharGenManager.selectedCreature.skills[1].rank = CharGenManager.demolitions;
        CharGenManager.selectedCreature.skills[2].rank = CharGenManager.stealth;
        CharGenManager.selectedCreature.skills[3].rank = CharGenManager.awareness;
        CharGenManager.selectedCreature.skills[4].rank = CharGenManager.persuade;
        CharGenManager.selectedCreature.skills[5].rank = CharGenManager.repair;
        CharGenManager.selectedCreature.skills[6].rank = CharGenManager.security;
        CharGenManager.selectedCreature.skills[7].rank = CharGenManager.treatInjury;
        this.close();
      });

      this.BTN_RECOMMENDED.addEventListener('click', (e: any) => {

        CharGenManager.resetSkillPoints();
        CharGenManager.availSkillPoints = CharGenManager.getMaxSkillPoints();
        let skillOrder = CharGenManager.getRecommendedOrder();
        
        while(CharGenManager.availSkillPoints > 0){
          for(let i = 0; i < 8; i++){
            let skillIndex = skillOrder[i];

            if(!CharGenManager.availSkillPoints)
              break;

            switch(skillIndex){
              case 0:
                CharGenManager.computerUse++;
              break;
              case 1:
                CharGenManager.demolitions++;
              break;
              case 2:
                CharGenManager.stealth++;
              break;
              case 3:
                CharGenManager.awareness++;
              break;
              case 4:
                CharGenManager.persuade++;
              break;
              case 5:
                CharGenManager.repair++;
              break;
              case 6:
                CharGenManager.security++;
              break;
              case 7:
                CharGenManager.treatInjury++;
              break;
            }
            
            if(skillIndex >= 0){
              CharGenManager.availSkillPoints -= 1;
            }
          }
        }

        this.updateButtonStates();

      });
      resolve();
    });
  }

  show() {
    super.show();
    this.updateButtonStates();
  }

  updateButtonStates() {
    this.COMPUTER_USE_POINTS_BTN.setText(CharGenManager.computerUse);
    this.DEMOLITIONS_POINTS_BTN.setText(CharGenManager.demolitions);
    this.STEALTH_POINTS_BTN.setText(CharGenManager.stealth);
    this.AWARENESS_POINTS_BTN.setText(CharGenManager.awareness);
    this.PERSUADE_POINTS_BTN.setText(CharGenManager.persuade);
    this.REPAIR_POINTS_BTN.setText(CharGenManager.repair);
    this.SECURITY_POINTS_BTN.setText(CharGenManager.security);
    this.TREAT_INJURY_POINTS_BTN.setText(CharGenManager.treatInjury);
    this.REMAINING_SELECTIONS_LBL.setText(CharGenManager.availSkillPoints);
  }

  reset() {
    CharGenManager.availSkillPoints = CharGenManager.getMaxSkillPoints();
    CharGenManager.resetSkillPoints();
  }
  
}
