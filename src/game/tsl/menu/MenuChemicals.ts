import { GameMenu } from "../../../gui";
import type { GUILabel, GUIListBox, GUIButton } from "../../../gui";

/**
 * MenuChemicals class.
 * 
 * KotOR JS - A remake of the Odyssey Game Engine that powered KotOR I & II
 * 
 * @file MenuChemicals.ts
 * @author KobaltBlu <https://github.com/KobaltBlu>
 * @license {@link https://www.gnu.org/licenses/gpl-3.0.txt|GPLv3}
 */
export class MenuChemicals extends GameMenu {

  declare LBL_BAR2: GUILabel;
  declare LB_DESCRIPTIONINV: GUIListBox;
  declare LBL_BAR1: GUILabel;
  declare LB_DESCRIPTION: GUIListBox;
  declare LB_SHOPITEMS: GUIListBox;
  declare LB_INVITEMS: GUIListBox;
  declare LBL_CREDITS_VALUE: GUILabel;
  declare LBL_CREDITS: GUILabel;
  declare LBL_COST_VALUE: GUILabel;
  declare LBL_COST: GUILabel;
  declare LBL_STOCK: GUILabel;
  declare LBL_STOCK_VALUE: GUILabel;
  declare BTN_Accept: GUIButton;
  declare BTN_Cancel: GUIButton;
  declare BTN_Examine: GUIButton;
  declare LBL_TITLE: GUILabel;
  declare LBL_TITLE2: GUILabel;
  declare BTN_CREATE_HEALTH: GUIButton;
  declare BTN_CREATE_STIMS: GUIButton;
  declare BTN_CREATE_GRENADES: GUIButton;
  declare BTN_CREATE_MINES: GUIButton;
  declare LBL_RELATEDSKILL: GUILabel;
  declare LBL_BAR3: GUILabel;

  constructor(){
    super();
    this.gui_resref = 'chemical_p';
    this.background = '';
    this.voidFill = true;
  }

  async menuControlInitializer(skipInit: boolean = false) {
    await super.menuControlInitializer(true);
    if(skipInit) return;
    return new Promise<void>((resolve, reject) => {
      resolve();
    });
  }
  
}
