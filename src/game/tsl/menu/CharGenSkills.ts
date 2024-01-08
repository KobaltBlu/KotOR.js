import type { GUILabel, GUIButton, GUIListBox } from "../../../gui";
import { CharGenSkills as K1_CharGenSkills } from "../../kotor/KOTOR";

/**
 * CharGenSkills class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file CharGenSkills.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class CharGenSkills extends K1_CharGenSkills {

  declare MAIN_TITLE_LBL: GUILabel;
  declare SUB_TITLE_LBL: GUILabel;
  declare SELECTIONS_REMAINING_LBL: GUILabel;
  declare COMPUTER_USE_POINTS_BTN: GUIButton;
  declare COMPUTER_USE_LBL: GUILabel;
  declare COM_MINUS_BTN: GUIButton;
  declare COM_PLUS_BTN: GUIButton;
  declare DEMOLITIONS_POINTS_BTN: GUIButton;
  declare DEMOLITIONS_LBL: GUILabel;
  declare DEM_PLUS_BTN: GUIButton;
  declare DEM_MINUS_BTN: GUIButton;
  declare STEALTH_POINTS_BTN: GUIButton;
  declare STEALTH_LBL: GUILabel;
  declare STE_MINUS_BTN: GUIButton;
  declare STE_PLUS_BTN: GUIButton;
  declare AWARENESS_POINTS_BTN: GUIButton;
  declare AWARENESS_LBL: GUILabel;
  declare AWA_MINUS_BTN: GUIButton;
  declare AWA_PLUS_BTN: GUIButton;
  declare PERSUADE_POINTS_BTN: GUIButton;
  declare PERSUADE_LBL: GUILabel;
  declare PER_MINUS_BTN: GUIButton;
  declare PER_PLUS_BTN: GUIButton;
  declare REPAIR_POINTS_BTN: GUIButton;
  declare REPAIR_LBL: GUILabel;
  declare REP_MINUS_BTN: GUIButton;
  declare REP_PLUS_BTN: GUIButton;
  declare COST_LBL: GUILabel;
  declare COST_POINTS_LBL: GUILabel;
  declare SECURITY_POINTS_BTN: GUIButton;
  declare SECURITY_LBL: GUILabel;
  declare SEC_MINUS_BTN: GUIButton;
  declare SEC_PLUS_BTN: GUIButton;
  declare TREAT_INJURY_POINTS_BTN: GUIButton;
  declare TREAT_INJURY_LBL: GUILabel;
  declare TRE_PLUS_BTN: GUIButton;
  declare TRE_MINUS_BTN: GUIButton;
  declare LB_DESC: GUIListBox;
  declare CLASSSKL_LBL: GUILabel;
  declare LBL_BAR1: GUILabel;
  declare LBL_BAR2: GUILabel;
  declare REMAINING_SELECTIONS_LBL: GUILabel;
  declare BTN_BACK: GUIButton;
  declare BTN_ACCEPT: GUIButton;
  declare BTN_RECOMMENDED: GUIButton;

  constructor(){
    super();
    this.gui_resref = 'skchrgen_p';
    this.background = '';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }
  
}
