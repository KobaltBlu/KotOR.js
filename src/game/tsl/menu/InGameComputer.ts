import type { GUILabel, GUIListBox } from "../../../gui";
import { InGameComputer as K1_InGameComputer } from "../../kotor/KOTOR";

/**
 * InGameComputer class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file InGameComputer.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class InGameComputer extends K1_InGameComputer {

  declare LBL_REP_UNITS: GUILabel;
  declare LBL_REP_SKILL: GUILabel;
  declare LBL_COMP_SPIKES: GUILabel;
  declare LBL_COMP_SKILL: GUILabel;
  declare LBL_COMP_SKILL_VAL: GUILabel;
  declare LBL_REP_SKILL_VAL: GUILabel;
  declare LBL_REP_UNITS_VAL: GUILabel;
  declare LBL_BAR1: GUILabel;
  declare LB_MESSAGE: GUIListBox;
  declare LBL_BAR2: GUILabel;
  declare LBL_COMP_SPIKES_VAL: GUILabel;
  declare LB_REPLIES: GUIListBox;
  declare LBL_BAR3: GUILabel;
  declare LBL_BAR4: GUILabel;
  declare LBL_BAR5: GUILabel;
  declare LBL_BAR6: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'computer_p';
    this.background = 'black';
    this.voidFill = false;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      this.LB_MESSAGE.clearItems();
      resolve();
    });
  }
  
}
